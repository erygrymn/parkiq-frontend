# UGC reklamı — TikTok (28 sn)

Karakter tam kare 9:16 konuşur, **elleri boş**. App ekran kaydı sağ üstte yuvarlatılmış
dikey kart olarak biner (kadrajın ~%34'ü), 0:09'da girer 0:24'te çıkar.

## Karakter

33–40 yaş, **Caucasian, yerel ABD tiplemesi**. Bölge satış müdürü / bağımsız danışman:
günde 2–3 müşteri ziyareti, haftada 4–5 kez ücretli otopark. CEO değil — arabasını kendi
kullanan, faturayı kendi cebinden ödeyen biri. Tasarruf iddiası ancak TEKRAR EDEN bir
masrafta inandırıcı olur; tipleme bunun için seçildi.

| | |
|---|---|
| Kıyafet | Açık mavi oxford, kolları bir kat kıvrık, kravat yok. Ceket arka koltukta |
| Görünüm | Model değil. Hafif sakal, makyajsız, yorgun |
| Mekân | Park halinde arabanın sürücü koltuğu, kontak kapalı, gündüz |
| Kamera | Telefon cam/panel tutucusunda, hafif alttan açı. Ring light yok, gün ışığı |
| Ton | Heyecanlı DEĞİL. Başta hafif sinirli, sonra düz ve olgusal. Ünlem yok |
| Oyunculuk | İki doğal takılma bırakılsın, kesilmesin |

## Transkript

| Zaman | Replik | Yan panel |
|---|---|---|
| 0:00–0:04 | "Every garage does the same thing to you. You come back nine minutes late, and it costs you double." | — |
| 0:04–0:09 | "I park four, five times a week for client meetings. I was never checking. I'd come back whenever, and pay whatever." | — |
| 0:09–0:16 | "This counts down to the minute the price goes up. Not the time — the *price*. It just says: leave now, five dollars. Stay, it's ten." | Sayaç akar → çubuk amber → "Now $5 · Next $10" |
| 0:16–0:21 | "And it's on my lock screen. I'm not even opening the app, I just look." | Kilit ekranı + Live Activity |
| 0:21–0:26 | "Three days in, it had already paid for itself. Which is not a big claim. I just didn't pay ten bucks, once." | Kutlama: SAVED $5. |
| 0:26–0:28 | "ParkIQ. It's free to try." | İkon + wordmark |

## Neden son beat böyle

"Paid for itself" tek başına şişirilmiş bir iddia; TikTok izleyicisi anında eler. Arkasına
*"which is not a big claim"* koyunca hem küçülüyor hem doğrulanabiliyor: Pro aylık $4.99,
bir kez $5'lık dilim atlamamak zaten bir ayı karşılıyor. Rakam gerçekten tutuyor.

## Bağlayıcı sınırlar

- **Paywall GÖSTERİLMEZ.** Videoda geçen her özellik (sayaç, dilim uyarısı, Live Activity)
  ücretsiz katmanda. Apple 2.3.1 mağaza DIŞI pazarlamayı da kapsıyor.
- Para birimi USD; panel rakamları ($5 → $10) `assets/tariff-board-en.png` ve sahne
  tarifesiyle aynı.
- Veri akışı iddiası yok ("takip etmiyor", "cihazdan çıkmıyor" DENMEZ) — aso.md kuralı.
- design.md §3.3: ünlem yok, para rakamla konuşur.

## Yan paneldeki kayıt

**Ayarlar > Geliştirici > Screenshot sahneleri > UGC demo · kendi akar (28 sn)**.

Kendi kendine oynar, dokunuş beklemez — kayıt sırasında el kadraja girmesin diye. Döngüde:
keşif → park damgası → sayaç 0'dan 52 dakikaya koşar → amber → SAVED $5 → başa dön.

Zaman sıkıştırılıyor ama **matematik sıkıştırılmıyor**: her tik'te `startedAtMs` geriye
itiliyor, çubuk ve sayaç bunu gerçek geçmiş süre sanıp `tariffMath`'ten normal yoldan
geçiyor. Sahte bir ilerleme animasyonu çizmek design.md İlke 5'i kırardı.

Kilit ekranı karesi (0:16–0:21) bu reel'den ÇIKMAZ — Live Activity işletim sistemi yüzeyi,
gerçek cihazda ayrıca çekilmeli (bkz. README).
