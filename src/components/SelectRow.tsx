import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/tokens';

// Ayar satırı + açılır liste. Çip grubu iki-üç kısa seçenek için doğru araç
// (görünüm: açık/koyu/sistem), ama para birimi ya da uyarı eşiği gibi listelerde
// satırı taşırıyor ve seçili değer bir bakışta okunmuyordu.
//
// Liste satırın ALTINA açılır, ayrı bir pencereye değil: sayfanın kendi kaydırma
// alanında kalır, üst üste binen modal yığını olmaz.

export function SelectRow<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { key: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.key === value);

  return (
    <View style={{ marginBottom: spacing.s8 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: selected?.label }}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((previous) => !previous)}
        hitSlop={4}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 44,
            gap: spacing.s12,
          }}
        >
          <Text style={{ fontSize: 15, color: colors.ink }}>{label}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s8 }}>
            <Text numberOfLines={1} style={{ fontSize: 15, color: colors.textSecondary }}>
              {selected?.label ?? '—'}
            </Text>
            <SymbolView
              name={open ? 'chevron.up' : 'chevron.down'}
              size={12}
              tintColor={colors.disabled}
              weight="semibold"
            />
          </View>
        </View>
      </Pressable>

      {open && (
        <View
          style={{
            borderRadius: radius.r12,
            backgroundColor: colors.inset,
            overflow: 'hidden',
            marginBottom: spacing.s8,
          }}
        >
          {options.map((option, index) => {
            const isSelected = option.key === value;
            return (
              <Pressable
                key={String(option.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => {
                  onChange(option.key);
                  setOpen(false);
                }}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  height: 44,
                  paddingHorizontal: spacing.s12,
                  backgroundColor: pressed ? colors.insetPressed : 'transparent',
                  borderTopWidth: index === 0 ? 0 : 1,
                  borderTopColor: colors.gridline,
                })}
              >
                <Text
                  style={{
                    fontSize: 15,
                    color: colors.ink,
                    fontWeight: isSelected ? '600' : '400',
                  }}
                >
                  {option.label}
                </Text>
                {isSelected && (
                  <SymbolView name="checkmark" size={13} tintColor={colors.accentFill} weight="semibold" />
                )}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
