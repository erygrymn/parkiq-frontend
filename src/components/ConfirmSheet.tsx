import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  useBottomSheetSpringConfigs,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useCallback, useEffect, useRef } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { upper } from '../localization';
import { useTheme } from '../theme';
import { SPRING } from '../theme/motion';
import { radius, spacing, typeScale } from '../theme/tokens';
import { GhostButton, PrimaryCta } from './Buttons';
import { Body } from './Typography';

/**
 * Yıkıcı onay (kaydı sil, tüm veriyi sil). design.md: akış içinde sistem UIAlert yok; onay
 * aynı spring'le gelen küçük bir sheet'tir. Tek siyah CTA onaylar, ghost vazgeçer.
 */
export function ConfirmSheet({
  visible,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
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
      enablePanDownToClose
      onDismiss={onClose}
      backdropComponent={renderBackdrop}
      animationConfigs={springs}
      backgroundStyle={{ backgroundColor: colors.card, borderRadius: radius.r24 }}
      handleIndicatorStyle={{ backgroundColor: colors.insetPressed, width: 36, height: 4.5 }}
    >
      <BottomSheetView
        style={{
          paddingHorizontal: spacing.s20,
          paddingTop: spacing.s8,
          paddingBottom: insets.bottom + spacing.s20,
          gap: spacing.s16,
        }}
      >
        <View style={{ gap: spacing.s8 }}>
          <Text
            style={{
              fontSize: typeScale.title.fontSize,
              fontWeight: typeScale.title.fontWeight,
              letterSpacing: typeScale.title.letterSpacing,
              color: colors.ink,
            }}
          >
            {upper(title)}
          </Text>
          <Body color={colors.textSecondary}>{body}</Body>
        </View>
        <PrimaryCta
          label={confirmLabel}
          onPress={() => {
            ref.current?.dismiss();
            onConfirm();
          }}
        />
        <GhostButton label={cancelLabel} onPress={() => ref.current?.dismiss()} />
      </BottomSheetView>
    </BottomSheetModal>
  );
}
