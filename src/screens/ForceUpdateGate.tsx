import { TwiceVersionCheck, type UpdateStatus } from '@twiceapps/react-native';
import { useEffect, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryCta } from '../components/Buttons';
import { Body } from '../components/Typography';
import { isAnalyticsEnabled } from '../lib/analytics';
import { t } from '../localization';
import { useTheme } from '../theme';
import { spacing, typeScale } from '../theme/tokens';

// Zorunlu güncelleme kapısı. Yalnız panelden "forced" işaretlendiğinde çıkar ve
// KAPATILAMAZ — sunucu sözleşmesi kırıldığında eski istemcinin yanlış para
// göstermesindense hiç göstermemesi doğrudur.
//
// İsteğe bağlı güncellemede hiçbir şey yapılmaz: her açılışta banner göstermek
// kullanıcıyı yorar, kritik olan zaten forced ile gelir.

export function useForcedUpdate(): boolean {
  const [forced, setForced] = useState(false);

  useEffect(() => {
    if (!isAnalyticsEnabled) return;
    let cancelled = false;
    void TwiceVersionCheck.check()
      .then((status: UpdateStatus) => {
        if (!cancelled) setForced(status.updateAvailable && status.isForced);
      })
      .catch(() => {
        // Sürüm kontrolü ulaşılamıyorsa app'i KİLİTLEME: ağ hatası yüzünden
        // kullanıcıyı dışarıda bırakmak, eski sürümle çalışmasından kötüdür.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return forced;
}

export function ForceUpdateScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const openStore = () => {
    void TwiceVersionCheck.check()
      .then((status) => Linking.openURL(TwiceVersionCheck.storeUrl(status)))
      .catch(() => undefined);
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        justifyContent: 'center',
        paddingHorizontal: spacing.s24,
        paddingBottom: insets.bottom + spacing.s24,
        gap: spacing.s16,
      }}
    >
      <Text
        style={{
          fontSize: typeScale.displayM.fontSize,
          fontWeight: typeScale.displayM.fontWeight,
          letterSpacing: typeScale.displayM.letterSpacing,
          color: colors.ink,
        }}
      >
        {t('updateRequiredTitle')}
      </Text>
      <Body color={colors.textSecondary}>{t('updateRequiredBody')}</Body>
      <PrimaryCta label={t('updateNow')} onPress={openStore} />
    </View>
  );
}
