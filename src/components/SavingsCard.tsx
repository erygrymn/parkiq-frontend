import { Text, View } from 'react-native';
import { formatDurationStamp, formatMoney } from '../lib/format';
import type { TariffState } from '../lib/tariffMath';
import { getLocale, t } from '../localization';

// §11.1 SAVINGS CARD — kanonik koyu ink kart, TEMA BAĞIMSIZ.
// 1080×1920 story. Zemin #141416. Partikül/konfeti yok; palet yalnız ink/beyaz/yeşil.
// Kart app koordinat uzayı dışındadır: ölçüler 1080 genişliğe göre sabittir,
// render sırasında tek bir ölçekle küçültülür (view-shot tam çözünürlükte yakalar).

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1920;

const INK = '#141416';
const GREEN = '#2FE07A';
const MUTED = '#8A8A93'; // koyu ink kartlarda text-tertiary HER ZAMAN dark değeri
const TRACK = '#26262B';

export interface SavingsCardData {
  placeName: string | null;
  durationMs: number;
  paid: number | null;
  saved: number | null;
  currency: string | null;
  /** Çubuk için tarife durumu; yoksa "makbuz" çubuğu çizilmez. */
  tariffState: TariffState | null;
}

function Column({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return (
    <View style={{ flex: 1, gap: 8 }}>
      <Text style={{ fontSize: 32, fontWeight: '800', letterSpacing: 32 * 0.14, color: MUTED }}>
        {label.toUpperCase()}
      </Text>
      <Text
        style={{
          fontSize: 64,
          fontWeight: '800',
          color: green ? GREEN : '#FFFFFF',
          fontVariant: ['tabular-nums'],
        }}
      >
        {value}
      </Text>
    </View>
  );
}

/** §11.1.4 mini tarife çubuğu "makbuzu" — çıkış noktasına kadar yeşil dolgu. */
function ReceiptBar({ state }: { state: TariffState }) {
  const knob = state.knobPct ?? 0;
  let acc = 0;
  const segments = state.segments.map((segment) => {
    const startPct = acc;
    acc += segment.widthPct;
    return { ...segment, startPct };
  });

  return (
    <View style={{ gap: 16 }}>
      <View style={{ height: 20, flexDirection: 'row' }}>
        {segments.map((segment, index) => {
          const fill = Math.min(1, Math.max(0, (knob - segment.startPct) / segment.widthPct));
          return (
            <View
              key={segment.startMin}
              style={{
                width: `${segment.widthPct}%`,
                height: 20,
                backgroundColor: TRACK,
                borderRadius: 10,
                overflow: 'hidden',
                marginLeft: index === 0 ? 0 : 4,
              }}
            >
              {fill > 0 && <View style={{ width: `${fill * 100}%`, height: '100%', backgroundColor: GREEN }} />}
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row' }}>
        {segments.map((segment, index) => (
          <Text
            key={`p${segment.startMin}`}
            numberOfLines={1}
            style={{
              width: `${segment.widthPct}%`,
              marginLeft: index === 0 ? 0 : 4,
              textAlign: 'center',
              fontSize: 32,
              color: MUTED,
              fontVariant: ['tabular-nums'],
            }}
          >
            {state.currency ? formatMoney(segment.cumulativePrice, state.currency, getLocale()) : ''}
          </Text>
        ))}
      </View>
    </View>
  );
}

export function SavingsCard({ data }: { data: SavingsCardData }) {
  const locale = getLocale();
  const savedText =
    data.saved !== null && data.currency ? formatMoney(data.saved, data.currency, locale) : null;
  const heroSaved = savedText !== null && data.saved !== null && data.saved > 0;

  return (
    <View
      style={{
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        backgroundColor: INK,
        paddingHorizontal: 96,
        paddingTop: 250,
        paddingBottom: 220,
        justifyContent: 'space-between',
      }}
    >
      <View style={{ gap: 56 }}>
        {/* Overline: konum max semt düzeyi, NOKTASIZ (§11.1.1) */}
        <Text style={{ fontSize: 40, fontWeight: '700', letterSpacing: 40 * 0.14, color: MUTED }}>
          {['PARKIQ', data.placeName?.toUpperCase()].filter(Boolean).join(' · ')}
        </Text>

        {/* Hero — karttaki TEK imza noktası */}
        <Text style={{ fontSize: 288, lineHeight: 288 * 0.98, fontWeight: '900', color: '#FFFFFF' }}>
          {heroSaved ? t('savedWord') : t('parkedWord')}
          {'\n'}
          <Text style={{ color: GREEN }}>
            {heroSaved ? savedText : formatDurationStamp(data.durationMs)}
            <Text style={{ color: GREEN }}>.</Text>
          </Text>
        </Text>

        <Text style={{ fontSize: 44, color: MUTED }}>
          {formatDurationStamp(data.durationMs).toLowerCase()}
        </Text>
      </View>

      <View style={{ gap: 72 }}>
        {data.tariffState && data.tariffState.segments.length > 0 && (
          <ReceiptBar state={data.tariffState} />
        )}

        <View style={{ flexDirection: 'row', gap: 32 }}>
          <Column label={t('duration')} value={formatDurationStamp(data.durationMs).toLowerCase()} />
          {data.paid !== null && data.currency && (
            <Column label={t('paid')} value={formatMoney(data.paid, data.currency, locale)} />
          )}
          {savedText && (
            <Column label={t('avoided')} value={savedText} green />
          )}
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 48, fontWeight: '900', color: '#FFFFFF', letterSpacing: -1 }}>
            PARKIQ<Text style={{ color: GREEN }}>.</Text>
          </Text>
          <Text style={{ fontSize: 36, color: MUTED }}>parkiq.app</Text>
        </View>
      </View>
    </View>
  );
}
