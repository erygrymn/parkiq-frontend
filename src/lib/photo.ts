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

    const target = new File(photoDirectory(), `${sessionId}.jpg`);
    if (target.exists) target.delete();
    await new File(asset.uri).copy(target);
    return { status: 'ok', uri: target.uri };
  } catch {
    return { status: 'failed' };
  }
}

export function deleteSpotPhoto(uri: string): void {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Dosya zaten yoksa sorun değil.
  }
}
