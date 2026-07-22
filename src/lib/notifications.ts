import * as Notifications from 'expo-notifications';
import { formatDurationStamp, formatMoney } from './format';
import { getLocale, t } from '../localization';
import { listUpcomingBoundaries } from './tariffMath';
import type { ParkSession } from '../state/sessionStore';

// §8.4 — dilim uyarıları LOCAL notification olarak eşikten ÖNCE zamanlanır:
// app kapalıyken de çalışır, push sunucusu yok. Free kullanıcının TEK uyarı kanalı
// budur (Live Activity premium). Oturum bitince/Undo'da hepsi iptal edilir.
// Tek aktif oturum kuralı sayesinde "hepsini iptal et" güvenlidir.

const FORGOTTEN_SESSION_MS = 24 * 60 * 60 * 1000;
/** Bir oturumda kurulacak azami dilim uyarısı (iOS 64 bildirimle sınırlı). */
const MAX_TIER_ALERTS = 8;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export type NotificationPermission = 'granted' | 'denied';

/**
 * İzin yalnız BAĞLAMINDA istenir (kullanıcı bir hatırlatıcı kurarken).
 * prompt=false: soğuk açılışta yeniden zamanlama için — kullanıcıyı rahatsız etmez.
 */
export async function ensureNotificationPermission(prompt: boolean): Promise<NotificationPermission> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return 'granted';
    if (!prompt || !current.canAskAgain) return 'denied';
    const asked = await Notifications.requestPermissionsAsync();
    return asked.granted ? 'granted' : 'denied';
  } catch {
    return 'denied';
  }
}

/** §8.4 oto-algılama onayı: "Park kaydedildi. Sayaç başlasın mı?" */
export async function notifyAutoParked(): Promise<void> {
  try {
    if ((await ensureNotificationPermission(false)) !== 'granted') return;
    await Notifications.scheduleNotificationAsync({
      content: { title: undefined, body: t('autoParkedNotice'), sound: false },
      trigger: null, // hemen
    });
  } catch {
    /* bildirim yoksa akış etkilenmez */
  }
}

export async function cancelSessionAlerts(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // Bildirim katmanı yoksa sessizce geç: sayaç ve tarife çubuğu etkilenmez.
  }
}

async function scheduleAt(atMs: number, title: string | undefined, body: string): Promise<void> {
  const seconds = Math.round((atMs - Date.now()) / 1000);
  if (seconds <= 0) return;
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: false },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      repeats: false,
    },
  });
}

/**
 * Oturumun tüm gelecek dilim uyarılarını + unutulmuş oturum hatırlatıcısını kurar.
 * Önce mevcut tüm zamanlamaları temizler (tarife değişince yeniden kurulur).
 */
export async function scheduleSessionAlerts(
  session: ParkSession,
  warnThresholdMin: number,
  options: { prompt: boolean } = { prompt: true },
): Promise<NotificationPermission> {
  await cancelSessionAlerts();

  const permission = await ensureNotificationPermission(options.prompt);
  if (permission !== 'granted') return permission;

  const locale = getLocale();
  const title = session.placeName ?? undefined;

  try {
    const boundaries = listUpcomingBoundaries(session.tariff, session.startedAtMs, Date.now(), MAX_TIER_ALERTS);
    for (const boundary of boundaries) {
      const currency = session.tariff?.currency ?? 'TRY';
      // Copy §5.9 formülünden: para diliyle konuşur, ünlem yok.
      const body = t('tierAlert', {
        tier: boundary.tierIndex + 1,
        minutes: warnThresholdMin,
        now: formatMoney(boundary.currentPrice, currency, locale),
        next: formatMoney(boundary.nextPrice, currency, locale),
      });
      await scheduleAt(boundary.atMs - warnThresholdMin * 60_000, title, body);
    }

    // Basit süre hatırlatıcısı — tarifeden bağımsız çalışır (tarife bilinmese de
    // sayaç + hatırlatıcı ürünün free çekirdeğidir).
    if (session.reminderAtMs !== null) {
      await scheduleAt(
        session.reminderAtMs,
        title,
        t('simpleReminder', {
          duration: formatDurationStamp(session.reminderAtMs - session.startedAtMs).toLowerCase(),
        }),
      );
    }

    // Unutulan oturum: 24 saat sonra nazik hatırlatma (§8.4).
    await scheduleAt(
      session.startedAtMs + FORGOTTEN_SESSION_MS,
      title,
      session.placeName ? t('stillParked', { place: session.placeName }) : t('stillParkedShort'),
    );
  } catch {
    // Zamanlama başarısızsa oturum çalışmaya devam eder.
  }

  return 'granted';
}
