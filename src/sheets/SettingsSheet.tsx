import type { ReactNode } from 'react';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, Switch, Text, TextInput, View } from 'react-native';
import { useIsPremium, usePremiumStore } from '../state/premiumStore';
import { ChipGroup } from '../components/ChipGroup';
import { PageSheet, Section } from '../components/PageSheet';
import { SelectRow } from '../components/SelectRow';
import { openAppSettings, StatusLine } from '../components/StatusLine';
import { Caption } from '../components/Typography';
import { t } from '../localization';
import type { Locale } from '../localization';
import { useSessionStore } from '../state/sessionStore';
import {
  CURRENCIES,
  useSettingsStore,
  WARN_THRESHOLDS,
  type Currency,
  type ThemeMode,
} from '../state/settingsStore';
import { trackPaywallShown } from '../lib/analytics';
import { deleteSpotPhoto } from '../lib/photo';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/tokens';

// screens.md §10 / design.md §7.9. Premium satırları (oto-algılama,
// abonelik) RevenueCat tuğlasıyla gelecek — burada henüz yok.

const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
const PRIVACY_URL = 'https://www.twiceapps.co/privacy';
const SUPPORT_EMAIL = 'info@twiceapps.co';
/** Doğrudan yorum yazma sayfası — sistem penceresi kotaya takılabilir. */
const REVIEW_URL = 'https://apps.apple.com/app/id6756688254?action=write-review';

/** Bölüm içi alt alan: küçük etiket + kontrol. Başlık gürültüsü yaratmaz. */
function Field({ label, children }: { label: string; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: spacing.s8, marginBottom: spacing.s16 }}>
      <Text style={{ fontSize: 13, color: colors.textSecondary }}>{label}</Text>
      {children}
    </View>
  );
}

/** iOS abonelik yönetimi sistem sayfası — iptal/değiştirme oradan yapılır. */
function openSubscriptionSettings(): void {
  void Linking.openURL('itms-apps://apps.apple.com/account/subscriptions');
}

/** Cihaz-yerel veriyi JSON olarak paylaşır; sunucuya hiçbir şey gitmez. */
function exportData(): void {
  void (async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const repo = require('../db/sessionRepo') as typeof import('../db/sessionRepo');
      const payload = JSON.stringify({ sessions: repo.listEndedSessions() }, null, 2);
      const file = new File(Paths.document, 'parkiq-export.json');
      if (file.exists) file.delete();
      file.create();
      file.write(payload);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json' });
      }
    } catch {
      // Dışa aktarma başarısızsa sessizce geç.
    }
  })();
}

function LinkRow({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={4}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 44 }}>
        <Text style={{ fontSize: 15, color: colors.ink }}>{label}</Text>
        <SymbolView name="chevron.right" size={13} tintColor={colors.disabled} weight="semibold" />
      </View>
    </Pressable>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 32 }}>
      <Text style={{ fontSize: 15, color: colors.ink }}>{label}</Text>
      <Text style={{ fontSize: 15, color: colors.textSecondary, fontVariant: ['tabular-nums'] }}>{value}</Text>
    </View>
  );
}


/**
 * İzinlerin GERÇEK durumu.
 *
 * Panel eskiden oturum store'undaki `locationState`/`notificationState`e
 * bakıyordu; ikisi de 'idle' başlıyor ve hiç izin istenmemişken "açık" diye
 * okunuyordu. Sıkışan kullanıcının sorununu teşhis etmek için baktığı tek yer
 * ona tam tersini söylüyor ve iOS Ayarlar'a giden köprüyü gizliyordu.
 */
function usePermissions(visible: boolean): { location: boolean | null; notifications: boolean | null } {
  const [location, setLocation] = useState<boolean | null>(null);
  const [notifications, setNotifications] = useState<boolean | null>(null);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    void Location.getForegroundPermissionsAsync()
      .then((p) => {
        if (!cancelled) setLocation(p.status === Location.PermissionStatus.GRANTED);
      })
      .catch(() => {
        if (!cancelled) setLocation(null);
      });
    void Notifications.getPermissionsAsync()
      .then((p) => {
        if (!cancelled) setNotifications(p.granted);
      })
      .catch(() => {
        if (!cancelled) setNotifications(null);
      });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  return { location, notifications };
}

