# AR Find My Car — Uygulama Dokümanı (v1 + v2)

Bu doküman, ParkIQ'nun AR "arabamı bul" özelliğini sıfır sohbet bağlamıyla uygulayabilmek için yazıldı.
Uygulamaya başlamadan önce ZORUNLU okuma sırası: kökteki **CLAUDE.md** (bağlayıcı kurallar) →
**design.md** (görsel dil; §5.8 pin, §8 koyu yüzey ailesi) → **screens.md §7b** (checklist).
Bu dokümanla çelişki olursa öncelik: CLAUDE.md > design.md > bu doküman.

---

## 0. Özellik özeti

Kullanıcı park etmiş, arabasına dönüyor. Aktif oturumda **Find My Car** → kamera açılır (ARKit):

- Arabanın gerçek konumunda **yerden göğe yükselen ışık huzmesi** (beam).
- Zeminde arabaya doğru akan **chevron okları** (v1: düz hat; v2: Mapbox yürüyüş rotası — "NFS hissi").
- Üstte **mesafe HUD'ı**: "87 m" (tabular), yer adı overline'ı.
- **<20 m**: huzme kaybolur, yere inen pin/pulse + "You're close" durumu (GPS hatası yakında görünür olur; bunu tasarımla kucaklıyoruz).
- **Fallback**: GPS zayıf / izin yok / kapalı otopark → mevcut foto-kat kartına zarif düşüş (AR ekranı hiç açılmaz ya da içinden çıkılır).

Fiziksel kısıtlar (değiştirilemez):
- GPS ±5–15 m, pusula ±10–20°. Uzakta açısal hata küçüktür → huzme doğru okunur; yakında yanıltır → yakın-mod şart.
- Kapalı otoparkta GPS yok → AR yok. Foto/kat kartı zaten bu senaryonun çözümü.

## 1. Mevcut kod tabanıyla bağlantı noktaları

| Ne | Nerede | Not |
|---|---|---|
| Araba koordinatı | `src/state/sessionStore.ts` → `ParkSession.latitude/longitude/placeName/floor/photoUri` | Park anında yazılıyor |
| Find My Car butonu | `src/sheets/SessionSheets.tsx` → `ActiveSheet`, şu an `openInMaps(session)` çağırıyor | AR entegrasyonunda davranış değişecek (aşağıda §5) |
| Native-modül koruma kalıbı | `src/screens/MapCanvas.tsx` | Expo Go'da native modülü HİÇ `require` etmeme kalıbı — AYNI kalıp AR için kullanılacak |
| Tema token'ları | `src/theme/tokens.ts` | AR HUD RN tarafında bunlarla çizilir |
| Konum yardımcıları | `src/lib/location.ts` | İzin akışı örneği |
| Mapbox public token | `src/config.ts` → `MAPBOX_PUBLIC_TOKEN` | v2 Directions isteği bunu kullanır |

Kritik proje kuralları (CLAUDE.md'den):
- **Expo Go'da native modül çalışmaz ve import bile edilmemeli** (Hermes segfault vakası yaşandı). `Constants.executionEnvironment === ExecutionEnvironment.StoreClient` kontrolü + `try/catch` `require` kalıbı zorunlu (MapCanvas.tsx'e bak).
- Kullanıcı build'i Mac'te `npx expo run:ios` ile alır; EAS yok. Yeni pod'lar prebuild'de otomatik gelir.
- Google API'leri yasak. Rota = Mapbox Directions.
- Yeni bağımlılık eklerken sürüm `expo install` ile (bundledNativeModules uyumu) — üçüncü parti AR kütüphanesi (ViroReact vb.) EKLENMEZ; ARKit/RealityKit sistem framework'leri yeterli (pod gerekmez).
- Test: kullanıcı kendi cihazında yapar. Statik doğrulama `npx tsc --noEmit` + `npx jest` ile sınırlı kalır.

## 2. Mimari

