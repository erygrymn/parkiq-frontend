import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { cancelParkAlarms, isAlarmAvailable, scheduleParkAlarm } from './alarm';
import { channelFor, ensureChannels } from './notificationChannels';
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
  // App açıkken de sesli uyarı SESLİ gelir: kullanıcı "alarm" seçtiyse sessiz banner
  // sözün tutulmaması demek. Sessiz uyarılar eskisi gibi ses çıkarmaz.
  handleNotification: async (notification) => {
    const loud = (notification.request.content.data as { loud?: boolean } | undefined)?.loud === true;
    return {
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: loud,
      shouldSetBadge: false,
    };
  },
});

/**
 * 'undetermined': hiç sorulmadı. 'denied'den AYRI tutulur: sorulmamış izni "kapalı" diye
 * okumak kullanıcıyı Ayarlar'a yolluyordu, oysa iOS orada uygulama bir kez sormadan bildirim
 * anahtarı göstermiyor — çıkmaz bir yol.
 */
export type NotificationPermission = 'granted' | 'denied' | 'undetermined';

/**
 * Kurulan sistem alarmlarının kimlikleri (SQLite `settings`).
 *
 * Alarmı iptal etmenin TEK yolu kimliğidir; app öldürülüp açılsa da bu liste kalır.
 * Oturum bittiğinde/geri alındığında `cancelSessionAlerts` hepsini durdurur — çalmadan
 * iptal edilme garantisi buradan gelir.
 */
const ALARM_IDS_KEY = 'alarmHandles';

function repo() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../db/sessionRepo') as typeof import('../db/sessionRepo');
}

function readAlarmIds(): string[] {
  try {
    const raw = repo().readSetting(ALARM_IDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function writeAlarmIds(ids: string[]): void {
  try {
    repo().writeSetting(ALARM_IDS_KEY, JSON.stringify(ids));
  } catch {
    /* yazılamazsa süpürme yolu (stopAllAlarms) yine de çalışır */
  }
}

/**
 * İzin yalnız BAĞLAMINDA istenir (kullanıcı bir hatırlatıcı kurarken).
 * prompt=false: soğuk açılışta yeniden zamanlama için — kullanıcıyı rahatsız etmez.
 */
export async function ensureNotificationPermission(prompt: boolean): Promise<NotificationPermission> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return 'granted';
    if (!current.canAskAgain) return 'denied';
    if (!prompt) return current.status === 'denied' ? 'denied' : 'undetermined';
    const asked = await Notifications.requestPermissionsAsync();
    return asked.granted ? 'granted' : 'denied';
  } catch {
    return 'denied';
  }
}

/**
 * Oturumun tüm uyarılarını iptal eder.
 *
 * `dismissDelivered`: ZATEN DÜŞMÜŞ bildirimleri de siler. `cancelAllScheduled…`
 * yalnız gelecektekileri iptal ediyor; tepsiye düşmüş bir dilim uyarısı park
 * bittikten sonra da orada duruyordu — kullanıcı için bu, bitmiş bir parkın hâlâ
 * sürdüğü anlamına geliyor. Yalnız BİTİŞ yollarında açılır: uyarılar yeniden
 * kurulurken (tarife değişimi) açılırsa Android'deki kalıcı park kartını da
 * silerdi, oysa oturum sürüyor.
 */
/**
 * Zamanlama turları SIRAYLA koşar ve her tur bir kuşak numarası taşır.
 *
 * Tarife formu her tuş vuruşunda yeniden zamanlıyordu ve turlar üst üste biniyordu: her biri
 * "önce hepsini sil, sonra kur" dediği için iki turun kurduğu bildirimler birlikte hayatta
 * kalıyordu ("20" yazan kullanıcıya hem 2 hem 20 dakika kala alarm). Bitiş anında hâlâ
 * süren bir tur da iptalden SONRA kurup hayalet uyarı bırakıyordu. Artık yeni tur ya da
 * iptal eski turun kuşağını geçersiz kılar; eski tur ilk fırsatta durur.
 */
let generation = 0;
let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

export async function cancelSessionAlerts(
  options: { dismissDelivered?: boolean } = {},
): Promise<void> {
  generation += 1;
  await enqueue(() => clearScheduled(options));
}

async function clearScheduled(options: { dismissDelivered?: boolean } = {}): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // Bildirim katmanı yoksa sessizce geç: sayaç ve tarife çubuğu etkilenmez.
  }
  if (options.dismissDelivered) {
    try {
      await Notifications.dismissAllNotificationsAsync();
    } catch {
      /* tepsi temizlenemezse oturum durumu yine doğru */
    }
  }
  // Sistem alarmları bildirimlerden AYRI yaşar: park erken bitirilince ikisi de susmalı.
  const ids = readAlarmIds();
  writeAlarmIds([]);
  await cancelParkAlarms(ids);
}

