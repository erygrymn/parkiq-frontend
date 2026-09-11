import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { openAppSettings } from '../components/StatusLine';
import { Caption } from '../components/Typography';
import { t } from '../localization';
import { useUiStore } from '../state/uiStore';
import { useTheme } from '../theme';
import { CROSSFADE_MS } from '../theme/motion';
import { spacing } from '../theme/tokens';

// Konum izni daveti — KAPI DEĞİL.
//
// Uygulamanın üç sorusu da konumdan türer, ama izin vermeyeni dışarıda bırakmak
// App Store 5.1.2(i) ihlalidir ("may not require users to enable system
// functionalities … in order to access functionality, content, use the app") ve
// 5.1.1(iv) tam da konumu örnek verip alternatif sunmayı ister. Alternatif zaten
// var: haritadan pin bırakarak park kaydı. Bu yüzden burada duvar değil, keşif
// panelinin üstünde kapatılabilir bir davet satırı var.
//
// iOS izni ÖMÜRDE BİR KEZ sorar; reddedildikten sonra request() pencere açmadan
// 'denied' döner. Kullanıcı için tek fiil kalır ("izni ver"), butonun gittiği yer
// sistemin durumuna göre değişir.

type GateState = 'checking' | 'granted' | 'ask' | 'blocked';

function readState(
  permission: Pick<Location.PermissionResponse, 'status' | 'canAskAgain'>,
): GateState {
  if (permission.status === Location.PermissionStatus.GRANTED) return 'granted';
  return permission.canAskAgain ? 'ask' : 'blocked';
}

function useLocationPermission(): { state: GateState; request: () => void } {
  const [state, setState] = useState<GateState>('checking');
  const asking = useRef(false);

  const read = useCallback(() => {
    void Location.getForegroundPermissionsAsync()
      .then((permission) => setState(readState(permission)))
      // Okuma başarısızsa davet hiç çıkmasın: modül hatası yüzünden izinli bir
      // cihazda kullanıcıyı rahatsız etmek, davetin kaçmasından kötüdür.
      .catch(() => setState('granted'));
  }, []);

  useEffect(() => {
    read();
    // Ayarlar'dan izin açıp dönen kullanıcı satırı bir daha görmemeli.
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active' && !asking.current) read();
    });
    return () => sub.remove();
  }, [read]);

  const request = useCallback(() => {
    if (state === 'blocked') {
      openAppSettings();
      return;
    }
    // Sistem penceresi app'i 'inactive'e düşürüp geri getiriyor; o dönüşteki okuma
    // kullanıcı henüz cevap vermeden çalışıp durumu yanlış yazıyordu.
    asking.current = true;
    void Location.requestForegroundPermissionsAsync()
      .then((permission) => setState(readState(permission)))
      .catch(() => setState('blocked'))
      .finally(() => {
        asking.current = false;
      });
  }, [state]);

  return { state, request };
}

/**
 * Keşif panelinin en üstündeki davet satırı. İzin verilmişse, okuma sürüyorsa ya
 * da kullanıcı bu oturumda kapattıysa hiç çizilmez. Siyah hap KULLANMAZ: bu
 * yüzeydeki tek siyah CTA "Park Ettim"dir (İlke 4).
 */
export function LocationInvite() {
  const { colors } = useTheme();
  const { state, request } = useLocationPermission();
  const dismissed = useUiStore((s) => s.locationInviteDismissed);

  if (state === 'checking' || state === 'granted' || dismissed) return null;
  const blocked = state === 'blocked';

  return (
    <Animated.View
      entering={FadeIn.duration(CROSSFADE_MS)}
      style={{
        gap: spacing.s8,
        paddingBottom: spacing.s12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.gridline,
      }}
    >
      <Text style={{ fontSize: 17, fontWeight: '600', color: colors.ink }}>{t('locationInviteTitle')}</Text>
      <Caption>{t(blocked ? 'locationInviteBlocked' : 'locationInviteBody')}</Caption>
      <View style={{ flexDirection: 'row', gap: spacing.s20, paddingTop: spacing.s4 }}>
        <Pressable accessibilityRole="button" onPress={request} hitSlop={8}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.ink }}>
            {t(blocked ? 'openLocationSettings' : 'allowLocation')}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => useUiStore.getState().dismissLocationInvite()}
          hitSlop={8}
        >
          <Text style={{ fontSize: 15, color: colors.textSecondary }}>{t('notNow')}</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}
