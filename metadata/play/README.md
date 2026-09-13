# Google Play metadata

`twice-store:android` akışının girdileri. Basma:

```bash
export PLAY_KEY="D:/Twice/GooglePlayKey.json" PLAY_PKG="com.twiceapps.parkiq"
node ~/.claude/skills/twice-store/scripts/play-listings.mjs check metadata/play/listings.json
node ~/.claude/skills/twice-store/scripts/play-listings.mjs push  metadata/play/listings.json
node ~/.claude/skills/twice-store/scripts/play-iap.mjs push metadata/play/products.json metadata/play/prices.json
```

- `listings.json` — 18 dil. Play tam açıklamayı İNDEKSLER, o yüzden bunlar App Store
  metinlerinin çevirisi DEĞİL; her pazarın kendi arama terimleriyle yazıldı. Çekirdek terim
  tekrarı 8 rakibin açıklamasından ölçülen ortalamaya göre kalibre edildi
  (`aso-research.mjs play-density`): rakip ortalaması "parking" 5.0 · "car" 3.4.
  Ölçümdeki boşluk: rakiplerin hiçbiri "timer", "rate" ya da "cost" tekrarlamıyor —
  fiyat tarafı indekste boş, metinler oraya yaslanıyor.
- Metinler Android'in GERÇEKTE yaptığını anlatır: AR ve ana ekran widget'ı YOK, o yüzden
  hiçbir dilde geçmiyor. Kilit ekranındaki kalıcı park kartı var, o anlatılıyor.
- `products.json` + `prices.json` — lifetime ürünü. Fiyatlar App Store'da canlı olanlarla
  BİREBİR aynı: aynı ülkedeki sürücü iki mağazada aynı parayı ödemeli. Google'ın kendi
  çevirisi Apple'ınkinden yukarıda olduğu için TR/AU/CA/NZ elle eşitlendi (aso.md §6.4).
- Abonelikler (monthly/yearly) bu scriptlerde YOK: Play'in ayrı `monetization/subscriptions`
  ucunu istiyor. Ya Play Console'dan ya da ayrı bir çağrıyla kurulur.

## data-safety.csv

Play Console → Data safety → **Import**. Jigfall'ın dışa aktardığı şablondan üretildi
(`/tmp/ds.js` mantığı burada özetli), cevaplar KODDAN doğrulandı:

| Ne | Nereye | Neden o cevap |
|---|---|---|
| Tam koordinat | overpass-api.de | Otopark araması `around:<yarıçap>,<enlem>,<boylam>` gönderiyor. Üçüncü taraf olduğu için **Shared** işaretli — tek "paylaşılan" veri bu. |
| ~110 m hücre + tarife | api.twiceapps.co | Tarife havuzu. Kendi sunucumuz → **Collected**, shared değil. Rıza sorulmadan gitmiyor, o yüzden "kullanıcı seçebilir". |
| Kurulum kimliği, olaylar, satın alma, hata | Twice + RevenueCat | Hesap yok; kimlikler anonim. |

Reklam olmadığı için hiçbir satırda `PSL_ADVERTISING` yok — Jigfall'daki en büyük fark bu.
İçerikteki her satır iOS privacy manifest'iyle (`app.config.ts`) aynı hikâyeyi anlatmalı;
birini değiştirirsen diğerini de değiştir.
