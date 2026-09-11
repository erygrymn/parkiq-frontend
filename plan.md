# ParkIQ — plan.md (görsel v3 uygulama planı · 2026-09-08)

Hedef: [design.md](design.md) v3'ü koda taşımak ve uygulamayı Apple editöryal çıtasına çıkarmak.
Bu dosya `screens.md`'nin yerini alır: yüzey checklist'i burada. Bir yüzey design.md spec'ine ve
§3 hareket sözleşmesine uyunca kutusu işaretlenir; listede olmayan yüzey önce buraya eklenir.

Doğrulama sınırı: Windows'ta simülatör yok. Statik doğrulama `npm run typecheck` + `npm test`;
görsel ve ısı doğrulaması kullanıcının Mac'inde `npx expo run:ios` ile. Her fazın "cihazda kontrol"
maddeleri kullanıcıya bırakılır ve aşağıda açıkça yazılır.

---

## Denetim özeti (neden bu plan)

| Alan | Bulgu | Karşılığı |
|---|---|---|
| Hareket | Reanimated 4 kurulu, 0 kullanım; tek animasyon onboarding'de 200 ms RN `Animated` | §3 sözleşme, `motion.ts`, Stamp/CountUp/Pressable primitifleri |
| Mimari | Park formu 7 RN Modal; FindMyCar pageSheet + AR Modal + foto Modal iç içe; kutlama Modal | İlke 9: sheet morph, `finding` fazı, `BottomSheetModal`, Reanimated overlay |
| Malzeme | Cam token'ı var, kodda düz dolgu; gölge çiftinin yarısı; koyu temada kenar ışığı yok | `expo-blur` Glass bileşeni, gölge çifti, hairline + kenar ışığı |
| AR | 60 m yeşil sütun, yeşil halka, 14 yeşil chevron, unlit, düzlem algılama kapalı, HUD koyu dikdörtgen | §7.7 yeniden: mürekkep disk yolu, P. monoliti, oklüzyon, cam HUD, kenar göstergesi |
| Kutlama | Statik damga; count-up yok; paywall kapağın üstüne anında açılıyor | §7.8 sekans + paywall yalnız Done sonrası |
| Arabamı Bul | Gri daire içinde SF Symbol ok; heading her olayda setState (sensör hızında re-render) | Pusula kadranı (nokta ibre), shared value, faz olarak sheet |
| Listeler | Her satır gri inset kutu | Hairline editöryal satırlar |
| Haptik | Yok | Haptik haritası (§3) |
| Paywall / Geçmiş | Başarı, restore ve silme sistem Alert | In-surface durumlar, `PRO.` damgası |
| Harita | Mapbox varsayılan stil | Krem editöryal `styleJSON` (Faz 4) |
| Marka | Mark hazır (`assets/brand`), araba pini `car.fill` kullanıyor | Araba pini = marka işareti |

## Higgsfield kararı

Şu an kullanılmıyor. Uygulama tipografik ve sistem-native; üretilmiş görsel kimlikle çatışır. Meşru
iki yuva ileride: App Store ekran görüntüsü/önizleme videosu arka planları (ASO fazı) ve paylaşım web
sayfası için tek bir hero görsel. AR işareti RealityKit'te canlı render edilir, 3D asset gerekmez.
Bağlayıcı olduğunda claude.ai bağlayıcı ayarlarından yetkilendirilmesi gerekir; bu oturumda yetki yok.

---

## Fazlar

### Faz 0 — Dokümanlar ✅
- [x] Eski `design.md`, `screens.md`, `ar-find-my-car.md`, `brand.md` silindi (git geçmişinde).
- [x] `design.md` v3 + bu plan; CLAUDE.md yeni dosyalara bağlandı.

