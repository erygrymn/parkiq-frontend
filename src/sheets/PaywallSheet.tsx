import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useEffect, useMemo } from 'react';
import { Alert, ActivityIndicator, Linking, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryCta } from '../components/Buttons';
import { Body, Caption, Overline } from '../components/Typography';
import { formatMoney } from '../lib/format';
import type { PlanPeriod, PurchasePlan } from '../lib/purchases';
import { getLocale, t, upper } from '../localization';
import { usePremiumStore } from '../state/premiumStore';
import { useTheme } from '../theme';
import { radius, spacing, typeScale } from '../theme/tokens';

// Apple standart EULA + Twice gizlilik politikası (5.1.1 / 3.1.2)
const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
const PRIVACY_URL = 'https://www.twiceapps.co/privacy';

// design.md §7.10. Zemin card (krem yasak), başlıkta nokta imzası YOK.
//
// Kendi tam ekran kabuğunu kurar, PageSheet'i kullanmaz: karar ekranının
// güvenli alanı ve DEĞİŞMEYEN alt bloğu (CTA + yasal satır) olmalı. PageSheet
// tek kaydırma alanı verdiği için başlık durum çubuğuna giriyor, CTA da uzun
// içerikte ekrandan kaçıyordu.
//
// §4.10 dikkat: paywall işletim sistemi yeteneğini (Live Activity/widget) DEĞİL,
// ParkIQ'nun kendi işlevlerini satar. LA, Dynamic Island, widget ve bildirim
// uyarıları herkese ÜCRETSİZDİR.
const FEATURES: Array<{
  symbol: SFSymbol;
  key: 'proFeatureAuto' | 'proFeatureScan' | 'proFeatureFind' | 'proFeatureFilter';
}> = [
  { symbol: 'sensor.tag.radiowaves.forward', key: 'proFeatureAuto' },
  { symbol: 'camera.viewfinder', key: 'proFeatureScan' },
  { symbol: 'location.north.circle', key: 'proFeatureFind' },
  { symbol: 'line.3.horizontal.decrease.circle', key: 'proFeatureFilter' },
];

const PLAN_LABEL: Record<PlanPeriod, 'planYearly' | 'planMonthly' | 'planLifetime'> = {
  yearly: 'planYearly',
  monthly: 'planMonthly',
  lifetime: 'planLifetime',
};

const CTA_TEMPLATE: Record<PlanPeriod, 'continueYearly' | 'continueMonthly' | 'continueLifetime'> = {
  yearly: 'continueYearly',
  monthly: 'continueMonthly',
  lifetime: 'continueLifetime',
};

/**
 * Yıllık planın aylığa göre kaç tasarruf ettirdiği. Pazarlama cümlesi değil,
 * iki gerçek fiyattan çıkan oran — hesaplanamıyorsa hiç gösterilmez.
 */
function savingPercent(plans: PurchasePlan[]): number | null {
  const yearly = plans.find((p) => p.period === 'yearly');
  const monthly = plans.find((p) => p.period === 'monthly');
  if (!yearly?.price || !monthly?.price) return null;
  const full = monthly.price * 12;
  if (full <= yearly.price) return null;
  const percent = Math.round((1 - yearly.price / full) * 100);
  return percent >= 5 ? percent : null;
}

function FeatureRow({ symbol, label }: { symbol: SFSymbol; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s12 }}>
      <SymbolView name={symbol} size={19} tintColor={colors.ink} weight="regular" />
      <Body style={{ flex: 1 }}>{label}</Body>
    </View>
  );
}