```
┌─ RN katmanı ─────────────────────────────────────────────┐
│ src/screens/ArFindCar.tsx                                │
│  - Tam ekran Modal; native AR view + RN HUD overlay      │
│  - HUD: mesafe (displayXL tabular), yer adı overline,    │
│    kapat butonu, durum satırları — hepsi mevcut token    │
│    ve komponentlerle (Typography, StatusLine)            │
│  - Native'den event alır: {distanceM, mode, tracking}    │
└──────────────┬───────────────────────────────────────────┘
               │ Expo Modules API (View + Props + Events)
┌──────────────▼───────────────────────────────────────────┐
│ modules/parkiq-ar/ (LOKAL expo modülü)                   │
│  ios/ParkiqArView.swift  — ARView (RealityKit)           │
│  - ARWorldTrackingConfiguration,                         │
│    worldAlignment = .gravityAndHeading                   │
│  - CLLocationManager'ı KENDİ içinde çalıştırır (GPS +    │
│    heading native'de; köprü trafiği yalnız seyrek event) │
│  - Huzme + chevron + yakın-mod pin entity'leri           │
│  - Sapma düzeltme (§3.4) ve durum makinesi (§3.6)        │
└──────────────────────────────────────────────────────────┘
```

Neden native içinde CLLocationManager: GPS/heading güncellemelerini her karede köprüden
geçirmek gereksiz gecikme ve trafik üretir. RN yalnız araba koordinatını (sabit) prop olarak
verir; native, kullanıcı konumunu kendi izler, RN'e saniyede ~1 event yollar.

## 3. Native modül (v1) — uygulama detayı

### 3.1 Modül iskeleti

```bash
# parkiq-frontend kökünde:
npx create-expo-module@latest --local parkiq-ar
```

`modules/parkiq-ar/expo-module.config.json` → yalnız iOS platformu bırak.
Modül tanımı (`ios/ParkiqArModule.swift`):

```swift
import ExpoModulesCore

public class ParkiqArModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ParkiqAr")
    View(ParkiqArView.self) {
      Prop("carLatitude") { (view: ParkiqArView, lat: Double) in view.carLatitude = lat }
      Prop("carLongitude") { (view: ParkiqArView, lng: Double) in view.carLongitude = lng }
      // routeCoords: v2 — [[lng,lat], ...] GeoJSON sırası (§6)
      Prop("routeCoords") { (view: ParkiqArView, coords: [[Double]]?) in view.routeCoords = coords }
      Events("onArState")
    }
  }
}
```

`onArState` payload'ı (saniyede ~1 + durum değişimlerinde):
```ts
{ distanceM: number; mode: 'far' | 'near' | 'initializing';
  tracking: 'normal' | 'limited'; accuracyM: number }
```

### 3.2 AR sahne kurulumu (`ParkiqArView.swift`)

- `ARView(frame:)` (RealityKit) + `ARWorldTrackingConfiguration`:
  - `worldAlignment = .gravityAndHeading`  ← kritik: dünya eksenleri gerçek kuzeye hizalanır.
  - `planeDetection = [.horizontal]` (chevronları zemine oturtmak için; bulunamazsa y=0 kullan).
- `ARCoachingOverlayView` ekle (`goal = .tracking`) — başlatma sırasında sistemin "telefonu gezdir" yönlendirmesi; bu süre boyunca `mode: 'initializing'` event'i.
- Ekseneler (gravityAndHeading): **+x = doğu, +y = yukarı, +z = güney**. Yani kuzey = −z.

### 3.3 Koordinat matematiği (hatasız uygulanacak kısım)

