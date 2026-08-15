# ParkIQ — Marka İşareti Araştırması ve Logo Prompt'ları

> Tarih: 2026-08-15 · Kardeş dokümanlar: [design.md](design.md) · [aso.md](aso.md) · [CLAUDE.md](../CLAUDE.md)
> Bu dosya logo/wordmark üretim brief'idir. Görsel dil kararları **design.md'de kilitli** — burası onu marka işaretine tercüme eder, yeni değer icat etmez.

---

## 1. Başlangıç noktası: ikon henüz yok

`assets/icon.png` şu an **Expo'nun varsayılan placeholder'ı** (mavi chevron + yapım çizgileri). Yani marka işareti sıfırdan kurulacak — mevcut bir şeyi düzeltmiyoruz.

Ama design.md marka işaretini **zaten tarif etmiş** ve bu bağlayıcı:

| Karar | Kaynak |
|---|---|
| App ikonu = **`P.` glyph** | [design.md §3.3](design.md) nokta whitelist'i |
| Wordmark = **`PARKIQ.`** | Aynı |
| Nokta = tamamlanmışlık imzası, **kanun** | design.md §3.3 "NOKTA imzası grameri (kanun)" |
| Marka işaretleri nokta frekans sayımına **dahil değil** | design.md §1 İlke 7 |
| Kişilik **tipografiden** gelir; illüstrasyon/maskot/dekor **yok** | design.md §1 İlke 1 |

Yani soru "logo ne olsun" değil, **"`P.` nasıl çizilsin"**.

---

## 2. Sert kısıtlar (prompt'lara gömülü)

### 2.1 SF Pro kullanılamaz
design.md §3: *"Apple platformu DIŞI yüzeylerde (web, story kartı, pazarlama, App Store dışı görsel) **Inter / Inter Display 800/900** kullanılır — SF lisansı platform dışına çıkamaz."*

Logo tanımı gereği platform dışı bir varlıktır (web, basın, sosyal, mağaza görselleri). **Logo SF Pro üzerine kurulamaz.** İki meşru yol: Inter Display 800/900 ya da sıfırdan çizilmiş özel harf formu. Prompt'ların hepsi bunu söylüyor.

### 2.2 Renk semantiği kilitli
| Token | Değer | Kural |
|---|---|---|
| ink | `#141416` | Ana renk. Harf formu bu. |
| yeşil (beyaz zeminde) | `#00A650` | Yalnız **para + şarj + canlı** anlamı taşır |
| yeşil (krem/surface zeminde) | `#0B7A3E` | Kontrast sınırı (design.md §2.2) |
| yeşil (koyu zeminde) | `#2FE07A` | |
| nokta yeşil zemin üstündeyse | `#141416` | Yeşil üstüne yeşil imkânsız |
| bg | `#F6F6F4` | |
| krem | `#F5F2EB` | **Yalnız harita canvas'ı + onboarding posteri.** Logo zemini olamaz. |

**Yeşil yalnız NOKTAYA dokunur.** Harf gövdesi yeşil olamaz — yeşil bir anlam taşıyıcıdır, dekor değil.

### 2.3 Yasaklar (CLAUDE.md AI slop listesi + design.md)
Gradyan · mor-mavi hero · cam efekti · emoji · maskot · illüstrasyon · 3D render · uzun gölge · dış çizgi/outline stroke · dekoratif ışıltı · araba resmi · yol resmi · pin klişesi (aşağıda 4 numaralı yön hariç, orada kasıtlı ve soyut) · ünlem.

