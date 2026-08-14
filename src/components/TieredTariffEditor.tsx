import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { t } from '../localization';
import { sanitizeTiers, type TariffTier } from '../lib/tariffMath';
import { fromMinutes, minutesOf, type TierUnit } from '../lib/tierUnits';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/tokens';
import { Caption, Overline } from './Typography';

// §7.4 dilimli tarife girişi: "0–30 dk ₺50 / 1–2 sa ₺100" gibi panolar için.
// Kullanıcı SÜRE girer, fiyat KÜMÜLATİF toplamdır (§5.9 veri modeli) —
// alan etiketleri bunu açıkça söyler, yoksa artımlı girip yanlış uyarı alır.
//
// Süre her satırda KENDİ birimini taşır. Tek birim (saat) dayatmak yarım
// saatlik dilimleri "0.5" diye yazdırıyordu; panolarda öyle bir şey yazmaz,
// pano "30 DK" der. Birim rozetine dokunmak dk ↔ sa arasında geçirir.

interface DraftRow {
  amount: string;
  unit: TierUnit;
  price: string;
}

function toTiers(rows: DraftRow[]): TariffTier[] {
  const parsed = rows
    .map((row) => ({
      endMin: Number(row.amount.replace(',', '.')) * minutesOf(row.unit),
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
          ...fromMinutes(tier.endMin),
          price: String(tier.cumulativePrice),
        }))
      : [
          { amount: '1', unit: 'hour', price: '' },
          { amount: '2', unit: 'hour', price: '' },
        ],
  );

  const update = (next: DraftRow[]) => {
    setRows(next);
    onChange(toTiers(next));
  };

  const setRow = (index: number, patch: Partial<DraftRow>) =>
    update(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  // Birim değişince SAYI OLDUĞU GİBİ KALIR, çevrilmez: "30 dk" → "30 sa".
  // Çevirmek ondalık üretir ("0.5 sa") ve bu ekranın kaçındığı şey tam olarak o.
  const toggleUnit = (index: number) =>
    setRow(index, { unit: rows[index].unit === 'min' ? 'hour' : 'min' });

  const addRow = () => {
    const last = rows[rows.length - 1];
    const previous = Number(last?.amount ?? '0');
    const unit: TierUnit = last?.unit ?? 'hour';
    // Bir sonraki sınır için makul adım: saatlerde +1, dakikalarda +30.
    const stepped = Number.isFinite(previous) ? previous + (unit === 'min' ? 30 : 1) : NaN;
    update([...rows, { amount: Number.isFinite(stepped) ? String(stepped) : '', unit, price: '' }]);
  };

  const removeRow = (index: number) => update(rows.filter((_, i) => i !== index));

  const fieldStyle = {
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
        <Overline style={{ flex: 1 }}>{t('untilDuration')}</Overline>
        <Overline style={{ flex: 1 }}>{t('totalSoFar')}</Overline>
        <View style={{ width: 32 }} />
      </View>

      {rows.map((row, index) => (
        <View key={index} style={{ flexDirection: 'row', gap: spacing.s8, alignItems: 'center' }}>
          {/* Süre + birim tek bir alan gibi görünür; rozet dk ↔ sa geçirir. */}
          <View
            style={{
              flex: 1,
              height: 44,
              borderRadius: radius.r12,
              backgroundColor: colors.inset,
              flexDirection: 'row',
              alignItems: 'center',
              paddingRight: spacing.s4,
            }}
          >
            <BottomSheetTextInput
              value={row.amount}
              onChangeText={(amount) => setRow(index, { amount })}
              keyboardType="number-pad"
              placeholder={row.unit === 'min' ? '30' : '1'}
              placeholderTextColor={colors.textSecondary}
              style={[fieldStyle, { flex: 1, backgroundColor: 'transparent' }]}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('unitToggle')}
              onPress={() => toggleUnit(index)}
              hitSlop={8}
              style={({ pressed }) => ({
                height: 32,
                minWidth: 40,
                paddingHorizontal: spacing.s8,
                borderRadius: radius.r8,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: pressed ? colors.card : colors.insetPressed,
              })}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>
                {t(row.unit === 'min' ? 'unitMinShort' : 'unitHourShort')}
              </Text>
            </Pressable>
          </View>

          <BottomSheetTextInput
            value={row.price}
            onChangeText={(price) => setRow(index, { price })}
            keyboardType="decimal-pad"
            placeholder="50"
            placeholderTextColor={colors.textSecondary}
            style={[fieldStyle, { flex: 1 }]}
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