### Faz 1 — Temel (kod altyapısı) ✅ (2026-09-08)
- [x] Bağımlılık: `expo-haptics`, `expo-blur`, `expo-image` (`npx expo install`; `expo-image` plugin app.config.ts'e eklendi).
- [x] `src/theme/motion.ts`: `SPRING`, `DOT_SPRING`, `CROSSFADE_MS`, `LAYOUT_MS`, `PRESS_MS`, `COUNT_UP_MS`,
      `useReducedMotion`, `springTo()`.
- [x] `src/lib/haptics.ts`: §3 haptik haritası (tek giriş noktası; Reduce Motion'da kalır).
- [x] `src/components/motion/`: `Stamp` + `Dot` (damga sekansı), `CountUp` (UI thread tabular), `CelebrationHero`,
      `PressScale` (0.97 + spring), `Glass` (BlurView + tint + hairline, fallback). `Crossfade`/`Hairline` Faz 3'te
      ihtiyaç doğunca (erken soyutlama yok).
- [x] `PrimaryCta` (+ `tone="onDark"`) / `GhostButton` / cam kare → `PressScale`; `DisplayStamp` → `Stamp`. · [ ] chip → `PressScale` (Faz 4).
- [x] Araba pini → marka işareti (`assets/brand/mark.png`, 36pt, `surface/la` kare, 2pt beyaz ring, shadow/1).
- Kabul: `typecheck` + `test` temiz ✅ (222 test). RN `Animated` yalnız Onboarding'de kaldı (Faz 4).

### Faz 2 — AR yeniden (kullanıcının açık isteği) ✅ kod · ⏳ cihaz doğrulaması
- [x] `ParkiqArView.swift`: yatay düzlem algılama (en geniş düzlem, kamera −0.8…−2.2 m bandı); mürekkep disk yolu
      (24 × Ø0.14 m, beyaz halka, mesafeyle solan); P. monoliti (PBR mürekkep levha + ön yüzde app ikonu dokusu,
      doku yoksa 3D "P" + yeşil nokta; yalnız yaw billboard; ölçek clamp(d/12,1,5); yükseklik 2.4/1.5/0.9 m;
      iOS 18+ temas gölgesi); yeşil zemin noktası (yakında 2.4×); mesh oklüzyonu + kişi segmentasyonu;
      `environmentTexturing`; 300 ms easeInOut yeniden yerleşim; `onTarget` ≤6 Hz; arka planda ve pencereden
      çıkınca `pause`; yeşil sütun/halka/chevron silindi.
- [x] `ParkiqArModule.swift`: `Events("onStatus","onTarget")`; podspec `s.resources` ile doku.
- [x] `modules/parkiq-ar/index.ts`: `ArTargetEvent`, `limited` durumu.
- [x] `ArFindMyCar.tsx`: cam HUD kartı, mesafe 44/900, durum satırı, koyu yüzey CTA "I found it", kenar
      göstergesi (shared value, re-render yok), coaching'de kart gizli, yakın eşiğinde `impactLight`.
- [ ] Root'ta Reanimated overlay ile açılış/kapanış (şimdilik `fade` Modal; `finding` fazıyla birlikte Faz 3).
- Kabul: `typecheck` temiz; Swift derlemesi kullanıcının Mac'inde. Cihazda kontrol: (1) diskler yerde
  duruyor mu (2) monolit uzaktan okunuyor, yakında doğal mı (3) araç/insan işareti örtüyor mu (4) 10 dk AR
  sonrası ısı (AR doğası gereği sıcak; pause çalışıyor mu).

### Faz 3 — Çekirdek akış morph'u ✅ kod (2026-09-08) · ⏳ cihaz doğrulaması
- [x] Park anı: `impactMedium` → `PARKED.` damga sekansı → `notificationSuccess`; "Undo" 10 sn text buton;
      "+ Add details" tek satır → alanlar aynı sheet içinde hairline satırlar olarak `LinearTransition` ile açılır
      (konum arama, kat, not, foto, ne zaman, hatırlatıcı inline); 7 RN Modal kaldırıldı; tarife editörü
      `BottomSheetModal` (PopupSheet yeniden yazıldı). · [ ] pin iniş spring (MarkerView içinde; cihaz testi sonrası).
- [x] Kutlama: count-up + nokta en son + 3 detent (`CelebrationHero`) · paywall yalnız Done sonrası · yorum
      isteği 2.5 s sonra · Reanimated kapak (`FadeInDown` spring, Modal kaldırıldı) · canlı kart minyatürü
      (`SavingsCard` 0.12 ölçek, `r-24`, 1.2 s sonra gelir).
- [x] Sheet ↔ harita: `sheetIndex` (makeMutable) → harita scale 1→0.97 + scrim, yüzen kareler 0.6→1'de
      solar; gorhom `animationConfigs` = `SPRING`; faz içerikleri `FadeIn` 200 ms (çıkış animasyonu yok:
      dinamik yükseklik ikiye katlanmasın).
- [x] `finding` fazı: `startFinding`/`stopFinding`, `requestEnd` finding'den de; `FindingSheet` (üç kol,
      foto yerinde büyür, "I found it" → ending); kamera bounds (kullanıcı + araba, 600 ms); 2px ink
      `LineLayer`; `CompassDial` (nokta ibre, heading/bearing shared value, yakında merkeze iner ve yeşil olur);
      AR kök overlay (`ArOverlay`, fade); `FindMyCar.tsx` silindi.
- [x] Aktif oturum: `ElapsedCounter` 1 Hz kendi bileşeni (sheet 30 s'de bir); tarife knob `translateX`
      `withTiming` 300 ms; para kutusu `LinearTransition` spring + fade; foto `PhotoViewer` ile yerinde
      büyür (kök overlay); düzenleme satırları hairline; LA tazeleme Root'a taşındı.
- [x] Bitirme: aynı sheet içinde "END SESSION." damgası (ink nokta) + Paid/Avoided satırı + "End & save ₺X" CTA.
- Kabul: `typecheck` + `test`; cihazda: park anı ≤800 ms, kutlama ≤1.8 s, hiçbir modal iç içe değil,
  aktif ekranda 10 dk ısı testi (idle CPU <3 %).

### Faz 4 — Yüzey cilası ✅ kod (2026-09-08) · ⏳ cihaz doğrulaması
- [x] Onboarding: Reanimated; gezen nokta (üç yuva scroll offset'inden interpolasyon: konum, renk, boy);
      zemin `interpolateColor`; giriş 200 ms + `DOT_SPRING`; Reduce Motion'da inline nokta + crossfade; RN `Animated` kalmadı.
- [x] Geçmiş: kutusuz KPI (`StatTiles`), hairline satırlar, ilk 8 satır stagger, silme onayı `ConfirmSheet`.
- [x] Bitiş kalıcılığı (2026-09-12): "bitirdim ama açınca park sürüyor". Kapanış artık hedefli UPDATE ile yazılıp okunarak doğrulanıyor; açılışta birden fazla açık kayıt varsa en yenisi tutulup yetimler siliniyor (eski NaN sürümünden kalanlar sırayla geri geliyordu). Regresyon testi: .
- [x] Cihaz turu 3 (2026-09-12): Detaylar bloğuna kapatma satırı; dairesel kilit ekranı widget'ı kaldırıldı; Live Activity'deki "End" düğmesi ve niyet köprüsü kaldırıldı; oturumsuz durumda kilit ekranı + widget süpürülüyor (bitirdikten sonra sayaç akmaya devam ediyordu); hızlı soruda hatırlatıcı TÜRÜ seçilebiliyor (hep "bildirim" kuruluyordu, alarm bu yüzden ötmüyordu) ve AlarmKit çağrısı tam argümanlı hâle geldi.
- [x] Cihaz turu 2 (2026-09-12): paywall sayacı bitince düz metne devrediyor (animasyonlu alan yeniden bağlanınca "₺0"a düşüyordu); Mapbox imzası sağ alta, panelin arkasına döndü; bitirme onay bloğu geldi (aktif oturum, Arabamı Bul ve AR aynı bloğu kullanıyor); park soruları çiple ilerlemiyor, alttaki buton ilerletiyor ve geri oku eklendi; "Sesli" hatırlatıcı AlarmKit ile gerçek alarm kuruyor. **Cihazda doğrulanacak:** alarm iOS 26'da çalıyor mu, park erken bitince çalmadan iptal oluyor mu.
- [x] Paywall hero (2026-09-11): metin yığını yerine tek an. Kullanıcının biriktirdiği para varsa kutlama bileşeni count-up ile hero olur (haptiksiz), yoksa display-M başlık yükselerek gelir; satırlar ve plan karoları sırayla. Renk yalnız parada: seçili karo yeşil kâğıt, indirim rozeti accent dolgu.
- [x] Analytics denetimi (2026-09-11): retention ve kullanım verisi doğru akıyor (D1 %33, WAU 4, MAU 6). **Playtime BOZUK ve düzeltmesi SDK tarafında:** `session_end` yalnız 30 dk arka plandan sonra öne dönüşte üretiliyor, arka plana giderken hiç üretilmiyor; gelen tek kayıt da arka planda geçen süreyi uygulama süresi sayıyor. Uygulama tarafında kapatılanlar: build numarası artık gönderiliyor (tüm TestFlight derlemeleri tek satıra düşüyordu), `park_ended` artık `currency` ve `tariff_source` taşıyor.
- [x] Havuz anahtarı (2026-09-11): Ayarlar > Veri altında "Tarifeleri paylaş", varsayılan açık. Kapalıyken ne gönderim yapılır ne öneri sorulur.
- [x] Tarife havuzu (2026-09-11): park başlarken tarife twicehub paneline gönderiliyor, aynı otoparka park eden başkasına en çok girilen tarife öneri olarak dönüyor. Otopark kimliği OSM (`osm:way/123`), eşleşme yoksa ~110 m koordinat hücresi. Gönderende kullanıcı kimliği yok; sayacı şişirmesin diye otopark başına türetilmiş kısa özet var. Para birimleri ayrı sayılır. Panel: ParkIQ projesine özel "Tarife Havuzu" modülü. **Cihazda doğrulanacak:** öneri çipi gerçekten çıkıyor mu, gönderim panele düşüyor mu.
- [x] Kilit ekranı katmanı elden geçti (2026-09-10): Live Activity kartı kendi kendine akan geri sayım + dilim dolumu (`ProgressView(timerInterval:)`) ile canlı, başlıkta ikincil süre, sağ üstte "Bitir"; ContentState değişmez alan taşımıyor (kat/yer artık güncelleniyor); widget kutusu sınır + para metinlerini de taşıyor ve tam sınır anında tazeleniyor; kilit ekranı circular halka. **Cihazda doğrulanacak:** kart kilitliyken sayaç/halka akıyor mu, kat girince kart güncelleniyor mu.
- [x] Sesli hatırlatıcı gerçekten sesli (2026-09-10): `scheduleAt` `loud` bayrağını hiç kullanmıyordu, tüm bildirimler `sound: false` kuruluyordu. Ses + `interruptionLevel` eklendi, ön plan sunumu da sesi çalıyor, dilim uyarıları zaman duyarlı. **Cihazda doğrulanacak:** Xcode otomatik imzalama "Time Sensitive Notifications" yeteneğini eklemeli.
- [x] Cihaz turu düzeltmeleri (2026-09-10): bitiş anı NaN (`onPress={endSession}` olay nesnesini argüman geçiriyordu) → oturum kapanmıyor, sayaç yeniden açılışta devam ediyordu; Mapbox imzası panelin üstüne alındı; kat çipleri tek satır + fotoğraf ayrı eylem; tarife formu panelin içinde açılıyor; hatırlatıcı süreleri neye göre sayıldığını yazıyor.
- [x] Harita sheet yükselirken artık ölçeklenmiyor (kenar çerçevesi görünüyordu); derinlik yalnız scrim.
- [x] Kilit ekranı widget'ları (accessory circular/rectangular/inline) + Live Activity "Bitir" düğmesi (`ParkIQEndSessionIntent`, ikiz dosya) + `consumePendingEnd` köprüsü. **Cihazda doğrulanacak:** niyet arka planda app'i açıp kutuya yazıyor mu, kart anında sönüyor mu, kilit ekranı widget'ı galeride çıkıyor mu.
- [x] Park anı hızlı sorular (2026-09-08): form yerine Kat → Tarife → Hatırlat çip soruları, her biri atlanabilir; not/backdate/hatırlatıcı ayrıntıları aktif sheet "Details" satırına taşındı. Bitirme tek dokunuş (`endSession`), `ending` fazı silindi; Undo kutlama kapağında.
- [x] Geçmiş kök sheet sahnesi oldu (2026-09-08): ayrı pageSheet yok; noktalar haritada, satır → kamera uçuşu + araba pini, detay sheet içinde. Ayarlar pageSheet kaldı (koyu yüzey `surface/card`, 17/600 ortalanmış başlık).
- [x] Paywall: sistem Alert'ler kalktı; başarı → sheet kapanır + kök `ProStamp` ("PRO." ink nokta + haptik);
      restore satırları in-surface; plan kartı hairline + seçili ink border. Kullanıcının rakamı zaten başlık altında.
- [x] Ayarlar: tüm veriyi sil → `ConfirmSheet` (Alert kalktı); satırlar zaten metin satırı.
- [x] Keşif: cam kareler gerçek blur; chip'ler `PressScale` + `selection` (sheet içinde, cam değil); POI kartı
      faz crossfade'iyle morph; pin seçimi 1.25× `SPRING` + `selection`; en yakın 3 satır stagger.
- [x] Harita stili: gömülü `styleJSON` (`src/lib/mapStyle.ts`, Streets v8 üstüne krem/ink katmanlar, POI etiketi
      yok, semt adları uppercase). `calm` = mevcut uniform scrim (stil değişimi flicker yapar, yapılmadı).
      Cihazda kontrol: kaynak katman adları ve font isimleri.
- [x] Paylaşım kartı minyatürü kutlamada canlı.
- Kabul: `professional-app-design` döngüsü ekran başına en az bir tur (kullanıcı ekran görüntüsü
  sağlar), design.md DON'T listesi taraması, dark mode ve Dynamic Type XL kontrolü.

### Faz 5 — Doğrulama (kullanıcıda)
- [ ] 120 fps: sheet sürükleme, kutlama, AR HUD; Xcode Instruments Core Animation.
- [ ] Isı: aktif oturum 10 dk, AR 10 dk (pause davranışı); Energy Log.
- [ ] Reduce Motion açıkken tüm sekanslar; VoiceOver turu; Dynamic Type XL.
- [ ] Live Activity + widget dokunulmadı, regresyon yok.

---

## Yüzey checklist'i (design.md §7 sırasıyla)

**7.1 Onboarding** · [x] S1/S2/S3 posterler · [x] gate + Skip · [x] konum izni S3'te · [x] gezen nokta
· [x] zemin interpolasyonu · [x] Reanimated'e geçiş

**7.2 Keşif** · [x] Mapbox + puck + pinler · [x] arama · [x] chip'ler · [x] en yakın 3 · [x] POI kartı
· [x] konuma dön · [x] offline satırı · [x] cam kareler gerçek blur · [x] POI morph + pin spring
· [x] harita ↔ sheet bağı · [x] custom stil (gömülü JSON) · [ ] cluster kademeleri
· [x] izin reddi manuel pin akışı (§7.12) · [x] izin daveti satırı (`LocationInvite`)

**7.3 Park anı** · [x] ≤2 sn kayıt · [x] kat/not/foto/backdate/hatırlatıcı/tarife · [x] tarife hafızası
· [x] zayıf GPS nudge · [x] pin düzeltme · [x] damga sekansı + haptik · [x] "+ Add details" inline
· [x] popup modallar kaldırıldı · [x] araba pini = marka işareti

**7.4 Tarife + OCR** · [x] tiered/flat/hourly · [x] Vision OCR (premium) · [x] hata düşüşleri
· [ ] satır ekleme `LinearTransition` · [ ] OCR sonucu stagger · [x] editör `BottomSheetModal`

**7.5 Aktif oturum** · [x] sayaç · [x] tarife çubuğu · [x] para kutusu · [x] amber · [x] tarifesiz mod
· [x] aksiyonlar · [x] >24 sa · [x] cold start · [x] sayaç ayrı bileşen · [x] knob `withTiming`
· [x] para kutusu layout spring · [x] foto yerinde büyüme · [x] hairline satırlar

**7.6 Arabamı Bul** · [x] mesafe · [x] pusula (premium) · [x] kapalı alan kartı · [x] foto tam ekran
· [x] Apple Maps devri · [x] `finding` fazı (Modal kaldırıldı) · [x] kadran (nokta ibre) · [x] shared
value heading · [x] kamera bounds + hairline çizgi

**7.7 AR** · [x] modül + coaching + GPS yeniden bağlama · [x] disk yolu · [x] P. monoliti · [x] zemin
noktası · [x] düzlem algılama · [x] oklüzyon · [x] cam HUD · [x] kenar göstergesi · [x] overlay giriş
· [x] pause · [ ] cihazda doğrulama (Swift derlemesi + görsel)

**7.8 Bitirme + Kutlama** · [x] onay + Undo · [x] üç varyant · [x] paylaşım kartı · [x] yorum isteği
· [x] bildirim iptali · [x] Reanimated kapak · [x] count-up + nokta + haptik · [x] canlı minyatür
· [x] paywall yalnız Done sonrası

**7.9 Geçmiş (sheet sahnesi)** · [x] harita noktaları + uçuş · [x] liste + gruplar · [x] boş durum · [x] detay · [x] KPI + grafik · [x] aylık kart
· [x] kutusuz KPI · [x] hairline satırlar · [x] stagger · [x] silme onayı sheet

**7.10 Ayarlar** · [x] tema/dil/para/eşik · [x] abonelik · [x] izinler · [x] veri (havuz anahtarı)
· [x] hakkında · [x] silme onayı sheet

**7.11 Paywall** · [x] planlar · [x] özellikler · [x] restore + yasal · [x] tetikler · [x] Alert'siz
durumlar · [x] `PRO.` damgası · [x] hairline plan kartı

**7.12 Pin bırakma** · [x] katman · [ ] kart `SPRING` girişi

**7.13 Zorunlu güncelleme** · [x] `ForceUpdateGate`

**App Store uyum turu (2026-09-12)** · [x] konum duvarı kaldırıldı, yerine §7.2 daveti (5.1.2(i))
· [x] izin metinlerinden veri akışı iddiası çıktı (14 dil, 2.3.1) · [x] tarife havuzu rıza soruyor
(`tariffPoolAsked`, 5.1.5) · [x] oto-algılama tamamen kaldırıldı (kod + paywall + 18 dil mağaza metni)
· [x] `NSPhotoLibraryAddUsageDescription` (paylaşım sayfası çökmesi, 2.1) · [x] `ios.privacyManifests`
· [x] mağaza `supportUrl`/`marketingUrl` · [ ] cihazda kontrol: izni reddet → uygulama çalışıyor mu,
paylaşım kartı → "Görüntüyü Kaydet" çökmüyor mu

**8 LA/DI/widget** · [x] hepsi (regresyon testi Faz 5)

**9 Paylaşım** · [x] link + web sayfası · [x] kartlar · [x] kutlamada canlı minyatür

**Kesişen** · [x] offline · [x] izin satırları · [x] boş durumlar · [x] Dynamic Type · [x] dark mode
· [x] Reduce Motion (damga, count-up, PressScale, Dot, kadran, onboarding, foto: crossfade / hareketsiz) · [x] haptik
haritası (commit, stamp, tick, near, selection)

---

## Riskler

- **Reanimated 4.5.1 / worklets 0.10.1 / RN 0.86** eşleşmesi: `npx expo install --check` ile doğrula;
  uyumsuzlukta Expo'nun önerdiği sürüme in.
- **gorhom bottom-sheet 5 + Reanimated 4**: `animatedIndex` shared value tipi; `BottomSheetModal`
  `GestureHandlerRootView` içinde.
- **Harita ölçeği:** Mapbox view'ı yeniden boyutlanmamalı; yalnız container transform. Aksi halde tile
  yeniden hesaplanır ve ısınır.
- **AR PBR malzeme + oklüzyon** eski cihazlarda pahalı; `supportsSceneReconstruction` kontrolüyle kapı,
  LiDAR'sızda unlit'e düşülmez ama gölge kapanır.
- **Swift derlemesi burada test edilemez.** Kodu bilinen RealityKit API'leriyle ve `#available`
  kapılarıyla yazıp derleme hatasını kullanıcı raporlar.
- **Eski § referansları** kod yorumlarında (24 dosya) eski numaralara işaret ediyor; her dosyaya
  dokunulduğunda v3 numarasına çevrilir, toplu değişiklik yapılmaz.