### 2.4 Teknik
- **1024×1024**, tam kare, kenar boşluğu yok — iOS 26 kendi maskesini ve Liquid Glass'ını uyguluyor. Kendi köşe yuvarlaması **çizme**.
- **60×60'ta okunmalı.** Tek şekil, tek vurgu.
- **Dark-mode-first**: koyu zeminde önce çalışmalı, sonra açığa uyarlanmalı (2026'nın belirgin yönü).
- Android için `monochrome` varyantı zorunlu → mark tek renkte, gölgesiz de ayakta durmalı.

---

## 3. 2026 logo yönleri — araştırma özeti

| Yön | Ne diyor | ParkIQ'ya uygunluk |
|---|---|---|
| **Geometrik neo-minimalizm** | Literal tasvirden soyuta kaçış; küçük bir geometrik parça setiyle kasıtlı kurgu, asla fazla işlenmemiş | ✅ Tam isabet — İlke 1 zaten dekoru yasaklıyor |
| **Ultra sadeleşme** | 2026'nın en iyi performans göstereni: **tek tanınır şekil + tek vurgu rengi**, ikincil sembol yok, minik metin yok | ✅ `P.` = tam olarak bu |
| **Modern monogram / lettermark** | 1–3 harf, süslü değil ifade gücü yüksek; kriter **her ölçekte okunabilirlik** | ✅ Tek harf `P` |
| **Negatif alan alleys** | Şekiller arasında kasıtlı boşluk koridorları, çoğu zaman monograma çözülüyor | ✅ 2 ve 4 numaralı yönler |
| **Responsive kimlik sistemi** | Tek logo değil aile: tam logo · yığılmış · ikon · monogram · sadeleşmiş | ✅ `PARKIQ.` + `P.` zaten iki kademe |
| **Hareket-hazır / adaptif** | İşaretler duran değil davranan; dönen, dolan, sayan | ✅ Sayaç ürünü — dolan bir yay doğal |
| **Dark-mode-first** | Koyu zemin birincil tasarım hedefi | ✅ Tam koyu tema var |
| iOS 26 Liquid Glass | Kare ikona sistem otomatik cam uyguluyor | ⚠️ Kendi cam/gölgeni ekleme, sistem ezer |

**Anti-trend uyarısı:** 2026'da "AI yapımı" dedirten şey artık gradyan değil — **fazla yumuşatılmış, fazla yuvarlatılmış, fazla merkezlenmiş** işaret. ParkIQ'nun kaçışı sert tracking ve asimetrik nokta yerleşimi.

---

## 4. ParkIQ'nun kendi stil parmak izi

Koddan ve design.md'den çıkan, logoya taşınması gereken üç şey:

1. **Çift-izleme gerilimi** (design.md §3.1): dev uppercase SIKI (−0.02…−0.03em), overline GENİŞ (+0.14em). *"Bu gerilim sistemin parmak izidir."* → Logoda: harf sıkı, varsa alt satır geniş.
2. **Nokta = tamamlanmışlık.** Ürünün tamamı "oturum bitti, şu kadar kazandın" anına kurulu. Nokta bir süs değil, ürünün tezi.
3. **Ağırlık durakları 400/600/800/900 — 500 ve 700 yasak.** Logo 900'de yaşar.

---

## 5. Beş yön — birbirine benzemeyen

| # | Yön | Form dili | Harf/şekil |
|---|---|---|---|
| 1 | **Nokta hero** | Noktalama işareti başrolde | Harf ağırlıklı |
| 2 | **Geometrik counter** | Katı ızgara, mükemmel daire counter | Saf harf |
| 3 | **Dilim merdiveni** | Yükselen basamaklar, harf yok | Saf şekil |
| 4 | **Negatif alan kesişimi** | P'nin counter'ı oyulmuş | Karışım |
| 5 | **Sayaç yayı** | Dairesel, tek dolu yay | Şekil ağırlıklı |

---

### PROMPT 1 — "The Period Is the Product"

**Fikir:** Nokta ürünün tezi olduğu için logonun da tezi olur. Harf küçülür, nokta büyür. Rakiplerin hiçbirinde noktalama işareti marka işareti değil.

```
Vector logo mark for a parking app called ParkIQ. A single uppercase letter
"P" set in Inter Display Black (weight 900) with very tight optical tracking,
followed immediately by a full stop. The composition deliberately inverts
normal typographic hierarchy: the period is oversized — roughly 40 percent of
the cap height of the P — and sits tight against the letter's baseline right,
almost touching the stem. The P is drawn in flat solid ink #141416 with no
outline, no stroke, no gradient. The period is flat solid green #00A650, the
only colour accent in the entire mark. Background is flat #F6F6F4 with no
texture and no shadow, extending edge to edge with zero margin and no rounded
corner drawn into the artwork.

The letterform is architectural rather than friendly: flat terminals cut on a
strict horizontal, a perfectly vertical stem of even weight, and a bowl whose
counter is a clean geometric shape with generous negative space. Slightly
condensed proportions. The joint where the bowl meets the stem is cut square,
not softened.

Composition is intentionally off-centre — the letter-plus-period group sits
optically left of centre so the period has breathing room on the right, which
creates asymmetric tension instead of the usual dead-centre symmetry. Flat
two-dimensional vector, print-ready, monoline weight discipline, Swiss
typographic rigour, the restraint of a mature financial or productivity brand
rather than a consumer utility.

Negative: no gradients, no drop shadows, no glass or blur, no bevel, no 3D,
no outline stroke, no car, no road, no map pin, no location marker, no
mascot, no illustration, no emoji, no purple, no blue, no additional text,
no tagline, no border, no frame, no rounded-corner container.
```

---

### PROMPT 2 — "Grid-Cut P"

**Fikir:** Uluslararası park işareti zaten bir `P`. Onu geri almak — ama kırmızı/mavi tabela klişesi olmadan, saf geometri olarak. 2026'nın "geometric neo-minimalism" yönünün en saf hali.

```
Vector logo mark for a parking app called ParkIQ. A single custom-drawn
uppercase letter "P" constructed entirely from geometric primitives on a
strict modular grid: one vertical rectangle forming the stem, and a bowl
built as a perfect circle. The counter — the enclosed void inside the bowl —
is a mathematically exact circle, noticeably large relative to the letter, so
the negative space reads as an intentional element rather than leftover room.

The letter is drawn in flat solid ink #141416. One single diagonal cut at 45
degrees slices the lower right of the bowl where it meets the stem, creating
a sharp angular notch that keeps the form from feeling like a generic
typeface. Even stroke weight throughout, heavy — roughly one fifth of the cap
height. Flat horizontal terminals. Zero optical softening, no rounded
corners anywhere in the letterform.

Beneath the letter's baseline, aligned to its right edge, sits a small solid
square dot in green #00A650, sized to match the stem width exactly. It is the
only colour in the mark and it reads as a full stop.

Background flat #F6F6F4, edge to edge, no margin, no drawn corner radius.
Flat two-dimensional vector, absolutely no dimensionality. The discipline of
Wim Crouwel and Massimo Vignelli — modular, rational, cold, confident. Reads
correctly at 60 by 60 pixels. Monochrome-safe: the whole mark must still
work if the green dot is rendered in the same ink as the letter.

Negative: no gradients, no shadows, no glass, no bevel, no 3D, no outline,
no parking sign plate, no blue or red sign colours, no border, no frame,
no car, no road, no pin, no text, no tagline, no rounded container.
```

---

### PROMPT 3 — "Step Rate"

**Fikir:** Harf yok. Ürünün gerçek çekirdeği tarife merdiveni — fiyat kademe kademe atlıyor. Bu, hiçbir park uygulamasının sahip olmadığı bir soyutlama ve ürünün gerçek tezini taşıyor: *zaman değil, kademeler.*

```
Abstract vector logo mark for a parking app called ParkIQ. Four vertical bars
of identical width standing on a shared invisible baseline, ascending in
height from left to right in exact stepped increments — each bar precisely
one quarter taller than the one before it, producing a clean rising
staircase. The bars are separated by consistent narrow gaps equal to roughly
one third of a bar's width, so the negative space between them is as
deliberate as the bars themselves.

The first three bars are flat solid ink #141416. The fourth and tallest bar
is flat solid green #00A650 — the moment the price steps up. Every bar has
perfectly square corners, flat tops, no taper, no rounding.

The proportions are wide and grounded rather than tall and thin: the whole
group occupies a horizontal band across the optical centre, with generous
empty space above and below. Slight asymmetry — the gap before the green bar
is marginally wider than the others, giving the final step a beat of
hesitation before it lands.

Background flat #131315 dark charcoal, edge to edge, no margin, no drawn
corner radius, designed dark-mode first. Flat two-dimensional vector,
completely non-representational, no dimensionality whatsoever. The feeling
is a financial instrument or an audio meter, not a children's chart. Reads
instantly at 60 by 60 pixels.

Negative: no gradients, no shadows, no glow, no glass, no 3D, no rounded
bar tops, no outline stroke, no letters, no numbers, no axis lines, no grid
lines, no chart frame, no car, no road, no pin, no clock, no text, no
rounded container.
```

---

### PROMPT 4 — "Counter Void"

**Fikir:** Harf ve şekil birbirinin içinde. P'nin counter'ı boş bırakılmaz — oradan bir şey kesilir. Negatif alan hem harfi hem ikinci anlamı taşır. 2026'nın "negative space alleys resolving into monograms" yönü.

```
Vector logo mark for a parking app called ParkIQ. A heavy geometric uppercase
letter "P" rendered as a single solid flat shape in ink #141416 — no outline,
no stroke, one continuous filled silhouette. The letter is slightly condensed
with a tall stem and a compact bowl.

The defining move: the counter of the bowl is not a simple circle. A precise
circular void is punched out of the solid mass, and from the bottom of that
void a narrow vertical channel is cut straight down through the bowl and out
through the baseline — as if the letter has been pierced. The channel width
exactly matches the stem width. This single cut makes the negative space read
two ways at once: as the enclosed counter of a P, and as a keyhole or slot.
The cut is surgical and exact, never organic or hand-drawn.

Sitting inside the circular void, perfectly concentric and floating free of
all edges, is a small solid dot in green #00A650. It is the only colour in
the mark. The dot is small enough that a clear ring of background shows all
the way around it.

Background flat #F6F6F4, edge to edge, no margin, no drawn corner radius.
Flat two-dimensional vector, absolutely flat, no dimensionality. The
craftsmanship of a heritage logotype redrawn for screens — dense, deliberate,
slightly severe. Must remain legible at 60 by 60 pixels: the green dot may
become a single pixel of colour and the mark must still hold.

Negative: no gradients, no shadows, no glass, no bevel, no emboss, no 3D,
no outline stroke, no literal keyhole rendering, no keys, no locks, no car,
no road, no map pin teardrop, no text, no tagline, no border, no frame,
no rounded container.
```

---

### PROMPT 5 — "One Arc Filled"

**Fikir:** Ürün bir sayaç. Dairesel bir kadran, tek bir dolu yay — ve o yayın ucu noktaya dönüşüyor. Hareket-hazır: yay animasyonda dolabilir, bu 2026'nın "marks that behave rather than sit" yönüne birebir oturuyor.

```
Vector logo mark for a parking app called ParkIQ. A single thick circular
arc — an open ring, not a closed circle — drawn with uniform heavy weight
roughly one sixth of the overall diameter. The arc sweeps clockwise starting
from the twelve o'clock position and travels about three quarters of the way
around, stopping short so a clear open gap remains in the upper left. Both
ends of the arc are cut with flat square terminals, never rounded.

The first two thirds of the arc, measured from the start, are flat solid ink
#141416. The final third — the part approaching the gap — is flat solid green
#00A650, with a hard clean boundary between the two colours, no blending, no
fade, no gradient of any kind.

At the very tip of the green end, detached from the arc by a gap exactly
equal to the arc's own thickness, floats a solid circular dot in the same
green. The dot is the same diameter as the arc thickness, so it reads as the
arc's own terminal that has broken free and moved forward — a full stop, and
the moment the meter completes.

The ring sits at the optical centre with generous even breathing room on all
sides; it is not cropped and does not touch any edge. Background flat #131315
dark charcoal, edge to edge, no margin, no drawn corner radius, dark-mode
first. Flat two-dimensional vector, absolutely no dimensionality.

The mark should feel like a precision instrument dial — a Braun timer, a
Swiss gauge — not a loading spinner and not a pie chart. Reads at 60 by 60
pixels.

Negative: no gradients, no glow, no shadow, no glass, no 3D, no rounded arc
caps, no tick marks, no numerals, no clock hands, no needle, no percentage
text, no letters, no car, no road, no pin, no progress bar, no border,
no frame, no rounded container.
```

---

## 6. Nasıl değerlendirilir

Üretilen adaylar şu üç testten geçmeli:

1. **60×60 testi.** Ekran görüntüsünü 60 piksele küçült. Hâlâ tek bir şey mi okunuyor? İki şey okunuyorsa eleme.
2. **Marka kapatma testi** (CLAUDE.md AI slop kuralı). İşaretin yanına ParkIQ adını yazmadan birine göster: park/zaman/para çağrışımlarından biri geliyor mu, yoksa "herhangi bir SaaS logosu" mu?
3. **Tek renk testi.** Yeşili ink'e çevir. İşaret hâlâ ayakta mı? Değilse rengin taşıdığı yükü form taşımıyor demektir — Android monochrome ikonu bu yüzden zorunlu.

Kazanan yön seçildikten sonra `PARKIQ.` wordmark'ı **aynı harf çiziminden** türetilir (responsive kimlik sistemi: tam logo → yığılmış → ikon → monogram). Ayrı bir tipografiyle çizilmez.

⚠️ Bu prompt'lar **design.md'ye karşı üretildi**, kullanıcının paylaşacağı referans görsellere karşı değil — görseller geldiğinde yön seçimi ve oranlar yeniden kalibre edilmeli.
