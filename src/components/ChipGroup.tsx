import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/tokens';

// §5.5 chip: 32pt, tam radius. Seçili = ink dolgu, seçili değil = inset.
// Tarife formu ve Ayarlar aynı bileşeni kullanır (ikinci kopya yazılmaz).

export interface ChipOption<T extends string | number> {
  key: T;
  label: string;
}

export function ChipGroup<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: ChipOption<T>[];
  value: T;
  onChange: (key: T) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s8 }}>
      {options.map((opt) => {
        const selected = value === opt.key;
        return (
          <Pressable
            key={String(opt.key)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(opt.key)}
            style={({ pressed }) => ({
              height: 32,
              paddingHorizontal: spacing.s12,
              borderRadius: radius.rFull,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selected ? colors.ink : pressed ? colors.insetPressed : colors.inset,
            })}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: selected ? colors.card : colors.ink }}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
