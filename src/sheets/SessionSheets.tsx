import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GhostButton, PrimaryCta } from '../components/Buttons';
import { ChipGroup } from '../components/ChipGroup';
import { MoneyBox } from '../components/MoneyBox';
import { PhotoField } from '../components/PhotoField';
import { RatePrompt } from '../components/RatePrompt';
import { DetailRow, PopupSheet } from '../components/PopupSheet';
import { SearchBar } from '../components/SearchBar';
import type { SavingsCardData } from '../components/SavingsCard';
import { ShareCardRenderer } from '../components/ShareCardRenderer';
import {
  trackFindMyCar,
  trackPaywallShown,
  trackShareCard,
} from '../lib/analytics';
import { shouldAskForReview, shouldShowCelebrationPaywall } from '../lib/review';
import { useIsPremium } from '../state/premiumStore';
import { openAppSettings, StatusLine } from '../components/StatusLine';
import { TariffBar } from '../components/TariffBar';
import { TariffForm } from '../components/TariffForm';
import { Caption, DisplayStamp, Overline } from '../components/Typography';
import { formatClock, formatDurationStamp, formatElapsed, formatMoney, formatTariffSummary } from '../lib/format';
import { formatDistance } from '../lib/geo';
import { captureCurrentPlace } from '../lib/location';
import { refreshSessionActivity } from '../lib/liveActivity';
import { openCoordsInMaps } from '../lib/maps';
import { applyFilter, walkMinutes, type PoiFilter } from '../lib/parkingPoi';
import { useDiscoveryStore } from '../state/discoveryStore';
import { useNetworkStore } from '../state/networkStore';
import { shareParkedLocation } from '../lib/share';
import { FindMyCar } from '../screens/FindMyCar';
import { computeExitSummary, computeTariffState } from '../lib/tariffMath';
import { appliesAt } from '../lib/tariffSchedule';
import { getLocale, t, upper } from '../localization';
import { useSessionStore, type ParkSession } from '../state/sessionStore';
import { useSettingsStore } from '../state/settingsStore';
import { useTheme } from '../theme';
import { radius, spacing, typeScale } from '../theme/tokens';

// design.md §7 — durum-güdümlü sheet içerikleri. Her ekranda tek siyah CTA (İlke 4).

/** Olumsuz yorum yanıtı mağazaya değil bize gider. */
const SUPPORT_EMAIL = 'info@twiceapps.co';

const inputStyle = (bg: string, ink: string) => ({
  height: 44,
  borderRadius: radius.r12,
  backgroundColor: bg,
  paddingHorizontal: spacing.s12,
  fontSize: 15,
  color: ink,
});

