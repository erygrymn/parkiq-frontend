import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { PageSheet } from '../components/PageSheet';
import { useIsPremium } from '../state/premiumStore';
import { GhostButton } from '../components/Buttons';
import { MonthlySavingsChart } from '../components/MonthlySavingsChart';
import { trackPaywallShown, trackShareCard } from '../lib/analytics';
import type { SavingsCardData } from '../components/SavingsCard';
import { ShareCardRenderer } from '../components/ShareCardRenderer';
import { StatTiles } from '../components/StatTiles';
import { monthlySavings } from '../lib/monthlyStats';
import { Caption, Overline } from '../components/Typography';
import { computeStats } from '../lib/stats';
import { SessionDetail } from './SessionDetail';
import { formatClock, formatDateShort, formatDurationStamp, formatMoney, isSameDay } from '../lib/format';
import { computeExitSummary } from '../lib/tariffMath';
import { getLocale, t } from '../localization';
import { listEndedSessions } from '../db/sessionRepo';
import { useSessionStore } from '../state/sessionStore';
import type { ParkSession } from '../state/sessionStore';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/tokens';

// §7.8 Geçmiş — iOS pageSheet. Gün gruplu liste (Today/Yesterday/tarih).
// Geçmiş HERKESE AÇIK: 3 kayıt kilidi kaldırıldı (2026-08-15 premium kararı),
// yerini otopark filtreleme aldı.

interface DayGroup {
  label: string;
  sessions: ParkSession[];
}

function groupByDay(sessions: ParkSession[], nowMs: number, locale: string): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const s of sessions) {
    const label = isSameDay(s.startedAtMs, nowMs)
      ? t('today')
      : isSameDay(s.startedAtMs, nowMs - 86_400_000)
        ? t('yesterday')
        : formatDateShort(s.startedAtMs, locale);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.sessions.push(s);
    else groups.push({ label, sessions: [s] });
  }
  return groups;
}

function SessionRow({ session, onPress }: { session: ParkSession; onPress: () => void }) {
  const { colors } = useTheme();
  const locale = getLocale();
  const endedAt = session.endedAtMs ?? session.startedAtMs;
  const exit = computeExitSummary(session.tariff, session.startedAtMs, endedAt);
  const currency = session.tariff?.currency;
  const meta = [session.placeName, session.floor, session.note].filter(Boolean).join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? colors.insetPressed : colors.inset,
        borderRadius: radius.r12,
        paddingHorizontal: spacing.s16,
        paddingVertical: spacing.s12,
        gap: spacing.s4,
      })}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.ink, fontVariant: ['tabular-nums'] }}>
          {formatClock(session.startedAtMs)} → {formatClock(endedAt)}
        </Text>
        <Text style={{ fontSize: 13, fontWeight: '800', color: colors.ink, fontVariant: ['tabular-nums'] }}>
          {formatDurationStamp(endedAt - session.startedAtMs).toLowerCase()}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Caption numberOfLines={1} style={{ flexShrink: 1 }}>
          {meta}
        </Caption>
        {exit.paid !== null && currency && (
          <Caption
            color={exit.saved !== null && exit.saved > 0 ? colors.accentText : colors.textSecondary}
            style={{ fontWeight: '800' }}
          >
            {formatMoney(exit.paid, currency, locale)}
            {exit.saved !== null && exit.saved > 0 ? ` · −${formatMoney(exit.saved, currency, locale)}` : ''}
          </Caption>
        )}
      </View>
    </Pressable>
  );
}

function EmptyState() {
  const { colors } = useTheme();
  return (
    <View style={{ gap: spacing.s12 }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ height: 44, borderRadius: radius.r12, backgroundColor: colors.inset }} />
      ))}
      <View style={{ gap: spacing.s4, marginTop: spacing.s8 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.ink }}>{t('noSessions')}</Text>
        <Caption>{t('firstParkHere')}</Caption>
      </View>
    </View>
  );
}

