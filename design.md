# ParkIQ — design.md

Tek tasarım referansı. Bu dosyadaki her değer bağlayıcıdır; burada olmayan bir değer gerekirse en yakın token'a yuvarlanır, yeni ham değer icat edilmez. Dil adı: **Mono Editorial**.

---

## 1. Kimlik özeti + tasarım ilkeleri

ParkIQ, mürekkep-siyah tipografi + bembeyaz kartlar + sıcak krem harita + tek elektrik yeşili üzerine kurulu, kişiliğini renkten değil tipografiden alan bir iOS park asistanıdır. Referans DNA: Zara retail-editorial harita ekranı (dev Black uppercase yer adı + nokta), Flighty (tabela dili, tabular rakamlar, dürüst ilerleme çubuğu), (Not Boring) Weather (yalnızca kilit ekranı katmanında cesaret), EVPoint (pin → kart → filtre iskeleti + istasyon detay hiyerarşisi), iOS nativeimsilik (cam, SF Pro, sistem kalıpları).

**İlkeler (bağlayıcı):**

1. **Kişilik tipografiden gelir.** SF Pro Black/900 uppercase + cümle sonu NOKTA imzası duygu anlarını taşır; illüstrasyon, maskot, dekor yok.
2. **Yeşil semantik kilidi.** Yeşil yalnızca üç anlam taşır: **para + şarj + canlı**. Canlı oturumun ilerleme dolgusu (live dot, LA dolgusu, tarife çubuğu) "canlı" işinin kapsamındadır. Yeşil CTA, yeşil gradient, dekoratif yeşil dot, yeşil büyük yüzey dolgusu yasak. Sonuç kuralı: süre para değildir — süre-odaklı damgalar (örn. "PARKED 1H 45M.") yeşil değil INK nokta taşır.
3. **Krem karantinası.** #F5F2EB yalnızca Mapbox harita canvas'ında ve onboarding manifesto posterlerinde (S1/S3) yaşar — posterler İlke 3'ün TEK istisnasıdır (bkz. §7.1, poster katmanı). Hiçbir sheet/kart/paywall zemini krem olamaz; app zemini #F6F6F4.
4. **Ana aksiyon tek ve siyah.** Ekran başına tek siyah hap CTA; ikincil aksiyonlar ghost/text/cam kare olarak ayrışır. Bir kontrol = bir fiil.
5. **Veri asla yalan söylemez.** Tarife çubuğunun knob konumu, fiyat etiketleri ve copy her zaman aynı gerçek matematikten türetilir (§5.9 tarife veri modeli + tek kaynak matematiği); elle yüzde yasak. Para her zaman rakamla konuşur, sıfatla asla.
6. **Sahne ayrımı: app güven verir, kilit ekranı gösterir.** Tam yüzeyli siyah kart (#101012 + #2FE07A + ters tipografi) yalnızca Live Activity / Dynamic Island / widget / paylaşım kartlarında yaşar. App içinde siyah, mikro ölçekte kalır (CTA, pin, knob). Tek istisna: onboarding manifesto posteri S2 — poster katmanı sayılır; App Store screenshot seti bu karelerden üretildiği için S2'nin tam yüzeyli siyahı yalnız bu poster bağlamında meşrudur (§7.1).
7. **Ekran başına tek display-boy odak ve en fazla 1 imza noktası.** Marka işaretleri (P. glyph, PARKIQ. wordmark) imza sayımına dahil değildir (§3.3 frekans kanunu).

---

## 2. Renk token'ları

Kapalı küme. Component içinde ham hex **yasak** — her renk token üzerinden tüketilir. Silinen değerler: `#00C853`, `#FFC838`, `#F5325B`. `#0A84FF` yalnızca iOS konum noktası olarak yaşar.

### 2.1 Token tablosu

| Token | Light | Dark | Rol / kısıt |
|---|---|---|---|
| `ink` | `#141416` | `#F0F0F2` (metin olarak) | Birincil metin, siyah CTA, P pin, knob (light) |
| `surface/bg` | `#F6F6F4` | `#131315` | App zemini (harita hariç) |
| `surface/card` | `#FFFFFF` | `#1C1C1F` | Sheet, kart — opak, asla krem |
| `surface/elevated` | `#FFFFFF` + shadow/4 | `#232327` | Modal, popover |
| `surface/inset` | `#F4F4F1` | `#232327` | Gömük zeminler: ghost buton, arama, input, stat tile, iskelet satırları |
| `surface/la` | `#101012` | `#101012` | LA / widget / paylaşım kartı — tema-bağımsız |
| `map/canvas` | `#F5F2EB` | `#161618` | Mapbox zemini + onboarding S1/S3 posterleri (İlke 3'ün tek istisnası) |
| `accent-fill` | `#00A650` | `#2FE07A` | Dolgu, ikon; ≥22pt display rakam serbestliği YALNIZ `#FFFFFF` üzerinde; light'ta <20pt metin YASAK |
| `accent-text` | `#0B7A3E` | `#2FE07A` | <20pt tüm yeşil metin (₺ satırları, "Avoided"); light'ta `surface/bg` ve krem üstündeki display rakam/nokta da buraya düşer |
| `warn-fill` | `#C77700` | `#FFB300` | Amber dolgu/knob/segment; ≥22pt display rakam istisnası (§5.9). `#FFB300` açık temada HİÇBİR rolde kullanılamaz |
| `warn-text` | `#B45309` | `#FFB300` | Amber metin/rakam (varsayılan amber metin rengi) |
| `text-secondary` | `#6E6E78` | `#9B9BA4` | Meta, saniye bloğu, placeholder, ikincil satırlar, kilitli satır metni |
| `text-tertiary` | `#71717A` | `#8A8A93` | Overline'lar. Koyu ink kartlarda (LA + paylaşım kartları) HER ZAMAN dark değeri `#8A8A93` kullanılır |
| `disabled` | `#9A9AA2` | `#6E6E78` | YALNIZ gerçekten devre dışı kontroller (disabled CTA metni, chevron, kilit ikonu); ASLA bilgi taşıyan metin |
| `cta-pressed` | `#232326` | `#D8D8DC` | Siyah hap pressed durağı |
| `inset-pressed` | `#ECECEA` | `#2A2A2F` | Ghost/inset pressed durağı; disabled CTA zemini (light) |
| `alert-bg-money` | `#F2FBF5` | `rgba(47,224,122,.12)` | §5.10 para kutusu yeşil hal zemini |
| `alert-bg-warn` | `#FFF8E6` | `rgba(255,179,0,.12)` | §5.10 para kutusu amber hal zemini |
| `chart-neutral` | `#D0D0CB` | `#3A3A3E` | §11.2 "paid" kolonu — yalnız grafiklerde |
| `track` | `#E9E9E2` | `#26262B` | Tarife çubuğu track (LA'da da `#26262B`) |
| `gridline` | `#E8E8E2` | `#2C2C2A` | Grafik hairline + liste ayracı — 1px düz, asla kesikli |
| `hairline-dark` | — | `rgba(255,255,255,.07)` | Koyu yüzey 0.5px kenar çizgisi |
| `scrim` | `rgba(24,20,12,.08)` | `rgba(0,0,0,.25)` | Aktif oturumda harita üstü uniform scrim |
| `location-dot` | `#0A84FF` | `#0A84FF` | Yalnız "Me" konum noktası (iOS konvansiyonu) |

- **İnk rampı** (light `#E8E8E2 → #C9C9C4 → #9A9AA2 → #6E6E78 → #141416`; dark `#2C2C2A → #6E6E78 → #9B9BA4 → #F0F0F2`) yalnız §11.2 para-dışı grafiklerde yaşayan kapalı bir alt-settir; component'lerde kullanılmaz.

### 2.2 Kritik kontrast çiftleri (WCAG)

| Çift | Oran | Durum |
|---|---|---|
| `#141416` / `#FFFFFF` | 18.4:1 | AA ✓ her boyut |
| `#F0F0F2` / `#1C1C1F` | 14.9:1 | AA ✓ |
| `#0B7A3E` / `#FFFFFF` | 5.4:1 | AA ✓ normal metin |
| `#0B7A3E` / `#F6F6F4` | 5.0:1 | AA ✓ — kutlama hero'sunun light rengi (§7.7) |
| `#0B7A3E` / `#F5F2EB` | 4.9:1 | ✓ — krem üstü poster noktaları (non-text ≥3:1 fazlasıyla sağlanır) |
| `#00A650` / `#FFFFFF` | 3.2:1 | Yalnız ≥22pt display + non-text — YALNIZ beyaz zemin |
| `#00A650` / `#F6F6F4` | 2.95:1 | <3:1 → bu zeminde YASAK; display rakam/nokta `#0B7A3E`'ye düşer |
| `#00A650` / `#F5F2EB` | 2.86:1 | <3:1 → haritadaki her renkli işaret 1.5–2pt beyaz ring taşır (kural); krem üstü nokta `#0B7A3E` |
| `#2FE07A` / `#101012` | 10.9:1 | AA ✓ |
| `#141416` / `#2FE07A` | 10.6:1 | AA ✓ — yeşil dolgu üstüne HER ZAMAN ink; beyaz (1.74:1) yasak |
| `#C77700` / `#FFFFFF` | 3.46:1 | Non-text AA ✓ (dolgu); normal metinde YASAK — metin `warn-text` |
| `#B45309` / `#FFFFFF` | 5.0:1 | AA ✓ metin |
| `#FFB300` / `#101012` | 10.6:1 | AA ✓ (koyu/LA'da amber burada yaşar) |
| `#6E6E78` / `#FFFFFF` | 5.0:1 | AA ✓ (text-secondary light) |
| `#6E6E78` / `#F4F4F1` | 4.6:1 | AA ✓ (placeholder / inset zeminler) |
| `#71717A` / `#FFFFFF` | 4.8:1 | AA ✓ (text-tertiary light) |
| `#8A8A93` / `#101012` | 5.6:1 | AA ✓ |
| `#8A8A93` / `#141416` | 5.4:1 | AA ✓ (paylaşım kartı meta/fiyat satırları) |

### 2.3 Semantik kurallar

- Yeşil = para + şarj + canlı (canlı oturum dolgusu dahil). Başka hiçbir işte kullanılmaz. Süre para değildir → süre damgaları ink nokta.
- Amber = zaman eşiği (yaklaşan/aşılan dilim). Ekran aynı anda en fazla yeşil (para) + amber (zaman) taşır; üçüncü durum rengi (kırmızı) HİÇBİR ZAMAN yok.
- Amber her zaman ikon + metin çiftiyle gelir (CVD: açık temada yeşil↔amber deutan ΔE 6.4 — renk tek sinyal olamaz).
- Light hiyerarşi yönü sabittir: `ink` > `text-secondary` (5.0:1) > `text-tertiary` (4.8:1) > `disabled` (bilgi taşımaz). Dark'ta aynı yön: `#F0F0F2` > `#9B9BA4` > `#8A8A93` > `#6E6E78`.
- Gri ailesi tek: zinc seti. Warm/cool gri karışımı yasak. Gölge rengi istisna: sıcak-ink `rgba(24,20,12,x)` (bkz. §4.3).

---

## 3. Tipografi

**Tek aile: SF Pro, her katmanda.** SF Mono yok, serif hiçbir rolde yok. Apple platformu DIŞI yüzeylerde (web paylaşım sayfası, story kartı, pazarlama, App Store dışı görsel) **Inter / Inter Display 800/900** kullanılır (SF lisansı platform dışına çıkamaz).

### 3.1 Kapalı skala (393pt referans, default Dynamic Type)

| Token | Boyut | Weight | Tracking | Case | Dynamic Type | Rakam |
|---|---|---|---|---|---|---|
| `overline` | 11pt | 800 | +0.14em | UPPER | caption2 | tabular (zaman/fiyat içeriyorsa) |
| `caption` | 13pt | 400 | 0 | sentence | footnote | tabular (hizalıysa) |
| `body` | 15pt | 400 | 0 | sentence | subheadline | — |
| `headline` (CTA/etiket) | 17pt | 600 | 0 | sentence | headline | — |
| `title` | 22pt | 900 | −0.02em | UPPER | title3 | stat tile değerleri: proportional |
| `display-S` | 28pt | 900 | −0.02em | UPPER | title1 | — |
| `display-M` | 34pt | 900 | −0.03em | UPPER + nokta yuvası | largeTitle | — |
| `display-XL` | 64pt | 900 | −0.03em | — | sabit, UIFontMetrics max 1.3× | sayaç: tabular; kutlama hero: tabular (count-up gereği) |

- Yarım punto (8.5/9.5/10.5…) tamamen yasak. Tek istisna: tarife çubuğu iç mikro katmanı — sınır saatleri 9pt tabular (bkz. §5.9).
- **Ağırlık durakları: 400 / 600 / 800 / 900. 500 ve 700 her rolde yasak.** 900 yalnızca uppercase display satırlarında.
- **Çift-izleme kuralı:** dev uppercase SIKI (−0.02…−0.03em), overline GENİŞ (+0.14em). Bu gerilim sistemin parmak izidir.
- Display-M yer adları max 2 satır, `minimumScaleFactor 0.7`. Display katmanı `maxFontSizeMultiplier 1.3`.
- Ölçek kontrastı: app içinde 11→64 ≈ 1:5.8; poster katmanında (LA/widget/share/onboarding) 1:10+.

### 3.2 Tabular vs proportional

- **Tabular-nums:** sayaç, geri sayım, tarife fiyat satırları, tablo/liste sütunları, eksen tick'leri, kutlama count-up'ı (digit değişiminde layout zıplamasın).
- **Proportional:** duran hero rakamlar — stat tile değerleri (₺340), paylaşım kartı hero'su.
- Kural cümlesi: rakam saniyede değişiyorsa ya da alt alta hizalanıyorsa tabular; tek başına duruyorsa proportional.

### 3.3 NOKTA imzası grameri (kanun)

- Nokta = tamamlanmış durum. Yalnızca Black/900 uppercase display satır sonunda yaşar.
- **Yer adları noktayı KORUR ve nokta MÜREKKEPTİR:** "KANYON AVM." — nokta harflerle aynı renk (`#141416` light / `#F0F0F2` dark). Ayrı renklendirilmez.
- **Yeşil nokta whitelist'i (anlam bazlı — her locale'deki karşılık dahil):** park onayı damgası (`PARKED.` / `PARK ETTİN.`), tasarruf kutlaması (`SAVED ₺X.` / `₺X CEBİNDE.`), LA bitiş karesi (§8.5), paylaşım kartı tasarruf başlığı, wordmark `PARKIQ.`, app ikonu `P.`, onboarding manifesto noktaları (S1–S3, §7.1). Bu liste dışında hiçbir display noktası yeşil olamaz.
- **Whitelist noktasının rengi zemine bağlıdır:** beyaz `#FFFFFF` → `#00A650`; `surface/bg` `#F6F6F4` ve krem `#F5F2EB` → `#0B7A3E` (non-text 3:1 sınırı, bkz. §2.2); koyu zemin → `#2FE07A`; **yeşil zemin (LA bitiş karesi) → nokta INK `#141416`** (yeşil üstünde yeşil imkânsız — bu whitelist'in tek ink istisnasıdır).
- **Süre-odaklı damgalar** (`PARKED 1H 45M.` / `1S 45DK PARK.`) yeşil DEĞİL ink noktadır: yeşil = para; süre para değildir (İlke 2).
- **Blacklist:** buton/CTA metni, overline/eyebrow, push bildirimi, amber uyarı metni, liste satırı, tab, Ayarlar, Paywall plan/başlık metinleri, boş durum. LA overline'ı noktasız: "KANYON AVM · LEVEL −2".
- **Frekans (kanun):** yüzey başına en fazla **1 imza noktası + en fazla 1 marka işareti**. Marka işaretleri (P. glyph, `PARKIQ.` wordmark) nokta frekans sayımına dahil değildir; sayım yalnız display satırlarındaki imza noktalarını kapsar. **Tie-breaker:** aynı ekranda duygu başlığı + yer adı display'i varsa nokta hakkı DUYGU başlığınındır; yer adı o ekranda noktasız/meta yazılır (kutlama: "SAVED ₺50." + "Kanyon AVM" noktasız).
- Body metindeki normal noktalama imza sayılmaz, serbesttir.
- **ÜNLEM İŞARETİ tüm ürün copy'sinde (EN+TR, bildirimler, kartlar dahil) istisnasız yasak.**

### 3.4 RN uygulama notları

- iOS'ta `fontFamily` belirtme (sistem = SF Pro). Display: `fontWeight:'900'` + `textTransform:'uppercase'` + tracking. Sayaç/fiyat: `fontVariant:['tabular-nums']`.
- Dynamic Type eşlemeleri `UIFontMetrics` ile zorunlu; poster katmanı (LA/widget/share/onboarding render) sabit ölçekli.

---

## 4. Layout token'ları

### 4.1 Spacing (4pt taban, kapalı set)

İzinli değerler: **4, 8, 12, 16, 20, 24, 32, 40.**

| Kullanım | Değer |
|---|---|
| Sheet yatay padding | 20pt |
| Kart/sheet iç padding | 16pt (alt 20pt) |
| Grup içi boşluk | 8pt |
| Gruplar arası | 16pt |
| Section arası | 24pt |
| CTA üstü | 16–20pt |
| Grabber üst / alt | 8pt / 12pt |
| Yüzen öğe ekran kenarı inset | 12pt |
| Liste satır aralığı (rows gap) | 12pt |
| Sayaç → tarife çubuğu | 16pt |
| Saat işaretleri → track | 4pt |
| Track → ₺ etiketleri | 4pt |
| "PARKED." damgası → Undo | 12pt |
| Kutlama hero → özet listesi | 24pt |
| Kutlama alt buton rezervi | 128pt (bkz. §7.7) |

- **Tarife çubuğu iç mikro katmanı** (işaret/track/etiket dikey ritmi) kendi sabitlerini yukarıdaki satırlarla spec'ler; bu mikro katman dışında kapalı setten sapma yasak.

### 4.2 Radius (5 token + konsantrik kural)

| Token | Değer | Kullanım |
|---|---|---|
| `r-8` | 8pt | Mikro / satır ikon zemini |
| `r-12` | 12pt | Kare cam ikon buton (44pt), arama çubuğu, input, harita pinleri (32pt P pin — %33 köşe oranı) |
| `r-16` | 16pt | İç kutular: uyarı paneli, foto thumbnail, bildirim, plan kartı |
| `r-24` | 24pt | Sheet, kart, LA kartı, pageSheet |
| `r-999` | tam | Hap CTA (52pt), chip, grabber |

- Ara değer yasak. **Dairesel FAB yasak.**
- **Konsantrik kural:** iç radius = dış radius − aradaki padding; iç asla dıştan büyük olamaz.
- iOS'ta tüm köşeler `borderCurve:'continuous'` (squircle).

### 4.3 Elevation (z + gölge merdiveni)

Gölgeler sıcak-ink `rgba(24,20,12,x)`, temas+ortam çifti, **max alfa .18**, tek tepe ışık. Soğuk/navi tonlu gölge yasak. Her katman SABİT token kullanır, ödünç almaz.

| Katman | z | Gölge |
|---|---|---|
| L0 harita | 0 | yok |
| L1 pinler — `shadow/1` | 10 | `0 1px 2px rgba(24,20,12,.18)` + `0 4px 10px rgba(24,20,12,.14)` |
| L2 cam kontroller — `shadow/2` | 20 | `0 1px 2px rgba(24,20,12,.06)` + `0 8px 20px rgba(24,20,12,.10)` |
| L3 sheet/kart — `shadow/3` | 30 | `0 1px 2px rgba(24,20,12,.05)` + `0 16px 40px rgba(24,20,12,.12)` |
| L4 modal/kutlama — `shadow/4` | 40 | `0 2px 4px rgba(24,20,12,.06)` + `0 24px 64px rgba(24,20,12,.16)` |
| L5 sistem chrome | 50 | sistem |

- **Siyah hap CTA: GÖLGESİZ** + `inset 0 1px 0 rgba(255,255,255,.08)` üst kenar ışığı. Aynı kenar ışığı tüm koyu yüzeylere (LA kartı dahil).
- RN: iOS'ta view başına tek gölge → temas iç view'a, ortam wrapper'a; Android `elevation`.
- **Koyu tema:** in-app gölge kapalı. Hiyerarşi = yüzey basamağı `#131315 → #1C1C1F → #232327` + 0.5px `hairline-dark` + kenar ışığı `inset 0 1px 0 rgba(255,255,255,.06)`. Tek istisna: duvar kağıdı üstü LA kartı `0 8px 24px rgba(0,0,0,.45)`.
- **Renkli glow/gölge her yüzeyde yasak** (EV pin yeşil glow'u ve LA dolgusu dahil — LA dolgusu solid ve glowsuz).

### 4.4 Cam malzeme (tek token)

| Token | Reçete |
|---|---|
| `glass-light` | bg `rgba(255,255,255,.72)` + blur(20) saturate(180%) + iç hairline `inset 0 0 0 0.5px rgba(255,255,255,.55)` + dış hairline `0 0 0 0.5px rgba(24,20,12,.05)` + `shadow/2` |
| `glass-dark` | bg `rgba(24,24,27,.66)` + blur(20) saturate(160%) + iç hairline `inset 0 0 0 0.5px rgba(255,255,255,.10)`, gölgesiz |

- Expo: `expo-blur` BlurView intensity 70–80 + yarı saydam renk katmanı; hairline'lar `StyleSheet.hairlineWidth`.
- **Ekran başına ≤3 BlurView.** Android/düşük perf fallback: düz dolgu `rgba(255,255,255,.92)` light / `rgba(28,28,31,.92)` dark + 0.5pt border.
- Cam YALNIZCA haritanın üstünde yüzen öğelerde. Sheet ve kartlar opak.

---

## 5. Bileşen kütüphanesi

### 5.1 Primary CTA (siyah hap)

- 52pt yükseklik, `r-999`, metin 17pt/600 beyaz, yatay padding 24pt (min genişlik içerik+48).
- Light: bg `ink #141416`, kenar ışığı `inset 0 1px 0 rgba(255,255,255,.08)`, **gölgesiz**. Dark: bg `#F0F0F2`, metin `#141416`.
- Pressed: scale 0.97 + bg `cta-pressed` (`#232326` / dark `#D8D8DC`), 120ms. Disabled: bg `inset-pressed #ECECEA`, metin `disabled #9A9AA2` (dark: bg `surface/inset #232327`, metin `#6E6E78`).
- Ekran başına 1 adet. İçinde ikon/dot/dekor yok. Metni noktasız.

### 5.2 Ghost buton

- 44pt yükseklik, `r-999`, bg `surface/inset` (`#F4F4F1` / dark `#232327`), metin 17pt/600 ink. Pressed: bg `inset-pressed` (`#ECECEA` / dark `#2A2A2F`) + scale 0.97. Yan yana kullanımda arada 8pt.

### 5.3 Text buton

- 44pt dokunma hedefi, 17pt/600, `text-secondary`; pressed `ink`. Dolgu/gölge yok. ("Done", "Not now", "Undo", "Keep Parking")

### 5.4 Kare cam ikon buton

- 44×44pt, `r-12`, `glass-light/dark`, ikon 22pt SF Symbol **Light** weight, renk ink. Pressed: scale 0.97 + iç overlay `rgba(20,20,22,.06)`. Yalnız harita üstünde; sheet içinde cam yok.

### 5.5 Chip (filtre)

- 36pt görsel yükseklik + hitSlop = 44pt, `r-999`, yatay padding 16pt, metin 13pt/600.
- Default: `glass-light` + ink metin. Aktif: bg `#141416` + beyaz metin (18.4:1). EV chip aktifken yalnız `bolt.fill` glifi `#2FE07A`; **yeşil dolgulu chip yasak.**
- "All" çipi yok — hiçbiri seçili değilken hepsi görünür.

### 5.6 Arama çubuğu

- Sheet'in ilk satırı (grabber altı), 44pt, `r-12`, bg `surface/inset` (`#F4F4F1` / dark `#232327`), `magnifyingglass` 17pt Regular `text-secondary`, placeholder "Where to?" 15pt `text-secondary` (`#6E6E78` inset üstünde 4.6:1 — §2.2).

### 5.7 Liste satırı / Input / Toggle

- **Satır:** min 44pt, metin 15pt/400 ink, değer sağda 15pt/800 tabular, ayraç 1px `gridline` hairline (dark `hairline-dark`), chevron `chevron.right` 13pt Regular `disabled #9A9AA2` (chevron bilgi taşımaz — izinli). Satır ikonu 24pt `r-8` zeminli.
- **Input:** 44pt, `r-12`, bg `surface/inset`, focused 1.5pt ink border; sayısal alanlar tabular + sağa hizalı; ₺ prefix 15pt/600.
- **Toggle:** native switch, `onTintColor: accent-fill`.

### 5.8 Pinler ve cluster

- **P pin:** 32pt, `r-12` (köşe = kenarın %33'ü), bg `#141416`, beyaz 900 "P", **1.5–2pt beyaz ring** + `shadow/1`. Kural: krem haritada her renkli işaret beyaz ring taşır.
- **EV pin:** aynı geometri, bg `#00A650`, `bolt.fill` ink `#141416`, beyaz ring. Yeşil glow YASAK.
- **Cluster:** 28pt ink daire + beyaz tabular sayı. Zoom <13 yalnız cluster; 13–15 max ~25 pin 24pt (ring 1pt); >15 tam 32pt. `@rnmapbox` ShapeSource `clusterRadius 50`, `clusterMaxZoom 14`.
- Seçili pin: spring 1.25×. Her pin `Pressable` + hitSlop 44×44pt. "Me": `#0A84FF` nokta + `rgba(10,132,255,.18)` 6px halo (iOS konvansiyonu, kalır).

### 5.9 Tarife dilim çubuğu (kesin spec — app ve LA'da TEK KAYNAK MATEMATİĞİ)

**Tek kaynak matematiği (bağlayıcı):** dilim/knob/amber hesabı **paylaşılan saf TS modülünde** yapılır (`tariffMath`): girdi = tarife + `parkStart` + `now`; çıktı = segment yüzdeleri, knob konumu, amber durumu, sınır zamanları. RN in-app çubuğu bu çıktıdan çizer; aynı çıktı `ActivityAttributes.ContentState`'e yazılır ve SwiftUI, LA çubuğunu aynı token seti + aynı formülle render eder (§8 mimari notu). İki taraf da kendi matematiğini asla türetmez — İlke 5'in ("veri asla yalan söylemez") mekanizması budur.

**Tarife veri modeli (tek doğru kaynak):**

- Tier = `{endMin, cumulativePrice}` — `endMin` dilim SONUNUN park başlangıcından kümülatif dakikasıdır (1h → 60, 2h → 120; §7.4 formu süre girse bile motor kümülatif sınır tutar). Fiyatlar **KÜMÜLATİF TOPLAM**dır: "Now ₺50 · Next ₺100" satırında ₺100, o dilimde ödenecek toplam tutardır, ek tutar değil.
- **Girdi normalizasyonu `tariffMath`'te zorunludur** (elle giriş + OCR güvenilmezdir): tiers `endMin` artan sıraya dizilir; `endMin ≤ 0` veya bir öncekine eşit/küçük dilimler atılır (ilk giriş kazanır); kümülatif fiyat azalamaz (azalan fiyat bir öncekine yükseltilir). Normalizasyon sonrası dilim kalmazsa durum tarifesize düşer; NaN/sonsuz değer hiçbir çıktı alanına sızamaz.
- Tarife tipleri enum: `tiered | flat | hourly`.
  - `tiered`: form = dilim satırları (süre + toplam ₺, §7.4). Çubuk: süre-orantılı dilimler.
  - `flat`: form = tek ₺ alanı ("Flat rate"). Çubuk gizlenir; LA ikincil yuvası "₺X FLAT" (§8.1); para kutusu ve dilim uyarısı üretilmez.
  - `hourly`: form = tek alan "₺X / hour"; motor bunu otomatik kümülatif dilim dizisine açar (1h → ₺X, 2h → ₺2X, …); çubuk ve gösterim penceresi kuralları aynen uygulanır.
- **Tasarruf formülü:** `saved = nextTierPrice − currentTierPrice`; yalnız kullanıcı dilim sınırından ÖNCE çıkarsa gerçekleşir. Dilim aşıldıktan sonra biten oturumda `saved = 0`; tarifesiz/flat oturumda `saved` TANIMSIZDIR ve hiçbir yüzeyde gösterilmez.
- **Örnek hesap:** park 13:04, tarife `[1h → ₺50, 2h → ₺100]`. Tier 2 sınırı = 14:04. 13:49'da para kutusu copy'si bu formülden üretilir: "Exit before 14:04 and pay ₺50 instead of ₺100" (₺50 = currentTierPrice, ₺100 = nextTierPrice). 13:58 çıkış → Paid ₺50, Saved ₺50 (kutlama varyant c, §7.7). 14:20 çıkış → Paid ₺100, Saved 0 (varyant b).

**Görsel spec:**

- **Track:** 12pt yükseklik in-app (LA 8pt), radius tam, `#E9E9E2` light / `#26262B` dark+LA.
- **Dolgu:** SOLID yeşil — `#00A650` light / `#2FE07A` dark+LA. **Gradyan her yerde silindi.**
- **Knob:** 18pt daire (LA 14pt). Light app: `#141416` + 3.5px beyaz halka; dark/LA: `#2FE07A` + kart rengi halka. Knob konumu: `knobX = segStart + (elapsedInTier/tierDuration) × segWidth` — elle yüzde yasak. Açık uçlu dilimde referans süre = son tanımlı dilimin süresi; ilerleme segment sonunda doyar (knob %100'ü aşamaz).
- **Dilimler:** genişlik süre-orantılı; gösterim penceresi = başlangıç → şimdiki dilim + 2 (max 4 dilim); min dilim %18 clamp + renormalize; açık uçlu son dilim sabit %22 + sağ kenarda 12pt alpha fade. Ayraç: 2px zemin/yüzey rengi gap (asla stroke).
- **Fiyat etiketleri:** dilim MERKEZİNE absolute (`left: segCenter%`, `translateX(-50%)`), 11pt/800 tabular ink. **Geçilmiş dilim fiyatı `text-secondary` + ağırlık 400'e düşer** — "geçmişlik" sinyali renkle değil ağırlıkla verilir (aktif/sonraki 800, geçilmiş 400; renk tek sinyal olamaz + `disabled` bilgi taşıyamaz). `space-between` yasak.
- **Saat işaretleri:** dilim SINIRLARININ üstünde 9pt/600 tabular `text-secondary`; yalnız bir SONRAKİ sınır ink + 800.
- **Durum makinesi (app + LA + Aktif Oturum senkron — hepsi `tariffMath` çıktısındaki `barTone: green | amber-approaching | amber-exceeded` alanından; render katmanı bu durumu asla kendisi türetmez):**
  - `green` — sınıra >15 dk: dolgu+knob yeşil.
  - `amber-approaching` — sınıra ≤15 dk (kullanıcı eşiği, vars. 15 dk): dolgunun aktif segmenti ve knob `warn-fill`'e, geri sayım RAKAMI `warn-text`'e döner. İstisna: rakam ≥22pt display boyutundaysa (örn. LA hero 44pt) `warn-fill` (dark'ta `#FFB300`) kullanılabilir; varsayılan metin rengi her zaman `warn-text`'tir. **Knob dolu daireden halkaya döner** (ikinci kanal); saat ikonu (`clock`, Regular) + metin zorunlu eşlik eder. Pulse/titreme yok.
  - `amber-exceeded` — dilim aşıldı: amber kalır; copy duruma döner. Aşılmışken yeni bir sınıra ≤15 dk kalırsa `amber-approaching` öncelik alır. Kırmızı asla.
  - **Amber yalnız gerçek bir fiyat artışına bağlanır:** sonraki dilim yoksa (fiyat artmayacaksa) `amber-approaching` üretilmez ve sınır alanları (`nextBoundary*`, `minutesToBoundary`) null döner — bildirim zamanlayıcı fiyatı değişmeyen sınıra uyarı kuramaz.
- Çubuk çevresindeki tüm metin ink/gri kalır (overline'lar, ₺ etiketleri).

### 5.10 Uyarı / para kutusu (koşullu)

- `r-16`, padding 12×16pt, metin 13pt/400, tutarlar 800 tabular.
- Yeşil hal (fırsat): bg `alert-bg-money`, border 1px `rgba(0,166,80,.22)`, metin `accent-text #0B7A3E`. Amber hal: bg `alert-bg-warn`, border 1px `rgba(180,83,9,.25)`, metin `warn-text #B45309` + `clock` ikonu. Dark: bg token'ların dark değerleri, metin `#2FE07A` / `#FFB300`.
- Görünme koşulu: dilim sınırına ≤30 dk (dilim <60 dk ise %50'sinde). Öncesinde çubuk tek başına yeter. Copy her zaman §5.9 formülünden üretilir.

### 5.11 Offline / durum satırı

- 32pt satır, 6pt `warn-fill` nokta + 13pt/400 metin: "Offline — timer still running". Konum kapalı: "Location off · Turn on" (Settings deep link), 44pt satır. Aynı kalıp: "Notifications off · Turn on in Settings", "Camera off · Turn on in Settings".

### 5.12 Boş durumlar

- Geçmiş boş: 3 iskelet satır (bg `surface/inset`, `r-12`, 44pt) + "No sessions yet." 15pt/600 + "Your first park will land here." 13pt `text-secondary`. Free'de 3 kayıt sonrası: kilitli satırlar (`lock.fill` 15pt Regular `disabled`, satır metni `text-secondary` — bkz. §7.8) → paywall köprüsü.
- Tarife girilmemiş aktif oturum: çubuk yerine 64pt chip-stil satır "Add tariff to see cost →".
- İllüstrasyon, maskot, stok görsel yasak.

### 5.13 İkon dili

- Emoji glyph YASAK. Eşleme: ⚡→`bolt.fill` (yalnız EV), ⏰→`clock`, ➤→`location.north.fill`, ✕→`xmark`, arama→`magnifyingglass`.
- Metin yanı (17–22pt): weight **Regular**, scale Medium. Büyük/hero (≥24pt, cam kareler): weight **Light**. Aynı ekranda tek stroke ağırlığı.
- **Zara sadakat notu (bilinçli sapma):** Zara'nın ince çizgi DNA'sı ≥24pt hero ve cam kare ikonlarda **Light** weight ile, custom glyph ailesinde 1.5pt stroke ile korunur; <24pt'te Light optik olarak hairline'laşıp AA'yı riske attığı için Regular'a yükseltilir. Bu jenerik iOS tercihi değil, referansa bağlı okunabilirlik trade-off'udur.
- Custom glyph'ler (P pin, şarj, dilim): 24pt grid, 1.5pt stroke, round cap/join, kare formda köşe = kenarın %33'ü. Renk her zaman token'dan; duotone yok.

---

## 6. Mapbox harita stili

Custom style, iki varyant: `parkiq-light`, `parkiq-dark` + her birinin `calm` alt-varyantı (aktif oturumda: POI etiket opaklığı %50, yol kontrastı bir kademe düşük).

| Katman | Light | Dark |
|---|---|---|
| Zemin (land) | `#F5F2EB` | `#161618` |
| Yollar | `#FFFFFF` | `#232327` |
| Parklar/yeşil alan | `#DCE8CD` | `#1E241F` |
| Binalar/bloklar | `#ECE7DC` | `#1C1C1F` |
| Su | `#D9E3E8` | `#14181C` |
| Etiketler | `#6E6E78` (POI) / `#141416` (semt) | `#8A8A93` / `#F0F0F2` |

- POI yoğunluğu düşük tutulur (yalnız AVM/otopark/şarj kategorileri + semt adları).
- Zoom davranışı: bkz. §5.8 cluster kademeleri. Aktif oturumda `calm` + uniform `scrim` (dikey vignette yasak).
- Harita üstü yüzen her öğe cam token'ı veya pin spec'i kullanır; haritada logo/watermark alanı Mapbox attribution dışında boş.

---

## 7. Ekran ekran spec

**Mimari:** Tab bar YOK. Root = MapCanvas (Mapbox, asla unmount olmaz) + her zaman açık durum-güdümlü bottom sheet (`@gorhom/bottom-sheet`, detent 120pt / %45 / %90). State enum: `idle | parking | active | ending | ended`. Geçişler: 300ms yükseklik + 200ms crossfade morph. History/Settings/Paywall = iOS pageSheet (`r-24`). Sistem UIAlert akış içi onaylarda yasak. Cold start: aktif oturum varsa doğrudan `active`; oturum >24h ise sheet'te "Still parked at Kanyon? · End / Keep" satırı.

**Tek oturum kuralı (ürün kararı, bağlayıcı):** aynı anda yalnız TEK aktif oturum vardır. Çoklu araç bir **profil** özelliğidir, paralel oturum açmaz — ikinci araç park etmeye çalışılırsa sheet'te bilgi satırı: "End current session first." Bu kısıt state enum'unu ve tek-sheet mimarisini korur.

### 7.1 Onboarding — 3 tipografik manifesto posteri

**Poster katmanı ilanı (bağlayıcı):** bu üç ekran app yüzeyi değil POSTER katmanıdır — İlke 3 (krem) ve İlke 6 (tam yüzeyli siyah) istisnaları YALNIZ burada geçerlidir; App Store screenshot seti bu 3 kareden birebir üretilir. Bu istisna başka hiçbir ekrana genişletilemez.

Paged yatay swipe, sağ üstte "Skip" (text buton), altta 3 nokta indicator (aktif ink). Toplam okuma <15 sn. Özellik turu YOK; tarife/OCR/LA/paylaşım ilk kullanım anında bağlamsal ipucuyla öğretilir. Poster metni girişte 200ms fade/rise; parallax/lottie/video yok.

- **S1** — zemin `map/canvas` krem `#F5F2EB` (dark `#131315`). Ortada tek kelime "PARK." — Black/900 uppercase, kelime ekran genişliğinin ~%80'i (393pt'te ≈76pt; üst sınır 84pt), **nokta `accent-text #0B7A3E`** (krem üstünde 4.9:1; `accent-fill` 2.86:1 kaldığı için krem üstünde yasak — §2.2). Altında overline 11pt ink: "ONE TAP. TWO SECONDS." Başka öğe yok.
- **S2** — zemin `#141416` (her iki temada siyah; status bar beyaz; İlke 6'nın poster istisnası). "SAVE ₺." beyaz Black/900 (≈60pt), nokta `#2FE07A` (koyu zemin whitelist rengi). Altında overline boyutunda tabular örnek satır: "01:47 · ₺45".
- **S3** — zemin krem `#F5F2EB`. "FIND IT." (≈64pt), **nokta `#0B7A3E`**. Overline: "WE REMEMBER WHERE YOU PARKED." Altta siyah hap CTA "Enable Location" (52pt) → pre-prompt yok, doğrudan bu ekran pre-prompt'tur → sistem WhenInUse dialogu. Altında text buton "Not now" (izinsiz haritaya düşer; izin Keşif'te bağlamsal tekrar istenir).
- Poster noktaları §3.3 whitelist'inin "onboarding manifesto noktaları" maddesidir; ekran başına 1 imza noktası kuralı poster başına aynen geçerlidir.
- TR: "PARK ET." / "₺ BİRİKTİR." / "BUL." + overline çevirileri. İçerik 9:19.5 safe-area dışına taşmaz.
- **İzin koreografisi (bağlayıcı):** (1) Location WhenInUse: yalnız burada. Red → harita şehir merkezinde + sheet'te "Location off · Turn on" satırı. (2) Notifications: ilk "Warn me before Tier 2" toggle anında; red senaryosu §7.4. (3) Camera/Photos: ilk Photo/OCR dokunuşunda; red senaryosu §7.4. (4) Always + Motion: yalnız premium auto-detect açılırken, tek sayfalık açıklama kartıyla (§7.9).

### 7.2 Keşif (idle)

- **Harita:** üst 2/3. Sağ üstte 2 cam kare (44pt, arada 12pt): Settings (`gearshape`), History (`clock`). Locate-me cam karesi sheet üst kenarının 12pt üstünde sağda. **Ekranın üst 1/3'ünde birincil dokunulabilir öğe yok.**
- **Sheet (peek 120pt / mid %45 / full %90):** grabber → arama 44pt → chip satırı (sheet üst kenarına sabit, yatay scroll): "⚡ Charging" (`bolt.fill`), "Covered" → sonuç listesi.
- **Arama:** Mapbox Geocoding — otopark POI'leri + genel yerler. Sonuç satırı: yer adı 15pt/600 ink + mesafe 13pt tabular `text-secondary` sağda, 44pt satır, `gridline` ayraç. Aranırken sistem spinner; sonuç yok: "No parking nearby." + "Try zooming out." 13pt.
- **Otopark kartı (mid/full):** yer adı display-M 34pt Black "KANYON AVM." (**ink nokta** — ekranın tek imza noktası) → meta satırı max 3 öğe "·" ayraçlı: "Open · ₺50/hr · 4 chargers" (Open önünde 7pt `accent-fill` canlı dot; caption 13pt) → mesafe/yürüme 13pt tabular → siyah hap CTA **"I Parked"** (52pt, içinde dot/dekor yok).
- **Meta satırı veri kuralı (bağlayıcı):** yalnız MEVCUT veriler "·" ile dizilir; bilinmeyen alan sessizce atlanır; hiçbir veri yoksa satır tamamen gizlenir. "Unknown" / "—" placeholder YASAK. Canlı dot yalnız açık/kapalı verisi mevcutken render edilir.
- **CHARGING bölümü (koşullu, full detent — EVPoint istasyon detay hiyerarşisi):** overline "CHARGING" 11pt → satır "2/4 available · AC Type 2 · 22 kW · ₺8/kWh" 15pt (tutarlar 800 tabular; müsaitlik sayısının önünde 7pt `accent-fill` canlı dot — "canlı" whitelist kapsamı). Eksik veri alanı atlanır; bölümün hiç verisi yoksa bölüm tamamen gizlenir — placeholder yasak. EV chip aktifken bu bölüm meta satırının hemen altına yükselir.
- Pin seçimi → kart o otoparka morph (EVPoint pin→kart akışı). Durumlar: konum kapalı satırı (§5.11); **offline:** son cache'li tile'lar + §5.11 satırı "Offline — showing last map".

### 7.3 Park Etme sheet'i (parking)

- Tap "I Parked" → haptic + oturum persist **≤2 sn**, ağ beklenmez, konum arka planda iyileşir. **Zorunlu alan SIFIR.**
- Sheet mid detent'e morph: display-M "PARKED." damgası (yeşil nokta — bu ekranın tek imza noktası ve tek display odağı) → "Undo" text buton (10 sn görünür) → tek satır **"+ Add details"** (44pt) — arkasında katlı satırlar: Level, Photo, Note, Tariff (OCR) — her biri 44pt; **2+ araç profili varsa 5. satır "Vehicle"** (son kullanılan default; §7.9) → siyah "Done" yok; sheet'i aşağı çekmek geçerli kapanış, 6 sn etkileşimsizlikte otomatik `active`.
- Damga koreografisi: bkz. §9. Kutlama-dışı hiçbir öğe döndürülmez (damga rotasyonsuz, scale-overshoot).

### 7.4 Tarife girişi + OCR

- Park sheet'inden "Tariff" satırı → sheet full detent. Overline "TARIFF" → tarife tipi (tiered / flat / hourly — §5.9 veri modeli): tiered'da her dilim = 44pt satır (süre alanı + toplam ₺ input, tabular, sağa hizalı) + "+ Add tier" text satırı; flat/hourly'de tek ₺ alanı → ayrık satır "Scan tariff board" (`camera` ikon, ilk dokunuşta kamera izni).
- OCR sonucu: aynı satır formuna düzenlenebilir olarak dolar; onay = siyah hap "Save Tariff". Hatalı okuma satırı elle düzeltilir (OCR sonucu asla onaysız kaydedilmez).
- **OCR akış durumları (bağlayıcı):**
  1. **Kamera:** tam ekran modal; altta 13pt ipucu "Frame the price board"; beyaz deklanşör 64pt (`r-999`); `xmark` sol üstte 44pt cam kare.
  2. **İşleme:** çekilen kare sabit + üstte "Reading…" 15pt + sistem spinner; hedef ≤3 sn.
  3. **Başarısız:** "Couldn't read the board. Enter manually or retake." 15pt + ghost "Retake" + text "Enter manually" (form her zaman geri dönüş yoludur).
  4. **İzin reddi:** "Scan tariff board" satırı yerine 44pt "Camera off · Turn on in Settings" satırı (§5.11 kalıbı, Settings deep link).
  5. **Motor:** on-device Apple Vision framework — offline çalışır, görüntü cihaz dışına ÇIKMAZ (bu cümle gizlilik metnine de yazılır).
  6. **Free sayaç:** free'de 3 OCR/ay; "Scan tariff board" satırının sağında "2 left this month" 13pt `text-secondary`; 0'da `lock.fill` + dokununca paywall pageSheet. Premium sınırsız.
- İlk tarife kaydında "Warn me before next tier" toggle (vars. 15 dk) → toggle dokunuşunda bildirim izni. **Bildirim izni reddedilirse:** toggle kapalı konuma döner + altında 44pt satır "Notifications off · Turn on in Settings" (§5.11 kalıbı, deep link) — free kullanıcının tek uyarı kanalı bildirimdir (§8.4).

### 7.4b Auto-detect oturum başlangıcı (premium)

1. Algılama gerçekleşince sistem bildirimi: "Parked at Kanyon AVM? Session started." + bildirim aksiyonu "Undo".
2. App açılınca sheet doğrudan `active` durumundadır; sayaç bloğunun üstünde 32pt satır: "Auto-detected · Not parked? Undo" (text buton; 10 dk görünür).
3. **Undo:** oturumu geçmişe yazmadan tamamen siler; sheet `idle`'a morph eder.
4. **State geçişi:** `idle → active` — `parking` durumu atlanır ve "PARKED." damga koreografisi OYNAMAZ; damga yalnız manuel "I Parked" anına aittir (bağlayıcı).
5. Yanlış pozitif düzeltmesi yalnız Undo'dur; ikinci bir onay dialogu yok (sessiz güven + tek dokunuşta geri alma).

### 7.5 Aktif Oturum (active)

- **Yüzey: BEYAZ sheet** (`surface/card #FFFFFF`, `r-24`, `shadow/3`; dark `#1C1C1F`). App içinde tam-genişlik siyah kart/sheet YASAK. Üstte harita `calm` varyant + uniform `scrim`, siyah P pin görünür.
- İçerik (yukarıdan aşağı, toplam ~5 blok):
  1. Overline 11pt: "PARKED 13:04 · LEVEL −2, C" (`text-tertiary`).
  2. **Sayaç — tek display odağı:** 64pt/900 tabular ink; saniye bloğu 24pt `text-secondary`. Sayaç ink kalır — yeşil DEĞİL.
  3. Tarife dilim çubuğu (§5.9). Tarifesizse: "Add tariff to see cost →" satırı. Flat'ta çubuk gizli, "₺X flat" 15pt/800 tabular satırı.
  4. Koşullu para kutusu (§5.10): "Exit before 14:04 and pay ₺50 instead of ₺100" (§5.9 formülünden).
  5. Siyah hap **"Find My Car"** (52pt) → altında yan yana iki 44pt ghost: "Share" + "End" (arada 8pt).
- SİLİNENLER (geri eklenmez): "PARKED." display başlığı (damga anına taşındı), dgrid (Cost now/Distance/Reminder), ikinci kart, "Share Location · End" çift-eylem butonu.
- Offline: §5.11 satırı sheet üstünde; sayaç lokal sürer.

### 7.6 Find My Car

- Full-screen push (kapatınca `active` sheet'e döner, oturum sürer).
- **Birincil içerik kuralı (üç kol, bağlayıcı):**
  1. **Foto/kat kaydı VAR** → foto kartı birincil (16:9, `r-16`) + display-M "LEVEL −2 · ROW C." (ink nokta) + pusula/mesafe altta ikincil.
  2. **Foto/kat yok + `horizontalAccuracy ≤ 25m`** → pusula birincil: 64pt tabular metre + `location.north.fill` yön oku (Light weight, 32pt) + altta mini harita.
  3. **Foto/kat yok + `horizontalAccuracy > 25m`** (kapalı otoparkta hızlı park — en olası kötü senaryo) → mini harita birincil (son bilinen nokta + belirsizlik halkası) + 13pt bilgi satırı "Location was approximate — check nearby levels"; pusula gizli.
- **Navigate davranışı:** Apple Maps yürüme rotası deep link'i (in-app rota çizimi YOK — solo dev kısıtı, bilinçli karar). Mesafe <30m → siyah CTA "Navigate" → "End Session" 200ms crossfade morph. Ekranda ikinci siyah buton asla yok.
- **Heading verisi yoksa** (iPad, kapalı alan, pusula kalibrasyonsuz): yön oku gizlenir; yalnız mesafe + harita gösterilir.
- **Konum izni oturum sırasında geri alınmışsa:** §5.11 "Location off · Turn on" satırı; kayıtlı park noktası haritada sabit kalır, canlı mesafe/pusula gizlenir.

### 7.7 Oturum bitirme (ending) + Kutlama (ended)

**Varyant seçimi (bağlayıcı tablo — §5.9 veri modelinden türetilir):**

| Koşul | Ending | Kutlama hero | Özet | Paylaşım |
|---|---|---|---|---|
| (c) Tarifeli + sınırdan önce çıkış (`saved > 0`) | "END SESSION." + "You'll pay ₺50 · Saved ₺50" + siyah "End & Save ₺50" | "YOU SAVED" + "₺50." (yeşil nokta, count-up) | Duration / Paid / This month | Savings Card minyatürü + siyah "Share Card" |
| (b) Tarifeli + `saved = 0` (dilim aşılmışken bitiş) | "END SESSION." + nötr satır "You'll pay ₺100" (amber DEĞİL, ink) + siyah "End Session" | "PARKED 1H 45M." display-M, **INK nokta**; "YOU SAVED" bloğu tamamen GİZLİ, count-up yok | Duration / Paid ₺100 / This month | Paylaşım kartı GİZLİ; yalnız "Done" |
| (a) Tarifesiz / flat | "END SESSION." + süre satırı (flat'ta "You'll pay ₺X") + siyah "End Session" | "PARKED 1H 45M." display-M, **INK nokta** | Duration / konum (flat'ta + Paid) | Ghost "Share Location" (Location Card, §11.1) |

- İnk nokta kararı (bağlayıcı): yeşil = para; süre para değildir → süre-odaklı damga her locale'de ink noktadır (§3.3).
- **Ending:** "End" → sheet morph (300ms): display-M "END SESSION." (ink nokta) + varyant satırı (tabular; tasarruf `accent-text`) + siyah CTA + "Keep Parking" ghost (44pt). Sistem alert yok.
- **Kutlama (full-screen cover):** zemin `surface/bg` (`#F6F6F4` / `#131315`). **KONFETİ SIFIR — her yüzeyde.** Partikül, glow, radyal patlama, arka plan pulse yok.
  - Varyant (c) hiyerarşisi: overline "SESSION ENDED · 14:49" → "YOU SAVED" display-S 28pt/900 ink → **"₺50."** display-XL 64pt, rakam **`accent-text #0B7A3E` light (surface/bg üstünde 5.0:1 — §2.2; `#00A650` bu zeminde 2.95:1 kaldığı için YASAK)** / dark `#2FE07A`, tabular (count-up) — **yeşil nokta, ekranın tek imza noktası** → meta 13pt "Kanyon AVM · Exited 15 min before Tier 2" (noktasız — tie-breaker §3.3).
  - Özet 3 satır (liste, `gridline` hairline ayraçlı): Duration 1h 45m / Paid ₺50 / This month ₺340 (istatistik-premium köprüsü). "Avoided" satırı YOK (başlık zaten o).
  - Altta (yalnız c): koyu paylaşım kartının **canlı minyatürü** (`r-24`, `#141416`, gerçek render) + siyah hap "Share Card" + "Done" text buton. Kart flow içinde; buton alanı için altta min 128pt rezerv (§4.1).
  - Koreografi: bkz. §9 (count-up yalnız varyant c'de). Streak, rozet, sürekli tam-ekran kutlama yasak.

### 7.8 Geçmiş + İstatistik (pageSheet)

- Üstte KPI satırı: 3 stat tile — "Total saved" (hero, değer 28pt proportional `accent-text #0B7A3E`; dark `#2FE07A`), "Sessions", "Avg duration" (değerler 22pt proportional ink); tile: `r-16`, bg `surface/inset`, overline 11pt etiket.
- Grafikler: §11.2 reçetesi. Altında oturum listesi: satır = yer adı 15pt/600 + tarih 13pt `text-secondary` + araç adı 13pt `text-secondary` (2+ araç varsa) + sağda ₺ 15pt/800 tabular (tasarruflu satırda "Saved ₺X" `accent-text`).
- Free: son 3 kayıt + KPI'lar; sonrası kilitli satırlar (blur yok, `lock.fill` `disabled` ikon + **satır metni `text-secondary`** — kilitli satırlar okunmak istenen paywall köprüsüdür, `disabled` grisiyle yazılamaz) → paywall.
- Boş durum: §5.12.

### 7.9 Ayarlar (pageSheet)

- Liste grupları (44pt satırlar): Vehicle, Default tariff reminder (15 dk stepper), Notifications, Appearance (System/Light/Dark), Language (EN/TR), Premium durumu → paywall, Restore Purchases, Privacy & Terms.
- **Vehicle (çoklu araç, premium):** araç = profil (ad + opsiyonel plaka; **plaka hiçbir karta/paylaşıma/ekran görüntüsü yüzeyine çıkmaz**). Free'de tek satır + kilit. 2+ profil varsa park sheet'ine "Vehicle" satırı eklenir (§7.3), son kullanılan default; geçmiş satırına araç adı yazılır (§7.8). Aynı anda tek aktif oturum kuralı §7 mimari paragrafındadır.
- Auto-detect (premium): açılırken tek sayfalık açıklama kartı → Always + Motion izinleri. Kart: display-S başlık noktasız + body 15pt + siyah "Enable" + "Not now" text. Davranış: §7.4b.
- Başlık: navbar 17pt/600 "Settings" — display/nokta yok.

### 7.10 Paywall (pageSheet)

- Zemin `surface/card #FFFFFF` (dark `#1C1C1F`) — krem yasak. Plan/başlık metinlerinde nokta imzası YOK.
- Hiyerarşi: overline "PARKIQ PRO" 11pt → başlık display-S 28pt Black uppercase, noktasız: **"PRO DETECTS PARKING"** + body 15pt "You never think about it." → özellik listesi 4 satır (SF Symbol Regular + 15pt): Auto-detection, Live Activity + widgets, Unlimited history & stats, Multiple vehicles — (tarife panosu tarama premium DEĞİLDİR: cihaz üstü Vision'a geçildiği için herkese sınırsız ücretsizdir) → plan kartları: Yearly (vars. seçili) + Monthly + Lifetime — her biri `r-16` kutu, 44pt+, fiyat 17pt/800 tabular; seçili kart 2pt ink border → siyah hap CTA → 13pt text satır: "Restore · Terms · Privacy".
- **CTA metni plan-bağımlı şablon:** "Continue — ₺X/year" / "Continue — ₺X/month" / "Continue — ₺X once" (fiyat her zaman tabular rakam).
- **Durum listesi (bağlayıcı):**
  1. **Yükleniyor:** plan kartları yerine 3 iskelet kutu (§5.12 kalıbı, `r-16`), CTA disabled.
  2. **Hata/offline:** "Couldn't load plans. Check your connection." 15pt + ghost "Retry".
  3. **Satın alma sürüyor:** CTA metni yerine sistem spinner; ekran etkileşime kilitli (dismiss dahil).
  4. **Başarı:** sheet kapanır; geldiği ekranda display-S "PRO." damga anı + `notificationSuccess` (§9 nokta damgası koreografisi). Nokta **bilinçli olarak INK**: yeşil = para + şarj + canlı; satın alma bu üçünden biri değildir — whitelist'e eklenmedi.
  5. **Restore:** başarıda 13pt satır "Restored." + sheet kapanır; başarısızlıkta "No purchases found." 13pt `text-secondary`.
  6. **Trial/intro offer:** plan kartında "1 week free, then ₺X/year" 13pt `text-secondary`; fiyat yine rakamla.
- RevenueCat offerings; fiyat metinleri her zaman rakam. "Unlock/amazing" tipi kelimeler yasak (§10).

---

## 8. Live Activity + Dynamic Island + Widget

**Kart:** `#101012`, `r-24`, kenar ışığı `inset 0 1px 0 rgba(255,255,255,.08)`, duvar kağıdı gölgesi `0 8px 24px rgba(0,0,0,.45)`. Yeşil piksel alanı ≤%10 (tek istisna: §8.5 bitiş karesi). App'in tarife çubuğuyla AYNI token seti + TEK KAYNAK MATEMATİĞİ (§5.9).

**Mimari not (bağlayıcı):** LA / Dynamic Island / widget, WidgetKit + SwiftUI **extension**'ında yaşar ve RN kodu ÇALIŞTIRMAZ; Expo tarafında `expo prebuild` ile widget extension target'ı eklenir. Senkron garantisinin mekanizması: §5.9'daki paylaşılan saf hesap modülünün çıktısı (segment yüzdeleri, knob konumu, amber durumu, sınır zamanları) `ActivityAttributes.ContentState`'e yazılır; SwiftUI tarafı yalnız render eder, kendi matematiğini asla türetmez. "Aynı bileşen" ifadesi bu anlama gelir: aynı token + aynı formül + tek veri kaynağı.

**Marka katmanı:** sol üst 22×22pt "P." glyph (app ikonu minisi: siyah yuvarlak-kare, beyaz P, yeşil nokta; kart üstünde 1pt `#2FE07A` çerçeve) + overline "KANYON AVM · LEVEL −2" — **noktasız**, 11pt, +0.14em, `#8A8A93`. "PARKIQ" yazısı yok.

### 8.1 Durum-bağımlı hero yuvası

- **Tarifeli oturum:** HERO (sol) = sonraki dilime GERİ SAYIM — `Text(timerInterval:, countsDown:true)`, 44pt/900 tabular beyaz; üstünde overline "NEXT TIER ₺100" (`#8A8A93`). İKİNCİL (sağ) = "ELAPSED" overline + 17pt tabular beyaz sayaç (`countsDown:false`). Son 15 dk: hero rakam + knob + dolgu `#FFB300` (rakam ≥22pt display istisnası — §5.9 durum makinesi). Dilim sınırı geçilince hero sonraki dilimin geri sayımına atlar (staleDate + planlı içerik güncellemesi); son dilimdeyse tarifesiz moda düşer.
- **Tarifesiz oturum (birinci sınıf mod):** HERO = geçen süre 44pt Black tabular; overline "PARKED 13:04". İkincil: "LEVEL −2, C" veya "₺X FLAT" (flat tarife — §5.9 veri modeli). Dilim çubuğu gizlenir, kart bir satır kısalır.
- **Çubuk:** 8pt track `#26262B`, solid `#2FE07A` dolgu, 2px `#101012` gap'ler, knob 14pt `#2FE07A` + `#101012` halka — tamamı ContentState'teki `tariffMath` çıktısından.
- **Para footer'ı:** "Now ₺50 · Next ₺100" — 13pt/800 tabular beyaz (10px yasak; kilit ekranı mesafesinden okunur). Fiyatlar kümülatif toplamdır (§5.9). Çift zaman kodlaması yok (saatler yalnız çubuk sınırlarında).

### 8.2 Dynamic Island

- Compact: leading = P. glyph; trailing = yeşil tabular geri sayım "23m" (son 15 dk amber `#FFB300`). Tarifesizse geçen süre. Minimal: yalnız P. glyph. Expanded: mini LA kartı, aynı token'lar.

### 8.3 Widget

- Aile boyutuna göre aynı mantık: bg `#101012`, rakam kartın %50+ yüksekliğini kaplar. systemSmall: hero rakam + yer adı overline; systemMedium: mini LA (çubuk dahil). Oturum yoksa: "P." glyph + "No active session" 13pt `#8A8A93` + son tasarruf "₺340 saved this month" `#2FE07A` tabular.
- Poster katmanı sabit ölçekli (Dynamic Type yok). Geri sayımlar `Text(timerInterval:)` — push gerekmez.

### 8.4 Bildirim banner'ı

- Sistem bildirimi, para diliyle: "Tier 2 in 15 min. Now ₺50, after ₺100." Eşikte bir kez tetiklenir. Ünlem yok.
- **Mekanizma (bağlayıcı):** dilim uyarısı **local notification** olarak eşikten önce zamanlanır — app kapalıyken de çalışır; push/sunucu gerekmez. Free kullanıcıda TEK uyarı kanalı budur (LA premium'dur); premium'da LA + bildirim birlikte çalışır. Oturum bitince veya Undo'da zamanlanmış tüm bildirimler iptal edilir. Bildirim izni yoksa: §7.4 red senaryosu (toggle kapalı + Settings satırı).

### 8.5 Bitiş karesi (tek karelik gösteriş anı — NotBoring bacağı)

- Oturum "End" ile kapanırken LA'nın SON güncellemesi kartı ters çevirir: zemin `accent-fill #2FE07A`, TÜM tipografi ink `#141416` (10.6:1 — §2.2), hero "SAVED ₺50." 44pt/900 + **ink nokta** (yeşil zeminde nokta ink — §3.3'ün tek ink whitelist istisnası). Overline "KANYON AVM · 1H 45M" ink.
- Tarifesiz/`saved=0` oturumda kare "PARKED 1H 45M." olur (aynı ters şema, ink nokta).
- **Tek kare:** loop yok, glow yok, konfeti yok, animasyon yok. 3 sn sonra `dismissalPolicy(.after(...))` ile kalkar. Yeşil piksel ≤%10 kuralının tek ve ≤3 sn ömürlü istisnası budur — kilit ekranında herkesin göreceği an.

---

## 9. Motion & haptik

**Tek spring konfigürasyonu:** Reanimated `damping 18, stiffness 180, mass 1` (sheet aç/kapa, kart giriş, pin seçimi). `linear` ve `ease-in-out` yasak.

| An | Süre/eğri | Haptik |
|---|---|---|
| Buton pressed | scale 0.97, 120ms | — |
| Sheet state morph | 300ms yükseklik + 200ms crossfade | — |
| "I Parked" damga sekansı | metin 150ms fade → yeşil check 300ms stroke → sheet spring kapanır → "PARKED." scale 1.04–1.12→1.0 overshoot + nokta spring 0→1.15→1.0; **toplam ≤800ms** | tap'te `impactMedium`, damgada `notificationSuccess` |
| Kutlama sekansı (yalnız §7.7 varyant c) | toplam 1.6–1.8s: overline fade 0.2s → "YOU SAVED" → ₺ count-up 0→50, ~0.8s easeOut (tabular) → **nokta EN SON**: scale 0.6→1 spring bounce | count-up'ta max 3–4 hafif detent; nokta ile senkron tek `notificationSuccess` |
| CTA morph (Navigate→End Session) | 200ms crossfade | — |
| Seçili pin | spring 1.25× | `selection` |
| Nokta damgası (genel — "PRO." dahil) | başlık oturduktan 150ms sonra, spring response 0.35 / damping 0.7 | `notificationSuccess` |

- **Reduce Motion:** tüm spring/overshoot → 200ms crossfade; rotasyon yok; count-up → düz opacity fade; haptik kalır.
- Sürekli animasyon yok (knob nabzı dahil hiçbir öğe loop'ta oynamaz — LA geri sayımı sistem timer'ıdır; §8.5 bitiş karesi statik tek karedir).

---

## 10. Ses & kopya

**Dört kural:** (1) Kısa bildirim cümleleri — iş bitince nokta. (2) Para her zaman rakamla, sıfatla asla. (3) Aciliyet = gerçek + fiyat; panik dili yok; amber görsel sinyaldir, dil önce "şimdi çıkarsan X" seçeneğini söyler. (4) TR'de "sen" dili, resmiyet yok.

| Bağlam | EN | TR |
|---|---|---|
| Park onayı † | PARKED. | PARK ETTİN. |
| Kutlama † | SAVED ₺50. | ₺50 CEBİNDE. |
| Süre damgası † (ink nokta) | PARKED 1H 45M. | 1S 45DK PARK. |
| Dilim uyarısı | Exit before 14:04 and pay ₺50 instead of ₺100. | 14:04'ten önce çık — ₺100 yerine ₺50 öde. |
| Bildirim | Tier 2 in 15 min. Now ₺50, after ₺100. | 2. dilime 15 dk. Şimdi ₺50, sonra ₺100. |
| Dilim aşıldı | New tier started — ₺100. | Yeni dilim başladı — ₺100. |
| Find | Your car is 320 m away. | Araban 320 m ötede. |
| Boş geçmiş | No sessions yet. Your first park will land here. | Henüz oturum yok. İlk parkın burada başlar. |
| Offline | Offline — timer still running. | Çevrimdışı — sayaç çalışıyor. |
| Paywall | Pro detects parking automatically. You never think about it. | Pro parkı otomatik algılar. Sen hiç düşünme. |

- **†** işaretli satırlar imza-noktalı display satırlarıdır ve her iki dilde §3.3 whitelist'ine tabidir (park onayı + kutlama yeşil; süre damgası ink). Diğer satırlar body/bildirim kopyasıdır — display noktası taşımaz.
- **Yasak kelimeler:** amazing, unlock, süper, harika, hemen şimdi. **Ünlem: istisnasız yasak.**
- Body içinde marka adı "ParkIQ"; display dışında asla tümü büyük yazılmaz. Wordmark "PARKIQ." — monolit, tek ağırlık, yeşil terminal nokta; "IQ"yu ayırmak (renk/ağırlık/italik) yasak. App içinde navbar/haritada logo yok.
- App ikonu (Konsept A): `#141416` zemin, beyaz Black "P" (yükseklik = ikonun ~%56'sı, kütle merkezi %48'de) + baseline'da `#2FE07A` nokta (çap = genişliğin %13'ü) → "P." okunur. İkon = pin = LA glyph = favicon tek DNA; tinted mod için tek renk beyaz varyant.

---

## 11. Paylaşım kartları + istatistik görselleştirme

### 11.1 Paylaşım kartları (render, app koordinat uzayı dışında; font: Inter Display 800/900)

**Koyu ink kart kuralı (bağlayıcı):** LA + tüm paylaşım kartları ink-siyah yüzey ailesidir — `text-secondary`/`text-tertiary` bu yüzeylerde HER ZAMAN dark sütun değerlerini kullanır (`#9B9BA4` / `#8A8A93`); light değerleri (`#6E6E78`, `#71717A`) koyu zeminde yasak (kontrast: §2.2).

**SAVINGS CARD — kanonik koyu ink kart, tema-bağımsız.** 1080×1920 story (+1080×1080 kare varyant). Zemin `#141416`. Güvenli alan: içerik y 250–1700, yan marjin 96px. Partikül/konfeti yok; palet yalnız ink/beyaz/yeşil.

1. Overline: "PARKIQ · KANYON AVM" 40px Bold uppercase, +0.14em, `#8A8A93` — noktasız (konum max semt düzeyi).
2. Hero: "SAVED ₺50." — 288px Black uppercase, lh 0.98 (kart yüksekliğinin ~%22–25'i); "SAVED" beyaz, "₺50" + nokta `#2FE07A`, **proportional** rakam. (Karttaki tek imza noktası; wordmark marka işaretidir, sayıma girmez — §3.3.)
3. Alt satır: "1 h 45 m · Exited 15 min before Tier 2" 44px/400 `#8A8A93`.
4. Mini tarife çubuğu "makbuz": 888×20px, radius 10px, track `#26262B`, yeşil dolgu çıkış noktasına kadar, knob 28px `#2FE07A` + 4px `#141416` halka, 4px dilim gap; altta fiyatlar 32px tabular `#8A8A93` (`#141416` üstünde 5.4:1 — §2.2).
5. 3 sütun veri: Duration / Paid / Avoided — overline 32px + değer 64px tabular; Avoided `#2FE07A`.
6. Footer: "PARKIQ." wordmark (yükseklik ≤ kart yüksekliğinin %3'ü, beyaz + yeşil nokta) + sağda "parkiq.app" 36px `#8A8A93`.

**LOCATION CARD:** krem `#F5F2EB` harita stili + siyah P pin + adres + yürüme süresi (amaç konum — harita serbest); aynı footer. **Gizlilik:** savings kartında tam adres/koordinat/plaka ASLA; location kartı yalnız kullanıcının bilinçli paylaşımıyla üretilir; araç plakası hiçbir kartta yer almaz.

**Konum paylaşım web sayfası:** Inter; light harita stili + P pin + "Araban burada · 320 m" satırı + "PARKIQ." footer; token seti birebir (light tema değerleri).

- **Yaşam döngüsü (bağlayıcı):** link = **statik park noktası snapshot'ı** — canlı takip YOK (gizlilik + solo dev kısıtı). Login yok; link anonim token ile üretilir. Oturum bitince veya 24 saat sonunda link pasifleşir.
- **Expired durumu:** aynı sayfa iskeleti; harita yerine `#F6F6F4` zemin + "THIS SPOT EXPIRED." Inter 800 uppercase (**ink nokta** — para/tasarruf değil) + siyah hap "Get ParkIQ" → App Store.
- **Yüklenme hatası:** "Couldn't load location." + "Retry" text buton.
- Sayfanın alt CTA'sı HER durumda App Store köprüsüdür — bu sayfa organik büyümenin ana kanalıdır ve amacı budur.

### 11.2 İstatistik görselleştirme reçetesi

- **(a) KPI satırı:** §7.8. Değerler proportional.
- **(b) Aylık tasarruf:** tek seri yeşil kolon (`accent-fill`), kolon ≤24px, üst uç 4px radius + taban köşesiz, kolonlar arası 2px yüzey gap, legend yok, direct label yalnız güncel ay + max ay, gridline 1px `gridline` düz hairline. Y ekseni yuvarlak ₺ (₺0/₺100/₺200), tabular tick.
- **(c) Paid vs avoided:** emphasis yığılmış kolon — paid `chart-neutral` (`#D0D0CB` / dark `#3A3A3E`), avoided yeşil; 2 seri → legend zorunlu; değerler alttaki listede her zaman okunur.
- **Para-dışı veri** (yoğunluk heatmap, süre dağılımı): yeşil DEĞİL — sequential **ink rampı** (§2.1 kapalı alt-set): light `#E8E8E2 → #C9C9C4 → #9A9AA2 → #6E6E78 → #141416`; dark `#2C2C2A → #6E6E78 → #9B9BA4 → #F0F0F2`. Heatmap hücreleri 4px radius + 2px gap; hücre içine rakam yazılmaz, uç değerlere direct label + dokununca değer.
- **Yasak:** pasta/donut, tasarruf halkası/gauge, çift y-eksen, ay başına farklı renk, değere göre koyulaşan yeşil, kesikli gridline.

---

## 12. Erişilebilirlik

- **Kontrast:** §2.2 tablosu bağlayıcı. `#00A650` açık zeminde <20pt metin yasak; ≥22pt display serbestliği YALNIZ `#FFFFFF` üzerindedir — `surface/bg` (#F6F6F4) ve krem (#F5F2EB) üstünde display rakam/nokta `accent-text #0B7A3E` kullanır. `#2FE07A` açık zeminde asla; `#FFB300` açık temada hiçbir rolde; amber açık temada `#C77700` dolgu / `#B45309` metin (metin varsayılanı her zaman `warn-text` — §5.9); yeşil dolgu üstüne her zaman ink.
- **Bilgi taşıyan metin asla `disabled` grisiyle yazılmaz:** geçilmiş dilim fiyatı ve kilitli geçmiş satırları `text-secondary` (§5.9, §7.8); `#9A9AA2` yalnız devre dışı kontrol + chevron/kilit ikonu.
- **Renk asla tek sinyal:** amber geçişi = renk + `clock` ikonu + metin ("14 dk → ₺100") + knob'un halkaya dönmesi; geçilmiş dilim = renk + ağırlık düşüşü (800→400); canlı dot her zaman "Open"/müsaitlik metniyle; grafiklerde legend/direct label.
- **Dokunma:** tüm interaktif hedefler ≥44×44pt (chip/pin hitSlop ile tamamlanır).
- **Dynamic Type:** §3.1 eşlemeleri zorunlu; display `maxFontSizeMultiplier 1.3`; accessibility boyutlarında Display-XL sayaç gerekirse saniye birimini düşürür; poster katmanı (LA/widget/share/onboarding) sabit.
- **VoiceOver:** her aksiyon ayrı öğe (çift-eylem butonu zaten yasak); tarife çubuğu tek öğe olarak okunur: "Tier 1, ₺50, next tier at 14:04, 23 minutes left"; damga/nokta animasyonları dekoratif (`accessibilityElementsHidden`).
- **Reduce Motion:** §9. **Haptik** Reduce Motion'da kalır.
- Sistem çift tema zorunlu ve eş kaliteli; tema `System/Light/Dark` ayarı §7.9.

---

## 13. DO / DON'T

### DO

- Tüm renk/spacing/radius/gölge değerlerini token'dan tüket; yeni değer gerekirse en yakın token'a yuvarla.
- Her rakamı gerçek matematikten türet (knob konumu, fiyatlar, geri sayım, saved formülü); app ve LA'da §5.9 TEK KAYNAK MATEMATİĞİNİ kullan (paylaşılan TS modülü → ContentState → SwiftUI).
- Her ekranda tek siyah hap CTA + ayrık ≥44pt ikincil hedefler.
- SF Symbols (metin yanı Regular, hero Light — §5.13 bilinçli Zara trade-off'u) + %33 köşe oranlı custom glyph ailesi.
- Beyaz ring'li pinler, cluster kademeleri, `calm` harita varyantı.
- Para diliyle konuş: "Exit before 14:04 and pay ₺50 instead of ₺100."
- Kutlamayı tipografi + count-up + nokta damgası + haptikle yap; varyantı §7.7 tablosundan seç.
- Meta satırlarında yalnız MEVCUT veriyi göster; bilinmeyen alanı sessizce atla ("Unknown"/"—" yazma).
- Her akışın yükleniyor/hata/izin-reddi/offline durumunu spec'ten uygula (OCR §7.4, paywall §7.10, Find §7.6, keşif §7.2).
- Koyu temada yüzey basamağı + hairline + kenar ışığı ile hiyerarşi kur; koyu ink kartlarda tertiary/secondary'nin dark değerlerini kullan.
- Poster cesaretini yalnız LA/widget/paylaşım kartı/onboarding posterlerinde harca; bitiş karesini (§8.5) tek karede bırak.

### DON'T (vetolar — istisnasız, istisnalar metinde adlandırılmıştır)

- **Emoji ikon** (⚡ ⏰ ➤ ✕ dahil) hiçbir yüzeyde; aynı ekranda karışık ikon stroke ağırlığı.
- **Serif** hiçbir rolde; SF Pro'yu Apple platformu dışında kullanmak.
- **Dekoratif gradyan** her türlüsü (tarife dolgusu, CTA, kart, arka plan); tek istisna fonksiyonel scrim.
- **Renkli glow/gölge** (EV pin yeşil glow'u, LA dolgu glow'u dahil); soğuk/navi tonlu gölge; siyah CTA'ya drop shadow.
- **Palet dışı renk:** `#00C853`, `#FFC838`, `#F5325B`, süs mavi/mor; çok renkli konfeti — konfeti zaten SIFIR.
- **Yeşil dekor:** yeşil CTA, yeşil dolgulu chip, dekoratif yeşil dot, yeşil büyük yüzey (tek istisna: §8.5 bitiş karesi, ≤3 sn), koyu temada yeşil başlık/gövde metni.
- **Krem** harita ve onboarding S1/S3 posterleri dışında herhangi bir yüzeyde; **app içinde tam yüzeyli siyah kart/sheet** (tek istisna: onboarding S2 manifesto posteri — poster katmanı).
- **Çift-eylemli buton** ("Share Location · End"), ekranda ikinci hap kütlesi, dairesel FAB, tab bar, sistem UIAlert.
- **Nokta enflasyonu:** overline/meta/body'de display noktası; yüzey başına 1'den fazla imza noktası (marka işaretleri §3.3 gereği sayım dışı); whitelist dışı yeşil nokta; süre damgasında yeşil nokta; **ünlem işareti**.
- **Tip ihlalleri:** yarım punto (tek istisna: §5.9 9pt saat işaretleri), 500/700 ağırlık, ekran başına birden fazla display-boy odak, 900'ü body/meta'da kullanmak.
- **Ham hex** component içinde; ad-hoc cam/gölge/radius parametresi; koyu ink kartta light gri değeri.
- **Grafik yasakları:** pasta/donut, gauge/halka, çift y-eksen, nominal seride renk rampı.
- **Veri dürüstlüğü yasakları:** `disabled` grisiyle bilgi taşıyan metin; "Unknown"/"—" placeholder; elle yüzde; SwiftUI/RN taraflarının kendi tarife matematiğini türetmesi.
- **Davranış yasakları:** zorunlu park formu alanı, onboarding'de konum dışı izin, auto-detect'te damga koreografisi oynatmak, paralel ikinci aktif oturum, streak/rozet/maskot/stok illüstrasyon, ASCII/scanline/hazard-kırmızısı kostümü, panik/aciliyet dili, `#FFB300`'ü açık temada kullanmak, çubuğun veriyle çeliştiği herhangi bir durumda ship etmek.