import { Image, Pressable, Text, View } from 'react-native';
import { Caption, Overline } from '../components/Typography';
import { formatClock, formatDateShort, formatDurationStamp, formatMoney } from '../lib/format';
import { openInMaps } from '../lib/maps';
import { computeExitSummary } from '../lib/tariffMath';
import { getLocale, t, upper } from '../localization';
import type { ParkSession } from '../state/sessionStore';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/tokens';

// §7.8 oturum detayı. Gömülü harita Mapbox native build'iyle gelecek; konum
// bugün sistem haritasına devredilir — ölü placeholder bırakmayız.

function DetailRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.s12,
        borderBottomWidth: 1,
        borderBottomColor: colors.gridline,
      }}
    >
      <Caption>{label}</Caption>
      <Text
        style={{
          fontSize: 15,
          fontWeight: '800',
          color: valueColor ?? colors.ink,
          fontVariant: ['tabular-nums'],
        }}
      >
        {value}
      </Text>
    </View>
  );
}

export function SessionDetail({ session }: { session: ParkSession }) {
  const { colors } = useTheme();
  const locale = getLocale();
  const endedAt = session.endedAtMs ?? session.startedAtMs;
  const exit = computeExitSummary(session.tariff, session.startedAtMs, endedAt);
  const currency = session.tariff?.currency;
  const hasLocation = session.latitude !== null && session.longitude !== null;

  return (
    <View style={{ gap: spacing.s20 }}>
      <View style={{ gap: spacing.s4 }}>
        <Overline>
          {[formatDateShort(session.startedAtMs, locale), `${formatClock(session.startedAtMs)} → ${formatClock(endedAt)}`]
            .filter(Boolean)
            .join(' · ')}
        </Overline>
        {/* Yer adı burada display: nokta INK (§3.3 — yer adları noktayı korur, mürekkeptir) */}
        {session.placeName && (
          <Text
            style={{
              fontSize: 28,
              fontWeight: '900',
              letterSpacing: 28 * -0.02,
              color: colors.ink,
            }}
            maxFontSizeMultiplier={1.3}
          >
            {upper(session.placeName)}
            <Text style={{ color: colors.ink }}>.</Text>
          </Text>
        )}
      </View>

      {session.photoUri && (
        <Image
          source={{ uri: session.photoUri }}
          style={{ width: '100%', height: 220, borderRadius: radius.r16, backgroundColor: colors.inset }}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      )}

      <View>
        <DetailRow label={t('duration')} value={formatDurationStamp(endedAt - session.startedAtMs).toLowerCase()} />
        {exit.paid !== null && currency && (
          <DetailRow label={t('paid')} value={formatMoney(exit.paid, currency, locale)} />
        )}
        {exit.saved !== null && exit.saved > 0 && currency && (
          <DetailRow
            label={t('avoided')}
            value={`−${formatMoney(exit.saved, currency, locale)}`}
            valueColor={colors.accentText}
          />
        )}
        {!!session.floor && <DetailRow label={t('floor')} value={session.floor} />}
      </View>

      {!!session.note && (
        <View style={{ gap: spacing.s8 }}>
          <Overline>{t('note')}</Overline>
          <Text style={{ fontSize: 15, color: colors.ink }}>{session.note}</Text>
        </View>
      )}

      {hasLocation && (
        <Pressable
          accessibilityRole="button"
          onPress={() => openInMaps(session)}
          style={({ pressed }) => ({
            height: 44,
            borderRadius: radius.rFull,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? colors.insetPressed : colors.inset,
          })}
        >
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.ink }}>{t('openInMaps')}</Text>
        </Pressable>
      )}
    </View>
  );
}