function PlanCard({
  plan,
  selected,
  badge,
  onPress,
}: {
  plan: PurchasePlan;
  selected: boolean;
  badge: string | null;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const locale = getLocale();

  // Yıllık planın aylık karşılığı: karşılaştırmayı kullanıcıya yaptırmayalım.
  const perMonth =
    plan.period === 'yearly' && plan.price > 0
      ? t('planPerMonth', { price: formatMoney(plan.price / 12, plan.currency, locale) })
      : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        minHeight: 68,
        borderRadius: radius.r16,
        backgroundColor: colors.inset,
        borderWidth: 2,
        // Seçilmemiş kart da 2pt taşır ama rengi zeminle aynı: seçim değişince
        // kartlar zıplamasın (kenarlık kalınlığı düzeni oynatıyordu).
        borderColor: selected ? colors.ink : colors.inset,
        opacity: selected ? 1 : 0.72,
        paddingHorizontal: spacing.s16,
        paddingVertical: spacing.s12,
        justifyContent: 'center',
        gap: spacing.s4,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s8 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.ink }}>
          {t(PLAN_LABEL[plan.period])}
        </Text>
        {badge && (
          <View
            style={{
              paddingHorizontal: spacing.s8,
              paddingVertical: 2,
              borderRadius: radius.r8,
              backgroundColor: colors.ink,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 0.6, color: colors.card }}>
              {badge}
            </Text>
          </View>
        )}
        <View style={{ flex: 1 }} />
        <Text style={{ fontSize: 17, fontWeight: '800', color: colors.ink, fontVariant: ['tabular-nums'] }}>
          {plan.priceLabel}
        </Text>
      </View>

      {(plan.introLabel || perMonth || plan.period === 'lifetime') && (
        <Caption>
          {plan.introLabel
            ? t('freeThen', { intro: plan.introLabel, price: plan.priceLabel })
            : (perMonth ?? t('lifetimeNote'))}
        </Caption>
      )}
    </Pressable>
  );
}

function SkeletonPlans() {
  const { colors } = useTheme();
  return (
    <View style={{ gap: spacing.s8 }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ height: 68, borderRadius: radius.r16, backgroundColor: colors.inset }} />
      ))}
    </View>
  );
}

