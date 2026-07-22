import * as ImagePicker from 'expo-image-picker';
import { isOcrAvailable, recognizeText } from '../../modules/parkiq-ocr';
import { parseTariffLines } from './tariffParser';
import type { Tariff } from './tariffMath';

// §7.4 tarife panosu tarama — TAMAMEN CİHAZDA.
// Fotoğraf telefondan çıkmaz: ağ isteği yok, servis yok, kota yok.
// Otopark bodrumunda sinyal olmasa da çalışır (panolar tam oralarda).
// Metin → dilim çevrimi tariffParser'da; oradan çıkan tarife sanitizeTiers'tan geçer.

const PHOTO_QUALITY = 0.6;

export type OcrOutcome =
  | { status: 'ok'; tariff: Tariff }
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

  const lines = await recognizeText(uri);
  if (lines === null) return { status: 'failed' };
  if (lines.length === 0) return { status: 'not_detected' };

  const parsed = parseTariffLines(lines, fallbackCurrency);
  return parsed ? { status: 'ok', tariff: parsed.tariff } : { status: 'not_detected' };
}