Kısa mesafede (birkaç km'ye kadar) düzlem yaklaşımı yeterli:

```swift
// origin: AR oturumu başladığı andaki kullanıcı GPS'i (ilk iyi fix, §3.5)
func enuOffset(from origin: CLLocationCoordinate2D, to target: CLLocationCoordinate2D) -> SIMD3<Float> {
  let mPerDegLat = 111_320.0
  let north = (target.latitude - origin.latitude) * mPerDegLat
  let east  = (target.longitude - origin.longitude) * mPerDegLat * cos(origin.latitude * .pi / 180)
  return SIMD3(Float(east), 0, Float(-north))   // ARKit: +x doğu, −z kuzey
}
```

Mesafe için `CLLocation.distance(from:)` kullan (haversine elle yazma).

### 3.4 Çapa (anchor) ve sapma düzeltme

- Oturum başında: `carWorld = enuOffset(origin, car)` → `AnchorEntity(world:)` ile huzme yerleştir.
- ARKit VIO kısa vadede çok stabil; GPS yalnız BAŞLANGICI ve ARA DÜZELTMEYİ besler.
- Her yeni GPS fix'inde beklenen kullanıcı pozisyonu: `expectedUser = enuOffset(origin, currentGPS)`.
  Gerçek kamera pozisyonu `arView.cameraTransform.translation` (y'yi yok say).
  `error = expectedUser - cameraPos`; `|error| > 8 m` ise çapayı `error` kadar kaydır —
  **anlık değil, 1–2 sn'de lerp'le** (huzme zıplamasın). `|error| < 8 m` ise dokunma.
- Pusula hatası dünyayı döndürür; v1'de kabul edilir (huzme geniş/uzun olduğu için yön okunur).
  Geliştirme (opsiyonel, v1.5): kullanıcı ~10 m yürüyünce GPS rotası ile ARKit hareket vektörü
  karşılaştırılıp dünya yaw'ına düzeltme uygulanabilir — v1'de YAPMA, karmaşıklık/kazanç oranı kötü.

### 3.5 Konum yönetimi (native içinde)

- `CLLocationManager`: `desiredAccuracy = kCLLocationAccuracyBestForNavigation`, `startUpdatingLocation()` + `startUpdatingHeading()`.
- "İlk iyi fix": `horizontalAccuracy <= 20 m` olan ilk konum → origin. O gelene dek `mode: 'initializing'`.
- 10 sn içinde iyi fix yoksa VEYA sürekli `horizontalAccuracy > 35 m` (kapalı alan işareti) →
  `tracking: 'limited'` event'i; RN foto-kat fallback'ini gösterir (§5).
- View kapanınca/`removeFromSuperview`: session pause + location manager stop (pil).

### 3.6 Sahne öğeleri ve durum makinesi

- **Huzme (far modu):** `ModelEntity(mesh: .generateCylinder(height: 60, radius: r))`,
  `UnlitMaterial` yeşil `#2FE07A`, alpha ~0.55; taban zeminde (y = height/2 − kullanıcı göz yüksekliği ~1.5).
  Yarıçap mesafeyle ölçeklensin: `r = max(0.6, distance * 0.02)` — uzaktan görünür, yakında incelir.
  Hafif dikey "nefes" animasyonu serbest; parlama/glow YOK (design.md §4.3: renkli glow yasak).
- **Chevronlar (v1):** origin→araba hattı boyunca her 3 m'de bir, zeminde (plane raycast sonucu ya da y≈−1.4),
  arabaya bakan yassı üçgen/`generatePlane` entity, ink `#141416`; öne akan opaklık animasyonu (0.4→0.9→0.4).
  Yalnız İLK 30 m'lik dilim çizilir, kullanıcı ilerledikçe kayar (performans + GPS hatasında az yanıltma).
- **Near modu (<20 m):** huzme + chevronlar fade-out; arabada zemine inen 32 pt ölçekli pin
  (design.md §5.8 P-pin formu: ink yuvarlak-kare + sivri uç, RealityKit'te basitleştirilmiş hali)
  + altında yumuşak pulse halkası. Event `mode: 'near'` → RN HUD kopyası değişir.
- **Histerezis:** near'a giriş <20 m, çıkış >25 m (sınırda titremesin).

## 4. RN katmanı (v1)

### 4.1 Korumalı yükleme — `src/lib/arAvailability.ts`

MapCanvas kalıbının aynısı:

```ts
import Constants, { ExecutionEnvironment } from 'expo-constants';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export function getArView(): React.ComponentType<ArViewProps> | null {
  if (isExpoGo) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('../../modules/parkiq-ar').ParkiqArView;
  } catch { return null; }
}
```

### 4.2 Ekran — `src/screens/ArFindCar.tsx`

- Tam ekran `Modal` (`animationType="fade"`).
- Native view `StyleSheet.absoluteFill`.
- HUD (RN overlay, mevcut token'larla):
  - Üst: kapat (kare buton, `xmark` SF Symbol — PageSheet'teki kalıp) + overline `PLACENAME · LEVEL −2` (noktasız — design.md §3.3 blacklist).
  - Alt: koyu kart `colors.la (#101012)`, `r-24`, içinde mesafe `displayXL` tabular beyaz + `mode==='near'` iken kopya değişimi. Bu yüzey design.md §8 "koyu ink kart" ailesidir → `text-secondary/tertiary` HER ZAMAN dark değerleri.
  - `tracking: 'limited'` → StatusLine kalıbıyla uyarı + "foto/kat kartına geç" aksiyonu.
- i18n: yeni anahtarlar `src/localization/en.ts + tr.ts` içine (ör. `youAreClose: "You're close — look around" / "Yaklaştın — etrafına bak"`). Ünlem YASAK (CLAUDE.md).

### 4.3 Find My Car butonunun yeni davranışı (`ActiveSheet`)

```
AR view VAR && session.latitude != null  → ArFindCar modal'ını aç
AR view YOK (Expo Go) || konum yok       → mevcut davranış (openInMaps / hiçbir şey)
AR açık ama tracking 'limited'           → modal içinde foto-kat kartı fallback'i
```
`openInMaps` silinmez — AR ekranında ikincil "Open in Maps" text-buton olarak kalır (uzun mesafe kaçışı).

## 5. İzinler / cihaz

- Kamera + konum izin metinleri `app.json`'da zaten var; ARKit ek izin istemez.
- ARKit desteği: A9+ (fiilen tüm güncel iPhone'lar). Yine de `ARWorldTrackingConfiguration.isSupported` kontrolü → desteklenmiyorsa buton eski davranışta kalır.
- Yalnız iOS. Android ileride ARCore ile ayrı implementasyon (modül arayüzü platform-bağımsız tutulsun).

## 6. v2 — Mapbox Directions rotası

- **Ne zaman:** v1 sahada doğrulandıktan sonra. İstek KURALI: yalnız `distanceM > 100` iken (maliyet + UX).
- **İstek (RN tarafında):**
  `https://api.mapbox.com/directions/v5/mapbox/walking/{userLng},{userLat};{carLng},{carLat}?geometries=geojson&overview=full&access_token=${MAPBOX_PUBLIC_TOKEN}`
  → `routes[0].geometry.coordinates` ([[lng,lat],...]) → native'e `routeCoords` prop'u.
- **Native render:** her koordinat `enuOffset(origin, coord)` ile dünyaya çevrilir; ardışık noktalar arası
  segmentlere §3.6 chevron dizisi döşenir (düz-hat chevronların yerine geçer). Yalnız kullanıcıya en yakın
  ~40 m'lik dilim görünür.
- **Yeniden isteme:** kullanıcı rotadan >35 m saparsa VEYA 60 sn geçtiyse yeni istek; aksi halde ASLA
  (100k/ay ücretsiz kota — 1000 kullanıcıda ~%10 doluluk, bkz. sohbet notu/memory).
- Rota isteği başarısızsa sessizce v1 düz-hat moduna düş (kullanıcıya hata gösterme; huzme zaten çalışıyor).

## 7. design.md eklentisi (uygulamayla birlikte yapılacak)

design.md §7.6'ya "AR katmanı" alt bölümü eklenmeli (screens.md §7b'de kutusu var):
huzme = `accent-fill` dark değeri `#2FE07A` alpha ~0.55, glow yok; chevron = ink; HUD = §8 koyu kart ailesi;
near-mod pin = §5.8 P-pin türevi; kopyalar para-dilinde değil mesafe-dilinde, ünlemsiz.
Eklerken §3.3 nokta grameri ve kapalı token seti korunur — yeni ham renk İCAT EDİLMEZ.

## 8. İş sırası (önerilen commit dilimleri)

1. `modules/parkiq-ar` iskeleti + boş ARView render (kamera açılıyor) + RN modal + koruma katmanı.
2. Origin fix + huzme (statik) + mesafe event'i + HUD.
3. Sapma düzeltme (§3.4) + near-mod + histerezis + fallback durumları.
4. Chevronlar (düz hat) + animasyon.
5. (v2) Directions entegrasyonu + rota chevronları.

Her dilimden sonra: `npx tsc --noEmit` + `npx jest` (mevcut 56 test kırılmamalı). Cihaz testi kullanıcıya
bırakılır (memory: testing-left-to-user) — özet mesajında tek satır "cihazda şunu kontrol et" yeter.

## 9. Bilinen tuzaklar

- **Expo Go'da import → Hermes segfault.** Koruma kalıbı atlanamaz (bkz. MapCanvas.tsx + memory: Expo Go 57 dersi).
- `gravityAndHeading` oturumu pusula hazır olmadan başlarsa hizalama bozuk olabilir → CoachingOverlay bitmeden huzmeyi gösterme (`mode: 'initializing'`).
- Entity'leri her frame'de yeniden yaratma — bir kez yarat, transform güncelle (pil/ısınma).
- `Info.plist`'e yeni bir şey EKLEME (kamera+konum metinleri mevcut); prebuild app.json'dan üretir, `ios/` klasörünü elle düzenleme.
- Simülatörde ARKit çalışmaz — kullanıcı gerçek cihazda dener; "simülatörde test edelim" önerme.
