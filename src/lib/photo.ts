import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

// Spot fotoğrafı — kapalı otoparkta "arabam nerede" sorusunun tek gerçek çözümü
// (GPS orada çalışmaz). Bu yüzden free katmanda kalır.
// Foto belgeler dizinine kopyalanır: kamera cache'i sistem tarafından silinebilir,
// kullanıcı ise fotoğrafa saatler sonra ihtiyaç duyar.

const PHOTO_DIR = 'spot-photos';

function photoDirectory(): Directory {
  const dir = new Directory(Paths.document, PHOTO_DIR);
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

let photoDirUri: string | null = null;

/** Klasörün BUGÜNKÜ adresi (sonunda "/"). */
function photoDirectoryUri(): string {
  if (photoDirUri === null) {
    const uri = new Directory(Paths.document, PHOTO_DIR).uri;
    photoDirUri = uri.endsWith('/') ? uri : `${uri}/`;
  }
  return photoDirUri;
}

/**
 * Kayıttaki yolu BUGÜNKÜ uygulama konteynerine çevirir.
 *
 * iOS uygulamanın veri konteynerinin mutlak yolunu güncellemede ve yedekten dönüşte
 * değiştirebiliyor. Kayıtlar mutlak yol sakladığı için, güncellemeden sonra Arabamı Bul'daki
 * fotoğraf — kapalı otoparktaki tek kanıt — boş görünüyordu; silme de dosyayı bulamıyordu.
 * Dosya adı korunur, klasör her okumada yeniden çözülür.
 */
export function resolvePhotoUri(stored: string | null): string | null {
  if (!stored) return null;
  const marker = `/${PHOTO_DIR}/`;
  const at = stored.lastIndexOf(marker);
  if (at < 0) return stored;
  try {
    return photoDirectoryUri() + stored.slice(at + marker.length);
  } catch {
    return stored;
  }
}

export type PhotoOutcome =
  | { status: 'ok'; uri: string }
  | { status: 'denied' }
  | { status: 'canceled' }
  | { status: 'failed' };

export async function captureSpotPhoto(sessionId: string): Promise<PhotoOutcome> {
  try {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return { status: 'denied' };

    const result = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return { status: 'canceled' };

    // Her çekim yeni bir ad alır: aynı adı yeniden kullanınca görüntü önbelleği eski
    // fotoğrafı göstermeye devam ediyordu. Eskisini çağıran taraf siler.
    const target = new File(photoDirectory(), `${sessionId}-${Date.now()}.jpg`);
    await new File(asset.uri).copy(target);
    return { status: 'ok', uri: target.uri };
  } catch {
    return { status: 'failed' };
  }
}

export function deleteSpotPhoto(uri: string): void {
  try {
    const file = new File(resolvePhotoUri(uri) ?? uri);
    if (file.exists) file.delete();
  } catch {
    // Dosya zaten yoksa sorun değil.
  }
}

/** "Tüm oturumları sil": klasörün tamamı gider — kayıtsız kalmış yetim dosyalar dahil. */
export function deleteAllSpotPhotos(): void {
  try {
    const dir = new Directory(Paths.document, PHOTO_DIR);
    if (dir.exists) dir.delete();
  } catch {
    // Silinemezse bir sonraki çekim klasörü yeniden kullanır.
  }
}
