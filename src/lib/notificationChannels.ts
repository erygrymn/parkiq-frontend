import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { t } from '../localization';

/**
 * Android bildirim kanalları. iOS'ta kanal diye bir şey yoktur — bu dosyanın tamamı
 * `Platform.OS === 'android'` kapısının arkasındadır ve iOS akışına HİÇ dokunmaz.
 *
 * Android 8'den beri kanalsız bildirim varsayılana düşer ve sessizleşir: dilim uyarısı
 * duyulmazsa ürünün ikinci sözü ("fiyat artmadan haber ver") tutulmamış olur.
 *
 * Üç rol, üç kanal — çünkü kanalın sesi/önemi KURULDUKTAN SONRA koddan değiştirilemez,
 * yalnız kullanıcı değiştirebilir. Rolleri tek kanala toplamak, birini susturmak isteyen
 * kullanıcıya hepsini sustur demek olurdu.
 */

export const CHANNEL_ALERTS = 'tier-alerts';
export const CHANNEL_ALARM = 'loud-reminder';
export const CHANNEL_SESSION = 'active-session';

const isAndroid = Platform.OS === 'android';

let ready = false;

/**
 * Kanalları kurar (idempotent). Bildirim zamanlayan her yol önce bunu çağırır.
 *
 * iOS'ta anında döner.
 */
export async function ensureChannels(): Promise<void> {
  if (!isAndroid || ready) return;
  ready = true;
  try {
    // Dilim uyarısı: başlık çubuğunda görünür (HIGH) ama sessiz — iOS'taki
    // `sound: false` + timeSensitive davranışının karşılığı.
    await Notifications.setNotificationChannelAsync(CHANNEL_ALERTS, {
      name: t('chTierAlerts'),
      importance: Notifications.AndroidImportance.HIGH,
      sound: null,
      vibrationPattern: [0, 200],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
    });

    /* Sesli hatırlatıcı: sesi ALARM akışından çalar. Zil anahtarı ve Rahatsız Etmeyin
       alarm akışını kısmaz — iOS'ta AlarmKit'in çözdüğü sorun burada kanal ayarıyla
       çözülüyor. `bypassDnd` de açık: kullanıcı bunu açıkça "sesli" diye seçti. */
    await Notifications.setNotificationChannelAsync(CHANNEL_ALARM, {
      name: t('chLoudReminder'),
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      audioAttributes: { usage: Notifications.AndroidAudioUsage.ALARM },
      vibrationPattern: [0, 500, 250, 500],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
    });

    // Süren park kartı: kalıcı, sessiz, sıralamada dipte. Live Activity'nin karşılığı
    // olduğu için uyarı değil, DURUM taşır — ses çıkarması yanlış olurdu.
    await Notifications.setNotificationChannelAsync(CHANNEL_SESSION, {
      name: t('chActiveSession'),
      importance: Notifications.AndroidImportance.LOW,
      sound: null,
      vibrationPattern: null,
      showBadge: false,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  } catch {
    // Kanal kurulamazsa bildirimler varsayılan kanala düşer: sessiz ama çalışır.
  }
}

/** Bir uyarının hangi kanala gideceği. iOS'ta çağrılmaz. */
export function channelFor(loud: boolean): string {
  return loud ? CHANNEL_ALARM : CHANNEL_ALERTS;
}
