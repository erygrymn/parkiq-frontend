import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  useBottomSheetSpringConfigs,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Modal, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t, upper } from '../localization';
import { useTheme } from '../theme';
import { SPRING } from '../theme/motion';
import { radius, spacing, typeScale } from '../theme/tokens';
import { PrimaryCta } from './Buttons';

/**
 * Tek bir ayarı düzenlemek için alttan gelen küçük yüzey (tarife editörü, filtreler).
 *
 * design.md İlke 9 gereği panel gorhom'dur: jestle sürülür, kesilebilir, kök sheet ile aynı
 * spring'i (§3 `SPRING`) kullanır. Zemin 200 ms fade, panel spring ile gelir. Klavye:
 * `keyboardBehavior="interactive"`; içerik uzarsa panel %88'de durur ve içi kayar.
 *
 * Taşıyıcı neden RN Modal: `BottomSheetModal` portal konağına çizilir ve gorhom 5.2'de o konak
 * sağlayıcının İLK çocuğudur — uygulamanın geri kalanı sonra geldiği için panelin ÜSTÜNE boyanır.
 * Panel açılıyordu ama haritanın arkasında kalıyordu: filtre butonu ölü, tarife editöründeki "Gir"
 * basılamaz görünüyordu. Ayrı bir pencere bu sıralamayı tamamen atlar.
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
  const { height } = useWindowDimensions();
  const ref = useRef<BottomSheet>(null);
  const springs = useBottomSheetSpringConfigs(SPRING);
  // Pencere panelden önce açılır, paneli kapanma animasyonu bitene kadar da açık tutar.
  const [mounted, setMounted] = useState(visible);
  // Kapanış `visible` prop'undan geldiyse `onClose` çağrılmaz: filtre paneli haritadan alan
  // seçilirken GEÇİCİ olarak çekilir, sahibi hâlâ açık saymalı ki seçim bitince geri gelsin.
  const closingFromProp = useRef(false);

  useEffect(() => {
    if (visible) {
      closingFromProp.current = false;
      setMounted(true);
    } else if (mounted) {
      closingFromProp.current = true;
      ref.current?.close();
    }
  }, [visible, mounted]);

  const handleClosed = useCallback(() => {
    setMounted(false);
    if (closingFromProp.current) closingFromProp.current = false;
    else onClose();
  }, [onClose]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.4} pressBehavior="close" />
    ),
    [],
  );

  return (
    <Modal visible={mounted} transparent animationType="none" statusBarTranslucent onRequestClose={handleClosed}>
      {/* Ayrı pencere kendi jest köküne muhtaç: olmadan panel sürüklenmez. */}
      <GestureHandlerRootView style={{ flex: 1 }}>
    <BottomSheet
      ref={ref}
      index={0}
      enableDynamicSizing
      maxDynamicContentSize={Math.round(height * 0.88)}
      enablePanDownToClose
      onClose={handleClosed}
      backdropComponent={renderBackdrop}
      animationConfigs={springs}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      backgroundStyle={{ backgroundColor: colors.card, borderRadius: radius.r24 }}
      handleIndicatorStyle={{ backgroundColor: colors.insetPressed, width: 36, height: 4.5 }}
    >
      <BottomSheetScrollView
        bounces={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: spacing.s20,
          paddingTop: spacing.s8,
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
            onPress={() => ref.current?.close()}
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

        {children}

        <PrimaryCta label={t('done')} onPress={() => ref.current?.close()} />
      </BottomSheetScrollView>
    </BottomSheet>
      </GestureHandlerRootView>
    </Modal>
  );
}

/**
 * design.md §5 liste satırı: etiket + değer + chevron, `gridline` hairline ayraçlı, gri kutu yok.
 * Değer yoksa yer tutucu `text-secondary` ile yazılır (bilgi taşır, `disabled` yasak).
 */
export function DetailRow({
  label,
  value,
  placeholder,
  onPress,
  open,
}: {
  label: string;
  value: string | null;
  placeholder: string;
  onPress: () => void;
  /** Satır inline editörünü açtıysa chevron aşağı bakar. */
  open?: boolean;
}) {
  const { colors } = useTheme();
  const filled = value !== null && value.length > 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${filled ? value : placeholder}`}
      accessibilityState={open === undefined ? undefined : { expanded: open }}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.s12,
        minHeight: 48,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text style={{ fontSize: 15, color: colors.ink }}>{label}</Text>
      <Text
        numberOfLines={1}
        style={{
          flex: 1,
          textAlign: 'right',
          fontSize: 15,
          fontWeight: filled ? '600' : '400',
          color: filled ? colors.ink : colors.textSecondary,
        }}
      >
        {filled ? value : placeholder}
      </Text>
      <SymbolView
        name={open ? 'chevron.down' : 'chevron.right'}
        size={13}
        tintColor={colors.disabled}
        weight="semibold"
      />
    </Pressable>
  );
}
