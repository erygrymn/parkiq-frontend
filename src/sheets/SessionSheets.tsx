import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GhostButton, PrimaryCta } from '../components/Buttons';
import { ChipGroup } from '../components/ChipGroup';
import { MoneyBox } from '../components/MoneyBox';
import { CelebrationHero } from '../components/motion/CelebrationHero';
import { PhotoThumb } from '../components/motion/PhotoViewer';
import { PhotoField } from '../components/PhotoField';
import { RatePrompt } from '../components/RatePrompt';
import { DetailRow, PopupSheet } from '../components/PopupSheet';
import { CARD_HEIGHT, CARD_WIDTH, SavingsCard, type SavingsCardData } from '../components/SavingsCard';
import { SearchBar } from '../components/SearchBar';
import { ShareCardRenderer } from '../components/ShareCardRenderer';
import { trackPaywallShown, trackShareCard } from '../lib/analytics';
import { hapticCommit, hapticStamp } from '../lib/haptics';
import { shouldAskForReview, shouldShowCelebrationPaywall } from '../lib/review';
import { useIsPremium } from '../state/premiumStore';
import { openAppSettings, StatusLine } from '../components/StatusLine';
import { TariffBar } from '../components/TariffBar';
import { TariffForm } from '../components/TariffForm';
import { Caption, DisplayStamp, Overline } from '../components/Typography';
import { formatClock, formatDurationStamp, formatElapsed, formatMoney, formatTariffSummary } from '../lib/format';
import { formatDistance } from '../lib/geo';
import { captureCurrentPlace } from '../lib/location';
import { openCoordsInMaps } from '../lib/maps';
import { applyFilter, walkMinutes, type PoiFilter } from '../lib/parkingPoi';
import { useDiscoveryStore } from '../state/discoveryStore';
import { useNetworkStore } from '../state/networkStore';
import { shareParkedLocation } from '../lib/share';
import { computeExitSummary, computeTariffState } from '../lib/tariffMath';
import { appliesAt } from '../lib/tariffSchedule';
import { getLocale, t, upper } from '../localization';
import {
  useSessionStore,
  type ParkSession,
  type ReminderAnchor,
  type ReminderKind,
} from '../state/sessionStore';
import { useSettingsStore } from '../state/settingsStore';
import { useTheme } from '../theme';
import { CROSSFADE_MS, SPRING } from '../theme/motion';
import { radius, spacing, typeScale } from '../theme/tokens';

// design.md §7 — durum-güdümlü sheet içerikleri. Her ekranda tek siyah CTA (İlke 4).
// İlke 9: park formu ve bitirme sheet'in İÇİNDE morph eder; ayrı modal yok. Küçük düzenleme
// yüzeyleri inline açılır (LinearTransition), yalnız tarife editörü BottomSheetModal'dır.

/** Olumsuz yorum yanıtı mağazaya değil bize gider. */
const SUPPORT_EMAIL = 'info@twiceapps.co';

const layoutSpring = LinearTransition.springify().damping(SPRING.damping).stiffness(SPRING.stiffness).mass(SPRING.mass);

const inputStyle = (bg: string, ink: string) => ({
  height: 44,
  borderRadius: radius.r12,
  backgroundColor: bg,
  paddingHorizontal: spacing.s12,
  fontSize: 15,
  color: ink,
});

/** 44pt text buton (§5): dolgu yok, `text-secondary`, pressed ink. */
function TextButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={8}
      style={{ height: 44, justifyContent: 'center', alignSelf: 'flex-start' }}
    >
      {({ pressed }) => (
        <Text style={{ fontSize: 17, fontWeight: '600', color: pressed ? colors.ink : colors.textSecondary }}>{label}</Text>
      )}
    </Pressable>
  );
}

/** Hairline ayraçlı satır grubu: editör satırın altında yerinde açılır. */
function Field({
  label,
  value,
  placeholder,
  open,
  onToggle,
  children,
}: {
  label: string;
  value: string | null;
  placeholder: string;
  open: boolean;
  onToggle: () => void;
  children?: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <Animated.View layout={layoutSpring} style={{ borderBottomWidth: 1, borderBottomColor: colors.gridline }}>
      <DetailRow label={label} value={value} placeholder={placeholder} onPress={onToggle} open={children ? open : undefined} />
      {open && children && (
        <Animated.View entering={FadeIn.duration(CROSSFADE_MS)} style={{ paddingBottom: spacing.s12, gap: spacing.s8 }}>
          {children}
        </Animated.View>
      )}
    </Animated.View>
  );
}

