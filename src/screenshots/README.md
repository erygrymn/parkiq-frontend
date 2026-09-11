# Ekran görüntüsü sahneleri

`__DEV__` içinde **Ayarlar > Geliştirici > Screenshot sahneleri**. Bir satıra dokun,
panel kapansın, kareyi arkadaki **gerçek** ekrandan al.

Sahte ekran yazılmadı, sahte **durum** yazıldı: `scenarios.ts` store'lara state basıyor,
kareyi çizen şey üretimdeki yüzeyin kendisi. İkinci bir "screenshot sürümü" komponent
yazmak, gerçek UI değiştiğinde sessizce eskiyen bir yalan üretirdi.

⚠️ Bu klasör **`screenshots` dalında yaşar ve `main`'e birleşmez.** CLAUDE.md: placeholder
veri shipping'e girmez.

## Sahneler (aso.md §4 kare numaraları)

| # | Sahne | Nerede çekilir |
|---|---|---|
| 1 | Aktif oturum · amber | Simülatör (dev build) |
| 3 | Kutlama · SAVED | Simülatör (dev build) |
| 4 | Tipografik kare | Simülatör — tam ekran poster, EN/TR toggle'ı altta |
| 5 | Arabamı Bul · kapalı alan | Simülatör (dev build) |
| 6 | Tarife · tarama sonucu | Simülatör — *panoya bakan kamera karesi değil, bkz. aşağısı* |
| 7 | Harita · şarj filtresi | Simülatör (dev build, Mapbox token gerekli) |

**Para birimi sahneyi sürer.** `scenarios.ts` tarifeyi Ayarlar'daki para biriminden kurar:
USD → 5/10/15/30, TRY → 50/100/150/300. EN seti USD'de, TR seti TRY'de çekilir; rakamlar
aso.md §4 altyazılarıyla ("Leave now $5. Stay and it's $10" / "Şimdi çık ₺50. Kalırsan ₺100")
birebir tutar.

## Panolar

`assets/tariff-board-en.png` ve `assets/tariff-board-tr.png` app'e GİRMİYOR — **fiziksel prop**.
Başka bir ekranda aç ya da yazdır, gerçek cihazın kamerasını ona doğrult. Rakamları yukarıdaki
mock tarifeyle aynı; biri değişirse öteki de değişmeli, yoksa set kendi içinde yalan söyler.

EN birincil mağaza dili (aso.md), o yüzden varsayılan pano `-en` olanı.

## App içinde ÜRETİLEMEYENLER

1. **Kare 2 — Kilit ekranı + Dynamic Island.** Live Activity işletim sistemi yüzeyi;
   simülatörde kilit ekranı kartı yok, Expo Go'da ActivityKit hiç yok. Gerçek cihaz +
   dev build, oturum başlat, telefonu kilitle, cihazın kendi ekran görüntüsünü al.
   Dynamic Island için 14 Pro ve üstü şart.
2. **Kare 6'nın gerçek hali — kameranın panoya bakışı.** Kamera önizlemesi canlı bir akış;
   simülatörde kamera yok, mock'lanamaz. Gerçek cihazda pano görselini ekrana/kâğıda koy
   ve tara. Sahnedeki 6 yalnız taramanın SONUCUNU (forma dökülmüş dilimler) veriyor — o da
   işe yarar bir kare ama altyazı "Point the camera" ise cihaz gerekiyor.
3. **AR karesi (aso.md'de 8. kare, opsiyonel).** ARKit simülatörde çalışmaz.
4. **Harita**, dev build ister (Mapbox native). Expo Go'da boş çıkar; `EXPO_PUBLIC_MAPBOX_TOKEN`
   dolu olmalı.

## Not

Kare 1 ve 3'ün amber/kutlama anları `Date.now()`'a göre kuruluyor: sahneyi seçtikten sonra
bekleme, sayaç akıyor. Amber penceresi ~8 dakika.
