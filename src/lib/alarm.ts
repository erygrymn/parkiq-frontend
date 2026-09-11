import Constants, { ExecutionEnvironment } from 'expo-constants';
import { t } from '../localization';

/**
 * Gerçek alarm (Apple AlarmKit, iOS 26+).
 *
 * Bildirim, sessiz moddaki ya da Odak'taki bir telefonu UYANDIRAMAZ — kullanıcı
 * "Sesli" hatırlatıcı seçtiğinde beklediği şey buydu ve olmuyordu. AlarmKit sistem
 * alarmı kurar: kilit ekranında çalar, sessiz modu deler, app kapalıyken de gelir.
 *
 * iOS 26 altında ve Expo Go'da modül yoktur; o zaman çağrılar sessizce boş döner ve
 * bildirim yolu (zaman duyarlı + sesli) tek başına kalır. Uygulama aynen çalışır.
 *
 * Alarmlar TEK SEFERLİKTİR: her biri mutlak bir zaman damgasına kurulur, tekrar yok.
 * Kurulan her alarmın kimliği cihazda saklanır; oturum bitince, geri alınınca ya da
 * silinince hepsi durdurulur (bkz. `cancelParkAlarms`).
 */

type AlarmKit = typeof import('react-native-nitro-ios-alarm-kit');

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let mod: AlarmKit | null | undefined;
function alarmKit(): AlarmKit | null {
  if (mod === undefined) {
    if (isExpoGo) {
      mod = null;
    } else {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        mod = require('react-native-nitro-ios-alarm-kit') as AlarmKit;
      } catch {
        // Nitro modülü bu derlemede yok (eski build) — bildirim yoluna düşülür.
        mod = null;
      }
    }
  }
  return mod;
}

/** iOS 26+ ve modül yüklü mü. False ise sesli hatırlatıcı bildirimle yetinir. */
export function isAlarmAvailable(): boolean {
  try {
    return alarmKit()?.isAvailable() === true;
  } catch {
    return false;
  }
}

/** Alarm ekranının vurgu rengi — marka yeşili (design.md §2 accent-fill). */
const TINT = '#00A650';

/**
 * Verilen ana TEK SEFERLİK sistem alarmı kurar. Döndürdüğü kimlik saklanmalı:
 * iptal etmenin tek yolu o.
 *
 * Ertelemesi YOK (`countdown` verilmez): park hatırlatıcısını ertelemek kullanıcıyı
 * bir sonraki fiyat diliminin içinde bırakır, yani tam da kaçınmak istediği şeyi yapar.
 */
export async function scheduleParkAlarm(atMs: number, title: string): Promise<string | null> {
  const m = alarmKit();
  if (!m || !isAlarmAvailable()) return null;
  const seconds = Math.floor(atMs / 1000);
  if (seconds * 1000 <= Date.now()) return null;
  try {
    if (!(await m.requestAlarmPermission())) return null;
    const id = await m.scheduleFixedAlarm(
      // Dynamic Island'da 15 karakterden uzun başlık kırpılıyor.
      title.slice(0, 15),
      { text: t('alarmStop'), textColor: '#FFFFFF', icon: 'checkmark.circle.fill' },
      TINT,
      undefined,
      seconds,
    );
    return id || null;
  } catch {
    return null;
  }
}

/** Kurulmuş alarmları durdurur; kimliği bilinmeyen kalıntı varsa süpürür. */
export async function cancelParkAlarms(ids: string[]): Promise<void> {
  const m = alarmKit();
  if (!m) return;
  try {
    for (const id of ids) {
      if (id) await m.stopAlarm(id);
    }
    // Süpürme: app öldürülmüşken kimlik listesi kaybolduysa bile çalacak alarm kalmasın.
    // ParkIQ'da aynı anda tek oturum var, başka birinin alarmını kapatma riski yok.
    await m.stopAllAlarms();
  } catch {
    /* alarm zaten çalmış ya da bilinmiyor */
  }
}