/** §7.2 idle sheet: arama + "I Parked" + filtre çipleri + en yakın 3 otopark. */
export function IdleSheet({ onOpenPaywall }: { onOpenPaywall: () => void }) {
  const { colors } = useTheme();
  const isPremium = useIsPremium();
  const locale = getLocale();
  const park = useSessionStore((s) => s.park);
  const filter = useDiscoveryStore((s) => s.filter);
  const discoveryState = useDiscoveryStore((s) => s.state);
  const pois = useDiscoveryStore((s) => s.pois);
  const { setFilter, load, pinTo, requestFollow } = useDiscoveryStore.getState();

  // Kullanıcı konumu alınınca yakındakiler çekilir (mesafe eşiğiyle tekrar sorgu engellenir).
  useEffect(() => {
    void captureCurrentPlace().then((outcome) => {
      if (outcome.status === 'ok') {
        load({ latitude: outcome.place.latitude, longitude: outcome.place.longitude });
      }
    });
  }, [load]);

  const radiusM = useDiscoveryStore((s) => s.radiusM);
  const visible = applyFilter(pois, filter, radiusM);

  // Tarife hafızası: bu otoparka daha önce park edildiyse girilen tarife gösterilir.
  const rememberedTariffFor = (poi: { latitude: number; longitude: number }) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const repo = require('../db/sessionRepo') as typeof import('../db/sessionRepo');
      return repo.findRememberedTariff(poi.latitude, poi.longitude);
    } catch {
      return null;
    }
  };

  // Konuma dön: haritanın kendi konum akışına "kullanıcıyı takip et" der.
  const locateMe = () => requestFollow();

  return (
    <View style={{ paddingHorizontal: spacing.s20, paddingBottom: spacing.s20, gap: spacing.s16 }}>
      {/* Hedefi ara → ORANIN çevresindeki otoparklar (evden çıkmadan planlama). */}
      <SearchBar onPick={(result) => pinTo(result.coords)} onLocate={locateMe} />

      {/* CTA doğrudan aramanın altında: kompakt kademede görünen tek şey bu ikisi. */}
      <PrimaryCta
        label={t('iParked')}
        onPress={() => {
          // design.md §3 park anı sekansı: impactMedium → sheet morph → PARKED. damgası.
          hapticCommit();
          park();
        }}
      />

      <ChipGroup<PoiFilter>
        options={[
          { key: 'all', label: t('filterAll') },
          { key: 'charging', label: t('filterCharging') },
          { key: 'covered', label: t('filterCovered') },
        ]}
        value={filter}
        // Filtreleme premium (ürün kararı). Çipler GÖRÜNÜR kalır — yeteneğin
        // var olduğunu görmek, dokununca fiyatını öğrenmekten iyidir.
        onChange={(next) => {
          if (!isPremium && next !== 'all') {
            trackPaywallShown('feature');
            onOpenPaywall();
            return;
          }
          setFilter(next);
        }}
      />

      {discoveryState === 'loading' && pois.length === 0 && (
        <View style={{ height: 56, borderRadius: radius.r12, backgroundColor: colors.inset }} />
      )}

      {discoveryState === 'error' && <StatusLine label={t('poiError')} />}

      {discoveryState === 'ready' && pois.length > 0 && visible.length === 0 && (
        <Caption>{t('noNearbyForFilter')}</Caption>
      )}

      {/* §7.2 en yakın otoparklar: editöryal satırlar, gri kutu yok. */}
      {visible.slice(0, 3).map((poi, index) => {
        const remembered = rememberedTariffFor(poi);
        return (
          <Animated.View
            key={poi.id}
            entering={FadeInDown.delay(index * 50).duration(CROSSFADE_MS)}
            style={{ gap: spacing.s4, paddingBottom: spacing.s12, borderBottomWidth: 1, borderBottomColor: colors.gridline }}
          >
            <Overline>
              {[
                t('minWalk', { minutes: walkMinutes(poi.distanceM) }),
                formatDistance(poi.distanceM, locale),
                poi.covered === true ? t('filterCovered') : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Overline>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s8 }}>
              <Text
                numberOfLines={1}
                style={{
                  flex: 1,
                  fontSize: 21,
                  fontWeight: '900',
                  letterSpacing: 21 * -0.02,
                  color: colors.ink,
                }}
              >
                {upper(poi.name ?? t(poi.kind === 'charging' ? 'poiCharging' : 'poiParking'))}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => openCoordsInMaps(poi, poi.name, { directions: true })}
                hitSlop={8}
              >
                <Caption color={colors.ink} style={{ fontWeight: '600' }}>
                  {t('directions')}
                </Caption>
              </Pressable>
            </View>
            {remembered && <Caption color={colors.accentText}>{formatTariffSummary(remembered, locale)}</Caption>}
          </Animated.View>
        );
      })}
    </View>
  );
}

/** Park formunda inline açık olan alan. */
type ParkField = 'location' | 'floor' | 'note' | 'photo' | 'backdate' | 'reminder';

