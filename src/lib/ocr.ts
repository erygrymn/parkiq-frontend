import * as ImagePicker from 'expo-image-picker';
import { isOcrAvailable, recognizeText } from '../../modules/parkiq-ocr';
import { assembleRows } from './ocrRows';
import { normalizeLine, parseTariffLines } from './tariffParser';
import { selectSchedule, type ScheduleKind } from './tariffSchedule';
import type { Tariff } from './tariffMath';

// §7.4 tarife panosu tarama — TAMAMEN CİHAZDA.
// Fotoğraf telefondan çıkmaz: ağ isteği yok, servis yok, kota yok.
// Otopark bodrumunda sinyal olmasa da çalışır (panolar tam oralarda).
// Metin → dilim çevrimi tariffParser'da; oradan çıkan tarife sanitizeTiers'tan geçer.

const PHOTO_QUALITY = 0.6;

export type OcrOutcome =
  | { status: 'ok'; tariff: Tariff; schedule: ScheduleKind | null; partial: boolean }
  | { status: 'not_detected' }
  | { status: 'denied' }
  | { status: 'canceled' }
  | { status: 'unavailable' }
  | { status: 'failed' };

export { isOcrAvailable };

export async function scanTariffBoard(fallbackCurrency: string): Promise<OcrOutcome> {
  // Native modül yoksa (Expo Go) kamerayı hiç açma — kullanıcıyı boşuna yorma.
  if (!isOcrAvailable) return { status: 'unavailable' };

  let uri: string;
  try {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return { status: 'denied' };

    const result = await ImagePicker.launchCameraAsync({ quality: PHOTO_QUALITY });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return { status: 'canceled' };
    uri = asset.uri;
  } catch {
    return { status: 'failed' };
  }

  const blocks = await recognizeText(uri);
  if (blocks === null) return { status: 'failed' };
  if (blocks.length === 0) return { status: 'not_detected' };

  // Pano iki sütunlu tablo: süre solda, fiyat sağda ve Vision bunları AYRI
  // bloklar döndürür. Satırları geometriden geri kur, sonra ayrıştır.
  const lines = assembleRows(blocks);

  // Pano birden fazla tarife taşıyorsa (hafta içi/sonu, gündüz/gece) cihaz
  // saatine göre geçerli olanı seç. Hangisi seçildiği çağırana bildirilir;
  // kullanıcı görmeden uygulanmaz.
  const schedule = selectSchedule(lines, new Date(), normalizeLine);
  const parsed = parseTariffLines(schedule.lines, fallbackCurrency, schedule.priceColumn);
  if (!parsed) return { status: 'not_detected' };
  return {
    status: 'ok',
    tariff: parsed.tariff,
    schedule: schedule.kind,
    // Tarifeye benzeyip okunamayan satır kaldıysa sonuç eksik olabilir.
    partial: parsed.missedLines > 0,
  };
}
