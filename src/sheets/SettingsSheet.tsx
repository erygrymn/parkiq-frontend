import Constants from 'expo-constants';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as StoreReview from 'expo-store-review';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Linking, Pressable, Switch, Text, TextInput, View } from 'react-native';
import { useVehicleStore } from '../state/vehicleStore';
import { useIsPremium, usePremiumStore } from '../state/premiumStore';
import { ChipGroup } from '../components/ChipGroup';
import { PageSheet, Section } from '../components/PageSheet';
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
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/tokens';

// screens.md §10 / design.md §7.9. Premium satırları (araçlar, oto-algılama,
// abonelik) RevenueCat tuğlasıyla gelecek — burada henüz yok.

const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
const PRIVACY_URL = 'https://www.twiceapps.co/privacy';
const SUPPORT_EMAIL = 'info@twiceapps.co';

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
  const vehicles = useVehicleStore((s) => s.vehicles);
  const activeVehicleId = useVehicleStore((s) => s.activeVehicleId);
  const { addVehicle, removeVehicle, setActiveVehicle } = useVehicleStore.getState();
  const [newVehicle, setNewVehicle] = useState('');
  const { themeMode, locale, currency, warnThresholdMin, autoDetectEnabled } = useSettingsStore();
  const { setThemeMode, setLocalePref, setCurrency, setWarnThreshold, setAutoDetect } =
    useSettingsStore.getState();
  const locationState = useSessionStore((s) => s.locationState);
  const notificationState = useSessionStore((s) => s.notificationState);

  const confirmDeleteAll = () => {
    Alert.alert(t('deleteAllData'), t('deleteAllConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: () => {
          try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            (require('../db/sessionRepo') as typeof import('../db/sessionRepo')).deleteAllSessions();
            useSessionStore.setState({ phase: 'idle', session: null, suggestedTariff: null });
          } catch {
            // Silme başarısızsa mevcut durum korunur.
          }
        },
      },
    ]);
  };

  return (
    <PageSheet visible={visible} title={t('settings')} onClose={onClose}>
      <Section title={t('appearance')}>
        <ChipGroup<ThemeMode>
          options={[
            { key: 'light', label: t('themeLight') },
            { key: 'dark', label: t('themeDark') },
            { key: 'system', label: t('themeSystem') },
          ]}
          value={themeMode}
          onChange={setThemeMode}
        />
      </Section>

      <Section title={t('language')}>
        <ChipGroup<Locale>
          options={[
            { key: 'en', label: 'English' },
            { key: 'tr', label: 'Türkçe' },
          ]}
          value={locale}
          onChange={setLocalePref}
        />
      </Section>

      <Section title={t('currency')}>
        <ChipGroup<Currency>
          options={CURRENCIES.map((c) => ({ key: c, label: c }))}
          value={currency}
          onChange={setCurrency}
        />
      </Section>

      <Section title={t('alertThreshold')}>
        <ChipGroup<number>
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
          <Pressable accessibilityRole="button" onPress={onOpenPaywall} hitSlop={8}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 44 }}>
              <Text style={{ fontSize: 15, color: colors.ink }}>{t('goPro')}</Text>
              <SymbolView name="chevron.right" size={13} tintColor={colors.disabled} weight="semibold" />
            </View>
          </Pressable>
        )}
      </Section>

      <Section title={t('vehicles')}>
        {vehicles.map((vehicle) => (
          <View key={vehicle.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s8 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: vehicle.id === activeVehicleId }}
              onPress={() => setActiveVehicle(vehicle.id)}
              hitSlop={4}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.s8, height: 44 }}
            >
              <SymbolView
                name={vehicle.id === activeVehicleId ? 'checkmark.circle.fill' : 'circle'}
                size={19}
                tintColor={vehicle.id === activeVehicleId ? colors.accentFill : colors.disabled}
                weight="regular"
              />
              <Text style={{ fontSize: 15, color: colors.ink }}>{vehicle.name}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('delete')}
              onPress={() => removeVehicle(vehicle.id)}
              hitSlop={8}
            >
              <SymbolView name="minus.circle" size={19} tintColor={colors.textSecondary} weight="regular" />
            </Pressable>
          </View>
        ))}

        {isPremium || vehicles.length === 0 ? (
          <View style={{ flexDirection: 'row', gap: spacing.s8, alignItems: 'center' }}>
            <TextInput
              value={newVehicle}
              onChangeText={setNewVehicle}
              placeholder={t('vehicleNamePlaceholder')}
              placeholderTextColor={colors.textSecondary}
              onSubmitEditing={() => {
                addVehicle(newVehicle);
                setNewVehicle('');
              }}
              style={{
                flex: 1,
                height: 44,
                borderRadius: radius.r12,
                backgroundColor: colors.inset,
                paddingHorizontal: spacing.s12,
                fontSize: 15,
                color: colors.ink,
              }}
            />
          </View>
        ) : (
          // Free: tek araç + kilitli satır → paywall köprüsü (§7.9)
          <Pressable accessibilityRole="button" onPress={onOpenPaywall} hitSlop={4}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s8, height: 44 }}>
              <SymbolView name="lock.fill" size={15} tintColor={colors.disabled} weight="regular" />
              <Caption color={colors.textSecondary} style={{ flex: 1 }}>
                {t('multiVehiclePro')}
              </Caption>
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
        {locationState === 'denied' ? (
          <StatusLine label={t('locationOff')} onPress={openAppSettings} />
        ) : (
          <Caption>{t('locationGranted')}</Caption>
        )}
        {notificationState === 'denied' ? (
          <StatusLine label={t('notificationsOff')} onPress={openAppSettings} />
        ) : (
          <Caption>{t('notificationsGranted')}</Caption>
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
        <LinkRow label={t('rateUs')} onPress={() => void StoreReview.requestReview()} />
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
