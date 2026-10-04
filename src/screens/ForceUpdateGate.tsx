import type { UpdateStatus } from '@twiceapps/react-native';
import { useEffect, useState } from 'react';
import { Linking, Platform, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryCta } from '../components/Buttons';
import { Body } from '../components/Typography';
import { getStoreUrl, isAnalyticsEnabled } from '../lib/analytics';
import { APP_STORE_URL, PLAY_STORE_URL } from '../config';
import { t } from '../localization';
import { useTheme } from '../theme';
import { spacing, typeScale } from '../theme/tokens';

// Zorunlu güncelleme kapısı. Yalnız panelden "forced" işaretlendiğinde çıkar ve
// KAPATILAMAZ — sunucu sözleşmesi kırıldığında eski istemcinin yanlış para
// göstermesindense hiç göstermemesi doğrudur.
//
// İsteğe bağlı güncellemede hiçbir şey yapılmaz: her açılışta banner göstermek
// kullanıcıyı yorar, kritik olan zaten forced ile gelir.

/** Sürüm kontrolü de tembel: Expo Go'da modül yok, kapı hiç kurulmaz. */
function versionCheck(): typeof import('@twiceapps/react-native').TwiceVersionCheck | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('@twiceapps/react-native') as typeof import('@twiceapps/react-native'))
      .TwiceVersionCheck;
  } catch {
    return null;
  }
}

export function useForcedUpdate(): boolean {
  const [forced, setForced] = useState(false);

  useEffect(() => {
    if (!isAnalyticsEnabled) return;
    let cancelled = false;
    void versionCheck()?.check()
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
    // Kaçışı olmayan bir ekranın tek düğmesi HER ZAMAN bir yere gitmeli: çevrimdışıyken ya da
    // panelde mağaza kimliği yokken SDK boş adres veriyordu ve düğme hiçbir şey yapmıyordu.
    const fallback = getStoreUrl(
      Platform.OS === 'android' ? 'android' : 'ios',
      Platform.OS === 'android' ? PLAY_STORE_URL : APP_STORE_URL,
    );
    const open = (url: string | null | undefined) => {
      const platformUrl =
        url && (Platform.OS === 'android' ? url.includes('play.google') : url.includes('apple.com')) ? url : fallback;
      void Linking.openURL(platformUrl);
    };
    const check = versionCheck()?.check();
    if (!check) {
      open(null);
      return;
    }
    void check.then((status: UpdateStatus) => open(versionCheck()?.storeUrl(status))).catch(() => open(null));
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