/** Tarife formu + tarama satırı + OCR durumları — park ve aktif sheet'lerde aynı. */
function TariffEditor({ onOpenPaywall, onClose }: { onOpenPaywall: () => void; onClose: () => void }) {
  const { colors } = useTheme();
  const session = useSessionStore((s) => s.session);
  const externalTariffVersion = useSessionStore((s) => s.externalTariffVersion);
  const ocrState = useSessionStore((s) => s.ocrState);
  const ocrSchedule = useSessionStore((s) => s.ocrSchedule);
  const ocrPartial = useSessionStore((s) => s.ocrPartial);
  const { setTariff, scanTariff } = useSessionStore.getState();
  if (!session) return null;

  return (
    <>
      {/* key: tarife dışarıdan set edilince (öneri kabulü / OCR) form kendini tazeler */}
      <TariffForm key={externalTariffVersion} value={session.tariff} onChange={setTariff} />

      <Pressable
        accessibilityRole="button"
        onPress={scanTariff}
        disabled={ocrState === 'scanning'}
        style={({ pressed }) => ({
          height: 44,
          borderRadius: radius.r12,
          backgroundColor: pressed ? colors.insetPressed : colors.inset,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.s8,
          paddingHorizontal: spacing.s12,
        })}
      >
        {/* OCR gerçek iş: sistem spinner, sahte ilerleme yok (§7.4). */}
        {ocrState === 'scanning' ? (
          <ActivityIndicator size="small" color={colors.textSecondary} />
        ) : (
          <SymbolView name="camera.viewfinder" size={17} tintColor={colors.ink} weight="regular" />
        )}
        <Text style={{ fontSize: 15, color: colors.ink }}>{ocrState === 'scanning' ? t('scanning') : t('scanBoard')}</Text>
      </Pressable>

      {ocrSchedule !== null && (
        <Caption color={colors.accentText}>
          {t(
            ocrSchedule === 'weekday'
              ? 'scheduleWeekday'
              : ocrSchedule === 'weekend'
                ? 'scheduleWeekend'
                : ocrSchedule === 'day'
                  ? 'scheduleDay'
                  : 'scheduleNight',
          )}
        </Caption>
      )}
      {ocrPartial && <Caption color={colors.warnText}>{t('scanPartial')}</Caption>}
      {ocrState === 'not_detected' && <Caption color={colors.warnText}>{t('scanNotDetected')}</Caption>}
      {ocrState === 'failed' && <Caption color={colors.warnText}>{t('scanFailed')}</Caption>}
      {ocrState === 'unavailable' && <Caption>{t('scanUnavailable')}</Caption>}
      {ocrState === 'locked' && (
        <StatusLine
          label={t('scanPro')}
          onPress={() => {
            onClose();
            trackPaywallShown('feature');
            onOpenPaywall();
          }}
        />
      )}
    </>
  );
}

