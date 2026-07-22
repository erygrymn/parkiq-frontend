import { Text, View } from 'react-native';
import { formatClock, formatMoney } from '../lib/format';
import { getLocale, t } from '../localization';
import type { TariffState } from '../lib/tariffMath';
import { useTheme } from '../theme';
import { spacing } from '../theme/tokens';
import { Overline } from './Typography';

// §5.9 görsel spec. Tüm geometri TariffState'ten gelir (tek kaynak matematiği);
// bu bileşen hiçbir yüzde/durum hesabı yapmaz, yalnız çizer.

const TRACK_HEIGHT = 12;
const KNOB_SIZE = 18;

function segmentFillRatio(knobPct: number | null, segStartPct: number, segWidthPct: number): number {
  if (knobPct === null) return 0;
  return Math.min(1, Math.max(0, (knobPct - segStartPct) / segWidthPct));
}

export function TariffBar({ state }: { state: TariffState }) {
  const { colors, scheme } = useTheme();
  if (state.mode !== 'tiered' || state.segments.length === 0) return null;

  const amber = state.barTone !== 'green';
  const fillColorFor = (active: boolean) => (active && amber ? colors.warnFill : colors.accentFill);

  // Segment başlangıç yüzdeleri (etiket/knob konumlandırma için kümülatif)
  let acc = 0;
  const segs = state.segments.map((seg) => {
    const startPct = acc;
    acc += seg.widthPct;
    return { ...seg, startPct };
  });

  const knobRing = scheme === 'dark' ? colors.card : '#FFFFFF';
  const knobFill = amber ? colors.warnFill : scheme === 'dark' ? colors.accentFill : colors.ink;
  const approaching = state.barTone === 'amber-approaching';

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.s4 }}>
        <Overline>{t('tariff')}</Overline>
        {state.nextBoundaryAtMs !== null && (
          <Overline color={colors.ink}>
            {t('nextTier')} {formatClock(state.nextBoundaryAtMs)}
          </Overline>
        )}
      </View>

      <View style={{ height: TRACK_HEIGHT, flexDirection: 'row' }}>
        {segs.map((seg, i) => {
          const first = i === 0;
          const last = i === segs.length - 1;
          const ratio = segmentFillRatio(state.knobPct, seg.startPct, seg.widthPct);
          return (
            <View
              key={`${seg.startMin}`}
              style={{
                width: `${seg.widthPct}%`,
                height: TRACK_HEIGHT,
                backgroundColor: colors.track,
                overflow: 'hidden',
                // Ayraç: 2px zemin rengi gap (asla stroke) — §5.9
                marginLeft: first ? 0 : 2,
                borderTopLeftRadius: first ? TRACK_HEIGHT / 2 : 2,
                borderBottomLeftRadius: first ? TRACK_HEIGHT / 2 : 2,
                borderTopRightRadius: last ? TRACK_HEIGHT / 2 : 2,
                borderBottomRightRadius: last ? TRACK_HEIGHT / 2 : 2,
              }}
            >
              {ratio > 0 && (
                <View
                  style={{
                    width: `${ratio * 100}%`,
                    height: '100%',
                    backgroundColor: fillColorFor(seg.active),
                    opacity: seg.endMin === null ? 0.85 : 1,
                  }}
                />
              )}
            </View>
          );
        })}

        {state.knobPct !== null && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: `${state.knobPct}%`,
              top: TRACK_HEIGHT / 2 - KNOB_SIZE / 2,
              marginLeft: -KNOB_SIZE / 2,
              width: KNOB_SIZE,
              height: KNOB_SIZE,
              borderRadius: KNOB_SIZE / 2,
              // §5.9: approaching'de knob dolu daireden HALKAYA döner (ikinci kanal)
              backgroundColor: approaching ? colors.card : knobFill,
              borderWidth: approaching ? 4 : 3.5,
              borderColor: approaching ? colors.warnFill : knobRing,
            }}
          />
        )}
      </View>

      <View style={{ flexDirection: 'row', marginTop: spacing.s4 }}>
        {segs.map((seg, i) => (
          <Text
            key={`p${seg.startMin}`}
            numberOfLines={1}
            style={{
              width: `${seg.widthPct}%`,
              marginLeft: i === 0 ? 0 : 2,
              textAlign: 'center',
              fontSize: 11,
              // Geçilmiş dilim fiyatı: renk değil AĞIRLIK sinyali (§5.9)
              fontWeight: seg.passed ? '400' : '800',
              color: seg.passed ? colors.textSecondary : colors.ink,
              fontVariant: ['tabular-nums'],
            }}
          >
            {state.currency ? formatMoney(seg.cumulativePrice, state.currency, getLocale()) : seg.cumulativePrice}
          </Text>
        ))}
      </View>
    </View>
  );
}