/** §7.2 idle sheet: filtre çipleri + en yakın otopark kartı + "I Parked". */
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
  // Anlık koordinatı harita zaten biliyor; burada tekrar konum çekmiyoruz.
  const locateMe = () => requestFollow();

  return (
    <View style={{ paddingHorizontal: spacing.s20, paddingBottom: spacing.s20, gap: spacing.s16 }}>
      {/* Hedefi ara → ORANIN çevresindeki otoparklar (evden çıkmadan planlama).
          Arama sabit bir noktaya pinler; takip kesilir. */}
      <SearchBar onPick={(result) => pinTo(result.coords)} onLocate={locateMe} />

      {/* CTA doğrudan aramanın altında: kompakt kademede görünen tek şey bu ikisi.
          Filtreler ve liste aşağıda kalır, panel yukarı çekilince ortaya çıkar. */}
      <PrimaryCta label={t('iParked')} onPress={park} />

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

      {/* Sorgu çöktüyse bunu SÖYLE. Aksi halde ekran "burada otopark yok" gibi
          okunuyor ve kullanıcı yanlış bir şehir bilgisiyle uzaklaşıyor. */}
      {discoveryState === 'error' && <StatusLine label={t('poiError')} />}

      {/* Filtre sonuç vermeyince sessiz boşluk kalıyordu — "Kapalı" özellikle
          seyrek, çünkü OSM çoğu otoparkı kapalı/açık diye etiketlemiyor. */}
      {discoveryState === 'ready' && pois.length > 0 && visible.length === 0 && (
        <Caption>{t('noNearbyForFilter')}</Caption>
      )}

      {/* §7.2 pin detay kartı: ad, mesafe/yürüme, tarife hafızası varsa özet, Directions */}
      {visible.slice(0, 3).map((poi) => {
        const remembered = rememberedTariffFor(poi);
        return (
          <View key={poi.id} style={{ gap: spacing.s4 }}>
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
                {/* Adsız POI'de filtre etiketi ("Tümü") basılıyordu — türün adı doğrusu */}
                {upper(poi.name ?? t(poi.kind === 'charging' ? 'poiCharging' : 'poiParking'))}
              </Text>
              <Pressable accessibilityRole="button" onPress={() => openCoordsInMaps(poi, poi.name, { directions: true })} hitSlop={8}>
                <Caption color={colors.ink} style={{ fontWeight: '600' }}>
                  {t('directions')}
                </Caption>
              </Pressable>
            </View>
            {remembered && (
              <Caption color={colors.accentText}>{formatTariffSummary(remembered, locale)}</Caption>
            )}
          </View>
        );
      })}
    </View>
  );
}

/** Park formunda popup'ı açık olan alan. */
type ParkField = 'location' | 'floor' | 'note' | 'photo' | 'backdate' | 'reminder' | 'tariff';

