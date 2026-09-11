import type { ReactNode } from 'react';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Linking, Pressable, Switch, Text, View } from 'react-native';
import { ConfirmSheet } from '../components/ConfirmSheet';
import { PageSheet, Section } from '../components/PageSheet';
import { SelectRow } from '../components/SelectRow';
import { ProBadge } from '../components/ProBadge';
import { openAppSettings, StatusLine } from '../components/StatusLine';
import { Caption } from '../components/Typography';
import { trackPaywallShown } from '../lib/analytics';
import { deleteSpotPhoto } from '../lib/photo';
import { LOCALES, LOCALE_NAMES, t } from '../localization';
import type { Locale } from '../localization';
import { useIsPremium, usePremiumStore } from '../state/premiumStore';
import { useSessionStore } from '../state/sessionStore';
import {
  CURRENCIES,
  useSettingsStore,
  WARN_THRESHOLDS,
  type Currency,
  type ThemeMode,
} from '../state/settingsStore';
import { useTheme } from '../theme';
import { spacing } from '../theme/tokens';

// design.md §7.10 Ayarlar: beş grup, hairline satırlar, açıklama cümlesi yok. Her satır 44pt;
// değer sağda, eylem chevron ile. Bölüm başlığı satır adını tekrarlamaz (eski "PARKIQ PRO / ParkIQ
// Pro" ikilemesi kaldırıldı). İzinler yalnız eksik izin varsa görünür.

const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
const PRIVACY_URL = 'https://www.twiceapps.co/privacy';
const SUPPORT_EMAIL = 'info@twiceapps.co';
/** Doğrudan yorum yazma sayfası — sistem penceresi kotaya takılabilir. */
const REVIEW_URL = 'https://apps.apple.com/app/id6756688254?action=write-review';

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

/** Hairline ayraçlı 44pt satır: etiket + sağda değer / chevron / kontrol. */
function SettingRow({
  label,
  value,
  onPress,
  trailing,
  locked,
  tone = 'ink',
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  /** Sağdaki kontrol (switch gibi). Verilirse chevron çizilmez. */
  trailing?: ReactNode;
  /** Premium kilidi: sol kilit ikonu + ikincil metin; dokununca paywall. */
  locked?: boolean;
  tone?: 'ink' | 'warn';
}) {
  const { colors } = useTheme();
  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.s8,
        height: 44,
        borderBottomWidth: 1,
        borderBottomColor: colors.gridline,
      }}
    >
      {locked && <ProBadge size={13} />}
      <Text
        style={{
          flex: 1,
          fontSize: 15,
          color: tone === 'warn' ? colors.warnText : locked ? colors.textSecondary : colors.ink,
        }}
      >
        {label}
      </Text>
      {value !== undefined && (
        <Text style={{ fontSize: 15, color: colors.textSecondary, fontVariant: ['tabular-nums'] }}>{value}</Text>
      )}
      {trailing}
      {onPress && !trailing && (
        <SymbolView name="chevron.right" size={13} tintColor={colors.disabled} weight="semibold" />
      )}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      {content}
    </Pressable>
  );
}

