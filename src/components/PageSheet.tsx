import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { upper } from '../localization';
import { useTheme } from '../theme';
import { radius, spacing, typeScale } from '../theme/tokens';

// design.md §7: Ayarlar iOS pageSheet olarak açılır (Geçmiş kök sheet sahnesi, Paywall tam ekran).
// Ortak kabuk: ortalanmış 17/600 başlık (sistem nav bar hissi, çift kabuk yok) + kapatma +
// kaydırılabilir gövde. Koyu temada kart zemini bir basamak açık (`surface/card`): arkadaki
// kararmış haritayla kaynaşmasın.

export function PageSheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const { colors, scheme } = useTheme();
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {/* RN Modal ayrı bir pencere: içindeki ConfirmSheet'in kendi portal sağlayıcısı olmalı. */}
      <BottomSheetModalProvider>
      <View style={{ flex: 1, backgroundColor: scheme === 'dark' ? colors.card : colors.bg }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            height: 56,
            paddingHorizontal: spacing.s20,
            gap: spacing.s12,
          }}
        >
          <View style={{ width: 32 }} />
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: typeScale.headline.fontSize,
              fontWeight: typeScale.headline.fontWeight,
              color: colors.ink,
            }}
          >
            {title}
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

        <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.s20, paddingTop: spacing.s8, paddingBottom: spacing.s40 }}>
          {children}
        </ScrollView>
      </View>
      </BottomSheetModalProvider>
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
