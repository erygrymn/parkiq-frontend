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
/**
 * CarPlay koptu: oturumu SESSİZCE açmak yerine sor.
 *
 * Kopuş noktasının koordinatı bildirimin içinde taşınır; kullanıcı dokununca
 * park o konumla ve o anla başlar. Kendiliğinden oturum açmak, kırmızı ışıkta
 * telefonu ayıran ya da benzinlikte duran herkese hayalet kayıt bırakıyordu.
 */
export async function askAutoParked(place: {
  latitude: number;
  longitude: number;
  atMs: number;
}): Promise<void> {
  try {
    if ((await ensureNotificationPermission(false)) !== 'granted') return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: undefined,
        body: t('autoParkedAsk'),
        sound: false,
        data: { kind: AUTO_PARK_KIND, ...place },
      },
      trigger: null, // hemen
    });
  } catch {
    /* bildirim yoksa akış etkilenmez */
  }
}

/** Bildirim dokunuşunu tanımak için — App.tsx bunu dinler. */
export const AUTO_PARK_KIND = 'auto-park';

export async function cancelSessionAlerts(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // Bildirim katmanı yoksa sessizce geç: sayaç ve tarife çubuğu etkilenmez.
  }
}

/**
 * `loud` uyarıyı sesli ve ZAMAN DUYARLI yapar: Odak modlarını deler ve sessiz
 * banner yerine duyulur. Gerçek bir alarm (sessiz moda rağmen çalan, tam ekran)
 * AlarmKit ister ve o iOS 26'dan itibaren var — bu yüzden şimdilik en yüksek
 * dikkat seviyesi budur.
 */
async function scheduleAt(
  atMs: number,
  title: string | undefined,
  body: string,
  loud = false,
): Promise<void> {
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
    // Dilim uyarıları hiçbir şey ayarlamadan çalışır — ürünün free çekirdeği bu.
    // Ama kullanıcı hatırlatıcıyı tarifeye bağladıysa (ilk/her artıştan önce)
    // kural ONUNKİDİR: ikisini birden kurmak aynı sınır için çift bildirim demek.
    const reminderOwnsTiers = session.reminder !== null && session.reminder.anchor !== 'afterPark';
    const boundaries = reminderOwnsTiers
      ? []
      : listUpcomingBoundaries(session.tariff, session.startedAtMs, Date.now(), MAX_TIER_ALERTS);
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

    // Kullanıcının kurduğu hatırlatıcı. Süre neye göre sayılıyorsa zamanlar
    // ondan türer — kural tek yerde, ekrandaki üç satırla birebir aynı.
    const reminder = session.reminder;
    if (reminder) {
      const loud = reminder.kind !== 'notification';
      if (reminder.anchor === 'afterPark') {
        await scheduleAt(
          session.startedAtMs + reminder.minutes * 60_000,
          title,
          t('simpleReminder', {
            duration: formatDurationStamp(reminder.minutes * 60_000).toLowerCase(),
          }),
          loud,
        );
      } else {
        const wanted = reminder.anchor === 'beforeFirstTier' ? 1 : MAX_TIER_ALERTS;
        const upcoming = listUpcomingBoundaries(session.tariff, session.startedAtMs, Date.now(), wanted);
        const currency = session.tariff?.currency ?? 'TRY';
        for (const boundary of upcoming) {
          await scheduleAt(
            boundary.atMs - reminder.minutes * 60_000,
            title,
            t('tierAlert', {
              tier: boundary.tierIndex + 1,
              minutes: reminder.minutes,
              now: formatMoney(boundary.currentPrice, currency, locale),
              next: formatMoney(boundary.nextPrice, currency, locale),
            }),
            loud,
          );
        }
      }
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
