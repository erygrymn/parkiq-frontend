import { ProBadge } from '../components/ProBadge';
import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { GhostButton } from '../components/Buttons';
import { ConfirmSheet } from '../components/ConfirmSheet';
import { MonthlySavingsChart } from '../components/MonthlySavingsChart';
import type { SavingsCardData } from '../components/SavingsCard';
import { ShareCardRenderer } from '../components/ShareCardRenderer';
import { StatTiles } from '../components/StatTiles';
import { Caption, Overline } from '../components/Typography';
import { listEndedSessions } from '../db/sessionRepo';
import { trackPaywallShown, trackShareCard } from '../lib/analytics';
import { formatClock, formatDateShort, formatDurationStamp, formatMoney, isSameDay } from '../lib/format';
import { hapticSelect } from '../lib/haptics';
import { monthlySavings } from '../lib/monthlyStats';
import { computeStats } from '../lib/stats';
import { computeExitSummary } from '../lib/tariffMath';
import { getLocale, t, upper } from '../localization';
import { useIsPremium } from '../state/premiumStore';
import { useSessionStore, type ParkSession } from '../state/sessionStore';
import { useUiStore } from '../state/uiStore';
import { useTheme } from '../theme';
import { CROSSFADE_MS } from '../theme/motion';
import { radius, spacing, typeScale } from '../theme/tokens';
import { SessionDetail } from './SessionDetail';

// design.md §7.9 Geçmiş — ayrı ekran değil, kök sheet'in bir sahnesi (İlke 9). Harita üstte kalır:
// geçmiş park noktaları haritada işaretlenir, satıra dokununca kamera o noktaya uçar ve pin
// büyür; detay aynı sheet içinde açılır. Kutusuz KPI, hairline satırlar, ilk 8 satır stagger.
// Silme onayı ConfirmSheet. Geçmiş HERKESE AÇIK (2026-08-15 premium kararı).

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

function SquareButton({ symbol, label, onPress }: { symbol: 'chevron.left' | 'xmark'; label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
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
      <SymbolView name={symbol} size={14} tintColor={colors.ink} weight="semibold" />
    </Pressable>
  );
}

function SessionRow({ session, onPress }: { session: ParkSession; onPress: () => void }) {
  const { colors } = useTheme();
  const locale = getLocale();
  const endedAt = session.endedAtMs ?? session.startedAtMs;
  const exit = computeExitSummary(session.tariff, session.startedAtMs, endedAt);
  const currency = session.tariff?.currency;
  const meta = [session.placeName, session.floor].filter(Boolean).join(' · ');
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

export function HistoryScene({ onOpenPaywall }: { onOpenPaywall: () => void }) {
  const locale = getLocale();
  const isPremium = useIsPremium();
  const { colors } = useTheme();
  const selectedId = useUiStore((s) => s.historySelectedId);
  const { closeHistory, selectHistory, setHistorySpots } = useUiStore.getState();
  const [shareData, setShareData] = useState<SavingsCardData | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Silme sonrası listeyi tazelemek için.
  const [revision, setRevision] = useState(0);

  const sessions = useMemo(() => {
    try {
      return listEndedSessions();
    } catch {
      return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision]);

  // Harita katmanı: koordinatı olan her oturum bir nokta. Sahne kapanınca temizlenir.
  useEffect(() => {
    setHistorySpots(
      sessions
        .filter((s) => s.latitude !== null && s.longitude !== null)
        .map((s) => ({ id: s.id, latitude: s.latitude as number, longitude: s.longitude as number })),
    );
    return () => setHistorySpots([]);
  }, [sessions, setHistorySpots]);

  const stats = useMemo(() => computeStats(sessions), [sessions]);
  const groups = useMemo(() => groupByDay(sessions, Date.now(), locale), [sessions, locale]);
  const selected = selectedId ? sessions.find((s) => s.id === selectedId) : undefined;

  if (selected) {
    return (
      <Animated.View key={selected.id} entering={FadeIn.duration(CROSSFADE_MS)} style={{ paddingHorizontal: spacing.s20, paddingBottom: spacing.s20, gap: spacing.s16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s12 }}>
          <SquareButton symbol="chevron.left" label={t('history')} onPress={() => selectHistory(null)} />
          <Overline style={{ flex: 1 }} numberOfLines={1}>
            {t('history')}
          </Overline>
          <SquareButton symbol="xmark" label={t('close')} onPress={closeHistory} />
        </View>

        <SessionDetail session={selected} />

        {/* Yanlış kaydı geçmişte taşımak zorunda kalmak istatistikleri de bozar. */}
        <Text
          accessibilityRole="button"
          onPress={() => setConfirmDelete(true)}
          style={{ fontSize: 15, color: colors.warnText, paddingVertical: spacing.s8 }}
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
            selectHistory(null);
            setRevision((r) => r + 1);
          }}
        />
      </Animated.View>
    );
  }

  let rowIndex = 0;

  return (
    <View style={{ paddingHorizontal: spacing.s20, paddingBottom: spacing.s20, gap: spacing.s16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s12 }}>
        <Text
          style={{
            flex: 1,
            fontSize: typeScale.title.fontSize,
            fontWeight: typeScale.title.fontWeight,
            letterSpacing: typeScale.title.letterSpacing,
            color: colors.ink,
          }}
        >
          {upper(t('history'))}
        </Text>
        <SquareButton symbol="xmark" label={t('close')} onPress={closeHistory} />
      </View>

      {sessions.length > 0 && (
        <View>
          <StatTiles stats={stats} />
          <MonthlySavingsChart buckets={monthlySavings(sessions, Date.now())} currency={stats.savedCurrency} />
        </View>
      )}

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
            paddingVertical: spacing.s12,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: colors.gridline,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <ProBadge size={16} />
          <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: colors.ink }}>{t('goPro')}</Text>
          <SymbolView name="chevron.right" size={13} tintColor={colors.disabled} weight="semibold" />
        </Pressable>
      )}

      <ShareCardRenderer data={shareData} onDone={() => setShareData(null)} />

      {groups.length === 0 ? (
        <EmptyState />
      ) : (
        groups.map((group) => (
          <View key={group.label}>
            <Overline style={{ marginBottom: spacing.s4 }}>{group.label}</Overline>
            <View style={{ borderTopWidth: 1, borderTopColor: colors.gridline }}>
              {group.sessions.map((s) => {
                const index = rowIndex;
                rowIndex += 1;
                const row = (
                  <SessionRow
                    key={s.id}
                    session={s}
                    onPress={() => {
                      // Satır seçimi haritayı o noktaya uçurur (MapboxCanvas uiStore'u izler).
                      hapticSelect();
                      selectHistory(s.id);
                    }}
                  />
                );
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
    </View>
  );
}
