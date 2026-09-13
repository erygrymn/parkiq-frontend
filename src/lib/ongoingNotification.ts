import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { LiveActivityPayload } from '../../modules/parkiq-live-activity';
import { CHANNEL_SESSION, ensureChannels } from './notificationChannels';

/**
 * Live Activity'nin Android karşılığı: kalıcı (sticky) bir bildirim.
 *
 * iOS'ta kilit ekranı kartını SİSTEM çiziyor ve sayaç `Text(timerInterval:)` ile
 * saniye saniye kendi akıyor; app hiç çalışmıyor. Android'de bunun dengi özel
 * `RemoteViews` + chronometer ister ve `expo-notifications` onu dışa vermiyor.
 *
 * Peşine düşmüyoruz: bildirim AKAN SAYAÇ değil, HEDEF ZAMAN gösterir —
 * "Sonraki kademe 14:30 · Şimdi ₺50, sonra ₺100". Kullanıcının sorduğu soru
 * "kaç saniye geçti" değil, "ne zaman pahalanıyor"; bu satır onu cevaplıyor.
 * Metin zaten dilim sınırlarında tazeleniyor (uyarılar o anlara zamanlı).
 *
 * Bu dosyanın tamamı Android'e özeldir. iOS'ta her fonksiyon anında döner ve
 * ActivityKit yolu hiç etkilenmez.
 */

const isAndroid = Platform.OS === 'android';

/** Kalıcı bildirimin kimliği; tazeleme aynı kimliğe yazar, iptal onu kaldırır. */
const ONGOING_ID = 'parkiq-active-session';

function bodyOf(payload: LiveActivityPayload): string {
  // Metinler zaten dile çevrilmiş halde geliyor (liveActivity.ts tek kaynak).
  return [payload.heroLabel, payload.footerText].filter(Boolean).join(' · ');
}

function titleOf(payload: LiveActivityPayload): string {
  return [payload.placeName, payload.floor].filter(Boolean).join(' · ') || 'ParkIQ';
}

/**
 * Kartı gösterir ya da yerinde tazeler.
 *
 * `presentNotificationAsync` aynı kimlikle çağrılınca Android bildirimi DEĞİŞTİRİR,
 * ikincisini eklemez — başlangıç ve tazeleme aynı yoldan geçebilir.
 */
export async function showOngoingSession(payload: LiveActivityPayload): Promise<void> {
  if (!isAndroid) return;
  try {
    await ensureChannels();
    await Notifications.scheduleNotificationAsync({
      identifier: ONGOING_ID,
      content: {
        title: titleOf(payload),
        body: bodyOf(payload),
        sticky: true,
        autoDismiss: false,
        sound: false,
        data: { ongoing: true },
      },
      // Kanal tetikleyicide bildirilir (içerikte değil); `channelId` tek başına
      // "şimdi göster, ama bu kanaldan" demektir. iOS alanı yok sayar.
      trigger: isAndroid ? { channelId: CHANNEL_SESSION } : null,
    });
  } catch {
    // Kart gösterilemezse oturum aynen sürer; sayaç ve uyarılar etkilenmez.
  }
}

/** Park bitince/geri alınınca kartı kaldırır. İki kez çağırmak zararsızdır. */
export async function hideOngoingSession(): Promise<void> {
  if (!isAndroid) return;
  try {
    await Notifications.dismissNotificationAsync(ONGOING_ID);
  } catch {
    /* zaten yoksa sorun değil */
  }
  try {
    // Gösterilmeden önce iptal edilirse zamanlanmış kopya da kalmasın.
    await Notifications.cancelScheduledNotificationAsync(ONGOING_ID);
  } catch {
    /* yoksa sorun değil */
  }
}
