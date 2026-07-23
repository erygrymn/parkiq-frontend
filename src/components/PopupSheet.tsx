import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t, upper } from '../localization';
import { useTheme } from '../theme';
import { radius, spacing, typeScale } from '../theme/tokens';
import { PrimaryCta } from './Buttons';

/**
 * Tek bir ayarı düzenlemek için alttan açılan küçük yüzey. Park formu bu yüzden
 * modüler: tüm alanlar tek panele yığıldığında ekrana sığmıyor, CTA erişilemez
 * kalıyordu. Her satır kendi popup'ını açar, popup içerik boyunda kalır.
 *
 * Klavye yönetimi burada toplanır — `KeyboardAvoidingView` alanı yukarı iter,
 * zemine dokunmak kapatır, "Bitti" her zaman klavyenin üstünde kalır.
 */
export function PopupSheet({
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
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'flex-end' }}
      >
        {/* Zemin: dokunulunca kapanır. Panelin kendisi dokunuşu yutar. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('close')}
          onPress={onClose}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
        />
        <View
          style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: radius.r24,
            borderTopRightRadius: radius.r24,
            paddingHorizontal: spacing.s20,
            paddingTop: spacing.s20,
            paddingBottom: insets.bottom + spacing.s20,
            gap: spacing.s16,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s12 }}>
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
              accessibilityRole="button"
              accessibilityLabel={t('close')}
              onPress={onClose}
              hitSlop={8}
              style={({ pressed }) => ({
                width: 32,
                height: 32,
                borderRadius: radius.r12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: pressed ? colors.insetPressed : colors.inset,
              })}
            >
              <SymbolView name="xmark" size={13} tintColor={colors.ink} weight="semibold" />
            </Pressable>
          </View>

          {/* İçerik uzarsa kayar; kısa kalırsa panel içeriğe göre küçülür. */}
          <ScrollView
            bounces={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: spacing.s16 }}
            style={{ flexGrow: 0 }}
          >
            {children}
          </ScrollView>

          <PrimaryCta label={t('done')} onPress={onClose} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/**
 * Park formundaki satır: etiket + o anki değer + chevron. Değer yoksa
 * yer tutucu gri kalır, böylece "doldurulmamış" hemen okunur.
 */
export function DetailRow({
  label,
  value,
  placeholder,
  onPress,
}: {
  label: string;
  value: string | null;
  placeholder: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const filled = value !== null && value.length > 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${filled ? value : placeholder}`}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.s12,
        minHeight: 52,
        paddingHorizontal: spacing.s16,
        borderRadius: radius.r12,
        backgroundColor: pressed ? colors.insetPressed : colors.inset,
      })}
    >
      <Text style={{ fontSize: 15, color: colors.ink }}>{label}</Text>
      <Text
        numberOfLines={1}
        style={{
          flex: 1,
          textAlign: 'right',
          fontSize: 15,
          color: filled ? colors.textSecondary : colors.disabled,
        }}
      >
        {filled ? value : placeholder}
      </Text>
      <SymbolView name="chevron.right" size={13} tintColor={colors.disabled} weight="semibold" />
    </Pressable>
  );
}