/**
 * `sound` uyarıyı duyulur, `timeSensitive` Odak modlarını delen bir uyarı yapar.
 *
 * Bu iki bayrak ÖNCEDEN HİÇ KULLANILMIYORDU: fonksiyon `loud` alıyor ama içeriği
 * her zaman `sound: false` ile kuruyordu, yani "Sesli"/"Her ikisi" seçenekleri
 * sessiz banner üretiyordu. Gerçek bir alarm (sessiz moda rağmen çalan, tam ekran)
 * AlarmKit ister ve o iOS 26'dan itibaren var — bu yüzden şimdilik en yüksek
 * dikkat seviyesi budur.
 *
 * Android'de AlarmKit yok ama gerekmiyor da: sesli uyarı ALARM akışını kullanan bir
 * kanala gider (bkz. `notificationChannels`), o da zil anahtarından ve Rahatsız
 * Etmeyin'den etkilenmez. iOS'ta `channelId` yok sayılır.
 */
async function scheduleAt(
  atMs: number,
  title: string | undefined,
  body: string,
  options: { sound?: boolean; timeSensitive?: boolean; alarm?: boolean } = {},
): Promise<void> {
  const sound = options.sound === true;
  const seconds = Math.round((atMs - Date.now()) / 1000);
  if (seconds <= 0) return;

  /* "Sesli"/"Her ikisi" seçildiyse GERÇEK alarm kurulur (iOS 26+). Bildirim sessiz
     moddaki telefonu uyandıramıyor; kullanıcının beklediği şey buydu. Alarm kurulduysa
     yanına ayrıca bir de sesli bildirim koymayız — aynı an iki kez ötmesin. */
  if (options.alarm && isAlarmAvailable()) {
    const id = await scheduleParkAlarm(atMs, title ?? 'ParkIQ');
    if (id) {
      writeAlarmIds(readAlarmIds().concat(id));
      return;
    }
  }
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: sound ? 'default' : false,
      interruptionLevel: options.timeSensitive ? 'timeSensitive' : 'active',
      // Ön plan sunumu bu bayrağı okur: app açıkken de sesli uyarı sesli gelir.
      data: { loud: sound },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      repeats: false,
      // Kanal TETİKLEYİCİDE bildirilir; içeriğe yazılan `channelId` sessizce yok
      // sayılır ve bildirim varsayılan kanala düşerdi. iOS bu alanı görmez.
      ...(Platform.OS === 'android' ? { channelId: channelFor(sound) } : null),
    },
  });
}

/**
 * Oturumun tüm gelecek dilim uyarılarını + unutulmuş oturum hatırlatıcısını kurar.
 * Önce mevcut tüm zamanlamaları temizler (tarife değişince yeniden kurulur).
 */
export function scheduleSessionAlerts(
  session: ParkSession,
  warnThresholdMin: number,
  options: { prompt: boolean; catchUp?: boolean } = { prompt: true },
): Promise<NotificationPermission | null> {
  const ticket = ++generation;
  return enqueue(() => scheduleRound(ticket, session, warnThresholdMin, options));
}

/** Uyarı anı geçmiş ama artışa en az bu kadar varsa uyarı hemen verilir (bkz. catchUp). */
const CATCH_UP_MIN = 2;
const CATCH_UP_DELAY_MS = 3000;

