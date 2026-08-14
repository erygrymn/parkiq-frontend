import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { markReviewDeclined, requestSystemReview } from '../lib/review';
import { t } from '../localization';
import { useTheme } from '../theme';
import { radius, spacing, typeScale } from '../theme/tokens';
import { GhostButton, PrimaryCta } from './Buttons';
import { Body } from './Typography';

// İki adımlı yorum isteği.
//
// Sistem penceresi yılda üç kezle sınırlıdır ve memnun olmayan birine denk
// gelirse puan kalıcı olarak düşer. Bu yüzden önce KENDİ sorumuzu sorarız;
// sisteme yalnız olumlu yanıt verenler geçer. Olumsuz yanıtta ısrar yok —
// bir daha sorulmaz, geri bildirim için destek e-postası açılır.

export function RatePrompt({
  visible,
  onClose,
  onFeedback,
}: {
  visible: boolean;
  onClose: () => void;
  /** Olumsuz yanıt: kullanıcıyı mağazaya değil, bize yönlendirir. */
  onFeedback: () => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const accept = () => {
    onClose();
    void requestSystemReview();
  };

  const decline = () => {
    markReviewDeclined();
    onClose();
    onFeedback();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
        <View
          style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: radius.r24,
            borderTopRightRadius: radius.r24,
            paddingHorizontal: spacing.s20,
            paddingTop: spacing.s24,
            paddingBottom: insets.bottom + spacing.s20,
            gap: spacing.s16,
          }}
        >
          <Text
            style={{
              fontSize: typeScale.displayS.fontSize,
              fontWeight: typeScale.displayS.fontWeight,
              letterSpacing: typeScale.displayS.letterSpacing,
              color: colors.ink,
            }}
            maxFontSizeMultiplier={1.3}
          >
            {t('rateAskTitle')}
          </Text>
          <Body color={colors.textSecondary}>{t('rateAskBody')}</Body>

          <PrimaryCta label={t('rateYes')} onPress={accept} />
          <GhostButton label={t('rateNo')} onPress={decline} />

          <Pressable accessibilityRole="button" onPress={onClose} hitSlop={8} style={{ alignSelf: 'center' }}>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>{t('later')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