export function ParkingSheet({ onOpenPaywall }: { onOpenPaywall: () => void }) {
  const { colors } = useTheme();
  const session = useSessionStore((s) => s.session);
  const locationState = useSessionStore((s) => s.locationState);
  const suggestedTariff = useSessionStore((s) => s.suggestedTariff);
  const cameraState = useSessionStore((s) => s.cameraState);
  const autoDetected = useSessionStore((s) => s.autoDetected);
  const dismissAutoPark = useSessionStore((s) => s.dismissAutoPark);
  const {
    setFloor,
    setNote,
    acceptSuggestedTariff,
    confirmDetails,
    setBackdateMinutes,
    setReminder,
    capturePhoto,
    removePhoto,
    setParkLocation,
    useMyLocationForPark,
  } = useSessionStore.getState();
  const cancelPark = useSessionStore((s) => s.cancelPark);
  const [customReminder, setCustomReminder] = useState(false);
  const warnThresholdMin = useSettingsStore((s) => s.warnThresholdMin);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [openField, setOpenField] = useState<ParkField | null>(null);
  const [tariffOpen, setTariffOpen] = useState(false);
  const [undoVisible, setUndoVisible] = useState(true);
  const toggle = (field: ParkField) => setOpenField((current) => (current === field ? null : field));

  // §7.3: "Undo" 10 sn görünür; sonra sheet'i aşağı çekmek geri alma yolu olarak kalır.
  useEffect(() => {
    const id = setTimeout(() => setUndoVisible(false), 10_000);
    return () => clearTimeout(id);
  }, []);

  // Soğuk açılışta yarım kalmış form: doldurulmuş alan varsa detaylar açık gelir.
  useEffect(() => {
    if (session && (session.floor || session.note || session.photoUri || session.tariff || session.reminder)) {
      setDetailsOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pin bırakılırken bu panel tamamen unmount olur; dönüşte konum alanı yeniden açılır.
  const reopenAfterPick = useSessionStore((s) => s.reopenAfterPick);
  useEffect(() => {
    if (reopenAfterPick !== 'park') return;
    useSessionStore.getState().clearReopenAfterPick();
    setDetailsOpen(true);
    setOpenField('location');
  }, [reopenAfterPick]);

  const pickOnMap = () => {
    const current = useSessionStore.getState().session;
    if (current?.latitude != null && current.longitude != null) {
      useDiscoveryStore.getState().pinTo({ latitude: current.latitude, longitude: current.longitude });
    }
    useSessionStore.getState().startPickingLocation('park');
  };

  if (!session) return null;

  const backdateMinutes = Math.round((session.recordedAtMs - session.startedAtMs) / 60_000);
  const reminder = session.reminder;
  const reminderSummary = reminder
    ? [
        reminder.minutes < 60
          ? t('minutesShort', { minutes: reminder.minutes })
          : t('hoursShort', { hours: Math.round((reminder.minutes / 60) * 10) / 10 }),
        t(
          reminder.anchor === 'afterPark'
            ? 'anchorAfterPark'
            : reminder.anchor === 'beforeFirstTier'
              ? 'anchorFirstTier'
              : 'anchorEveryTier',
        ).toLocaleLowerCase(),
      ].join(' · ')
    : null;

  // Yer adı META'dır: nokta hakkı duygu damgasınındır (§2 tie-breaker).
  const overline = [
    session.placeName ?? (locationState === 'capturing' ? t('locating') : null),
    t('parkedAt', { time: formatClock(session.startedAtMs) }),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Animated.View layout={layoutSpring} style={{ paddingHorizontal: spacing.s20, paddingBottom: spacing.s20, gap: spacing.s16 }}>
      <View style={{ gap: spacing.s4 }}>
        <Overline>{overline}</Overline>
        {/* PARKED. — §2 yeşil nokta whitelist'i; nokta inince notificationSuccess (§3). */}
        <DisplayStamp text={t('parkedStamp').replace(/\.$/, '')} dotColor={colors.accentText} onLanded={hapticStamp} />
      </View>

      {undoVisible && (
        <Animated.View exiting={FadeOut.duration(CROSSFADE_MS)} layout={layoutSpring}>
          <TextButton label={t('undo')} onPress={cancelPark} />
        </Animated.View>
      )}

      {locationState === 'denied' && <StatusLine label={t('locationOff')} onPress={openAppSettings} />}
      {/* §7.3 zayıf GPS = kapalı otopark sinyali → kat/foto burada işe yarar */}
      {locationState === 'weak' && <StatusLine label={t('weakGpsNudge')} />}
      {/* Oto-algılama tetiklediyse geri alma yolu açık kalır */}
      {autoDetected && <StatusLine label={t('notParkedYet')} onPress={dismissAutoPark} />}

      {suggestedTariff && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.s12,
            borderRadius: radius.r16,
            backgroundColor: colors.alertBgMoney,
            borderWidth: 1,
            borderColor: 'rgba(0,166,80,0.22)',
            paddingVertical: spacing.s12,
            paddingHorizontal: spacing.s16,
          }}
        >
          <Text style={{ flex: 1, fontSize: 13, color: colors.accentText }}>
            {t('lastTimeTariff', { summary: formatTariffSummary(suggestedTariff, getLocale()) })}
          </Text>
          <Pressable accessibilityRole="button" onPress={acceptSuggestedTariff} hitSlop={8}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.accentText }}>{t('use')}</Text>
          </Pressable>
        </View>
      )}

      {/* Zorunlu alan sıfır: detaylar tek satırın arkasında, aynı sheet içinde açılır (§7.3). */}
      {!detailsOpen ? (
        <Animated.View layout={layoutSpring} style={{ borderTopWidth: 1, borderTopColor: colors.gridline }}>
          <DetailRow label={`+ ${t('addDetails')}`} value={null} placeholder={t('detailsOptional')} onPress={() => setDetailsOpen(true)} />
        </Animated.View>
      ) : (
        <Animated.View entering={FadeIn.duration(CROSSFADE_MS)} layout={layoutSpring} style={{ borderTopWidth: 1, borderTopColor: colors.gridline }}>
          <Field
            label={t('parkLocation')}
            value={session.placeName}
            placeholder={locationState === 'capturing' ? t('locating') : t('useMyLocation')}
            open={openField === 'location'}
            onToggle={() => toggle('location')}
          >
            <SearchBar
              onPick={(result) => {
                setParkLocation({ ...result.coords, placeName: result.label });
                setOpenField(null);
              }}
              trailingSymbol="mappin.and.ellipse"
              trailingLabel={t('pickOnMap')}
              onLocate={pickOnMap}
            />
            <View style={{ flexDirection: 'row', gap: spacing.s8 }}>
              <GhostButton
                label={t('useMyLocation')}
                onPress={() => {
                  useMyLocationForPark();
                  setOpenField(null);
                }}
                style={{ flex: 1 }}
              />
              <GhostButton label={t('pickOnMap')} onPress={pickOnMap} style={{ flex: 1 }} />
            </View>
          </Field>

          <Field
            label={t('floor')}
            value={session.floor || null}
            placeholder={t('floorPlaceholder')}
            open={openField === 'floor'}
            onToggle={() => toggle('floor')}
          >
            <BottomSheetTextInput
              defaultValue={session.floor}
              onChangeText={setFloor}
              placeholder={t('floorPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => setOpenField(null)}
              style={inputStyle(colors.inset, colors.ink)}
            />
          </Field>

          <Field
            label={t('note')}
            value={session.note || null}
            placeholder={t('notePlaceholder')}
            open={openField === 'note'}
            onToggle={() => toggle('note')}
          >
            <BottomSheetTextInput
              defaultValue={session.note}
              onChangeText={setNote}
              placeholder={t('notePlaceholder')}
              placeholderTextColor={colors.textSecondary}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => setOpenField(null)}
              style={inputStyle(colors.inset, colors.ink)}
            />
          </Field>

          <Field
            label={t('photo')}
            value={session.photoUri ? t('photoAdded') : null}
            placeholder={t('addPhoto')}
            open={openField === 'photo'}
            onToggle={() => toggle('photo')}
          >
            <PhotoField uri={session.photoUri} onCapture={capturePhoto} onRemove={removePhoto} />
            {cameraState === 'denied' && <StatusLine label={t('cameraOff')} onPress={openAppSettings} />}
          </Field>

          <Field
            label={t('parkedWhen')}
            value={backdateMinutes === 0 ? null : t('minutesAgo', { minutes: backdateMinutes })}
            placeholder={t('justNow')}
            open={openField === 'backdate'}
            onToggle={() => toggle('backdate')}
          >
            <ChipGroup<number>
              options={[
                { key: 0, label: t('justNow') },
                ...[5, 10, 15, 30].map((m) => ({ key: m, label: t('minutesAgo', { minutes: m }) })),
              ]}
              value={backdateMinutes}
              onChange={setBackdateMinutes}
            />
          </Field>

          {/* Hatırlatıcı üç soruyu AYRI AYRI sorar: neye göre, ne kadar önce/sonra, nasıl. */}
          <Field
            label={t('remindMe')}
            value={reminderSummary}
            placeholder={t('reminderOff')}
            open={openField === 'reminder'}
            onToggle={() => toggle('reminder')}
          >
            <Overline>{t('reminderAnchor')}</Overline>
            <ChipGroup<'off' | ReminderAnchor>
              options={[
                { key: 'off', label: t('reminderOff') },
                { key: 'afterPark', label: t('anchorAfterPark') },
                { key: 'beforeFirstTier', label: t('anchorFirstTier') },
                { key: 'beforeEveryTier', label: t('anchorEveryTier') },
              ]}
              value={reminder?.anchor ?? 'off'}
              onChange={(next) => {
                if (next === 'off') {
                  setReminder(null);
                  return;
                }
                setReminder({
                  anchor: next,
                  minutes: reminder?.minutes ?? (next === 'afterPark' ? 60 : warnThresholdMin),
                  kind: reminder?.kind ?? 'notification',
                });
              }}
            />
            {reminder && reminder.anchor !== 'afterPark' && session.tariff === null && (
              <StatusLine label={t('reminderNeedsTariff')} onPress={() => setTariffOpen(true)} />
            )}
            {reminder && (
              <>
                <Overline>{reminder.anchor === 'afterPark' ? t('reminderAfterHow') : t('reminderBeforeHow')}</Overline>
                <ChipGroup<number>
                  options={[
                    ...(reminder.anchor === 'afterPark'
                      ? [30, 60, 120, 180].map((m) => ({
                          key: m,
                          label: m < 60 ? t('minutesShort', { minutes: m }) : t('hoursShort', { hours: m / 60 }),
                        }))
                      : [5, 10, 15, 30].map((m) => ({ key: m, label: t('minutesShort', { minutes: m }) }))),
                    { key: -1, label: t('custom') },
                  ]}
                  value={customReminder ? -1 : reminder.minutes}
                  onChange={(minutes) => {
                    if (minutes === -1) {
                      setCustomReminder(true);
                      return;
                    }
                    setCustomReminder(false);
                    setReminder({ ...reminder, minutes });
                  }}
                />
                {customReminder && (
                  <BottomSheetTextInput
                    defaultValue={String(reminder.minutes)}
                    onChangeText={(text) => {
                      const parsed = Number(text.replace(',', '.'));
                      if (Number.isFinite(parsed) && parsed > 0) setReminder({ ...reminder, minutes: Math.round(parsed) });
                    }}
                    keyboardType="number-pad"
                    autoFocus
                    returnKeyType="done"
                    placeholder={t('customMinutes')}
                    placeholderTextColor={colors.textSecondary}
                    style={{ ...inputStyle(colors.inset, colors.ink), fontVariant: ['tabular-nums'] }}
                  />
                )}
                <Overline>{t('reminderKind')}</Overline>
                <ChipGroup<ReminderKind>
                  options={[
                    { key: 'notification', label: t('kindNotification') },
                    { key: 'alarm', label: t('kindAlarm') },
                    { key: 'both', label: t('kindBoth') },
                  ]}
                  value={reminder.kind}
                  onChange={(kind) => setReminder({ ...reminder, kind })}
                />
                <Caption>{t('kindHint')}</Caption>
              </>
            )}
          </Field>

          {/* Tarife editörü tek gerçek popup: dilim satırları + OCR (§7.4). */}
          <Field
            label={t('tariff')}
            value={session.tariff ? formatTariffSummary(session.tariff, getLocale()) : null}
            placeholder={t('tariffNone')}
            open={false}
            onToggle={() => setTariffOpen(true)}
          />
        </Animated.View>
      )}

      <Animated.View layout={layoutSpring}>
        <PrimaryCta label={t('done')} onPress={confirmDetails} />
      </Animated.View>

      {(locationState === 'unavailable' || locationState === 'denied') && (
        <StatusLine label={t('locationMissing')} onPress={pickOnMap} />
      )}

      <PopupSheet visible={tariffOpen} title={t('tariff')} onClose={() => setTariffOpen(false)}>
        <TariffEditor onOpenPaywall={onOpenPaywall} onClose={() => setTariffOpen(false)} />
      </PopupSheet>
    </Animated.View>
  );
}

