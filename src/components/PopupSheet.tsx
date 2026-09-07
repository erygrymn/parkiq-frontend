import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  useBottomSheetSpringConfigs,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t, upper } from '../localization';
import { useTheme } from '../theme';
import { SPRING } from '../theme/motion';
import { radius, spacing, typeScale } from '../theme/tokens';
import { PrimaryCta } from './Buttons';

/**
 * Tek bir ayarı düzenlemek için alttan gelen küçük yüzey (tarife editörü, filtreler).
 *
 * design.md İlke 9: RN Modal değil, gorhom `BottomSheetModal` — jestle sürülür, kesilebilir,
 * kök sheet ile aynı spring'i (§3 `SPRING`) kullanır. Zemin 200 ms fade, panel spring ile gelir.
 * Klavye: `keyboardBehavior="interactive"`; içerik uzarsa panel %88'de durur ve içi kayar.
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
  const ref = useRef<BottomSheetModal>(null);
  const springs = useBottomSheetSpringConfigs(SPRING);

  useEffect(() => {
    if (visible) ref.current?.present();
    else ref.current?.dismiss();
  }, [visible]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.4} pressBehavior="close" />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={ref}
      enableDynamicSizing
      maxDynamicContentSize={Math.round(height * 0.88)}
      enablePanDownToClose
      onDismiss={onClose}
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
            onPress={() => ref.current?.dismiss()}
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

        <PrimaryCta label={t('done')} onPress={() => ref.current?.dismiss()} />
      </BottomSheetScrollView>
    </BottomSheetModal>
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