export function PaywallSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { plans, plansAreDemo, plansState, selectedPlanId, purchaseState, notice, justPurchased } =
    usePremiumStore();
  const { openPlans, selectPlan, buy, restore, consumeJustPurchased, clearNotice } =
    usePremiumStore.getState();

  useEffect(() => {
    if (visible) openPlans();
  }, [visible, openPlans]);

  // Başarı SESSİZ olmamalı: ekran kapanıp hiçbir şey söylememek, para ödemiş
  // kullanıcıyı "geçti mi geçmedi mi" halinde bırakıyordu.
  useEffect(() => {
    if (!justPurchased) return;
    consumeJustPurchased();
    Alert.alert(t('purchaseDoneTitle'), t('purchaseDoneBody'), [{ text: t('done'), onPress: onClose }]);
  }, [justPurchased, consumeJustPurchased, onClose]);

  // Restore'un üç sonucu da söylenir; "hiçbir şey bulunamadı" özellikle önemli:
  // yeni cihaza geçen ödemiş kullanıcının doğrudan destek yazdığı an burası.
  useEffect(() => {
    if (notice === 'restored') {
      clearNotice();
      Alert.alert(t('restoredTitle'), t('restoredBody'), [{ text: t('done'), onPress: onClose }]);
      return;
    }
    if (notice === 'none') {
      clearNotice();
      Alert.alert(t('noPurchases'), t('noPurchasesBody'), [{ text: t('done') }]);
    }
  }, [notice, clearNotice, onClose]);

  // Geçmişten gelen toplam tasarruf; paywall her açıldığında taze okunur.
  const savedSoFar = useMemo(() => {
    if (!visible) return null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const repo = require('../db/sessionRepo') as typeof import('../db/sessionRepo');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const stats = require('../lib/stats') as typeof import('../lib/stats');
      const sessions = repo.listEndedSessions();
      const total = stats.computeStats(sessions);
      if (total.totalSaved === null || total.totalSaved <= 0 || !total.savedCurrency) return null;
      return formatMoney(total.totalSaved, total.savedCurrency, getLocale());
    } catch {
      return null;
    }
  }, [visible]);

  const selected = plans.find((p) => p.id === selectedPlanId) ?? null;
  const selectedIsSubscription = selected !== null && selected.period !== 'lifetime';
  const busy = purchaseState !== 'idle';
  const saving = savingPercent(plans);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      // §7.10.3: satın alma sürerken ekran kapanmaz.
      onRequestClose={busy ? () => undefined : onClose}
    >
      <View style={{ flex: 1, backgroundColor: colors.card }}>
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + spacing.s12,
            paddingHorizontal: spacing.s20,
            paddingBottom: spacing.s24,
            gap: spacing.s24,
          }}
        >
          {/* Kapatma sağ üstte, güvenli alanın İÇİNDE — durum çubuğuna girmez. */}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('close')}
              onPress={busy ? undefined : onClose}
              disabled={busy}
              hitSlop={8}
              style={({ pressed }) => ({
                width: 32,
                height: 32,
                borderRadius: radius.r12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: pressed ? colors.insetPressed : colors.inset,
                opacity: busy ? 0.4 : 1,
              })}
            >
              <SymbolView name="xmark" size={13} tintColor={colors.ink} weight="semibold" />
            </Pressable>
          </View>

          <View style={{ gap: spacing.s8 }}>
            <Overline>{t('goPro')}</Overline>
            {/* Başlıkta nokta YOK (§7.10) */}
            <Text
              style={{
                fontSize: typeScale.displayS.fontSize,
                fontWeight: typeScale.displayS.fontWeight,
                letterSpacing: typeScale.displayS.letterSpacing,
                color: colors.ink,
              }}
              maxFontSizeMultiplier={1.3}
            >
              {upper(t('proHeadline'))}
            </Text>
            <Body color={colors.textSecondary}>{t('proBody')}</Body>
          </View>

          {/* Para dili, kullanıcının KENDİ rakamıyla konuşur. Uydurma bir ortalama
              değil, bu telefonun geçmişinden gelen toplam — §6.2'de ödüllendirilen
              tek argüman bu. Hiç tasarruf yoksa satır hiç çıkmaz. */}
          {savedSoFar !== null && (
            <Caption color={colors.accentText}>{t('savedSoFar', { amount: savedSoFar })}</Caption>
          )}

          <View style={{ gap: spacing.s12 }}>
            {FEATURES.map((feature) => (
              <FeatureRow key={feature.key} symbol={feature.symbol} label={t(feature.key)} />
            ))}
          </View>

          {plansState === 'loading' && <SkeletonPlans />}

          {plansState === 'error' && (
            <View style={{ gap: spacing.s12 }}>
              <Body>{t('plansError')}</Body>
              <Pressable accessibilityRole="button" onPress={openPlans} hitSlop={8}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.ink }}>{t('retry')}</Text>
              </Pressable>
            </View>
          )}

          {plansState === 'ready' && (
            <View style={{ gap: spacing.s8 }}>
              {plans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  selected={plan.id === selectedPlanId}
                  badge={plan.period === 'yearly' && saving ? t('planSave', { percent: saving }) : null}
                  onPress={() => selectPlan(plan.id)}
                />
              ))}
              {plansAreDemo && <Caption color={colors.warnText}>{t('demoPlans')}</Caption>}
            </View>
          )}

        </ScrollView>

        {/* Sabit alt blok: CTA ve yasal satır içerik ne kadar uzarsa uzasın kaçmaz. */}
        <View
          style={{
            paddingHorizontal: spacing.s20,
            paddingTop: spacing.s16,
            paddingBottom: insets.bottom + spacing.s16,
            gap: spacing.s12,
            borderTopWidth: 1,
            borderTopColor: colors.gridline,
            backgroundColor: colors.card,
          }}
        >
          {notice === 'failed' && <Caption color={colors.warnText}>{t('purchaseFailed')}</Caption>}

          {/* §3.1.2(a)(c): otomatik yenileme + ücretlendirme beyanı zorunlu */}
          {selectedIsSubscription && <Caption>{t('autoRenewNotice')}</Caption>}

          {purchaseState === 'purchasing' ? (
            <View
              style={{
                height: 52,
                borderRadius: radius.rFull,
                backgroundColor: colors.ink,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ActivityIndicator color={colors.card} />
            </View>
          ) : (
            <PrimaryCta
              label={
                selected ? t(CTA_TEMPLATE[selected.period], { price: selected.priceLabel }) : t('goPro')
              }
              onPress={buy}
              disabled={!selected || busy}
            />
          )}

          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.s16 }}>
            <Pressable accessibilityRole="button" onPress={restore} disabled={busy} hitSlop={8}>
              <Caption color={colors.ink}>
                {purchaseState === 'restoring' ? t('restoring') : t('restore')}
              </Caption>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => void Linking.openURL(TERMS_URL)}
              hitSlop={8}
            >
              <Caption>{t('terms')}</Caption>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => void Linking.openURL(PRIVACY_URL)}
              hitSlop={8}
            >
              <Caption>{t('privacy')}</Caption>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