function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** §7.5 sayaç — kendi 1 Hz bileşeni: saniye değişimi sheet'in geri kalanını re-render etmez. */
function ElapsedCounter({ startedAtMs }: { startedAtMs: number }) {
  const { colors } = useTheme();
  const now = useNow(1000);
  const elapsed = formatElapsed(now - startedAtMs);
  return (
    <Text
      style={{
        fontSize: typeScale.displayXL.fontSize,
        fontWeight: typeScale.displayXL.fontWeight,
        letterSpacing: typeScale.displayXL.letterSpacing,
        color: colors.ink,
        fontVariant: ['tabular-nums'],
      }}
      maxFontSizeMultiplier={1.3}
      accessibilityLabel={`${elapsed.main}${elapsed.seconds}`}
    >
      {elapsed.main}
      <Text style={{ fontSize: 24, color: colors.textSecondary }}>{elapsed.seconds}</Text>
    </Text>
  );
}

export function ActiveSheet({ onOpenPaywall }: { onOpenPaywall: () => void }) {
  const { colors } = useTheme();
  const session = useSessionStore((s) => s.session);
  const phase = useSessionStore((s) => s.phase);
  const notificationState = useSessionStore((s) => s.notificationState);
  const { requestEnd, keep, confirmEnd, startFinding, startPickingLocation } = useSessionStore.getState();
  const online = useNetworkStore((s) => s.online);
  const warnThresholdMin = useSettingsStore((s) => s.warnThresholdMin);
  const [tariffOpen, setTariffOpen] = useState(false);
  // Çubuk, para kutusu ve amber durumu dakikalık bilgidir: 30 sn'de bir yeter; sayaç kendi 1 Hz'inde.
  const now = useNow(30_000);
  if (!session) return null;

  const state = computeTariffState(session.tariff, session.startedAtMs, now, warnThresholdMin);
  const hasLocation = session.latitude !== null && session.longitude !== null;
  const locale = getLocale();

  // Oturum, tarifenin okunduğu takvimin dışına taştı mı; fiyat SESSİZCE yeniden hesaplanmaz.
  const scheduleExpired = session.tariffSchedule != null && !appliesAt(session.tariffSchedule, new Date(now));

  const exit = phase === 'ending' ? computeExitSummary(session.tariff, session.startedAtMs, now) : null;
  const currency = session.tariff?.currency;

  return (
    <Animated.View layout={layoutSpring} style={{ paddingHorizontal: spacing.s20, paddingBottom: spacing.s20, gap: spacing.s16 }}>
      <View style={{ gap: spacing.s4 }}>
        <Overline>
          {[session.placeName, t('parkedAt', { time: formatClock(session.startedAtMs) }), session.floor]
            .filter(Boolean)
            .join(' · ')}
        </Overline>
        <ElapsedCounter startedAtMs={session.startedAtMs} />
      </View>

      {state.mode === 'tiered' && (
        <View style={{ gap: spacing.s12 }}>
          <TariffBar state={state} />
          <MoneyBox state={state} />
        </View>
      )}

      {state.mode === 'flat' && state.nowPrice !== null && state.currency !== null && (
        <Caption>{t('flatRate', { amount: formatMoney(state.nowPrice, state.currency, locale) })}</Caption>
      )}

      {/* Spot fotoğrafı + not: kapalı otoparkta arabayı bulmanın asıl aracı. Foto yerinde büyür. */}
      {(session.photoUri || session.note) && (
        <View style={{ flexDirection: 'row', gap: spacing.s12, alignItems: 'center' }}>
          {session.photoUri && (
            <PhotoThumb uri={session.photoUri}>
              <Image
                source={{ uri: session.photoUri }}
                style={{ width: 64, height: 64, borderRadius: radius.r16, backgroundColor: colors.inset }}
                contentFit="cover"
                accessibilityIgnoresInvertColors
              />
            </PhotoThumb>
          )}
          {!!session.note && (
            <Caption color={colors.ink} style={{ flexShrink: 1 }}>
              {session.note}
            </Caption>
          )}
        </View>
      )}

      {scheduleExpired && <StatusLine label={t('scheduleChanged')} />}
      {state.beyondSchedule && <StatusLine label={t('beyondSchedule')} />}
      {!online && <StatusLine label={t('offlineTimer')} />}
      {notificationState === 'denied' && session.tariff !== null && (
        <StatusLine label={t('notificationsOff')} onPress={openAppSettings} />
      )}
      {now - session.startedAtMs > 86_400_000 && <Caption>{t('stillParkedShort')}</Caption>}
      {!hasLocation && <StatusLine label={t('locationMissing')} onPress={() => startPickingLocation('park')} />}

      {/* Sayaç başladıktan sonra da düzeltilebilir: hairline satırlar (§4 editöryal liste). */}
      {phase !== 'ending' && (
        <View style={{ borderTopWidth: 1, borderTopColor: colors.gridline }}>
          <View style={{ borderBottomWidth: 1, borderBottomColor: colors.gridline }}>
            <DetailRow
              label={t('fixLocation')}
              value={session.placeName}
              placeholder={t('pickOnMap')}
              onPress={() => startPickingLocation('park')}
            />
          </View>
          <View style={{ borderBottomWidth: 1, borderBottomColor: colors.gridline }}>
            <DetailRow
              label={t('tariff')}
              value={session.tariff ? formatTariffSummary(session.tariff, locale) : null}
              placeholder={t('addTariff')}
              onPress={() => setTariffOpen(true)}
            />
          </View>
        </View>
      )}

      <PopupSheet visible={tariffOpen} title={t('tariff')} onClose={() => setTariffOpen(false)}>
        <TariffEditor onOpenPaywall={onOpenPaywall} onClose={() => setTariffOpen(false)} />
      </PopupSheet>

      {phase === 'ending' ? (
        // §7.8 bitirme: aynı sheet morph eder — "END SESSION." damgası (ink nokta) + para satırı.
        <Animated.View entering={FadeIn.duration(CROSSFADE_MS)} style={{ gap: spacing.s12 }}>
          <View style={{ gap: spacing.s4 }}>
            <DisplayStamp text={t('endSessionStamp')} dotColor={colors.ink} size="S" />
            {exit && exit.paid !== null && currency ? (
              <Caption>
                {`${t('paid')} ${formatMoney(exit.paid, currency, locale)}`}
                {exit.saved !== null && exit.saved > 0 ? ` · ${t('avoided')} ${formatMoney(exit.saved, currency, locale)}` : ''}
              </Caption>
            ) : (
              <Caption>{t('endQuestion')}</Caption>
            )}
          </View>
          <PrimaryCta
            label={
              exit && exit.saved !== null && exit.saved > 0 && currency
                ? t('endAndSave', { amount: formatMoney(exit.saved, currency, locale) })
                : t('endSession')
            }
            onPress={confirmEnd}
          />
          <GhostButton label={t('keep')} onPress={keep} />
        </Animated.View>
      ) : (
        <View style={{ gap: spacing.s8 }}>
          {/* Ekranın tek siyah CTA'sı: dönüş anı. Arabamı Bul bir sheet fazıdır (§7.6). */}
          <PrimaryCta label={t('findMyCar')} onPress={startFinding} />
          <View style={{ flexDirection: 'row', gap: spacing.s8 }}>
            <GhostButton
              label={t('shareLocation')}
              onPress={() => void shareParkedLocation(session, t('shareMessage'))}
              disabled={!hasLocation}
              style={{ flex: 1 }}
            />
            <GhostButton label={t('endSession')} onPress={requestEnd} style={{ flex: 1 }} />
          </View>
        </View>
      )}
    </Animated.View>
  );
}

function SummaryRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.gridline,
      }}
    >
      <Caption>{label}</Caption>
      <Text style={{ fontSize: 13, fontWeight: '800', color: valueColor ?? colors.ink, fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
    </View>
  );
}

/** §7.8 paylaşım kartının canlı minyatürü: gerçek render, 0.12 ölçek, `r-24`. */
const MINI_SCALE = 0.12;
function CardMiniature({ data }: { data: SavingsCardData }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: CARD_WIDTH * MINI_SCALE,
        height: CARD_HEIGHT * MINI_SCALE,
        borderRadius: radius.r24,
        borderCurve: 'continuous',
        overflow: 'hidden',
        alignSelf: 'center',
      }}
    >
      <View
        pointerEvents="none"
        style={{ width: CARD_WIDTH, height: CARD_HEIGHT, transformOrigin: 'top left', transform: [{ scale: MINI_SCALE }] }}
      >
        <SavingsCard data={data} />
      </View>
    </View>
  );
}

function endedStamp(session: ParkSession, locale: string): { text: string; green: boolean } {
  const exit = computeExitSummary(session.tariff, session.startedAtMs, session.endedAtMs ?? session.startedAtMs);
  if (exit.saved !== null && exit.saved > 0 && session.tariff) {
    const amount = formatMoney(exit.saved, session.tariff.currency, locale);
    return { text: t('savedStamp', { amount }).replace(/\.$/, ''), green: true };
  }
  // Varyant a/b: süre damgası — süre para değildir, nokta INK (§2)
  const duration = formatDurationStamp((session.endedAtMs ?? session.startedAtMs) - session.startedAtMs);
  return { text: t('parkedDurationStamp', { duration }).replace(/\.$/, ''), green: false };
}

