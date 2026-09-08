import { Text, View } from 'react-native';
import { hapticSelect } from '../lib/haptics';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/tokens';
import { PressScale } from './motion/PressScale';

// design.md §5 chip: 36pt görsel + hitSlop, tam radius, 13/600. Seçili = ink dolgu + beyaz metin,
// seçili değil = inset. Pressed 0.97 (PressScale), seçim değişince `selection` haptiği (§3).
// Tarife formu, park formu ve Ayarlar aynı bileşeni kullanır (ikinci kopya yazılmaz).

export interface ChipOption<T extends string | number> {
  key: T;
  label: string;
  /** Yeşil para tonu: hafızadan gelen tarife önerisi gibi "bunu seç" çipleri (§5.10). */
  tone?: 'accent';
}

export function ChipGroup<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: ChipOption<T>[];
  /** null = hiçbiri seçili değil (park anı soruları: çipler cevaptır, durum değil). */
  value: T | null;
  onChange: (key: T) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s8 }}>
      {options.map((opt) => {
        const selected = value === opt.key;
        return (
          <PressScale
            key={String(opt.key)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            hitSlop={4}
            onPress={() => {
              if (opt.key === value) return;
              hapticSelect();
              onChange(opt.key);
            }}
            style={(pressed) => ({
              height: 36,
              paddingHorizontal: spacing.s16,
              borderRadius: radius.rFull,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selected
                ? colors.ink
                : pressed
                  ? colors.insetPressed
                  : opt.tone === 'accent'
                    ? colors.alertBgMoney
                    : colors.inset,
            })}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: selected ? colors.card : opt.tone === 'accent' ? colors.accentText : colors.ink,
              }}
            >
              {opt.label}
            </Text>
          </PressScale>
        );
      })}
    </View>
  );
}
