# ParkIQ — design.md (v3 · 2026-09-08)

Tasarımın tek kaynağı. Eski `design.md`, `screens.md`, `ar-find-my-car.md` ve `brand.md` bu dosyaya
katlandı ve silindi (git geçmişinde duruyor, son commit `81d5eb3`). Uygulama sırası, durum ve kabul
kriterleri **[plan.md](plan.md)**'de. Token değerleri kodda: `src/theme/tokens.ts` ve
`src/theme/motion.ts` — burada tekrar edilmez.

Öncelik: bu dosya > `twice-app-design` skill sözleşmesi > diğer skill önerileri.

---

## 0. Hedef ve ölçüt

Apple'ın editöryal olarak öne çıkarabileceği bir araç. Dört ölçüt, hepsi birden:

1. **Fiziksel nesne hissi.** Tek kahraman nesne, sürekli dönüşüm, hiçbir şey pop-in yapmaz. Durumlar
   arasında yeni ekran kaymaz, aynı yüzey morph olur.
2. **Kimlik tipografiden.** Marka kapatılsa bile ekranın ParkIQ olduğu anlaşılır: mürekkep, kâğıt,
   tek yeşil, noktayla biten display satırı.
3. **120 fps ve soğuk telefon.** Hareket başlar, biter, durur. Kullanıcı hiçbir şey yapmıyorsa cihaz
   da hiçbir şey yapmıyor.
4. **Platformun kendisi.** Live Activity, widget, Dynamic Island, cam, Dynamic Type, VoiceOver,
   Reduce Motion: hepsi gerçek, hiçbiri taklit.

Neyin bozuk olduğu (2026-09-08 denetimi): hareket katmanı sıfırdı (Reanimated kurulu, hiç
kullanılmamış); her durum geçişi sert içerik değişimiydi; park formu 7 ayrı modal açıyordu; Arabamı
Bul, AR ve foto üç iç içe modaldı; cam token'ı tanımlıydı ama kodda düz dolgu vardı; AR sahnesi
60 m'lik yeşil bir sütun ve 14 yeşil V idi; kutlama ekranı açılır açılmaz paywall üstüne kapanıyordu;
haptik yoktu. Bu dosya bunların hepsinin karşılığını verir.

---

## 1. Kimlik: Mono Editorial

Mürekkep-siyah tipografi, bembeyaz kartlar, sıcak krem harita, tek elektrik yeşili. Referans DNA:
Zara'nın retail-editorial harita ekranı (dev Black uppercase yer adı + nokta), Flighty (tabela dili,
tabular rakam, dürüst ilerleme), Apple Maps AR yürüyüş yönlendirmesi (yerde sakin, büyük, gölgeli
işaretler), iOS'un kendisi (cam, SF Pro, sistem kalıpları).

**İlkeler (bağlayıcı):**

1. **Kişilik tipografiden gelir.** SF Pro Black/900 uppercase + cümle sonu NOKTA imzası duygu
   anlarını taşır. İllüstrasyon, maskot, dekor, gradyan, konfeti, partikül yok.
2. **Yeşil semantik kilidi.** Yeşil yalnızca üç anlam taşır: **para + şarj + canlı**. Yeşil CTA, yeşil
   büyük yüzey, dekoratif yeşil nokta yasak. Süre para değildir: süre damgaları ink nokta taşır.
3. **Krem karantinası.** `map/canvas` kremi yalnız haritada ve onboarding S1/S3 posterlerinde. Hiçbir
   sheet, kart, paywall zemini krem olamaz.
4. **Ana aksiyon tek ve siyah.** Ekran başına tek hap CTA; ikincil aksiyonlar ghost/text/cam kare.
   Bir kontrol = bir fiil.
5. **Veri asla yalan söylemez.** Tarife çubuğu, fiyatlar, geri sayım, tasarruf: hepsi `tariffMath`'ten.
   Elle yüzde yok; sahte ilerleme çubuğu yok; para her zaman rakamla.
6. **Sahne ayrımı.** App güven verir, kilit ekranı gösterir. Tam yüzeyli siyah kart yalnız LA / widget
   / paylaşım kartı / AR HUD'ında yaşar; app içinde siyah mikro ölçekte kalır (CTA, pin, knob).
   Tek istisna: onboarding S2 posteri.
7. **Ekran başına tek display-boy odak ve en fazla 1 imza noktası.** Marka işaretleri sayıma girmez.
8. **Nokta hareket eder.** İmza noktası uygulamanın tek "bespoke" hareket varlığıdır: damgada en son
   gelir ve zıplar, haritada pindir, pusulada ibredir, AR'da varış işaretidir, onboarding'de posterler
   arasında yürür. Bunun dışında dekoratif hareket yoktur.
9. **Sahne, ekran değil.** Root = harita + tek sheet. Park formu, Arabamı Bul, bitirme, kutlama ve
   küçük düzenleme yüzeyleri sheet'in içinde ya da sheet'in morph'uyla yaşar. Modal yalnız: Geçmiş ve
   Ayarlar (pageSheet), Paywall (tam ekran), AR kamera (tam ekran overlay). İç içe modal yasak.

---

## 2. Token'lar ve tip kuralları

Değerler `src/theme/tokens.ts`'te (renk light/dark, tip skalası, spacing, radius, gölge çiftleri,
cam) ve `src/theme/motion.ts`'te (spring'ler, süreler). Component içinde ham hex/değer yasak.

**Renk kuralları:**
- Kontrast tablosu bağlayıcıdır: `#00A650` yalnız beyaz üstünde ve ≥22pt; `surface/bg` ve krem
  üstünde yeşil metin/nokta `accent-text #0B7A3E`; `#2FE07A` yalnız koyu zeminde; yeşil dolgu üstüne
  her zaman ink; `#FFB300` açık temada hiçbir rolde.
- Amber yalnız gerçek bir fiyat artışına bağlanır ve her zaman ikon + metin çiftiyle gelir. Kırmızı
  hiçbir zaman yok.
