import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useEffect, useMemo } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryCta } from '../components/Buttons';
import { CelebrationHero } from '../components/motion/CelebrationHero';
import { PressScale } from '../components/motion/PressScale';
import { Caption, Overline } from '../components/Typography';
import { hapticSelect } from '../lib/haptics';
import { formatMoney } from '../lib/format';
import type { PlanPeriod, PurchasePlan } from '../lib/purchases';
import { getLocale, t, upper } from '../localization';
import { usePremiumStore } from '../state/premiumStore';
import { useUiStore } from '../state/uiStore';
import { useTheme } from '../theme';
import { CROSSFADE_MS, useReducedMotion } from '../theme/motion';
import { lightColors, radius, spacing, typeScale } from '../theme/tokens';

// Apple standart EULA + Twice gizlilik politikası (5.1.1 / 3.1.2)
const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
const PRIVACY_URL = 'https://www.twiceapps.co/privacy';

// design.md §7.11 Paywall. Poster gibi okunur: bir başlık, dört kısa satır, üç plan karosu, tek CTA.
// Cümle yok, kart yığını yok. Zemin card (krem yasak), başlıkta nokta imzası YOK.
//
// §4.10: paywall işletim sistemi yeteneğini (Live Activity/widget) DEĞİL, ParkIQ'nun kendi
// işlevlerini satar. LA, Dynamic Island, widget ve bildirim uyarıları herkese ÜCRETSİZDİR.
const FEATURES: Array<{
  symbol: SFSymbol;
  key: 'proFeatureAuto' | 'proFeatureScan' | 'proFeatureFind' | 'proFeatureFilter' | 'proFeaturePool';
}> = [
  { symbol: 'sensor.tag.radiowaves.forward', key: 'proFeatureAuto' },
  { symbol: 'camera.viewfinder', key: 'proFeatureScan' },
  { symbol: 'person.2.circle', key: 'proFeaturePool' },
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

/** Karo sırası: aylık çapa, yıllık ortada ve varsayılan, ömür boyu sağda. */
const PLAN_ORDER: Record<PlanPeriod, number> = { monthly: 0, yearly: 1, lifetime: 2 };

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

function FeatureRow({ symbol, label, last }: { symbol: SFSymbol; label: string; last: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.s12,
        height: 48,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.gridline,
      }}
    >
      <SymbolView name={symbol} size={20} tintColor={colors.ink} weight="regular" />
      <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: colors.ink }}>{label}</Text>
    </View>
  );
}

