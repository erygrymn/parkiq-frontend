import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolView, type SFSymbol, type SymbolWeight } from 'expo-symbols';
import { Platform } from 'react-native';

// design.md §5.13 — ikon dili SF Symbols'tur ve iOS'ta AYNEN öyle kalır.
// `expo-symbols` Android'de hiçbir şey çizmez (hata da vermez, sessizce boş geçer),
// o yüzden orada Material karşılığı çizilir. Bu dosya o eşlemenin TEK yeridir.
//
// Neden eşleme, neden tek ortak ikon seti değil: SF Symbols iOS'ta sistem fontuyla
// aynı optik ağırlığa oturuyor; her şeyi Material'a çevirmek iOS'u bozmak olurdu.

/**
 * SF Symbol → Material karşılığı.
 *
 * Seçim kuralı aynı GÖRÜNEN ikon değil, aynı İŞİ anlatan ikon: `camera.viewfinder`
 * ParkIQ'da "tarife panosunu tara" demek, o yüzden Material'da `document-scanner`;
 * `location.north.circle` pusuladır, o yüzden `explore`.
 */
const MATERIAL = {
  'bolt.fill': ['material', 'bolt'],
  camera: ['material', 'photo-camera'],
  'camera.viewfinder': ['material', 'document-scanner'],
  checkmark: ['material', 'check'],
  'chevron.down': ['material', 'expand-more'],
  'chevron.left': ['material', 'chevron-left'],
  'chevron.right': ['material', 'chevron-right'],
  'chevron.up': ['material', 'expand-less'],
  'clock.arrow.circlepath': ['material', 'history'],
  'crown.fill': ['community', 'crown'],
  gearshape: ['material', 'settings'],
  'line.3.horizontal.decrease': ['material', 'filter-list'],
  'line.3.horizontal.decrease.circle': ['material', 'filter-alt'],
  'location.north.circle': ['material', 'explore'],
  'location.north.fill': ['material', 'navigation'],
  magnifyingglass: ['material', 'search'],
  'mappin.and.ellipse': ['material', 'place'],
  'minus.circle': ['material', 'remove-circle-outline'],
  'person.2.circle': ['material', 'group'],
  plus: ['material', 'add'],
  xmark: ['material', 'close'],
  'xmark.circle.fill': ['material', 'cancel'],
} as const satisfies Record<string, readonly ['material' | 'community', string]>;

/**
 * Uygulamanın kullandığı semboller — tüm `SFSymbol` birleşimi DEĞİL.
 *
 * Kasıtlı dar: tabloda olmayan bir sembol yazmak derleme hatası verir. Aksi hâlde
 * iOS'ta çalışan yeni bir ikon Android'de sessizce boş kalırdı ve bunu ancak cihazda
 * fark ederdik.
 */
export type AppSymbol = keyof typeof MATERIAL;

/**
 * Material ikonları 24dp kareye çizilir ve kenarında boşluk taşır; SF Symbols optik
 * olarak kutusunu doldurur. Aynı punto verilince Android'deki ikon küçük kalıyor —
 * bu çarpan ikisini aynı ağırlıkta gösteriyor.
 */
const ANDROID_SCALE = 1.15;

export function Icon({
  name,
  size,
  color,
  weight = 'regular',
}: {
  name: AppSymbol;
  size: number;
  color: string;
  /** Yalnız iOS'ta etkili: Material tek ağırlıkta çizilir. */
  weight?: SymbolWeight;
}) {
  if (Platform.OS !== 'android') {
    return <SymbolView name={name as SFSymbol} size={size} tintColor={color} weight={weight} />;
  }
  const [family, glyph] = MATERIAL[name];
  const androidSize = Math.round(size * ANDROID_SCALE);
  return family === 'community' ? (
    <MaterialCommunityIcons name={glyph as never} size={androidSize} color={color} />
  ) : (
    <MaterialIcons name={glyph as never} size={androidSize} color={color} />
  );
}
