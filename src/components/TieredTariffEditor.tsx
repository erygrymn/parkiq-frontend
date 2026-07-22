import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { t } from '../localization';
import { sanitizeTiers, type TariffTier } from '../lib/tariffMath';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/tokens';
import { Caption, Overline } from './Typography';

// §7.4 dilimli tarife girişi: "0–1s ₺50 / 1–2s ₺100" gibi panolar için.
// Kullanıcı SÜRE girer (saat), fiyat KÜMÜLATİF toplamdır (§5.9 veri modeli) —
// alan etiketleri bunu açıkça söyler, yoksa artımlı girip yanlış uyarı alır.

interface DraftRow {
  hours: string;
  price: string;
}

function toTiers(rows: DraftRow[]): TariffTier[] {
  const parsed = rows
    .map((row) => ({
      endMin: Number(row.hours.replace(',', '.')) * 60,
      cumulativePrice: Number(row.price.replace(',', '.')),
    }))
    .filter((tier) => Number.isFinite(tier.endMin) && Number.isFinite(tier.cumulativePrice));
  return sanitizeTiers(parsed);
}

export function TieredTariffEditor({
  initialTiers,
  onChange,
}: {
  initialTiers: TariffTier[] | undefined;
  onChange: (tiers: TariffTier[]) => void;
}) {
  const { colors } = useTheme();
  const [rows, setRows] = useState<DraftRow[]>(() =>
    initialTiers && initialTiers.length > 0
      ? initialTiers.map((tier) => ({
          hours: String(tier.endMin / 60),
          price: String(tier.cumulativePrice),
        }))
      : [
          { hours: '1', price: '' },
          { hours: '2', price: '' },
        ],
  );

  const update = (next: DraftRow[]) => {
    setRows(next);
    onChange(toTiers(next));
  };

  const setRow = (index: number, patch: Partial<DraftRow>) =>
    update(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const addRow = () => {
    const lastHours = Number(rows[rows.length - 1]?.hours ?? '0');
    update([...rows, { hours: String(Number.isFinite(lastHours) ? lastHours + 1 : ''), price: '' }]);
  };

  const removeRow = (index: number) => update(rows.filter((_, i) => i !== index));

  const inputStyle = {
    height: 44,
    borderRadius: radius.r12,
    backgroundColor: colors.inset,
    paddingHorizontal: spacing.s12,
    fontSize: 15,
    color: colors.ink,
    fontVariant: ['tabular-nums' as const],
  };

  return (
    <View style={{ gap: spacing.s8 }}>
      <View style={{ flexDirection: 'row', gap: spacing.s8 }}>
        <Overline style={{ flex: 1 }}>{t('untilHours')}</Overline>
        <Overline style={{ flex: 1 }}>{t('totalSoFar')}</Overline>
        <View style={{ width: 32 }} />
      </View>

      {rows.map((row, index) => (
        <View key={index} style={{ flexDirection: 'row', gap: spacing.s8, alignItems: 'center' }}>
          <BottomSheetTextInput
            value={row.hours}
            onChangeText={(hours) => setRow(index, { hours })}
            keyboardType="decimal-pad"
            placeholder="1"
            placeholderTextColor={colors.textSecondary}
            style={[inputStyle, { flex: 1 }]}
          />
          <BottomSheetTextInput
            value={row.price}
            onChangeText={(price) => setRow(index, { price })}
            keyboardType="decimal-pad"
            placeholder="50"
            placeholderTextColor={colors.textSecondary}
            style={[inputStyle, { flex: 1 }]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('delete')}
            onPress={() => removeRow(index)}
            disabled={rows.length <= 1}
            hitSlop={8}
            style={{ width: 32, alignItems: 'center' }}
          >
            <SymbolView
              name="minus.circle"
              size={19}
              tintColor={rows.length <= 1 ? colors.disabled : colors.textSecondary}
              weight="regular"
            />
          </Pressable>
        </View>
      ))}

      <Pressable
        accessibilityRole="button"
        onPress={addRow}
        style={({ pressed }) => ({
          height: 44,
          borderRadius: radius.r12,
          backgroundColor: pressed ? colors.insetPressed : colors.inset,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.s8,
          paddingHorizontal: spacing.s12,
        })}
      >
        <SymbolView name="plus" size={15} tintColor={colors.ink} weight="regular" />
        <Text style={{ fontSize: 15, color: colors.ink }}>{t('addTier')}</Text>
      </Pressable>

      <Caption>{t('cumulativeHint')}</Caption>
    </View>
  );
}