/** Plan karosu: dönem + fiyat + tek satır alt bilgi. Seçili 2pt ink; diğerleri hairline. */
function PlanTile({
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
  const sub =
    plan.period === 'yearly' && plan.price > 0
      ? t('planPerMonth', { price: formatMoney(plan.price / 12, plan.currency, locale) })
      : plan.period === 'lifetime'
        ? t('lifetimeNote')
        : null;

  return (
    <PressScale
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${t(PLAN_LABEL[plan.period])} ${plan.priceLabel}`}
      onPress={onPress}
      containerStyle={{ flex: 1 }}
      style={{
        minHeight: 96,
        borderRadius: radius.r16,
        borderCurve: 'continuous',
        // Seçili karo yeşil kâğıda oturur: ekranda renk PARANIN olduğu yerde çıkar,
        // dekor olarak değil (§2 yeşil whitelist'i).
        backgroundColor: selected ? colors.alertBgMoney : colors.card,
        borderWidth: 2,
        // Kalınlık sabit: seçim değişince karolar zıplamasın.
        borderColor: selected ? colors.ink : colors.gridline,
        paddingHorizontal: spacing.s12,
        paddingTop: spacing.s16,
        paddingBottom: spacing.s12,
        justifyContent: 'space-between',
        gap: spacing.s4,
      }}
    >
      {badge && (
        <View
          style={{
            position: 'absolute',
            top: -10,
            alignSelf: 'center',
            paddingHorizontal: spacing.s8,
            paddingVertical: 2,
            borderRadius: radius.rFull,
            // Rozet indirimi söylüyor, yani parayı: mürekkep değil accent.
            backgroundColor: colors.accentFill,
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 0.6, color: lightColors.card }}>{badge}</Text>
        </View>
      )}
      <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '600', color: selected ? colors.ink : colors.textSecondary }}>
        {t(PLAN_LABEL[plan.period])}
      </Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        style={{ fontSize: 17, fontWeight: '800', color: colors.ink, fontVariant: ['tabular-nums'] }}
      >
        {plan.priceLabel}
      </Text>
      <Text numberOfLines={1} style={{ fontSize: 11, color: colors.textSecondary, minHeight: 14 }}>
        {sub ?? ''}
      </Text>
    </PressScale>
  );
}

function SkeletonPlans() {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: spacing.s8 }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ flex: 1, height: 96, borderRadius: radius.r16, backgroundColor: colors.inset }} />
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

  // design.md §7.11.4: başarı sessiz değil ama sistem alert de değil — sheet kapanır, geldiği
  // ekranda "PRO." damgası + notificationSuccess (kök ProStamp).
  useEffect(() => {
    if (!justPurchased) return;
    consumeJustPurchased();
    useUiStore.getState().showProStamp();
    onClose();
  }, [justPurchased, consumeJustPurchased, onClose]);

  // Restore sonuçları alt blokta satır olarak söylenir (§7.11.5). Başarıda sheet 1.2 s sonra kapanır;
  // "hiçbir şey bulunamadı" satırı kalır — yeni cihaza geçen ödemiş kullanıcının destek yazdığı an.
  useEffect(() => {
    if (notice !== 'restored') return;
    const id = setTimeout(() => {
      clearNotice();
      onClose();
    }, 1200);
    return () => clearTimeout(id);
  }, [notice, clearNotice, onClose]);

  // Geçmişten gelen toplam tasarruf; paywall her açıldığında taze okunur. Uydurma ortalama değil,
  // bu telefonun kendi rakamı — yoksa satır hiç çıkmaz.
  const saved = useMemo(() => {
    if (!visible) return null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const repo = require('../db/sessionRepo') as typeof import('../db/sessionRepo');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const stats = require('../lib/stats') as typeof import('../lib/stats');
      const total = stats.computeStats(repo.listEndedSessions());
      if (total.totalSaved === null || total.totalSaved <= 0 || !total.savedCurrency) return null;
      return { amount: total.totalSaved, currency: total.savedCurrency };
    } catch {
      return null;
    }
  }, [visible]);

  const reduced = useReducedMotion();
  /* Satırlar hero'nun ardından gelir; count-up'lı hero daha uzun sürdüğü için bekleme
     ona göre. Toplam ≤ 1,3 sn — §3'ün 1,8 sn bütçesinin altında. */
  const rowDelay = saved !== null ? 420 : 180;

  const ordered = useMemo(
    () => [...plans].sort((a, b) => PLAN_ORDER[a.period] - PLAN_ORDER[b.period]),
    [plans],
  );
  const selected = plans.find((p) => p.id === selectedPlanId) ?? null;
  const selectedIsSubscription = selected !== null && selected.period !== 'lifetime';
  const busy = purchaseState !== 'idle';
  const saving = savingPercent(plans);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      // §7.11.3: satın alma sürerken ekran kapanmaz.
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

          {/* §7.11 poster. Ekranın TEK anı burada: kullanıcının kendi biriktirdiği para
              sayılarak gelir ve nokta en son iner (kutlama kapağıyla aynı bileşen, aynı
              gramer). Rakam yoksa hero satılan şeydir: display-M başlık, noktasız. */}
          <View style={{ gap: spacing.s8 }}>
            <Overline>{t('goPro')}</Overline>
            {saved !== null ? (
              <>
                <CelebrationHero amount={saved.amount} currency={saved.currency} haptics={false} />
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textSecondary }}>
                  {t('savedSoFarLead')}
                </Text>
              </>
            ) : (
              <Animated.Text
                entering={reduced ? FadeIn.duration(CROSSFADE_MS) : FadeInDown.duration(320)}
                style={{
                  fontSize: typeScale.displayM.fontSize,
                  fontWeight: typeScale.displayM.fontWeight,
                  letterSpacing: typeScale.displayM.letterSpacing,
                  lineHeight: Math.round(typeScale.displayM.fontSize * 1.1),
                  color: colors.ink,
                }}
                maxFontSizeMultiplier={1.3}
              >
                {upper(t('proHeadline'))}
              </Animated.Text>
            )}
          </View>

          {/* Satırlar hero bittikten SONRA gelir: aynı anda iki şey hareket etmez (§3). */}
          <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.gridline }}>
            {FEATURES.map((feature, index) => (
              <Animated.View
                key={feature.key}
                entering={
                  reduced
                    ? FadeIn.duration(CROSSFADE_MS)
                    : FadeInDown.delay(rowDelay + index * 50).duration(CROSSFADE_MS)
                }
              >
                <FeatureRow symbol={feature.symbol} label={t(feature.key)} last={index === FEATURES.length - 1} />
              </Animated.View>
            ))}
          </View>

          {plansState === 'loading' && <SkeletonPlans />}


          {plansState === 'error' && (
            <View style={{ gap: spacing.s12 }}>
              <Caption color={colors.ink}>{t('plansError')}</Caption>
              <Pressable accessibilityRole="button" onPress={openPlans} hitSlop={8}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.ink }}>{t('retry')}</Text>
              </Pressable>
            </View>
          )}

          {plansState === 'ready' && (
            <Animated.View
              entering={
                reduced ? FadeIn.duration(CROSSFADE_MS) : FadeIn.delay(rowDelay + 4 * 50).duration(CROSSFADE_MS)
              }
              style={{ gap: spacing.s12 }}
            >
              <View style={{ flexDirection: 'row', gap: spacing.s8, paddingTop: spacing.s8 }}>
                {ordered.map((plan) => (
                  <PlanTile
                    key={plan.id}
                    plan={plan}
                    selected={plan.id === selectedPlanId}
                    badge={plan.period === 'yearly' && saving ? t('planSave', { percent: saving }) : null}
                    onPress={() => {
                      if (plan.id === selectedPlanId) return;
                      hapticSelect();
                      selectPlan(plan.id);
                    }}
                  />
                ))}
              </View>
              {selected?.introLabel && (
                <Caption>{t('freeThen', { intro: selected.introLabel, price: selected.priceLabel })}</Caption>
              )}
              {plansAreDemo && <Caption color={colors.warnText}>{t('demoPlans')}</Caption>}
            </Animated.View>
          )}
        </ScrollView>

        {/* Sabit alt blok: durum satırı, yasal satır, CTA, bağlantılar. İçerik ne kadar uzarsa uzasın kaçmaz. */}
        <View
          style={{
            paddingHorizontal: spacing.s20,
            paddingTop: spacing.s12,
            paddingBottom: insets.bottom + spacing.s16,
            gap: spacing.s12,
            borderTopWidth: 1,
            borderTopColor: colors.gridline,
            backgroundColor: colors.card,
          }}
        >
          {notice === 'failed' && <Caption color={colors.warnText}>{t('purchaseFailed')}</Caption>}
          {notice === 'restored' && <Caption color={colors.accentText}>{t('restoredTitle')}</Caption>}
          {notice === 'none' && (
            <View style={{ gap: 2 }}>
              <Caption color={colors.ink}>{t('noPurchases')}</Caption>
              <Caption>{t('noPurchasesBody')}</Caption>
            </View>
          )}

          {/* §3.1.2(a)(c): otomatik yenileme beyanı zorunlu; tek satır, text-tertiary. */}
          {selectedIsSubscription && (
            <Text style={{ fontSize: 11, lineHeight: 15, color: colors.textTertiary }}>{t('autoRenewNotice')}</Text>
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
              label={selected ? t(CTA_TEMPLATE[selected.period], { price: selected.priceLabel }) : t('goPro')}
              onPress={buy}
              disabled={!selected || busy}
            />
          )}

          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.s16 }}>
            <Pressable accessibilityRole="button" onPress={restore} disabled={busy} hitSlop={8}>
              <Caption color={colors.ink}>{purchaseState === 'restoring' ? t('restoring') : t('restore')}</Caption>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => void Linking.openURL(TERMS_URL)} hitSlop={8}>
              <Caption>{t('terms')}</Caption>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => void Linking.openURL(PRIVACY_URL)} hitSlop={8}>
              <Caption>{t('privacy')}</Caption>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