/**
 * İzinlerin GERÇEK durumu. Store'daki 'idle' başlangıç değeri hiç sorulmamış izni "açık" gibi
 * okutuyordu; burada sistemden okunur.
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
  const { themeMode, locale, currency, warnThresholdMin, autoDetectEnabled, tariffPoolEnabled, clockFormat, units } =
    useSettingsStore();
  const {
    setThemeMode,
    setLocalePref,
    setCurrency,
    setWarnThreshold,
    setAutoDetect,
    setTariffPool,
    setClockFormatPref,
    setUnits,
  } = useSettingsStore.getState();
  const permissions = usePermissions(visible);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const deleteAll = () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const repo = require('../db/sessionRepo') as typeof import('../db/sessionRepo');
      // Fotoğraflar dosya sisteminde yaşıyor: tablo silinince onlar yetim kalıyordu.
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
  };

  const openPaywall = () => {
    trackPaywallShown('settings');
    onOpenPaywall();
  };

  const switchControl = (value: boolean, onValueChange: (next: boolean) => void) => (
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ true: colors.accentFill, false: colors.insetPressed }}
      thumbColor={colors.card}
    />
  );

  return (
    <PageSheet visible={visible} title={t('settings')} onClose={onClose}>
      <Section title={t('preferences')}>
        <View style={{ borderTopWidth: 1, borderTopColor: colors.gridline }}>
          <SelectRow<ThemeMode>
            label={t('appearance')}
            options={[
              { key: 'system', label: t('themeSystem') },
              { key: 'light', label: t('themeLight') },
              { key: 'dark', label: t('themeDark') },
            ]}
            value={themeMode}
            onChange={setThemeMode}
          />
          <SelectRow<Locale>
            label={t('language')}
            options={LOCALES.map((key) => ({ key, label: LOCALE_NAMES[key] }))}
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
        </View>
      </Section>

      {/* Pro ve oto-algılama tek grupta: ikisi de aynı satın almanın yüzü. */}
      <Section title="Pro">
        <View style={{ borderTopWidth: 1, borderTopColor: colors.gridline }}>
          {isPremium ? (
            <>
              <SettingRow label={t('goPro')} value={t('proActive')} />
              <SettingRow label={t('manageSubscription')} onPress={openSubscriptionSettings} />
              <SettingRow label={t('autoDetect')} trailing={switchControl(autoDetectEnabled, setAutoDetect)} />
            </>
          ) : (
            <>
              <SettingRow label={t('goPro')} locked onPress={openPaywall} />
              <SettingRow label={t('autoDetectPro')} locked onPress={openPaywall} />
            </>
          )}
        </View>
      </Section>

      {/* Verilmiş izin satır üretmez; bölüm yalnız eksik izin varsa görünür. Sorulmamış izin de
          "kapalı" tarafındadır: park kaydı konum olmadan, dilim uyarısı bildirim olmadan çalışmaz. */}
      {(permissions.location !== true || permissions.notifications !== true) && (
        <Section title={t('permissions')}>
          {permissions.location !== true && <StatusLine label={t('locationOff')} onPress={openAppSettings} />}
          {permissions.notifications !== true && <StatusLine label={t('notificationsOff')} onPress={openAppSettings} />}
        </Section>
      )}

      <Section title={t('data')}>
        <View style={{ borderTopWidth: 1, borderTopColor: colors.gridline }}>
          {/* Havuz alışverişi çift yönlü: kapatan hem göndermez hem öneri görmez. */}
          <SettingRow label={t('tariffPool')} trailing={switchControl(tariffPoolEnabled, setTariffPool)} />
          <Caption style={{ paddingBottom: spacing.s12 }}>{t('tariffPoolHint')}</Caption>
          <SettingRow label={t('exportData')} onPress={exportData} />
          <SettingRow label={t('deleteAllData')} tone="warn" onPress={() => setConfirmDeleteOpen(true)} />
        </View>
      </Section>

      <ConfirmSheet
        visible={confirmDeleteOpen}
        title={t('deleteAllData')}
        body={t('deleteAllConfirm')}
        confirmLabel={t('delete')}
        cancelLabel={t('cancel')}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={deleteAll}
      />

      <Section title={t('about')}>
        <View style={{ borderTopWidth: 1, borderTopColor: colors.gridline }}>
          <SettingRow label={t('privacy')} onPress={() => void Linking.openURL(PRIVACY_URL)} />
          <SettingRow label={t('terms')} onPress={() => void Linking.openURL(TERMS_URL)} />
          <SettingRow label={t('support')} onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} />
          <SettingRow label={t('rateUs')} onPress={() => void Linking.openURL(REVIEW_URL)} />
        </View>
        {/* Sürüm ve ODbL atfı (OpenStreetMap verisi kullanıldığı için zorunlu) tek dipnotta. */}
        <Caption style={{ paddingTop: spacing.s8 }}>
          {`ParkIQ ${Constants.expoConfig?.version ?? ''} · ${t('osmAttribution')}`.trim()}
        </Caption>
      </Section>

      {/* Yalnız geliştirme derlemesinde: __DEV__ production bundle'ında false olduğu
          için bu bölüm shipping'e giremez (premium.ts de anahtarı yok sayar). */}
      {__DEV__ && (
        <Section title={t('developer')}>
          <View style={{ borderTopWidth: 1, borderTopColor: colors.gridline }}>
            <SettingRow label={t('devPremium')} trailing={switchControl(devUnlock, setDevUnlock)} />
            <SettingRow
              label={t('devResetOnboarding')}
              onPress={() => {
                useSettingsStore.getState().resetOnboarding();
                onClose();
              }}
            />
          </View>
          <Caption style={{ paddingTop: spacing.s8 }}>{t('devPremiumHint')}</Caption>
        </Section>
      )}
    </PageSheet>
  );
}