- Altın (`pro` #B8860B / #F5C242) tek bir işin rengidir: premium rozeti `crown.fill`. Amberle
  karıştırılmaz — biri "paran artmak üzere", diğeri "bu kilitli" der. Kilitli HER yüzeyde aynı taç
  durur (filtre, çipler, tarife tarama, pusula, AR, Ayarlar, Geçmiş daveti) ve yalnız `!isPremium`
  iken çizilir: yetki gelince rozet düşer, özellik açılır. Dolgu olarak kullanılmaz.
- Bilgi taşıyan metin asla `disabled` grisiyle yazılmaz. Hiyerarşi: ink > text-secondary >
  text-tertiary > disabled (bilgi taşımaz).
- Gri ailesi tek (zinc). Gölge rengi sıcak-ink `rgba(24,20,12,x)`, max alfa .18. Renkli glow yok.

**Tip kuralları:**
- Tek aile SF Pro; platform dışı yüzeylerde (web, paylaşım kartı) Inter / Inter Display 800/900.
- Skala kapalı: overline 11/800 +0.14em UPPER · caption 13 · body 15 · headline 17/600 · title 22/900
  · display-S 28 · display-M 34 · display-XL 64. Ağırlık durakları 400/600/800/900; 900 yalnız
  uppercase display. Yarım punto yok (tek istisna: tarife çubuğu 9pt saat işaretleri).
- Çift-izleme: dev uppercase sıkı (−0.02…−0.03em), overline geniş (+0.14em).
- Tabular: saniyede değişen ya da alt alta hizalanan her rakam. Proportional: duran hero rakam.
- Display katmanı `maxFontSizeMultiplier 1.3`; poster katmanı (LA, widget, kart, onboarding) sabit.

**Nokta grameri (kanun):**
- Nokta = tamamlanmış durum. Yalnız Black/900 uppercase display satır sonunda.
- Yeşil nokta whitelist'i: `PARKED.` / `PARK ETTİN.` · `SAVED ₺X.` / `₺X CEBİNDE.` · LA bitiş karesi ·
  paylaşım kartı tasarruf başlığı · wordmark `PARKIQ.` · app ikonu · onboarding manifesto noktaları.
  Rengi zemine bağlı: beyaz → `#00A650`; `surface/bg` ve krem → `#0B7A3E`; koyu → `#2FE07A`; yeşil
  zemin → ink.
- Yer adları noktayı korur, nokta ink: `KANYON AVM.` Süre damgaları ink: `PARKED 1H 45M.`
- Blacklist: CTA, overline, bildirim, amber metin, liste satırı, Ayarlar, Paywall başlıkları, boş durum.
- Frekans: yüzey başına en fazla 1 imza noktası + 1 marka işareti. Tie-breaker: duygu başlığı kazanır,
  yer adı o ekranda noktasız yazılır.
- **Ünlem işareti tüm üründe istisnasız yasak.**

**Marka işareti:** `assets/brand/mark*.png` (P'nin karnında yeşil nokta, gövdesi pin ucuna iner).
Tek varlık: app ikonu = araba pini = LA/widget glyph'i = paylaşım kartı imzası. Yeniden çizilmez,
harflerden kurulmaz.

---

## 3. Hareket sözleşmesi (bağlayıcı)

`twice-app-design` skill sözleşmesinin ParkIQ'ya özel hali. Çelişkide bu bölüm kazanır.

**Kural seti:**
- Her ekran/akış işi **scene sheet** ile başlar: hero, driver, tek an, sabitler, sessizler, idle maliyeti,
  haptik, zaman çizelgesi. Scene sheet yoksa hareket yok.
- Ekran başına **tek koreografi** + kontrollerde mikro geri bildirim. Geri kalan her şey anlık ya da
  200 ms crossfade. Damga ≤ 800 ms; kutlama ≤ 1.8 s ve akış başına bir kez.
- **Döngü yok.** Nabız, nefes, süzülme, shimmer, parallax, sonsuz dönüş yok. `withRepeat` yasak. LA geri
  sayımı sistem timer'ıdır; §8.5 bitiş karesi tek karedir.
- **Fizik, tween değil.** Tek genel spring `SPRING` (damping 18, stiffness 180, mass 1). Nokta damgası
  için `DOT_SPRING` (damping 12, stiffness 260, mass 0.8: response ≈ 0.35, overshoot ≈ %15). Üçüncü
  spring yazılmaz. `linear` ve `ease-in-out` yasak; sabit süreler yalnız crossfade (200) ve layout (300).
- **UI thread.** Reanimated shared value + `useAnimatedStyle`; RN çekirdek `Animated` yasak. Jest sürüşlü
  geçişte tek `progress` değeri, her özellik ondan interpolasyon; kesilebilir ve geri alınabilir.
- **Compositor özellikleri.** Yalnız transform + opacity. Genişlik, yükseklik, padding, radius, blur
  yarıçapı, gölge hareketli view'da animasyona girmez. İlerleme çubuğu `scaleX` ile.
- **Stagger** 40–70 ms, en fazla 8 öğe, yalnız ilk mount'ta.
- **Her dokunulabilir:** pressed scale 0.97 (120 ms), bırakınca `SPRING`.
- **Reduce Motion:** spring/overshoot → 200 ms crossfade; rotasyon ve ölçek yok; count-up düz fade;
  haptik kalır.
- **Idle = sıfır iş.** Görünür sayaç 1 Hz ve yalnız ekranı odaktayken; sayaç kendi bileşeninde re-render
  olur, sheet'i tetiklemez. Harita bileşeni memoize; state değişimi haritayı yeniden render etmez.
  Konum: park anında tek düzeltme, sonra durur; Arabamı Bul açıkken akış, kapanınca iptal. Pusula
  okumaları shared value'ya yazılır, React re-render üretmez.
- **Cam bütçesi:** ekranda en fazla 3 BlurView, hepsi statik. Blur yarıçapı animasyona girmez.

**Haptik haritası (tam liste, başka yerde haptik yok):**

| An | Haptik |
|---|---|
| "I Parked" dokunuşu | `impactMedium` |
| `PARKED.` noktası inince | `notificationSuccess` |
| Pin / seçenek seçimi | `selection` |
| Kutlama count-up | en fazla 3 `impactLight` detent |
| `SAVED ₺X.` noktası inince | `notificationSuccess` (count-up ile tek) |
| `PRO.` damgası | `notificationSuccess` |
| AR / pusula "yakınsın" eşiği | tek `impactLight` |

**Sekanslar:**

| Sekans | Zaman çizelgesi |
|---|---|
| Damga (`PARKED.`, `END SESSION.`, `PRO.`, `PARKED 1H 45M.`) | t0 metin opacity 0→1 + y 8→0 (150 ms) · t150 nokta scale 0→1 `DOT_SPRING` (~350 ms) · toplam ≤ 500 ms |
| Park anı | tap `impactMedium` → CTA pressed 0.97 → sheet morph (`SPRING`) → damga → araba pini haritaya `SPRING` ile iner (y −24→0, scale 0.6→1) → nokta ile `notificationSuccess` · toplam ≤ 800 ms |
| Kutlama (yalnız varyant c) | overline 200 ms fade → "YOU SAVED" 150 ms → ₺ count-up 0→X, 800 ms `Easing.out(cubic)` benzeri spring-less (tek istisna: count-up sayısal), tabular, 3 detent → nokta `DOT_SPRING` EN SON + `notificationSuccess` → özet satırları 50 ms stagger · toplam ≤ 1.8 s |
| Sheet morph (faz değişimi) | yükseklik `SPRING` (gorhom `animationConfigs`) + içerik 200 ms crossfade (`FadeIn/FadeOut`) |
| Harita ↔ sheet | `animatedIndex` → scrim 0→1, yüzen kareler opacity 1→0 (yalnız full detent). Harita ölçeklenmez: küçültme kenarları açıp app zoom-out gibi görünüyordu |
| CTA morph (Navigate → End) | 200 ms crossfade |
| Pin seçimi | scale 1→1.25 `SPRING` + `selection` |
| Pusula | heading shared value, kısa yay üzerinden `SPRING`; ibre React re-render'sız |
| Onboarding | başlık 200 ms fade/rise · nokta 150 ms sonra `DOT_SPRING` · sayfa kaydırması noktayı ve zemin rengini scroll offset'inden sürer |
| Popup (BottomSheetModal) | zemin 200 ms fade, panel `SPRING` |

---

## 4. Malzeme ve derinlik

Üç katman: **L0 harita/kamera** (zengin zemin) · **L1 sheet ve kartlar** (opak, `surface/card`,
`r-24`, light'ta `shadow/3`, dark'ta gölgesiz + yüzey basamağı + 0.5px `hairline-dark` + kenar ışığı
`inset 0 1px 0 rgba(255,255,255,.06)`) · **L2 yüzen kontroller** (cam).

- **Derinlik davranıştan gelir, gölgeden değil.** Sheet full detent'e giderken harita yerinde kalır ve
  `scrim` gelir (ölçek küçültme yok — kenarlar açılıp çerçeve görünüyordu); aktif oturumda harita
  `calm` + uniform scrim. Dikey vignette yok.
- **Cam** (`glass` token'ı): `expo-blur` BlurView intensity 75 + tint katmanı + iç/dış hairline.
  Yalnız harita ya da kamera üstünde yüzen öğelerde: kare ikon butonlar, chip'ler, arama çubuğu, AR
  HUD kartı. Sheet ve kartlar asla cam. Fallback düz dolgu `%92`.
- **Gölge çiftleri** iki view ile uygulanır (temas iç view, ortam dış wrapper). Siyah CTA gölgesiz
  + kenar ışığı `inset 0 1px 0 rgba(255,255,255,.08)`.
- **Radius:** 8 / 12 / 16 / 24 / tam. Konsantrik kural: iç radius = dış − padding. `borderCurve:
  'continuous'`. Dairesel FAB yok.
- **Listeler editöryaldir:** gri kutu yığını değil, `gridline` hairline ile ayrılmış 44pt+ satırlar.
  Inset gri zemin yalnız input, arama, iskelet ve seçim kutuları için.
- **Pinler:** araba pini = marka işareti (`mark-light`/`mark-dark`), 36pt, beyaz ring 2pt, `shadow/1`,
  seçiliyken 1.25× spring; POI pini 22pt ink kare "P", şarj yeşil kare `bolt.fill`, beyaz ring 1.5pt;
  cluster 28pt ink daire + beyaz tabular sayı. "Me": iOS mavi nokta + halo (sistem konvansiyonu).

---

## 5. Bileşen kütüphanesi

| Bileşen | Spec |
|---|---|
| Primary CTA | 52pt hap, ink zemin (dark'ta `#F0F0F2` + ink metin), 17/600, gölgesiz + kenar ışığı; pressed 0.97 + `cta-pressed`; disabled `inset-pressed` + `disabled` metin. Ekran başına 1. Metinde nokta/ikon yok. |
| Ghost | 44pt hap, `surface/inset`, 17/600 ink; pressed `inset-pressed` + 0.97. |
| Text buton | 44pt hedef, 17/600 `text-secondary`, pressed ink. |
| Cam kare | 44×44 `r-12`, `glass`, SF Symbol 22pt Light, ink; pressed 0.97 + iç overlay. Yalnız harita/kamera üstü. |
| Chip | 36pt görsel (44 hedef), tam radius, 13/600; harita üstünde cam, seçili ink + beyaz metin; EV seçiliyken yalnız `bolt.fill` yeşil. Yeşil dolgulu chip yok. |
| Arama | 44pt `r-12`, harita üstünde cam, sheet içinde `surface/inset`; placeholder 15 `text-secondary`. |
| Liste satırı | min 44pt, 15/400 ink, değer sağda 15/800 tabular, `gridline` hairline ayraç; chevron 13 Regular `disabled`. |
| Input | 44pt `r-12` `surface/inset`, focused 1.5pt ink border; sayısal alan tabular sağa hizalı. |
| Toggle | native switch, `onTintColor accent-fill`. |
| Tarife çubuğu | §5.9 eski spec aynen: 12pt track, solid yeşil dolgu, 18pt knob (light ink + beyaz halka; dark yeşil + kart halka), dilim genişliği süre-orantılı, 2px gap, fiyatlar dilim merkezinde 11/800 tabular, geçilmiş dilim 400 `text-secondary`, saat işaretleri 9/600; `barTone` durum makinesi `tariffMath`'ten; approaching'de knob halkaya döner + `clock` ikon + metin. Knob konumu değişince `withTiming` 300 ms (dakikada bir gerçek matematik). |
| Para kutusu | `r-16`, 12×16 padding, 13/400, tutarlar 800 tabular; yeşil hal `alert-bg-money` + `accent-text`; amber hal `alert-bg-warn` + `warn-text` + `clock`. Görünme: sınıra ≤30 dk. Gelişi `LinearTransition` spring; tutar değişimi yerinde 200 ms crossfade. |
| Durum satırı | 32pt (eylemli 44pt), 6pt `warn-fill` nokta + 13/400 `text-secondary`; "Offline — timer still running", "Location off · Turn on". |
| Boş durum | 3 iskelet satır + 15/600 başlık + 13 açıklama. İllüstrasyon yok. |
| İkonlar | SF Symbols; metin yanı Regular, hero/cam kare Light. Emoji glyph yasak. |
| **Damga** (`Stamp`) | display-M/S + renkli nokta; §3 damga sekansı gömülü; Reduce Motion'da crossfade. |
| **CountUp** | tabular display-XL, shared value → `useAnimatedProps` (TextInput) ile UI thread'de; 3 detent haptik; Reduce Motion'da düz fade. |
| **Pusula kadranı** | 96pt hairline halka (`gridline` 1.5pt); ibre = 8pt ink nokta, halka üzerinde göreli yöne yürür (`SPRING`, kısa yay); ≤20 m'de nokta merkeze iner, 12pt yeşil olur ("buradasın"). Heading güvenilmezse (accuracy ≤1) nokta %45 opak; heading yoksa kadran hiç çizilmez. |
| **Foto** | `r-16`, `expo-image`; dokununca yerinde büyür (shared value scale/translate, tam ekran overlay), modal değil. |

---

## 6. Harita stili

Mapbox logosu + attribution **panelin hemen üstünde, sol altta** durur; panel her durduğunda konum
yeniden hesaplanır. Üst köşede sayfanın kendi başlığı gibi okunuyordu.

Custom stil JSON (`styleJSON`, Faz 4): `parkiq-light` / `parkiq-dark` + aktif oturumda `calm`
varyantı (POI etiket opaklığı %50, yol kontrastı bir kademe düşük).

| Katman | Light | Dark |
|---|---|---|
| Zemin | `#F5F2EB` | `#161618` |
| Yollar | `#FFFFFF` | `#232327` |
| Park/yeşil alan | `#DCE8CD` | `#1E241F` |
| Binalar | `#ECE7DC` | `#1C1C1F` |
| Su | `#D9E3E8` | `#14181C` |
| Etiketler | `#6E6E78` POI / `#141416` semt | `#8A8A93` / `#F0F0F2` |

POI yoğunluğu düşük (AVM/otopark/şarj + semt adları). Stil hazır olana kadar Mapbox Light/Dark.
Harita üstünde logo/watermark alanı yalnız Mapbox atfı.

---

## 7. Sahneler

**Mimari:** Tab bar yok. Root = `MapCanvas` (asla unmount olmaz) + her zaman açık durum-güdümlü
bottom sheet (`@gorhom/bottom-sheet`). Faz enum'u: `idle | parking | active | finding | ending |
ended`. Faz değişimi = sheet morph (§3). Geçmiş kök sheet sahnesidir (fazdan bağımsız, harita üstte);
Ayarlar pageSheet; Paywall tam ekran; AR tam ekran overlay. Küçük düzenleme yüzeyleri gorhom
panelidir (`PopupSheet`) — jest, spring ve zemin aynı. Taşıyıcısı 2026-09-11'de RN `Modal`'a
alındı: gorhom 5.2'de portal konağı sağlayıcının ilk çocuğu olduğu için panel uygulamanın ALTINA
çiziliyordu (filtre butonu ölü, tarife editöründeki "Gir" basılamaz görünüyordu). Kural aynı kalır —
ham RN `Modal` ile sheet yazılmaz, `PopupSheet` kullanılır. Aynı anda tek aktif oturum. Cold start aktif oturum varsa doğrudan `active`.

### 7.1 Onboarding: 3 tipografik manifesto posteri (poster katmanı)

- S1 krem `#F5F2EB` (dark `#131315`): "PARK." Black ≈76pt, nokta `#0B7A3E`; gövde 17/400 2–3 satır.
- S2 siyah `#141416` (her iki temada): "SAVE MONEY." beyaz, nokta `#2FE07A`.
- S3 krem: "FIND IT." + siyah hap "Continue" (pre-prompt'un kendisi → sistem WhenInUse) + "Not now".
- Skip sağ üstte; 3 nokta göstergesi; toplam okuma <15 sn; özellik turu yok.
- **Scene sheet:** hero = imza noktası (S1 → S2 → S3 boyunca tek nesne; sayfa kayarken kelimenin
  sonuna yürür, rengi zemine göre interpolasyon) · driver = pager scroll offset · an = ilk görünüşte
  başlık 200 ms fade/rise + nokta `DOT_SPRING` · sabit = Skip, gösterge, CTA · sessiz = gövde metni,
  CTA · haptik yok · idle sıfır.
- Zemin rengi sayfalar arasında `interpolateColor` ile (krem → siyah → krem), sert kesme yok.
- Reduce Motion: nokta ve zemin geçişi crossfade; nokta yürümez.
- App Store screenshot seti bu üç kareden üretilir.

### 7.2 Keşif (`idle`)

- Harita üst 2/3. Sağ üstte cam kareler: History (`clock.arrow.circlepath`), Settings (`gearshape`),
  Filters (`line.3.horizontal.decrease`). Ekranın üst 1/3'ünde birincil dokunulabilir öğe yok.
- Konum izni yoksa panelin EN ÜSTÜNDE davet satırı (§7.13): başlık + caption + "izin ver" /
  "şimdi değil". İzin gelince kendiliğinden düşer. Uygulama izinsiz de tam çalışır — pin bırakılır.
- Sheet kompakt (arama + "I Parked") → çekilince chip'ler + en yakın 3 otopark (editöryal satırlar:
  overline yürüme/mesafe · 21/900 ad · "Directions" text). Arama native geocoder.
- Pin seçimi → kart o otoparka morph (aynı sheet, 200 ms crossfade + `SPRING` yükseklik); harita
  kamerası pine uçar (600 ms). Yer adı display-M ink nokta (ekranın tek imza noktası).
- Meta satırı yalnız MEVCUT veriyi "·" ile dizer; "Unknown"/"—" yok. Canlı dot yalnız açık/kapalı
  verisi varken.
- **Scene sheet:** hero = sheet (peek → mid → full) · driver = sheet sürükleme (`animatedIndex`) ·
  an = ilk açılışta harita zaten konumlanmış, konum puck'ı 0→1 spring, sheet alttan `SPRING` (≤800 ms,
  spinner yok) · sabit = cam kareler · sessiz = arama, chip, liste · idle sıfır (harita memoize).

### 7.3 Park anı (`parking`): 2 saniye kuralı, sonra üç hızlı soru

- "I Parked" → `impactMedium` → oturum ≤2 sn'de persist, ağ beklenmez. Bütün iş, ekstra detay
  eklenmezse, **10–15 saniyede** biter: I Parked + en fazla üç çip dokunuşu.
- Sheet morph: `PARKED.` damgası (yeşil nokta, ekranın tek odağı) → "Undo" text (10 sn) → **form
  değil, sırayla üç soru**. Her soru bir overline + 17/600 soru cümlesi + çip satırı; solda geri oku
  (ilk sorudan sonra), sağ üstte "Skip". **Çip seçer, İLERLETMEZ:** ilerleten tek şey alttaki siyah
  buton ("Next", son soruda "Done") ya da "Skip". Otomatik ilerleme kat seçip fotoğraf eklemeyi
  imkânsız kılıyordu. Seçili çip oturumdan okunur, yani geri dönen kullanıcı kendi cevabını görür.
  Geçişler `CROSSFADE`, yükseklik `LinearTransition`. Sorular bitince oturum aktife geçer.
  1. **Kat** — "Which level?": Ground · −1 · −2 · Other, TEK satır. Aynı yerde daha önce kat
     girildiyse o kat ilk çiptir (yeşil ton, kat hafızası). "Other" inline input açar (tek metin
     girişi bu) ve −4, C2, P3 gibi her şeyi karşılar; uzun kat listesi tarama işi çıkarıyordu.
     Çiplerin altında ayrı bir "Fotoğraf çek" eylemi durur: fotoğraf bir kat değildir, soruyu
     cevaplamaz, kata ek olarak alınır.
  2. **Tarife** — "What does it cost?": hafızadan gelen "Last time · 0–1h ₺50" yeşil çip (varsa) ·
     **"Suggested · 0–1h ₺50"** (havuzda bu otopark için veri varsa) · Enter · Scan (premium).
     Öneri çipinin altında kaynağı YAZAR: "{n} sürücünün girdiğinden geliyor, panoyla karşılaştır".
     Veri yoksa çip de yazı da hiç çıkmaz — uydurma fiyat göstermek hiç göstermemekten kötüdür. Enter/Scan tarife formunu **aynı panelin içinde** açar (üst üste binen
     ikinci sheet yok, İlke 9); alttaki tek "Done" hem formu hem oturumu kapatır.
  3. **Hatırlat** — yalnız tarife girilmediyse: "1 h later" · … · Off. Süre neye göre sayılıyorsa
     çipin kendisi onu söyler ("1 sa sonra"), soru da öyle sorar ("Park'tan ne kadar sonra?").
     Tarife varsa dilim uyarıları zaten kurulur, soru düşer.
- Zorunlu alan sıfır. "Done" siyah hap her an bitirir; sheet'i aşağı çekmek geri almadır.
- Not, "aslında … önce park ettim", hatırlatıcı ayrıntıları, foto yeniden çekme: park anında
  sorulmaz, aktif sheet'in **Details** satırında yaşar (§7.5).
- Araba pini haritaya damgayla aynı anda iner (§3 park anı sekansı).
- Zayıf GPS → durum satırı "Weak signal · add level or photo"; konum yoksa "Mark it on the map".

### 7.4 Tarife girişi + OCR

- Tip: tiered / flat / hourly; tiered'da dilim satırları (süre + kümülatif ₺, tabular sağa hizalı) +
  "+ Add tier"; satır ekleme `LinearTransition`.
- "Scan tariff board" satırı (`camera.viewfinder`): cihaz üstü Vision, premium. Durumlar dürüst ve
  gerçek: kamera → "Reading…" (gerçek iş, ≤3 sn, sistem spinner) → forma yazıldı (satırlar stagger
  ile gelir) / "Couldn't read the board. Enter manually or retake." / kamera izni kapalı satırı.
  Sahte ilerleme çubuğu yok.
- İlk tarife kaydında "Warn me before next tier" toggle → bildirim izni; red → toggle kapanır +
  "Notifications off · Turn on in Settings".

### 7.5 Aktif oturum (`active`)

- Beyaz sheet, üstte harita `calm` + scrim, araba pini (marka işareti) görünür.
- İçerik: overline "PARKED 13:04 · LEVEL −2" → **sayaç** display-XL tabular ink (saniye 24pt
  `text-secondary`; kendi 1 Hz bileşeni) → tarife çubuğu (tarifesizde "Add tariff to see cost →") →
  koşullu para kutusu → foto thumbnail + not (dokununca yerinde büyür) → siyah **"Find My Car"** →
  yan yana ghost "Share" + "End".
- "Fix location", "Tariff" ve "Details" düzenleme satırları liste satırı olarak (inset kutu değil).
  Details satırı yerinde açılır: Level, Note, Photo, Parked when, Remind me (§7.3'te sorulmayanlar).
- >24 sa: "Still parked at X? · End / Keep" satırı. Offline satırı. Bildirim izni satırı.
- Idle maliyeti: sayaç 1 Hz yalnız görünürken; LA tazeleme dakikada bir; başka iş yok.

### 7.6 Arabamı Bul (`finding`): sheet fazı, ayrı ekran değil

- "Find My Car" → sheet `finding`'e morph; harita kamerası kullanıcı + arabayı birlikte çerçeveler
  (600 ms), araba pini 1.25× ve ekranın kahramanı olur; kullanıcıdan arabaya 2px ink hairline çizgi
  (`LineLayer`, düz, kesikli değil).
- **Üç kol (bağlayıcı):**
  1. Kayıtta foto/kat VAR → foto kartı birincil (`r-16`, 16:9) + display-M "LEVEL −2 · ROW C." ink
     nokta + altta mesafe/kadran ikincil.
  2. Foto/kat yok + doğruluk ≤ 35 m → **pusula kadranı** (§5) birincil + display-XL tabular metre.
  3. Foto/kat yok + doğruluk > 35 m (kapalı otopark) → "Location was approximate — check nearby
     levels" + kadran gizli; harita birincil.
- Pusula/AR premium; yer, foto, not ve "Open in Maps" herkese açık. Free'de kadran yerine 44pt
  "Compass is Pro · See plans" satırı; paywall akışı kesmez.
- Aksiyonlar: siyah "I found it" (→ `ending`) · ghost "AR" (yalnız açık alan + destek varsa) · text
  "Open in Maps". ≤30 m'de CTA metni aynı hapta 200 ms crossfade.
- Heading yoksa kadran çizilmez; kalibrasyonsuzsa kadran %45 + "Calibrate: move in a figure 8".
- Konum akışı: `BestForNavigation` yalnız `finding` süresince; faz değişince iptal. Heading ve
  mesafe shared value'da; sayı 1 Hz text güncellemesi.
- Scene sheet: hero = araba pini · driver = kullanıcının yürümesi (mesafe/heading) · an = faza girişte
  kamera uçuşu + pin büyümesi (≤800 ms) · sabit = CTA · sessiz = foto kartı, liste · idle: sensör
  akışı bu fazda meşru, faz bitince sıfır.

### 7.7 AR: "Yerde mürekkep, varışta nokta"

Yalnız açık alan (kayıt doğruluğu ≤35 m), ARKit destekli cihaz, premium. Kapalı otoparkta hiç
açılmaz; foto/kat kartı oradaki doğru araçtır.

**Sahne (RealityKit, `modules/parkiq-ar`):**
- **Zemin:** yatay düzlem algılama açık. İlk düzlem gelene kadar zemin = kamera y − 1.45 m; düzlem
  gelince gerçek yükseklik (raycast `existingPlaneGeometry` → `estimatedPlane`). Nesneler yerde
  durur; havada ya da yerin altında görünmez.
- **Yol:** kullanıcıdan arabaya doğru **mürekkep diskler**: Ø 0.14 m, aralık 1.2 m, en fazla 24 (≈30 m);
  ilk disk 1.2 m ileride; opaklık mesafeyle 0.85 → 0.25; malzeme unlit `#141416`; her diskin altında
  0.02 m taşan beyaz halka (koyu zeminde okunurluk; harita pin ring kuralının AR karşılığı). Chevron,
  ok, akış animasyonu yok. Yakın modda (≤20 m) yol gizlenir.
- **Varış: P. monoliti.** 0.56 × 0.72 × 0.05 m yuvarlatılmış ink levha (köşe 0.08), **PBR malzeme**
  (roughness 0.55, metallic 0) ve `environmentTexturing .automatic`: ortam ışığını alır, gerçek durur.
  Ön yüzünde beyaz "P" (`generateText`, 0.34 m, extrusion 0.008) + karnında yeşil `#2FE07A` disk
  Ø 0.11 m: marka işaretinin üç boyutlu hali. Yalnız yaw ekseninde billboard (dik durur, kameraya
  döner). Yükseklik: >60 m'de 2.4 m, orta 1.5 m, ≤20 m'de 0.9 m. Ölçek = clamp(mesafe / 12, 1, 5):
  uzaktan okunur, yakında doğal.
- **Zemin noktası:** monolitin altında yeşil disk Ø 0.5 m + beyaz halka 0.03 m; yakın modda Ø 1.2 m,
  halka 0.06 m: "araba burada". iOS 18+ `GroundingShadowComponent` ile temas gölgesi.
- **Oklüzyon:** `sceneReconstruction .mesh` + `sceneUnderstanding .occlusion` (LiDAR'da) ve
  `personSegmentationWithDepth` (destekleniyorsa): araçlar ve insanlar işareti gerçekten örter.
- **Sapma:** her GPS düzeltmesinde hedef kameranın o anki konumundan yeniden türer (mevcut kalıp);
  1 m altındaki oynamalar yok sayılır. Anlık zıplama yok; yeniden yerleşimde nesneler `SPRING`
  benzeri 300 ms lerp ile kayar (native).
- **Yeşil sütun, halka büyümesi ve chevron'lar silindi.**

**HUD (RN, koyu yüzey token'ları):**
- Üst sol 44pt cam kare `xmark`. Coaching (sistem `ARCoachingOverlayView`) açıkken HUD gizli.
- Alt: cam kart (`glass-dark` reçetesi, `r-24`, padding 16/20): overline "KANYON AVM · LEVEL −2"
  (`#8A8A93`, noktasız) → mesafe **44pt/900 tabular beyaz** → 13pt durum satırı ("Walk toward the
  marker." / "You're close." / "Move slowly, tracking is limited."). Altında 52pt hap `#F0F0F2` + ink
  metin "I found it". Haritaya dönüş üst soldaki kapatma karesidir; ikinci bir çıkış yok.
- **Kenar göstergesi:** hedef ekran dışındaysa o kenarda 10pt ink nokta + 2pt beyaz halka + 11pt
  overline mesafe; native `onTarget {x, y, onScreen, distanceM, near}` 6 Hz, RN'de shared value.
- Yakın eşiğine (≤20 m) ilk girişte tek `impactLight`.
- Giriş: root'ta tam ekran Reanimated overlay; harita 1→0.6 opaklık, kamera 0→1 (250 ms), HUD kartı
  alttan `SPRING`. Çıkış tersi. RN `Modal` değil.
- Durumlar: `initializing` (coaching) · `ready` · `near` · `limited` · `failed` / `unsupported` (haritaya
  düşer + durum satırı).
- Verimlilik: AR oturumu arka planda ve overlay kapanınca `pause()`; RN'e olay ≤6 Hz; billboard ve
  ölçek native karede.

### 7.8 Bitirme + Kutlama (`ended`)

- **Bitirme ONAY ister:** "End" / "Found it" / AR "Found it" panelin İÇİNDE bir onay bloğu açar —
  soru satırı + ödenen/kazanılan + siyah "End & save ₺X" + ghost "Keep parking". Sistem alert yok,
  ayrı ekran yok. Yanlışlıkla dokunmak sayacı sessizce kapatıyordu.
- **Bitiş KALICIDIR:** kapanış hedefli bir UPDATE ile yazılır ve hemen okunarak doğrulanır; satır hâlâ açıksa satır yeniden yazılır, o da tutmazsa silinir. Aynı anda tek aktif oturum kuralı açılışta da uygulanır: birden fazla açık kayıt varsa en yenisi tutulur, yetimler silinir.
- **Bitiş anı her zaman gerçek bir sayıdır:** `endSession` argümansız çağrılır; sayı olmayan her
  giriş "şimdi"ye düşer. Aksi hâlde kayıt yazılamıyor, oturum kapanmıyor ve sayaç yeniden açılışta
  devam ediyordu.
- **Bitirme tek dokunuştur:** "End" (aktif sheet), "Found it" (Arabamı Bul) ve AR "Found it" oturumu
  doğrudan bitirir; onay ekranı, sistem alert, ara faz yok. Emniyet kemeri kutlama kapağındaki "Undo".
- **Kutlama:** tam yüzeyli kapak `surface/bg`, Reanimated ile alttan `SPRING` + fade gelir (RN Modal
  değil). Konfeti, glow, partikül, pulse: sıfır.
  - Varyant c (`saved > 0`): overline "SESSION ENDED · 14:49" → "YOU SAVED" display-S ink → **"₺50."**
    display-XL tabular `accent-text` (light) / `#2FE07A` (dark), count-up + nokta EN SON (§3) →
    meta "Kanyon AVM · Exited 15 min before Tier 2" (noktasız) → özet 3 hairline satır (Duration /
    Paid / This month) → paylaşım kartının **canlı minyatürü** (`r-24`, gerçek render, 0.28 ölçek) →
    siyah "Share Card" → text "Done" ve "Undo".
  - Varyant b (`saved = 0`): "PARKED 1H 45M." ink nokta; YOU SAVED bloğu yok; kart yok.
  - Varyant a (tarifesiz/flat): "PARKED 1H 45M." ink nokta; ghost "Share Location".
- **Paywall zamanlaması (bağlayıcı):** paywall kutlamanın ÜSTÜNE açılmaz. Yalnız "Done"dan sonra ve
  yalnız 1./3./7. tasarruf anında. Yorum isteği paywall çıkmayan tasarruf anlarında, kapaktan sonra.
- Scene sheet: hero = ₺ rakamı · driver = "End" dokunuşu · an = §3 kutlama sekansı (≤1.8 s) · sabit =
  alt buton bloğu (min 128pt rezerv) · sessiz = özet satırları (stagger dışında) · idle sıfır.

### 7.9 Geçmiş + istatistik (kök sheet sahnesi)

- Ayrı ekran değil: saat karesine dokununca kök sheet %62 tavana çıkar, içeriği Geçmiş olur; harita
  üstte kalır ve geçmiş park noktaları mürekkep daire (beyaz ring) olarak görünür, kamera hepsini
  çerçeveler. Satıra dokununca kamera o noktaya uçar, nokta araba pinine (marka işareti) dönüşür,
  detay aynı sheet içinde açılır; geri dönünce liste, kapatınca keşif/aktif sheet morph ile döner.

- Üstte KPI satırı **kutusuz**: 3 sütun, overline + değer (Total saved 28/900 `accent-text`
  proportional; Sessions, Avg duration 22/900 ink), altta 1px `gridline`.
- Aylık tasarruf grafiği: tek seri yeşil kolon ≤24px, üst 4px radius, legend yok, direct label yalnız
  güncel + max ay, 1px düz gridline. Para-dışı veri ink rampı. Pasta/donut/gauge yasak.
- Liste: gün başlıkları overline; satırlar hairline ayraçlı (15/600 saat aralığı · 13 meta · sağda
  süre 13/800 ve ₺ tabular; tasarruflu satırda `accent-text`). İlk açılışta ≤8 satır 50 ms stagger.
- Detay: aynı pageSheet içinde geri oklu geçiş; foto `r-16` yerinde büyür; "Open in Maps"; sil (text,
  `warn-text`) → onay `BottomSheetModal`, sistem alert değil.
- Boş durum §5. Pro satırı tek satır, ünlemsiz.

### 7.10 Ayarlar (pageSheet)

Veri grubunda **"Tarifeleri paylaş"** anahtarı (varsayılan AÇIK): kapatan kullanıcı ne gönderir
ne öneri görür — havuz çift yönlü bir alışveriştir, tek yönlü kullanım bedavaya binmektir.

Tek pageSheet yüzeyi. Koyu temada kart zemini `surface/card` (arkadaki kararmış haritadan bir
basamak açık); başlık ortalanmış 17/600, sistem nav bar hissi, çift kabuk yok. Liste grupları
hairline satırlarla: hatırlatıcı eşiği, bildirimler, görünüm, dil, para birimi,
abonelik durumu → paywall, izin durumları
(§5 durum satırı + Settings deep link), veri (tarife havuzu / dışa aktar / sil), hakkında. Başlık 22/900 uppercase
noktasız. Geliştirici bölümü yalnız `__DEV__`.

### 7.11 Paywall (tam ekran)

- Poster gibi okunur, cümle yok. Zemin `surface/card`. Overline "PARKIQ PRO" → **hero** → 4 hairline
  satır:
- **Hero iki varyanttır ve ekranın TEK anıdır.**
  - Kullanıcının biriktirdiği para varsa hero ODUR: kutlama kapağının aynı bileşeni
    (`CelebrationHero`) — "SAVED / ₺340." count-up + nokta en son, yeşil. Altında rakamsız tek satır
    "ParkIQ bunu senin için biriktirdi" `text-secondary` 15/600. Haptik KAPALI: satın alma ekranında
    titretmek zorlamadır, kutlama değil. Display-M başlık bu varyantta ÇIKMAZ (iki hero olmaz).
  - Rakam yoksa hero satılan şeydir: display-M **noktasız** "PRO DETECTS PARKING", 320 ms fade + yükseliş.
- **Sahneleme (≤1,3 sn):** hero → 420 ms (rakamsız varyantta 180 ms) sonra hairline satırlar 50 ms
  stagger → sonra plan karoları 200 ms fade. Aynı anda iki şey hareket etmez. Reduce Motion → hepsi
  200 ms crossfade.
- 4 hairline satır: SF Symbol Regular 20 + 2–3 kelimelik etiket 15/600
  ("Auto-detect parking", "Scan tariff boards", "Compass and AR", "Parking filters") → **üç plan
  karosu yan yana** (Monthly · Yearly · Lifetime; `r-16`, hairline, seçili 2pt ink; dönem 13/600,
  fiyat 17/800 tabular, tek satır alt bilgi; yıllık varsayılan ve "SAVE 56%" rozeti). **Renk paranın
  olduğu yerde:** seçili karo `alert-bg/money` yeşil kâğıda oturur, indirim rozeti `accent-fill`
  dolgudur — dekoratif renk yok, gradyan yok → sabit alt blok:
  tek satır otomatik yenileme beyanı 11pt `text-tertiary` + CTA "Continue — ₺X/year" +
  "Restore · Terms · Privacy". Uzun özellik cümlesi, body paragrafı, kart yığını yok.
- Durumlar in-surface, **sistem alert yok:** yükleniyor 3 iskelet; hata "Couldn't load plans." + ghost
  Retry; satın alma CTA'da spinner + ekran kilitli; **başarı → sheet kapanır, geldiği ekranda `PRO.`
  damgası (ink nokta) + `notificationSuccess`**; restore → 13pt satır "Restored." / "No purchases
  found."
- Satılan yalnız ParkIQ işlevi: tarife tarama, pusula + AR, otopark filtresi, havuz önerisini uygulama. LA /
  widget / bildirim asla paywall'da yazmaz.

### 7.12 Pin bırakma katmanı

Harita altta kayar, artı işareti ekran merkezinde sabit; altta beyaz kart (`r-24`) + ipucu + siyah
"Use pin" + ghost "Cancel". Sheet bu sırada gizli; dönüşte açık alan geri gelir.

### 7.13 Zorunlu güncelleme kapısı

Uygulamanın önüne geçen TEK tam ekran yüzey (§ Twice sürüm kontrolü "forced" derse). Zemin `bg`
(poster katmanı DEĞİL: krem karantinası İlke 3 ve tam yüzeyli siyah İlke 6 burada da geçerli),
display-M uppercase başlık **noktasız** — kapı bir boş durumdur, nokta grameri blacklist'inde —,
15/400 `text-secondary` gövde, tek siyah hap CTA (İlke 4). İkincil aksiyon, kaçış yolu, illüstrasyon,
ikon ve giriş animasyonu yok: duvarı yumuşatmak onu geciktirmekten başka bir şey yapmaz.

**Konum izni kapı DEĞİLDİR.** Bir zamanlar buradaydı ve kaldırıldı: App Store 5.1.2(i) sistem
yeteneğini uygulamayı kullanmanın şartı yapmayı yasaklıyor, 5.1.1(iv) tam da konumu örnek verip
alternatif istiyor — alternatif zaten §7.12 pin bırakma. İzin daveti §7.2'de keşif panelinin
üstünde bir satır olarak yaşar: 17/600 başlık, caption gövde, iki metin butonu (izin / şimdi değil),
siyah hap YOK (o hakkı "Park Ettim" tutuyor). iOS izni ömürde bir kez sorduğu için buton iki hal
taşır — sorulmamışsa sistem penceresi, reddedilmişse Ayarlar. Ön plana her dönüşte izin yeniden
okunur. "Şimdi değil" yalnız o oturumu susturur: kalıcı olsaydı kazara bir dokunuş izni sonsuza
gömerdi.

## 8. Live Activity, Dynamic Island, widget

Kart `#101012`, `r-24`, kenar ışığı, yeşil piksel ≤%10. SwiftUI extension **matematik türetmez ve
sözlük taşımaz**: segment/knob/ton `tariffMath`'ten `ContentState`'e yazılır, metinler dile çevrilmiş
gelir. Marka glyph'i sol üstte 22pt; overline noktasız.

**Canlılık sözleşmesi (bağlayıcı):** app arka planda ÇALIŞMAZ ve push sunucusu YOKTUR. Bu yüzden
kartın hareket eden her parçası bir TARİH ARALIĞINDAN türer — `Text(timerInterval:)` ve
`ProgressView(timerInterval:)`. Sayaç, geri sayım ve dilim dolumu app kapalıyken de doğru akar;
RN'den gelen güncelleme yalnız para metinleri ve dilim değişimi içindir. Donmuş yüzde, donmuş
"kalan süre" metni ve kendi kendine ilerlemeyen çubuk yasaktır. ContentState'te değişmez alan
yoktur (yer adı ve kat da orada): park anından sonra girilen kat kilit ekranında da görünür.

- Tarifeli: hero = sonraki fiyat artışına geri sayım 44/900 tabular (sistem timer); son 15 dk amber.
  Başlıkta ikincil geçen süre 13/heavy muted. Çubuk = içinde bulunulan dilimin kendi kendine dolan
  ilerlemesi. Footer "Now ₺50 · Next ₺100" 13/800. Sağ üstte "End" düğmesi (§8 aşağıda).
- Tarifesiz: hero = geçen süre; çubuk gizli.
- Dynamic Island: compact glyph + sayaç; minimal glyph; expanded mini kart.
- Widget small/medium: hero rakam + yer adı; oturumsuz "₺340 saved this month". Quick Park widget'ı
  `parkiq://park` → app park kaydıyla açılır ve hızlı sorular (§7.3) hemen başlar.
- **Kilit ekranı widget'ları** (rectangular / inline; dairesel aile YOK — o boyutta yalnız bir halka kalıyor, ne olduğu anlaşılmıyor): oturum yokken marka glyph'i / "Park"
  → `parkiq://park`; oturum varken sayaç → `parkiq://session`. Circular tarife varken geri sayım
  HALKASI (kendi kendine boşalır, ortasında glyph); rectangular: etiket + büyük sayaç + para satırı.
  Sistem tek renk çizer, renk seçilmez — sayaç kendi rengini dayatmaz.
- Live Activity'de **düğme yok**: kart okunur, dokununca app aktif oturumda açılır (`parkiq://session`). Bitirme onay ister (§7.8) ve onay app içinde sorulur.
- **Bitiş karesi:** zemin `#2FE07A`, tüm tipografi ink, "SAVED ₺50." (ink nokta), 3 sn, tek kare,
  animasyonsuz.
- Bildirim: "Tier 2 in 15 min. Now ₺50, after ₺100." local, eşikten önce zamanlanır; ünlem yok.
  Dilim uyarısı **zaman duyarlıdır** (Odak modunu deler) ama sessizdir; ses kullanıcının hatırlatıcı
  türü seçimidir.
- **"Sesli" / "Her ikisi" GERÇEK alarm kurar** (Apple AlarmKit, iOS 26+): kilit ekranında çalar,
  sessiz modu deler, app kapalıyken gelir. Bildirim sessizdeki telefonu uyandıramıyor, o yüzden
  sözü tutan tek yol bu. Alarm kurulduysa aynı ana ayrıca sesli bildirim konmaz (çift ötme yok).
  iOS 26 altında ve Expo Go'da alarm yoktur, sesli + zaman duyarlı bildirime düşülür.
  **Alarmlar tek seferliktir** (mutlak zaman damgası, tekrar yok) ve kimlikleri cihazda saklanır;
  oturum bitince, geri alınınca, silinince ve aktif oturumsuz her soğuk açılışta durdurulur.
  Ertelemesi yoktur: park hatırlatıcısını ertelemek kullanıcıyı bir sonraki dilimin içinde bırakır.

## 9. Paylaşım kartları

Savings Card 1080×1920 (+1080×1080): zemin `#141416`, overline "PARKIQ · KANYON AVM" 40/700 (semt
düzeyi, noktasız) → hero "SAVED ₺50." 288/900 (tek imza noktası; en uzun satıra sığacak şekilde
küçülür) → süre 44 → mini tarife "makbuzu" → 3 sütun Duration / Paid / Avoided → footer marka işareti
+ "PARKIQ." + "parkiq.app". Koyu kartta gri metin her zaman dark değerleri. Plaka, tam adres,
koordinat asla. Location Card krem harita + pin; link statik snapshot, 24 sa. Web sayfası Inter.

## 10. Ses ve kopya

1. Kısa bildirim cümleleri; iş bitince nokta. 2. Para her zaman rakamla. 3. Aciliyet = gerçek + fiyat;
panik dili yok; önce "şimdi çıkarsan X" seçeneği. 4. TR'de "sen" dili.

| Bağlam | EN | TR |
|---|---|---|
| Park onayı † | PARKED. | PARK ETTİN. |
| Kutlama † | SAVED ₺50. | ₺50 CEBİNDE. |
| Süre damgası † (ink) | PARKED 1H 45M. | 1S 45DK PARK. |
| Dilim uyarısı | Exit before 14:04 and pay ₺50 instead of ₺100. | 14:04'ten önce çık — ₺100 yerine ₺50 öde. |
| Bildirim | Tier 2 in 15 min. Now ₺50, after ₺100. | 2. dilime 15 dk. Şimdi ₺50, sonra ₺100. |
| Find | Your car is 320 m away. | Araban 320 m ötede. |
| AR yakın | You're close. | Yaklaştın. |
| Boş geçmiş | No sessions yet. Your first park will land here. | Henüz oturum yok. İlk parkın burada başlar. |
| Offline | Offline — timer still running. | Çevrimdışı — sayaç çalışıyor. |
| Paywall | Pro detects parking. You never think about it. | Pro parkı otomatik algılar. Sen hiç düşünme. |

Yasak kelimeler: amazing, unlock, elevate, seamless, süper, harika, hemen şimdi. Ünlem yasak.
Wordmark "PARKIQ." tek ağırlık; "IQ" ayrılmaz. App içinde navbar/haritada logo yok.

## 11. Erişilebilirlik

- Kontrast §2 kuralları bağlayıcı. Renk asla tek sinyal: amber = renk + `clock` + metin + halka knob;
  geçilmiş dilim = renk + ağırlık; canlı dot her zaman metinle.
- Dokunma hedefleri ≥44×44 (hitSlop ile). Dynamic Type §2; accessibility boyutlarında sayaç saniyeyi
  düşürür; poster katmanı sabit.
- VoiceOver: her aksiyon ayrı öğe; tarife çubuğu tek öğe ("Tier 1, ₺50, next tier at 14:04, 23 minutes
  left"); damga/nokta/count-up dekoratif (`accessibilityElementsHidden`); AR HUD mesafeyi okur, sahne
  gizli.
- Reduce Motion §3; haptik kalır. İki tema eş kalite.

## 12. DO / DON'T

**DO:** token'dan tüket · her rakam `tariffMath`'ten · tek siyah CTA · scene sheet · tek spring ·
Reanimated UI thread · sheet morph · hairline listeler · cam yalnız harita/kamera üstünde · para
diliyle konuş · kutlamayı tipografi + count-up + nokta + haptikle yap · her akışın yükleniyor / hata /
izin reddi / offline durumu.

**DON'T (istisnasız):** emoji ikon · serif · dekoratif gradyan · renkli glow/gölge · palet dışı renk ·
yeşil dekor · krem yüzey (harita ve S1/S3 dışı) · app içinde tam yüzeyli siyah kart (S2 ve LA dışı) ·
çift-eylemli buton · ikinci hap · dairesel FAB · tab bar · sistem UIAlert akış içinde · iç içe modal ·
RN çekirdek `Animated` · `withRepeat` · her elemana fade-in · easing tween · sahte ilerleme · nokta
enflasyonu · ünlem · yarım punto · 500/700 ağırlık · ham hex · pasta/donut/gauge · "Unknown"/"—"
placeholder · SwiftUI/RN'in kendi tarife matematiği.
