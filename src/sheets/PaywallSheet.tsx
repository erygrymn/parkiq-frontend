import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useEffect } from 'react';
import { ActivityIndicator, Linking, Pressable, Text, View } from 'react-native';
import { PrimaryCta } from '../components/Buttons';
import { PageSheet } from '../components/PageSheet';
import { Body, Caption } from '../components/Typography';
import { t, upper } from '../localization';
import type { PlanPeriod, PurchasePlan } from '../lib/purchases';
import { usePremiumStore } from '../state/premiumStore';
import { useTheme } from '../theme';
import { radius, spacing, typeScale } from '../theme/tokens';

// Apple standart EULA + Twice gizlilik politikası (5.1.1 / 3.1.2)
const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
const PRIVACY_URL = 'https://www.twiceapps.co/privacy';

// design.md §7.10. Zemin card (krem yasak), başlıkta nokta imzası YOK.
// Durum listesi bağlayıcı: yükleniyor / hata / satın alma sürüyor / başarı / restore.

// §4.10 dikkat: paywall işletim sistemi yeteneğini (Live Activity/widget) DEĞİL,
// ParkIQ'nun kendi işlevlerini satar. LA, Dynamic Island, widget ve bildirim
// uyarıları herkese ÜCRETSİZDİR.
const FEATURES: Array<{ symbol: SFSymbol; key: 'proFeatureAuto' | 'proFeatureScan' | 'proFeatureFind' | 'proFeatureHistory' | 'proFeatureVehicles' }> = [
  { symbol: 'sensor.tag.radiowaves.forward', key: 'proFeatureAuto' },
  { symbol: 'camera.viewfinder', key: 'proFeatureScan' },
  { symbol: 'mappin.and.ellipse', key: 'proFeatureFind' },
  { symbol: 'chart.bar', key: 'proFeatureHistory' },
  { symbol: 'car.2', key: 'proFeatureVehicles' },
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
  onPress,
}: {
  plan: PurchasePlan;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        minHeight: 64,
        borderRadius: radius.r16,
        backgroundColor: colors.inset,
        borderWidth: selected ? 2 : 0,
        borderColor: colors.ink,
        paddingHorizontal: spacing.s16,
        paddingVertical: spacing.s12,
        justifyContent: 'center',
        gap: spacing.s4,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.ink }}>{t(PLAN_LABEL[plan.period])}</Text>
        <Text style={{ fontSize: 17, fontWeight: '800', color: colors.ink, fontVariant: ['tabular-nums'] }}>
          {plan.priceLabel}
        </Text>
      </View>
      {plan.introLabel && (
        <Caption>{t('freeThen', { intro: plan.introLabel, price: plan.priceLabel })}</Caption>
      )}
    </Pressable>
  );
}

function SkeletonPlans() {
  const { colors } = useTheme();
  return (
    <View style={{ gap: spacing.s8 }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ height: 64, borderRadius: radius.r16, backgroundColor: colors.inset }} />
      ))}
    </View>
  );
}

export function PaywallSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const { plans, plansAreDemo, plansState, selectedPlanId, purchaseState, notice, justPurchased } =
    usePremiumStore();
  const { openPlans, selectPlan, buy, restore, consumeJustPurchased } = usePremiumStore.getState();

  useEffect(() => {
    if (visible) openPlans();
  }, [visible, openPlans]);

  // Başarı: sheet kapanır (damga anı geldiği ekranda oynar — §7.10.4)
  useEffect(() => {
    if (justPurchased) {
      consumeJustPurchased();
      onClose();
    }
  }, [justPurchased, consumeJustPurchased, onClose]);

  // Restore başarısında da sheet kapanır (§7.10.5)
  useEffect(() => {
    if (notice === 'restored') onClose();
  }, [notice, onClose]);

  const selected = plans.find((p) => p.id === selectedPlanId) ?? null;
  const selectedIsSubscription = selected !== null && selected.period !== 'lifetime';
  const busy = purchaseState !== 'idle';

  return (
    <PageSheet
      visible={visible}
      title={t('goPro')}
      onClose={busy ? () => undefined : onClose}
      fullScreen
    >
      <View style={{ gap: spacing.s24 }}>
        {/* Üstteki overline sheet başlığının aynısıydı — iki kez "PARKIQ PRO"
            okunuyordu. Başlık kabukta kalır, burada yalnız vaat ve gövde var. */}
        <View style={{ gap: spacing.s8 }}>
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
                onPress={() => selectPlan(plan.id)}
              />
            ))}
            {plansAreDemo && <Caption color={colors.warnText}>{t('demoPlans')}</Caption>}
            {/* §3.1.2(a)(c): otomatik yenileme + ücretlendirme beyanı zorunlu */}
            {selectedIsSubscription && <Caption>{t('autoRenewNotice')}</Caption>}
          </View>
        )}

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
              selected
                ? t(CTA_TEMPLATE[selected.period], { price: selected.priceLabel })
                : t('goPro')
            }
            onPress={buy}
            disabled={!selected || busy}
          />
        )}

        {notice === 'none' && <Caption>{t('noPurchases')}</Caption>}
        {notice === 'failed' && <Caption color={colors.warnText}>{t('purchaseFailed')}</Caption>}

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.s16 }}>
          <Pressable accessibilityRole="button" onPress={restore} disabled={busy} hitSlop={8}>
            <Caption color={colors.ink}>{t('restore')}</Caption>
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
    </PageSheet>
  );
}
