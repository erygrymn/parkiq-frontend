import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { GhostButton } from '../components/Buttons';
import { ConfirmSheet } from '../components/ConfirmSheet';
import { MonthlySavingsChart } from '../components/MonthlySavingsChart';
import { PageSheet } from '../components/PageSheet';
import type { SavingsCardData } from '../components/SavingsCard';
import { ShareCardRenderer } from '../components/ShareCardRenderer';
import { StatTiles } from '../components/StatTiles';
import { Caption, Overline } from '../components/Typography';
import { listEndedSessions } from '../db/sessionRepo';
import { trackPaywallShown, trackShareCard } from '../lib/analytics';
import { formatClock, formatDateShort, formatDurationStamp, formatMoney, isSameDay } from '../lib/format';
import { monthlySavings } from '../lib/monthlyStats';
import { computeStats } from '../lib/stats';
import { computeExitSummary } from '../lib/tariffMath';
import { getLocale, t } from '../localization';
import { useIsPremium } from '../state/premiumStore';
import { useSessionStore, type ParkSession } from '../state/sessionStore';
import { useTheme } from '../theme';
import { CROSSFADE_MS } from '../theme/motion';
import { radius, spacing } from '../theme/tokens';
import { SessionDetail } from './SessionDetail';

// design.md §7.9 Geçmiş — pageSheet. Kutusuz KPI satırı, gün gruplu hairline satırlar,
// ilk açılışta ≤8 satır 50 ms stagger. Silme onayı ConfirmSheet (sistem alert yok).
// Geçmiş HERKESE AÇIK (2026-08-15 premium kararı).

const STAGGER_MAX = 8;

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
  const saved = exit.saved !== null && exit.saved > 0;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        paddingVertical: spacing.s12,
        gap: spacing.s4,
        borderBottomWidth: 1,
        borderBottomColor: colors.gridline,
        opacity: pressed ? 0.6 : 1,
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
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.s12 }}>
        <Caption numberOfLines={1} style={{ flexShrink: 1 }}>
          {meta}
        </Caption>
        {exit.paid !== null && currency && (
          <Caption color={saved ? colors.accentText : colors.textSecondary} style={{ fontWeight: '800', fontVariant: ['tabular-nums'] }}>
            {formatMoney(exit.paid, currency, locale)}
            {saved && exit.saved !== null ? ` · −${formatMoney(exit.saved, currency, locale)}` : ''}
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
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Silme sonrası listeyi tazelemek için: memo yalnız `visible`e bakıyordu.
  const [revision, setRevision] = useState(0);

  const sessions = useMemo(() => {
    if (!visible) return [];
    try {
      return listEndedSessions();
    } catch {
      return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, revision]);

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
          onPress={() => setConfirmDelete(true)}
          style={{ fontSize: 15, color: colors.warnText, paddingVertical: spacing.s16 }}
        >
          {t('delete')}
        </Text>

        <ConfirmSheet
          visible={confirmDelete}
          title={t('deleteSessionTitle')}
          body={t('deleteSessionBody')}
          confirmLabel={t('delete')}
          cancelLabel={t('cancel')}
          onClose={() => setConfirmDelete(false)}
          onConfirm={() => {
            useSessionStore.getState().deleteEndedSession(selected.id);
            setSelectedId(null);
            setRevision((r) => r + 1);
          }}
        />
      </PageSheet>
    );
  }

  let rowIndex = 0;

  return (
    <PageSheet
      visible={visible}
      title={t('history')}
      onClose={close}
      header={
        sessions.length > 0 ? (
          <>
            <StatTiles stats={stats} />
            <MonthlySavingsChart buckets={monthlySavings(sessions, Date.now())} currency={stats.savedCurrency} />
          </>
        ) : null
      }
    >
      {/* §9 aylık özet kartı — geçmişin viral bacağı */}
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

      {/* Pro daveti geçmişte durur: kullanıcı kaç para biriktirdiğini tam burada görüyor. */}
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
            paddingVertical: spacing.s12,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: colors.gridline,
            opacity: pressed ? 0.6 : 1,
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
            <Overline style={{ marginBottom: spacing.s4 }}>{group.label}</Overline>
            <View style={{ borderTopWidth: 1, borderTopColor: colors.gridline }}>
              {group.sessions.map((s) => {
                const index = rowIndex;
                rowIndex += 1;
                const row = <SessionRow key={s.id} session={s} onPress={() => setSelectedId(s.id)} />;
                // §3 stagger: yalnız ilk 8 satır, yalnız ilk mount.
                return index < STAGGER_MAX ? (
                  <Animated.View key={s.id} entering={FadeInDown.delay(index * 50).duration(CROSSFADE_MS)}>
                    {row}
                  </Animated.View>
                ) : (
                  row
                );
              })}
            </View>
          </View>
        ))
      )}
    </PageSheet>
  );
}