export function HistorySheet({
  visible,
  onClose,
  onOpenPaywall,
}: {
  visible: boolean;
  onClose: () => void;
  onOpenPaywall: () => void;
}) {
  const locale = getLocale();
  const isPremium = useIsPremium();
  const { colors } = useTheme();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [shareData, setShareData] = useState<SavingsCardData | null>(null);
  // Silme sonrası listeyi tazelemek için: memo yalnız `visible`e bakıyordu.
  const [revision, setRevision] = useState(0);

  // Modal her açılışta taze okur; visible değişimi memo'yu tazeler.
  const sessions = useMemo(() => {
    if (!visible) return [];
    try {
      return listEndedSessions();
    } catch {
      return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, revision]);

  // KPI'lar her zaman TÜM oturumlardan hesaplanır (§7.8: free'de de KPI görünür).
  const stats = useMemo(() => computeStats(sessions), [sessions]);
  const groups = useMemo(() => groupByDay(sessions, Date.now(), locale), [sessions, locale]);
  const selected = selectedId ? sessions.find((s) => s.id === selectedId) : undefined;

  const close = () => {
    setSelectedId(null);
    onClose();
  };

  if (selected) {
    return (
      <PageSheet
        visible={visible}
        title={selected.placeName ?? t('sessionDetail')}
        onClose={close}
        onBack={() => setSelectedId(null)}
      >
        <SessionDetail session={selected} />

        {/* Yanlış kaydı geçmişte taşımak zorunda kalmak istatistikleri de bozar. */}
        <Text
          accessibilityRole="button"
          onPress={() => {
            Alert.alert(t('deleteSessionTitle'), t('deleteSessionBody'), [
              { text: t('cancel'), style: 'cancel' },
              {
                text: t('delete'),
                style: 'destructive',
                onPress: () => {
                  useSessionStore.getState().deleteEndedSession(selected.id);
                  setSelectedId(null);
                  setRevision((r) => r + 1);
                },
              },
            ]);
          }}
          style={{ fontSize: 15, color: colors.warnText, paddingVertical: spacing.s16 }}
        >
          {t('delete')}
        </Text>
      </PageSheet>
    );
  }

  return (
    <PageSheet
      visible={visible}
      title={t('history')}
      onClose={close}
      // Özet sabit kalır, yalnız oturum listesi kayar.
      header={
        sessions.length > 0 ? (
          <>
            <StatTiles stats={stats} />
            <MonthlySavingsChart
              buckets={monthlySavings(sessions, Date.now())}
              currency={stats.savedCurrency}
            />
          </>
        ) : null
      }
    >

      {/* §11.1 aylık özet kartı — geçmişin viral bacağı */}
      {stats.totalSaved !== null && stats.totalSaved > 0 && (
        <GhostButton
          label={t('shareMonth')}
          onPress={() => {
            trackShareCard('month');
            setShareData({
              placeName: null,
              durationMs: stats.avgDurationMs ?? 0,
              paid: stats.totalPaid,
              saved: stats.totalSaved,
              currency: stats.savedCurrency,
              tariffState: null,
            });
          }}
          style={{ marginBottom: spacing.s24 }}
        />
      )}

      {/* Pro daveti geçmişte durur: kullanıcı kaç para biriktirdiğini tam
          burada görüyor. Tek satır, ünlemsiz — akışı kesmez. */}
      {!isPremium && sessions.length > 0 && (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            trackPaywallShown('history');
            onOpenPaywall();
          }}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.s12,
            marginBottom: spacing.s24,
            padding: spacing.s16,
            borderRadius: radius.r16,
            backgroundColor: pressed ? colors.insetPressed : colors.inset,
          })}
        >
          <SymbolView name="sparkle" size={17} tintColor={colors.ink} weight="regular" />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.ink }}>{t('goPro')}</Text>
            <Caption>{t('goProUpsell')}</Caption>
          </View>
          <SymbolView name="chevron.right" size={13} tintColor={colors.disabled} weight="semibold" />
        </Pressable>
      )}

      <ShareCardRenderer data={shareData} onDone={() => setShareData(null)} />
      {groups.length === 0 ? (
        <EmptyState />
      ) : (
        groups.map((group) => (
          <View key={group.label} style={{ marginBottom: spacing.s24 }}>
            <Overline style={{ marginBottom: spacing.s8 }}>{group.label}</Overline>
            <View style={{ gap: spacing.s12 }}>
              {group.sessions.map((s) => (
                <SessionRow key={s.id} session={s} onPress={() => setSelectedId(s.id)} />
              ))}
            </View>
          </View>
        ))
      )}

    </PageSheet>
  );
}

/**
 * §7.8: kilitli satırlar blur'suz; kilit ikonu `disabled`, ama satır METNİ
 * `text-secondary` — kilitli satırlar okunmak istenen paywall köprüsüdür,
 * bilgi taşıyan metin `disabled` grisiyle yazılamaz (§12).
 */
