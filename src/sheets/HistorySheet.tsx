import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useIsPremium } from '../state/premiumStore';
import { PageSheet } from '../components/PageSheet';
import { GhostButton } from '../components/Buttons';
import { MonthlySavingsChart } from '../components/MonthlySavingsChart';
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
import type { ParkSession } from '../state/sessionStore';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/tokens';

// §7.8 Geçmiş — iOS pageSheet. Gün gruplu liste (Today/Yesterday/tarih).
// Free 3-kayıt kilidi paywall tuğlasıyla birlikte gelecek (screens.md §9).

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

/** §7.8 free kilidi: son 3 kayıt açık, öncesi paywall köprüsü. */
const FREE_VISIBLE_SESSIONS = 3;

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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [shareData, setShareData] = useState<SavingsCardData | null>(null);

  // Modal her açılışta taze okur; visible değişimi memo'yu tazeler.
  const sessions = useMemo(() => {
    if (!visible) return [];
    try {
      return listEndedSessions();
    } catch {
      return [];
    }
  }, [visible]);

  // KPI'lar her zaman TÜM oturumlardan hesaplanır (§7.8: free'de de KPI görünür).
  const stats = useMemo(() => computeStats(sessions), [sessions]);
  const visible_ = isPremium ? sessions : sessions.slice(0, FREE_VISIBLE_SESSIONS);
  const lockedCount = sessions.length - visible_.length;
  const groups = useMemo(() => groupByDay(visible_, Date.now(), locale), [visible_, locale]);
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
      </PageSheet>
    );
  }

  return (
    <PageSheet visible={visible} title={t('history')} onClose={close}>
      {sessions.length > 0 && <StatTiles stats={stats} />}
      {sessions.length > 0 && (
        <MonthlySavingsChart
          buckets={monthlySavings(sessions, Date.now())}
          currency={stats.savedCurrency}
        />
      )}

      {/* §11.1 aylık özet kartı — geçmişin viral bacağı */}
      {stats.totalSaved !== null && stats.totalSaved > 0 && (
        <GhostButton
          label={t('shareMonth')}
          onPress={() =>
            setShareData({
              placeName: null,
              durationMs: stats.avgDurationMs ?? 0,
              paid: stats.totalPaid,
              saved: stats.totalSaved,
              currency: stats.savedCurrency,
              tariffState: null,
            })
          }
          style={{ marginBottom: spacing.s24 }}
        />
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

      {lockedCount > 0 && <LockedRows count={lockedCount} onPress={onOpenPaywall} />}
    </PageSheet>
  );
}

/**
 * §7.8: kilitli satırlar blur'suz; kilit ikonu `disabled`, ama satır METNİ
 * `text-secondary` — kilitli satırlar okunmak istenen paywall köprüsüdür,
 * bilgi taşıyan metin `disabled` grisiyle yazılamaz (§12).
 */
function LockedRows({ count, onPress }: { count: number; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.s12,
        backgroundColor: pressed ? colors.insetPressed : colors.inset,
        borderRadius: radius.r12,
        paddingHorizontal: spacing.s16,
        height: 44,
      })}
    >
      <SymbolView name="lock.fill" size={15} tintColor={colors.disabled} weight="regular" />
      <Caption color={colors.textSecondary} style={{ flex: 1 }}>
        {t('lockedSessions', { count })}
      </Caption>
      <SymbolView name="chevron.right" size={13} tintColor={colors.disabled} weight="semibold" />
    </Pressable>
  );
}