/** §7.8 kutlama: kök seviyede Reanimated kapak (Modal değil), alttan spring + fade ile gelir. */
export function EndedSheet({ onOpenPaywall }: { onOpenPaywall: () => void }) {
  const { colors } = useTheme();
  const session = useSessionStore((s) => s.session);
  const isPremium = useIsPremium();
  const { undoEnd, finish } = useSessionStore.getState();
  const [shareData, setShareData] = useState<SavingsCardData | null>(null);
  const [rateOpen, setRateOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const locale = getLocale();
  const exit = session?.endedAtMs
    ? computeExitSummary(session.tariff, session.startedAtMs, session.endedAtMs)
    : { paid: null, saved: null };

  // design.md §7.8: paywall kutlamanın ÜSTÜNE açılmaz. Karar kapak açılırken bir kez verilir
  // (sayaç ilerler), uygulanması Done'a kalır. Yorum isteği yalnız paywall çıkmayacaksa ve
  // kutlama sekansı (≤1.8 s) bittikten sonra gelir; ikisi aynı anda gösterilmez.
  const celebrationPaywall = useRef<boolean | null>(null);
  useEffect(() => {
    if (!session?.endedAtMs || celebrationPaywall.current !== null) return;
    const saved = exit.saved !== null && exit.saved > 0;
    celebrationPaywall.current = saved && shouldShowCelebrationPaywall(isPremium);
    if (celebrationPaywall.current || !shouldAskForReview()) return;
    const id = setTimeout(() => setRateOpen(true), 2500);
    return () => clearTimeout(id);
  }, [session?.id, session?.endedAtMs, exit.saved, isPremium]);

  const done = () => {
    finish();
    if (celebrationPaywall.current) {
      trackPaywallShown('celebration');
      onOpenPaywall();
    }
  };

  if (!session || session.endedAtMs === null) return null;

  const stamp = endedStamp(session, locale);
  const currency = session.tariff?.currency;
  const green = stamp.green && exit.saved !== null && exit.saved > 0 && !!currency;

  const cardData: SavingsCardData = {
    placeName: session.placeName,
    durationMs: (session.endedAtMs ?? session.startedAtMs) - session.startedAtMs,
    paid: exit.paid,
    saved: exit.saved,
    currency: currency ?? null,
    tariffState: session.tariff
      ? computeTariffState(session.tariff, session.startedAtMs, session.endedAtMs ?? session.startedAtMs)
      : null,
  };

  const details = [session.floor, session.note].filter(Boolean);

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(SPRING.damping).stiffness(SPRING.stiffness).mass(SPRING.mass)}
      exiting={FadeOut.duration(CROSSFADE_MS)}
      style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]}
    >
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.s20,
          paddingTop: insets.top + spacing.s32,
          paddingBottom: insets.bottom + spacing.s20,
          gap: spacing.s24,
        }}
      >
        <View style={{ gap: spacing.s8 }}>
          <Overline>
            {[session.placeName, `${formatClock(session.startedAtMs)} → ${formatClock(session.endedAtMs)}`]
              .filter(Boolean)
              .join(' · ')}
          </Overline>
          {/* Varyant c: SAVED / ₺X. count-up + nokta en son (§7.8). Varyant a/b: süre damgası, ink nokta. */}
          {green && exit.saved !== null && currency ? (
            <CelebrationHero amount={exit.saved} currency={currency} />
          ) : (
            <DisplayStamp text={stamp.text} dotColor={colors.ink} />
          )}
        </View>

        {(session.photoUri || details.length > 0) && (
          <View style={{ gap: spacing.s12 }}>
            {session.photoUri && (
              <PhotoThumb uri={session.photoUri}>
                <Image
                  source={{ uri: session.photoUri }}
                  style={{ width: '100%', height: 200, borderRadius: radius.r16, backgroundColor: colors.inset }}
                  contentFit="cover"
                  accessibilityIgnoresInvertColors
                />
              </PhotoThumb>
            )}
            {details.map((line) => (
              <Caption key={line} color={colors.ink}>
                {line}
              </Caption>
            ))}
          </View>
        )}

        <View>
          <SummaryRow label={t('duration')} value={formatDurationStamp(session.endedAtMs - session.startedAtMs).toLowerCase()} />
          {exit.paid !== null && currency && <SummaryRow label={t('paid')} value={formatMoney(exit.paid, currency, locale)} />}
          {exit.saved !== null && exit.saved > 0 && currency && (
            <SummaryRow label={t('avoided')} value={`−${formatMoney(exit.saved, currency, locale)}`} valueColor={colors.accentText} />
          )}
        </View>

        {/* Paylaşım kartı yalnız tasarruf varken: canlı minyatür + siyah "Share Card" (§7.8). */}
        {green && (
          <Animated.View entering={FadeIn.delay(1200).duration(CROSSFADE_MS)}>
            <CardMiniature data={cardData} />
          </Animated.View>
        )}

        <View style={{ gap: spacing.s8 }}>
          {green ? (
            <PrimaryCta
              label={t('shareCard')}
              onPress={() => {
                trackShareCard('session');
                setShareData(cardData);
              }}
            />
          ) : (
            <PrimaryCta label={t('done')} onPress={done} />
          )}
          {green && <GhostButton label={t('done')} onPress={done} />}
          <TextButton label={t('undo')} onPress={undoEnd} />
        </View>

        <ShareCardRenderer data={shareData} onDone={() => setShareData(null)} />
      </ScrollView>

      {/* İki adımlı yorum isteği: sistem penceresine yalnız memnun olanlar gider. */}
      <RatePrompt
        visible={rateOpen}
        onClose={() => setRateOpen(false)}
        onFeedback={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=ParkIQ`)}
      />
    </Animated.View>
  );
}