/** null: tur, daha yeni bir tur ya da iptal tarafından geçersiz kılındı. */
async function scheduleRound(
  ticket: number,
  session: ParkSession,
  warnThresholdMin: number,
  options: { prompt: boolean; catchUp?: boolean },
): Promise<NotificationPermission | null> {
  const stale = () => ticket !== generation;
  if (stale()) return null;
  // Kanallar zamanlamadan ÖNCE var olmalı: sonradan kurulan kanal, önceden
  // zamanlanmış bildirimi taşımaz (Android onu varsayılana atar ve sessizleşir).
  await ensureChannels();
  await clearScheduled();
  if (stale()) return null;

  const permission = await ensureNotificationPermission(options.prompt);
  if (stale()) return null;
  if (permission !== 'granted') return permission;

  /**
   * Uyarı anı çoktan geçmişse: eşik dilimden uzunsa (15 dk eşik, 15 dk bedava ilk dilim)
   * ya da park geriye tarihlendiyse ilk artışın uyarısı hiç kurulmuyordu. Kullanıcı bir şey
   * değiştirdiğinde (catchUp) uyarı birkaç saniye içinde, KALAN gerçek dakikayla verilir.
   * Soğuk açılıştaki yeniden kurulumda verilmez: aynı uyarı her açılışta tekrar çalardı.
   */
  const fireAt = (warnAtMs: number, boundaryAtMs: number): { atMs: number; minutes: number } | null => {
    const now = Date.now();
    if (warnAtMs > now) return { atMs: warnAtMs, minutes: Math.round((boundaryAtMs - warnAtMs) / 60_000) };
    const remaining = Math.floor((boundaryAtMs - now) / 60_000);
    if (!options.catchUp || remaining < CATCH_UP_MIN) return null;
    return { atMs: now + CATCH_UP_DELAY_MS, minutes: remaining };
  };

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
      if (stale()) return null;
      const when = fireAt(boundary.atMs - warnThresholdMin * 60_000, boundary.atMs);
      if (!when) continue;
      const currency = session.tariff?.currency ?? 'TRY';
      // Copy §5.9 formülünden: para diliyle konuşur, ünlem yok.
      const body = t('tierAlert', {
        tier: boundary.tierIndex + 1,
        minutes: when.minutes,
        now: formatMoney(boundary.currentPrice, currency, locale),
        next: formatMoney(boundary.nextPrice, currency, locale),
      });
      // Fiyat artışı uyarısı ürünün asıl sözü: Odak modunda yutulursa para kaybı olur.
      // Ses kullanıcının seçimidir (hatırlatıcı türü), zaman duyarlılık değildir.
      await scheduleAt(when.atMs, title, body, { timeSensitive: true });
    }

    // Kullanıcının kurduğu hatırlatıcı. Süre neye göre sayılıyorsa zamanlar
    // ondan türer — kural tek yerde, ekrandaki üç satırla birebir aynı.
    const reminder = session.reminder;
    if (reminder) {
      const loud = reminder.kind !== 'notification';
      if (stale()) return null;
      if (reminder.anchor === 'afterPark') {
        await scheduleAt(
          session.startedAtMs + reminder.minutes * 60_000,
          title,
          t('simpleReminder', {
            duration: formatDurationStamp(reminder.minutes * 60_000).toLowerCase(),
          }),
          { sound: loud, timeSensitive: true, alarm: loud },
        );
      } else {
        const wanted = reminder.anchor === 'beforeFirstTier' ? 1 : MAX_TIER_ALERTS;
        const upcoming = listUpcomingBoundaries(session.tariff, session.startedAtMs, Date.now(), wanted);
        const currency = session.tariff?.currency ?? 'TRY';
        for (const boundary of upcoming) {
          if (stale()) return null;
          const when = fireAt(boundary.atMs - reminder.minutes * 60_000, boundary.atMs);
          if (!when) continue;
          await scheduleAt(
            when.atMs,
            title,
            t('tierAlert', {
              tier: boundary.tierIndex + 1,
              minutes: when.minutes,
              now: formatMoney(boundary.currentPrice, currency, locale),
              next: formatMoney(boundary.nextPrice, currency, locale),
            }),
            { sound: loud, timeSensitive: true, alarm: loud },
          );
        }
      }
    }

    // Unutulan oturum: 24 saat sonra nazik hatırlatma (§8.4).
    if (stale()) return null;
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