export function ParkingSheet({ onOpenPaywall }: { onOpenPaywall: () => void }) {
  const { colors } = useTheme();
  const session = useSessionStore((s) => s.session);
  const locationState = useSessionStore((s) => s.locationState);
  const suggestedTariff = useSessionStore((s) => s.suggestedTariff);
  const externalTariffVersion = useSessionStore((s) => s.externalTariffVersion);
  const cameraState = useSessionStore((s) => s.cameraState);
  const ocrState = useSessionStore((s) => s.ocrState);
  const ocrSchedule = useSessionStore((s) => s.ocrSchedule);
  const ocrPartial = useSessionStore((s) => s.ocrPartial);
  const autoDetected = useSessionStore((s) => s.autoDetected);
  const dismissAutoPark = useSessionStore((s) => s.dismissAutoPark);
  const {
    setFloor,
    setNote,
    setTariff,
    acceptSuggestedTariff,
    confirmDetails,
    setBackdateMinutes,
    setReminderMinutes,
    capturePhoto,
    removePhoto,
    scanTariff,
    setParkLocation,
    useMyLocationForPark,
  } = useSessionStore.getState();
  const cancelPark = useSessionStore((s) => s.cancelPark);
  const [customReminder, setCustomReminder] = useState(false);
  const [openField, setOpenField] = useState<ParkField | null>(null);
  const closeField = () => setOpenField(null);

  // Pin bırakılırken bu panel tamamen unmount olur (harita tek başına kalır),
  // yani `openField` kaybolur. Dönüşte popup'ı geri açan işaret store'da durur.
  const reopenAfterPick = useSessionStore((s) => s.reopenAfterPick);
  useEffect(() => {
    if (reopenAfterPick !== 'park') return;
    useSessionStore.getState().clearReopenAfterPick();
    setOpenField('location');
  }, [reopenAfterPick]);

  const pickOnMap = () => {
    // Seçim arabanın bilinen yerinden başlar; kullanıcı oradan düzeltir.
    const current = useSessionStore.getState().session;
    if (current?.latitude != null && current.longitude != null) {
      useDiscoveryStore.getState().pinTo({ latitude: current.latitude, longitude: current.longitude });
    }
    useSessionStore.getState().startPickingLocation('park');
  };

  if (!session) return null;

  // Chip seçimleri oturumdan türer — ayrı state tutulmaz (tek kaynak).
  const backdateMinutes = Math.round((session.recordedAtMs - session.startedAtMs) / 60_000);
  const reminderMinutes =
    session.reminderAtMs === null ? 0 : Math.round((session.reminderAtMs - session.startedAtMs) / 60_000);

  // Yer adı burada META'dır, display değil: nokta hakkı duygu damgasınındır (§3.3 tie-breaker).
  const overline = [
    session.placeName ?? (locationState === 'capturing' ? t('locating') : null),
    t('parkedAt', { time: formatClock(session.startedAtMs) }),
    t('detailsOptional'),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={{ paddingHorizontal: spacing.s20, paddingBottom: spacing.s20, gap: spacing.s16 }}>
      {/* Geri: kayıt silinir, keşfe dönülür. Paneli aşağı çekmek de aynı yolu izler. */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.s12 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('back')}
          onPress={cancelPark}
          hitSlop={8}
          style={({ pressed }) => ({
            width: 32,
            height: 32,
            borderRadius: radius.r12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? colors.insetPressed : colors.inset,
          })}
        >
          <SymbolView name="chevron.left" size={14} tintColor={colors.ink} weight="semibold" />
        </Pressable>
        <View style={{ flex: 1, gap: spacing.s4 }}>
          <Overline>{overline}</Overline>
          {/* PARKED. — §3.3 yeşil nokta whitelist'i: park onayı damgası */}
          <DisplayStamp text={t('parkedStamp').replace(/\.$/, '')} dotColor={colors.accentText} />
        </View>
      </View>

      {locationState === 'denied' && <StatusLine label={t('locationOff')} onPress={openAppSettings} />}

      {/* §7.3 zayıf GPS = kapalı otopark sinyali → kat/foto burada işe yarar */}
      {locationState === 'weak' && <StatusLine label={t('weakGpsNudge')} />}

      {/* §7.4b yanlış algı: oto-algılama tetiklediyse geri alma yolu açık kalır */}
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

      {/* Her alan kendi popup'ında. Hepsi tek panele yığılınca ekrana sığmıyor,
          CTA erişilemez kalıyordu; satırlar aynı zamanda ne doldurulduğunu özetler. */}
      <View style={{ gap: spacing.s8 }}>
        {/* Sayaç başlatılırken kullanıcı arabadan uzaklaşmış olabilir; konum
            varsayılan olarak o anki yerdir ama başlatmadan önce düzeltilebilir. */}
        <DetailRow
          label={t('parkLocation')}
          value={session.placeName}
          placeholder={locationState === 'capturing' ? t('locating') : t('useMyLocation')}
          onPress={() => setOpenField('location')}
        />
        <DetailRow
          label={t('floor')}
          value={session.floor}
          placeholder={t('floorPlaceholder')}
          onPress={() => setOpenField('floor')}
        />
        <DetailRow
          label={t('note')}
          value={session.note}
          placeholder={t('notePlaceholder')}
          onPress={() => setOpenField('note')}
        />
        <DetailRow
          label={t('photo')}
          value={session.photoUri ? t('photoAdded') : null}
          placeholder={t('addPhoto')}
          onPress={() => setOpenField('photo')}
        />
        <DetailRow
          label={t('parkedWhen')}
          value={backdateMinutes === 0 ? t('justNow') : t('minutesAgo', { minutes: backdateMinutes })}
          placeholder={t('justNow')}
          onPress={() => setOpenField('backdate')}
        />
        <DetailRow
          label={t('remindMe')}
          value={reminderMinutes === 0 ? null : t('minutesShort', { minutes: reminderMinutes })}
          placeholder={t('reminderOff')}
          onPress={() => setOpenField('reminder')}
        />
        <DetailRow
          label={t('tariff')}
          value={session.tariff ? formatTariffSummary(session.tariff, getLocale()) : null}
          placeholder={t('tariffNone')}
          onPress={() => setOpenField('tariff')}
        />
      </View>

      <PrimaryCta label={t('done')} onPress={confirmDetails} style={{ marginTop: spacing.s4 }} />

      {/* Konum hiç alınamadıysa sessiz kalma: kullanıcı Done'a basıp gidiyor ve
          dönüşte elimizde koordinat olmuyor. */}
      {(locationState === 'unavailable' || locationState === 'denied') && (
        <StatusLine
          label={t('locationMissing')}
          onPress={pickOnMap}
        />
      )}

      <PopupSheet visible={openField === 'location'} title={t('parkLocation')} onClose={closeField}>
        <SearchBar
          onPick={(result) => {
            setParkLocation({ ...result.coords, placeName: result.label });
            closeField();
          }}
          // Adres aramanın yetmediği yerler için: otoparkın içi, sokak arası.
          trailingSymbol="mappin.and.ellipse"
          trailingLabel={t('pickOnMap')}
          onLocate={pickOnMap}
        />
        <GhostButton
          label={t('useMyLocation')}
          onPress={() => {
            useMyLocationForPark();
            closeField();
          }}
        />
        <GhostButton label={t('pickOnMap')} onPress={pickOnMap} />
      </PopupSheet>

      <PopupSheet visible={openField === 'floor'} title={t('floor')} onClose={closeField}>
        <BottomSheetTextInput
          defaultValue={session.floor}
          onChangeText={setFloor}
          placeholder={t('floorPlaceholder')}
          placeholderTextColor={colors.textSecondary}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={closeField}
          style={inputStyle(colors.inset, colors.ink)}
        />
      </PopupSheet>

      <PopupSheet visible={openField === 'note'} title={t('note')} onClose={closeField}>
        <BottomSheetTextInput
          defaultValue={session.note}
          onChangeText={setNote}
          placeholder={t('notePlaceholder')}
          placeholderTextColor={colors.textSecondary}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={closeField}
          style={inputStyle(colors.inset, colors.ink)}
        />
      </PopupSheet>

      <PopupSheet visible={openField === 'photo'} title={t('photo')} onClose={closeField}>
        <PhotoField uri={session.photoUri} onCapture={capturePhoto} onRemove={removePhoto} />
        {cameraState === 'denied' && <StatusLine label={t('cameraOff')} onPress={openAppSettings} />}
      </PopupSheet>

      <PopupSheet visible={openField === 'backdate'} title={t('parkedWhen')} onClose={closeField}>
        <ChipGroup<number>
          options={[
            { key: 0, label: t('justNow') },
            ...[5, 10, 15, 30].map((m) => ({ key: m, label: t('minutesAgo', { minutes: m }) })),
          ]}
          value={backdateMinutes}
          onChange={setBackdateMinutes}
        />
      </PopupSheet>

      <PopupSheet visible={openField === 'reminder'} title={t('remindMe')} onClose={closeField}>
        <ChipGroup<number>
          options={[
            { key: 0, label: t('reminderOff') },
            { key: 30, label: t('minutesShort', { minutes: 30 }) },
            ...[1, 2, 3].map((h) => ({ key: h * 60, label: t('hoursShort', { hours: h }) })),
            { key: -1, label: t('custom') },
          ]}
          value={customReminder ? -1 : reminderMinutes}
          onChange={(minutes) => {
            if (minutes === -1) {
              setCustomReminder(true);
              return;
            }
            setCustomReminder(false);
            setReminderMinutes(minutes);
          }}
        />
        {customReminder && (
          <BottomSheetTextInput
            defaultValue={reminderMinutes > 0 ? String(reminderMinutes) : ''}
            onChangeText={(text) => {
              const parsed = Number(text.replace(',', '.'));
              if (Number.isFinite(parsed) && parsed > 0) setReminderMinutes(Math.round(parsed));
            }}
            keyboardType="number-pad"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={closeField}
            placeholder={t('customMinutes')}
            placeholderTextColor={colors.textSecondary}
            style={{ ...inputStyle(colors.inset, colors.ink), fontVariant: ['tabular-nums'] }}
          />
        )}
      </PopupSheet>

      <PopupSheet visible={openField === 'tariff'} title={t('tariff')} onClose={closeField}>
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
          {ocrState === 'scanning' ? (
            <ActivityIndicator size="small" color={colors.textSecondary} />
          ) : (
            <SymbolView name="camera.viewfinder" size={17} tintColor={colors.ink} weight="regular" />
          )}
          <Text style={{ fontSize: 15, color: colors.ink }}>
            {ocrState === 'scanning' ? t('scanning') : t('scanBoard')}
          </Text>
        </Pressable>

        {/* Pano birden fazla tarife taşıyorsa hangisinin alındığı söylenir —
            oturum sınırı geçerse kullanıcı elle değiştirebilsin. */}
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
        {/* Yarım okuma sessizce doğru sanılmasın: dilimler geldi ama bazı
            satırlar okunamadıysa kullanıcıdan kontrol istenir. */}
        {ocrPartial && <Caption color={colors.warnText}>{t('scanPartial')}</Caption>}
        {ocrState === 'not_detected' && <Caption color={colors.warnText}>{t('scanNotDetected')}</Caption>}
        {ocrState === 'failed' && <Caption color={colors.warnText}>{t('scanFailed')}</Caption>}
        {ocrState === 'unavailable' && <Caption>{t('scanUnavailable')}</Caption>}
        {ocrState === 'locked' && (
          <Pressable accessibilityRole="button" onPress={onOpenPaywall} hitSlop={8}>
            <Caption color={colors.accentText}>{t('scanPro')}</Caption>
          </Pressable>
        )}
      </PopupSheet>
    </View>
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

export function ActiveSheet({ onOpenPaywall }: { onOpenPaywall: () => void }) {
  const { colors } = useTheme();
  const session = useSessionStore((s) => s.session);
  const phase = useSessionStore((s) => s.phase);
  const notificationState = useSessionStore((s) => s.notificationState);
  const { requestEnd, keep, confirmEnd } = useSessionStore.getState();
  const online = useNetworkStore((s) => s.online);
  const isPremium = useIsPremium();
  const warnThresholdMin = useSettingsStore((s) => s.warnThresholdMin);
  const [findOpen, setFindOpen] = useState(false);
  const [tariffOpen, setTariffOpen] = useState(false);
  const { startPickingLocation, setTariff, scanTariff } = useSessionStore.getState();
  const externalTariffVersion = useSessionStore((s) => s.externalTariffVersion);
  const ocrState = useSessionStore((s) => s.ocrState);
  const now = useNow(1000);
  if (!session) return null;

  // Amber eşiği kullanıcı ayarından; çubuk, para kutusu ve bildirim aynı değeri kullanır.
  const state = computeTariffState(session.tariff, session.startedAtMs, now, warnThresholdMin);
  const hasLocation = session.latitude !== null && session.longitude !== null;

  // Oturum, tarifenin okunduğu takvimin dışına taştı mı (cuma 23:00'te park
  // edip cumartesiye sarkmak gibi). Fiyat SESSİZCE yeniden hesaplanmaz:
  // şimdiye kadar biriken tutarı geriye dönük değiştirmek yanlış olurdu.
  // Doğru olan, artık geçerli olmadığını söylemek.
  const scheduleExpired =
    session.tariffSchedule != null && !appliesAt(session.tariffSchedule, new Date(now));

  // Live Activity dakikada bir tazelenir: sayaç sistemde akar, çubuk/amber burada güncellenir.
  // §4.10: premium kontrolü YOK — Live Activity işletim sistemi yeteneğidir, satılmaz.
  useEffect(() => {
    const id = setInterval(() => refreshSessionActivity(session, warnThresholdMin), 60_000);
    return () => clearInterval(id);
  }, [session, warnThresholdMin]);
  const elapsed = formatElapsed(now - session.startedAtMs);
  const locale = getLocale();

  return (
    <View style={{ paddingHorizontal: spacing.s20, paddingBottom: spacing.s20, gap: spacing.s16 }}>
      <View style={{ gap: spacing.s4 }}>
        <Overline>
          {[session.placeName, t('parkedAt', { time: formatClock(session.startedAtMs) }), session.floor]
            .filter(Boolean)
            .join(' · ')}
        </Overline>
        <Text
          style={{
            fontSize: typeScale.displayXL.fontSize,
            fontWeight: typeScale.displayXL.fontWeight,
            letterSpacing: typeScale.displayXL.letterSpacing,
            color: colors.ink,
            fontVariant: ['tabular-nums'],
          }}
          maxFontSizeMultiplier={1.3}
        >
          {elapsed.main}
          <Text style={{ fontSize: 24, color: colors.textSecondary }}>{elapsed.seconds}</Text>
        </Text>
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

      {/* Spot fotoğrafı + not: kapalı otoparkta arabayı bulmanın asıl aracı */}
      {(session.photoUri || session.note) && (
        <View style={{ flexDirection: 'row', gap: spacing.s12, alignItems: 'center' }}>
          {session.photoUri && (
            <Image
              source={{ uri: session.photoUri }}
              style={{ width: 64, height: 64, borderRadius: radius.r16, backgroundColor: colors.inset }}
              accessibilityIgnoresInvertColors
            />
          )}
          {!!session.note && (
            <Caption color={colors.ink} style={{ flexShrink: 1 }}>
              {session.note}
            </Caption>
          )}
        </View>
      )}

      {/* §5.11: çevrimdışıyken sayaç durmaz — satırın işi bunu söylemek */}
      {/* Tarifenin okunduğu takvim geçti: fiyat artık bu panoyu anlatmıyor. */}
      {scheduleExpired && <StatusLine label={t('scheduleChanged')} />}

      {/* Tarifenin anlattığı süre bitti ve günlük tavan bilinmiyor: gösterilen
          rakam artık donuk. Sessiz kalmak, ödeyeceğinden azını göstermek olurdu. */}
      {state.beyondSchedule && <StatusLine label={t('beyondSchedule')} />}

      {!online && <StatusLine label={t('offlineTimer')} />}

      {/* Tarife var ama bildirim izni yok → uyarı ulaşamaz; §5.11 kalıbı */}
      {notificationState === 'denied' && session.tariff !== null && (
        <StatusLine label={t('notificationsOff')} onPress={openAppSettings} />
      )}

      {now - session.startedAtMs > 86_400_000 && <Caption>{t('stillParkedShort')}</Caption>}

      {/* Konum hiç alınamadıysa bunu SÖYLE: kullanıcı PARKED. damgasını görüp
          işin bittiğini sanıyor, dönüşte elimizde koordinat olmuyor. */}
      {!hasLocation && (
        <StatusLine label={t('locationMissing')} onPress={() => startPickingLocation('park')} />
      )}

      {/* Sayaç başladıktan sonra da düzeltilebilir/eklenebilir: yanlış pin çoğu
          zaman saatler sonra, tarife ise otoparka girince fark ediliyor. */}
      <View style={{ gap: spacing.s4 }}>
        <DetailRow
          label={t('fixLocation')}
          value={session.placeName}
          placeholder={t('pickOnMap')}
          onPress={() => startPickingLocation('park')}
        />
        <DetailRow
          label={t('tariff')}
          value={session.tariff ? formatTariffSummary(session.tariff, locale) : null}
          placeholder={t('addTariff')}
          onPress={() => setTariffOpen(true)}
        />
      </View>

      {/* Tarife oturum başladıktan sonra da girilebilir/düzeltilebilir. Gerçek
          sıra "arabayı bırak → yürürken panoyu gör"; bu kapı olmadan hızlı
          Done'a basan her oturum kalıcı olarak tarifesiz kalıyordu. */}
      <PopupSheet visible={tariffOpen} title={t('tariff')} onClose={() => setTariffOpen(false)}>
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
          {ocrState === 'scanning' ? (
            <ActivityIndicator size="small" color={colors.textSecondary} />
          ) : (
            <SymbolView name="camera.viewfinder" size={17} tintColor={colors.ink} weight="regular" />
          )}
          <Text style={{ fontSize: 15, color: colors.ink }}>
            {ocrState === 'scanning' ? t('scanning') : t('scanBoard')}
          </Text>
        </Pressable>
        {ocrState === 'locked' && (
          <StatusLine
            label={t('scanPro')}
            onPress={() => {
              setTariffOpen(false);
              trackPaywallShown('feature');
              onOpenPaywall();
            }}
          />
        )}
        {ocrState === 'not_detected' && <StatusLine label={t('scanNotDetected')} />}
        {ocrState === 'failed' && <StatusLine label={t('scanFailed')} />}
      </PopupSheet>

      <FindMyCar
        visible={findOpen}
        session={session}
        isPremium={isPremium}
        onOpenPaywall={() => {
          setFindOpen(false);
          trackPaywallShown('feature');
          onOpenPaywall();
        }}
        onClose={() => setFindOpen(false)}
        onFound={() => {
          // Arabayı buldun: arama biter ve sayaç durdurulsun mu diye sorulur.
          // requestEnd geri alınabilir bir onay adımıdır (Bitir / Devam).
          setFindOpen(false);
          requestEnd();
        }}
      />

      {phase === 'ending' ? (
        <View style={{ gap: spacing.s8 }}>
          <Caption color={colors.ink}>{t('endQuestion')}</Caption>
          <PrimaryCta label={t('endSession')} onPress={confirmEnd} />
          <GhostButton label={t('keep')} onPress={keep} />
        </View>
      ) : (
        <View style={{ gap: spacing.s8 }}>
          {/* Ekranın tek siyah CTA'sı: dönüş anının aksiyonu (İlke 4).
              Pusulalı dönüş premium; free'de araba haritada pin olarak durmaya
              devam eder, CTA paywall'a köprüdür. */}
          {/* Dönüş anının aksiyonu herkese açıktır: ücretsiz kullanıcı yerini,
              fotoğrafını ve notunu görür. Satılan şey pusula ve AR. */}
          <PrimaryCta
            label={t('findMyCar')}
            onPress={() => {
              trackFindMyCar(hasLocation ? 'compass' : 'indoor');
              setFindOpen(true);
            }}
          />
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
    </View>
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
      <Text
        style={{
          fontSize: 13,
          fontWeight: '800',
          color: valueColor ?? colors.ink,
          fontVariant: ['tabular-nums'],
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function endedStamp(session: ParkSession, locale: string): { text: string; green: boolean } {
  const exit = computeExitSummary(session.tariff, session.startedAtMs, session.endedAtMs ?? session.startedAtMs);
  if (exit.saved !== null && exit.saved > 0 && session.tariff) {
    // SAVED ₺X. — §3.3 yeşil nokta whitelist'i (kutlama varyant c)
    const amount = formatMoney(exit.saved, session.tariff.currency, locale);
    return { text: t('savedStamp', { amount }).replace(/\.$/, ''), green: true };
  }
  // Varyant a/b: süre damgası — süre para değildir, nokta INK (§3.3)
  const duration = formatDurationStamp((session.endedAtMs ?? session.startedAtMs) - session.startedAtMs);
  return { text: t('parkedDurationStamp', { duration }).replace(/\.$/, ''), green: false };
}

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

  // §7.7 + §11: tasarruf anı hem yorum isteğinin hem paywall'ın tetiğidir —
  // kullanıcı ürünün değerini tam o an görüyor. İkisi AYNI ANDA gösterilmez;
  // paywall çıkarsa yorum isteği bir sonraki tasarruf anına kalır.
  useEffect(() => {
    if (!session?.endedAtMs) return;
    // Paywall yalnız PARA görülen anda açılır — tasarruf yoksa satacak kanıt da yok.
    if (exit.saved !== null && exit.saved > 0 && shouldShowCelebrationPaywall(isPremium)) {
      trackPaywallShown('celebration');
      onOpenPaywall();
      return;
    }
    // Yorum isteği her park bitişinde değerlendirilir: arabasını yeni buldu.
    if (shouldAskForReview()) setRateOpen(true);
  }, [session?.id, session?.endedAtMs, exit.saved, isPremium, onOpenPaywall]);

  if (!session || session.endedAtMs === null) return null;

  const stamp = endedStamp(session, locale);
  const currency = session.tariff?.currency;

  const buildCardData = (): SavingsCardData => ({
    placeName: session.placeName,
    durationMs: (session.endedAtMs ?? session.startedAtMs) - session.startedAtMs,
    paid: exit.paid,
    saved: exit.saved,
    currency: currency ?? null,
    tariffState: session.tariff
      ? computeTariffState(session.tariff, session.startedAtMs, session.endedAtMs ?? session.startedAtMs)
      : null,
  });

  const details = [session.floor, session.note].filter(Boolean);

  // §7.7 kapanış tam ekrandır: oturumun bittiği an panelin içinde bir satır
  // değil, kendi sayfası. Rakam, park detayları ve paylaşım aynı yerde durur.
  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={finish}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: spacing.s20,
            paddingTop: insets.top + spacing.s32,
            paddingBottom: insets.bottom + spacing.s20,
            gap: spacing.s24,
          }}
        >
      <View style={{ gap: spacing.s4 }}>
        <Overline>
          {[session.placeName, `${formatClock(session.startedAtMs)} → ${formatClock(session.endedAtMs)}`]
            .filter(Boolean)
            .join(' · ')}
        </Overline>
        <DisplayStamp text={stamp.text} dotColor={stamp.green ? colors.accentText : colors.ink} />
      </View>

      {/* Park detayları: kullanıcının o oturumda biriktirdiği her şey burada. */}
      {(session.photoUri || details.length > 0) && (
        <View style={{ gap: spacing.s12 }}>
          {session.photoUri && (
            <Image
              source={{ uri: session.photoUri }}
              style={{ width: '100%', height: 200, borderRadius: radius.r16, backgroundColor: colors.inset }}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
          )}
          {details.map((line) => (
            <Caption key={line} color={colors.ink}>
              {line}
            </Caption>
          ))}
        </View>
      )}

      <View>
        <SummaryRow
          label={t('duration')}
          value={formatDurationStamp(session.endedAtMs - session.startedAtMs).toLowerCase()}
        />
        {exit.paid !== null && currency && (
          <SummaryRow label={t('paid')} value={formatMoney(exit.paid, currency, locale)} />
        )}
        {exit.saved !== null && exit.saved > 0 && currency && (
          <SummaryRow
            label={t('avoided')}
            value={`−${formatMoney(exit.saved, currency, locale)}`}
            valueColor={colors.accentText}
          />
        )}
      </View>

      <View style={{ gap: spacing.s8 }}>
        {/* Paylaşım kartı yalnız tasarruf varken anlamlı (§11.1) */}
        <PrimaryCta
          label={t('shareCard')}
          onPress={() => {
            trackShareCard('session');
            setShareData(buildCardData());
          }}
        />
        <GhostButton label={t('done')} onPress={finish} />
        <GhostButton label={t('undo')} onPress={undoEnd} />
      </View>

      <ShareCardRenderer data={shareData} onDone={() => setShareData(null)} />
        </ScrollView>

        {/* İki adımlı yorum isteği: sistem penceresine yalnız memnun olanlar gider. */}
        <RatePrompt
          visible={rateOpen}
          onClose={() => setRateOpen(false)}
          onFeedback={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=ParkIQ`)}
        />
      </View>
    </Modal>
  );
}