export function SettingsSheet({
  visible,
  onClose,
  onOpenPaywall,
}: {
  visible: boolean;
  onClose: () => void;
  onOpenPaywall: () => void;
}) {
  const { colors } = useTheme();
  const isPremium = useIsPremium();
  const devUnlock = usePremiumStore((s) => s.devUnlock);
  const setDevUnlock = usePremiumStore((s) => s.setDevUnlock);
  const { themeMode, locale, currency, warnThresholdMin, autoDetectEnabled, clockFormat, units } =
    useSettingsStore();
  const {
    setThemeMode,
    setLocalePref,
    setCurrency,
    setWarnThreshold,
    setAutoDetect,
    setClockFormatPref,
    setUnits,
  } = useSettingsStore.getState();
  const permissions = usePermissions(visible);

  const confirmDeleteAll = () => {
    Alert.alert(t('deleteAllData'), t('deleteAllConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: () => {
          try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const repo = require('../db/sessionRepo') as typeof import('../db/sessionRepo');
            // Fotoğraflar dosya sisteminde yaşıyor: tablo silinince onlar
            // yetim kalıyordu. "Her şey" demek gerçekten her şey demek.
            for (const uri of repo.listAllPhotoUris()) deleteSpotPhoto(uri);
            repo.deleteEverything();
            useSessionStore.setState({
              phase: 'idle',
              session: null,
              suggestedTariff: null,
              locationState: 'idle',
              notificationState: 'idle',
            });
            useSettingsStore.getState().resetToDefaults();
            onClose();
          } catch {
            // Silme başarısızsa mevcut durum korunur.
          }
        },
      },
    ]);
  };

  return (
    <PageSheet visible={visible} title={t('settings')} onClose={onClose}>
      {/* Dört ayrı başlık yerine tek "Tercihler" bloğu: hepsi aynı cinsten
          seçim; ayrı ayrı başlıklandırınca sayfa başlık çorbasına dönüyordu. */}
      <Section title={t('preferences')}>
        <Field label={t('appearance')}>
          <ChipGroup<ThemeMode>
            options={[
              { key: 'light', label: t('themeLight') },
              { key: 'dark', label: t('themeDark') },
              { key: 'system', label: t('themeSystem') },
            ]}
            value={themeMode}
            onChange={setThemeMode}
          />
        </Field>

        {/* Bunlar liste seçimi, iki durumlu geçiş değil: çip grubu satırı taşırıyor
            ve seçili değeri bir bakışta okutmuyordu. */}
        <SelectRow<Locale>
          label={t('language')}
          options={[
            { key: 'en', label: 'English' },
            { key: 'tr', label: 'Türkçe' },
          ]}
          value={locale}
          onChange={setLocalePref}
        />

        <SelectRow<Currency>
          label={t('currency')}
          options={CURRENCIES.map((c) => ({ key: c, label: c }))}
          value={currency}
          onChange={setCurrency}
        />

        <SelectRow<'device' | '12' | '24'>
          label={t('clockFormat')}
          options={[
            { key: 'device', label: t('followDevice') },
            { key: '24', label: t('clock24') },
            { key: '12', label: t('clock12') },
          ]}
          value={clockFormat}
          onChange={setClockFormatPref}
        />

        <SelectRow<'device' | 'metric' | 'imperial'>
          label={t('units')}
          options={[
            { key: 'device', label: t('followDevice') },
            { key: 'metric', label: t('unitsMetric') },
            { key: 'imperial', label: t('unitsImperial') },
          ]}
          value={units}
          onChange={setUnits}
        />

        <SelectRow<number>
          label={t('alertThreshold')}
          options={WARN_THRESHOLDS.map((m) => ({ key: m, label: t('minutesShort', { minutes: m }) }))}
          value={warnThresholdMin}
          onChange={setWarnThreshold}
        />
      </Section>

      <Section title={t('goPro')}>
        {isPremium ? (
          <>
            <Row label={t('goPro')} value={t('proActive')} />
            <LinkRow label={t('manageSubscription')} onPress={openSubscriptionSettings} />
          </>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              trackPaywallShown('settings');
              onOpenPaywall();
            }}
            hitSlop={8}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 44 }}>
              <Text style={{ fontSize: 15, color: colors.ink }}>{t('goPro')}</Text>
              <SymbolView name="chevron.right" size={13} tintColor={colors.disabled} weight="semibold" />
            </View>
          </Pressable>
        )}
      </Section>

      <Section title={t('autoDetect')}>
        {isPremium ? (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 44 }}>
              <Text style={{ fontSize: 15, color: colors.ink, flex: 1 }}>{t('autoDetect')}</Text>
              <Switch
                value={autoDetectEnabled}
                onValueChange={setAutoDetect}
                trackColor={{ true: colors.accentFill, false: colors.insetPressed }}
                thumbColor={colors.card}
              />
            </View>
            <Caption>{t('autoDetectHint')}</Caption>
          </>
        ) : (
          <Pressable accessibilityRole="button" onPress={onOpenPaywall} hitSlop={4}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s8, height: 44 }}>
              <SymbolView name="lock.fill" size={15} tintColor={colors.disabled} weight="regular" />
              <Caption color={colors.textSecondary} style={{ flex: 1 }}>
                {t('autoDetectPro')}
              </Caption>
              <SymbolView name="chevron.right" size={13} tintColor={colors.disabled} weight="semibold" />
            </View>
          </Pressable>
        )}
      </Section>

      <Section title={t('permissions')}>
        {/* Sorulmamış izin de "kapalı" tarafında gösterilir: park kaydı konum
            olmadan, dilim uyarısı bildirim olmadan çalışmaz. */}
        {permissions.location === true ? (
          <Caption>{t('locationGranted')}</Caption>
        ) : (
          <StatusLine label={t('locationOff')} onPress={openAppSettings} />
        )}
        {permissions.notifications === true ? (
          <Caption>{t('notificationsGranted')}</Caption>
        ) : (
          <StatusLine label={t('notificationsOff')} onPress={openAppSettings} />
        )}
      </Section>

      <Section title={t('data')}>
        <LinkRow label={t('exportData')} onPress={exportData} />
        <Text
          onPress={confirmDeleteAll}
          accessibilityRole="button"
          style={{ fontSize: 15, color: colors.warnText, paddingVertical: spacing.s8 }}
        >
          {t('deleteAllData')}
        </Text>
      </Section>

      <Section title={t('about')}>
        <Row label={t('version')} value={Constants.expoConfig?.version ?? '—'} />
        <LinkRow label={t('privacy')} onPress={() => void Linking.openURL(PRIVACY_URL)} />
        <LinkRow label={t('terms')} onPress={() => void Linking.openURL(TERMS_URL)} />
        <LinkRow label={t('support')} onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} />
        <LinkRow label={t('rateUs')} onPress={() => void Linking.openURL(REVIEW_URL)} />
        {/* ODbL: OpenStreetMap verisi kullanıldığı için atıf zorunlu */}
        <Caption style={{ paddingTop: spacing.s8 }}>{t('osmAttribution')}</Caption>
      </Section>

      {/* Yalnız geliştirme derlemesinde: __DEV__ production bundle'ında false olduğu
          için bu bölüm shipping'e giremez (premium.ts de anahtarı yok sayar). */}
      {__DEV__ && (
        <Section title={t('developer')}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 44 }}>
            <Text style={{ fontSize: 15, color: colors.ink, flex: 1 }}>{t('devPremium')}</Text>
            <Switch
              value={devUnlock}
              onValueChange={setDevUnlock}
              trackColor={{ true: colors.accentFill, false: colors.insetPressed }}
              thumbColor={colors.card}
            />
          </View>
          <Caption>{t('devPremiumHint')}</Caption>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              useSettingsStore.getState().resetOnboarding();
              onClose();
            }}
            hitSlop={8}
          >
            <Text style={{ fontSize: 15, color: colors.ink, paddingVertical: spacing.s8 }}>
              {t('devResetOnboarding')}
            </Text>
          </Pressable>
        </Section>
      )}
    </PageSheet>
  );
}
