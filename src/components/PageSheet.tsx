import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { upper } from '../localization';
import { useTheme } from '../theme';
import { radius, spacing, typeScale } from '../theme/tokens';

// §7 mimarisi: Geçmiş/Ayarlar/Paywall iOS pageSheet olarak açılır.
// Ortak kabuk: başlık + kapatma + kaydırılabilir gövde.

export function PageSheet({
  visible,
  title,
  onClose,
  onBack,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  /** Verilirse başlığın soluna geri oku çıkar (liste → detay gezinmesi). */
  onBack?: () => void;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: spacing.s20,
            paddingTop: spacing.s20,
            paddingBottom: spacing.s12,
            gap: spacing.s12,
          }}
        >
          {onBack && (
            <Pressable
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel={title}
              hitSlop={8}
              style={({ pressed }) => ({
                width: 32,
                height: 32,
                borderRadius: radius.r8 + 2,
                backgroundColor: pressed ? colors.insetPressed : colors.inset,
                alignItems: 'center',
                justifyContent: 'center',
              })}
            >
              <SymbolView name="chevron.left" size={14} tintColor={colors.ink} weight="semibold" />
            </Pressable>
          )}
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              fontSize: typeScale.title.fontSize,
              fontWeight: typeScale.title.fontWeight,
              letterSpacing: typeScale.title.letterSpacing,
              color: colors.ink,
            }}
          >
            {upper(title)}
          </Text>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={title}
            hitSlop={8}
            style={({ pressed }) => ({
              width: 32,
              height: 32,
              borderRadius: radius.r8 + 2,
              backgroundColor: pressed ? colors.insetPressed : colors.inset,
              alignItems: 'center',
              justifyContent: 'center',
            })}
          >
            <SymbolView name="xmark" size={14} tintColor={colors.ink} weight="semibold" />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.s20, paddingBottom: spacing.s40 }}>
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}

/** Ayarlar/geçmiş içi bölüm başlığı + gövde. */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ marginBottom: spacing.s24, gap: spacing.s8 }}>
      <SectionLabel>{title}</SectionLabel>
      {children}
    </View>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <Text
      style={{
        fontSize: typeScale.overline.fontSize,
        fontWeight: typeScale.overline.fontWeight,
        letterSpacing: typeScale.overline.letterSpacing,
        color: colors.textTertiary,
      }}
    >
      {typeof children === 'string' ? upper(children) : children}
    </Text>
  );
}
