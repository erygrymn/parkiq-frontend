# ParkIQ — ASO & Organik Büyüme Planı

> Kaynak veri: 259 park uygulaması (SensorTower gerçek gelir), 2.188 yorum (8 bölge), 8 mağazada anahtar kelime duvarı ölçümü, Apple arama önerileri. Ölçüm tarihi 2026-08-15.
> Kardeş dokümanlar: [CLAUDE.md](../CLAUDE.md) · [design.md](design.md) · [screens.md](screens.md)
> Bu dosya **mağaza tarafının tek kaynağı**. Metadata değişikliği burada kararlaştırılır, sonra App Store Connect'e girilir.

---

## 0. Tek cümlelik strateji

**"Find my car" uygulaması olarak girme — "parking timer" olarak gir.**

"Find my car" terimi 15 yıllık, 5–12 bin oylu uygulamalarla dolu (US duvarı KD 74). "Parking timer" terimi **her İngilizce mağazada pratikte boş** — ilk üç sıradaki uygulamaların 0–7 oyu var. Ve daha değerli soruyu cevaplıyor: para.

---

## 1. Anahtar kelime haritası (ölçülmüş duvar yükseklikleri)

KD = ilk 3 sıradaki uygulamaların ortalama oy sayısının logaritmik ölçeği. 0 = boş, 100 = imkânsız.

### 1.1 Hedeflenecekler 🟢

| Pazar | Terim | KD | İlk 3'teki duvar |
|---|---|---|---|
| **IE** | parking timer | **0** | 0 / 0 / 0 oy |
| **NZ** | parking timer | **0** | 0 / 0 / 0 oy |
| **AU** | parking timer | **2** | 0 / 1 / 0 oy |
| **CA** | parking timer | **2** | 0 / 1 / 0 oy |
| **DE** | parkzeit erinnerung | **4** | 2 / 0 / 0 oy |
| **GB** | parking timer | **4** | 0 / 1 / 1 oy |
| **DE** | parkuhr erinnerung | **12** | 0 / 11 / 0 oy |
| **TR** | park süresi | **11** | 7 / 0 / 2 oy |
| **US** | parking timer | **13** | 3 / 3 / 7 oy |
| **TR** | park hatırlatıcı | **19** | 27 / 1 / 2 oy |
| **IE** | where did i park | **20** | 36 / 0 / 0 oy |
| **TR** | otopark bul | **23** | 7 / 47 / 1 oy |
| **TR** | araba nerede | **24** | 56 / 1 / 0 oy |
| **IE** | find my car | **28** | 52 / 52 / 3 oy |
| **NZ** | find my car | **29** | 48 / 13 / 56 oy |
| **TR** | arabam nerede | **30** | 75 / 56 / 8 oy |
| **TR** | park yeri | **30** | 70 / 0 / 56 oy |

### 1.2 Orta vadede saldırılacaklar 🟡🟠

| Pazar | Terim | KD | Not |
|---|---|---|---|
| CA | where did i park | 38 | Lider 348 oy — 6 ayda alınır |
| AU | where did i park / parking reminder | 47 | Find My Parked Car 1.213 oy |
| GB | where did i park | 48 | Lider 1.364 oy |
| CA / AU / GB | find my car | 53–58 | 12–18 ay |
| DE | mein auto finden | 53 | Lider 318 oy — düşük duvar |
| DE | auto finden | 53 | Lider 1.927 oy |
| DE | wo ist mein auto | 58 | Lider 1.927 oy |

### 1.3 Asla hedeflenmeyecekler 🔴

| Terim | KD | Sebep |
|---|---|---|
| car finder (US) | 100 | **CarGurus / Cars.com / Autotrader** — ikinci el araba pazarı kaçırmış terimi |
| find car (US) | 100 | Aynı |
| parking app / parking meter app / find parking near me (US) | 100 | ParkMobile (1.3M oy), SpotHero (407k) |
| parking cost / parking price / parking rate / parking fee tracker | 88–94 | ParkWhiz + Parking.com + SpotHero üçlüsü |
| avoid parking ticket / parking expiry / street parking reminder | 88–98 | Aynı üçlü |
| parked car (US) | 96 | **Parking Jam 3D** (478k oy) — oyunlar terimi yemiş |
| parkplatz merken (DE) | 92 | PayByPhone + EasyPark |
| otopark (TR) | 41 | Sonuçlar oyunlarla dolu — trafik var, niyet yok |

> ⚠️ **Kritik ayrım:** Para/tasarruf terimleri anahtar kelime olarak **ölü** (hepsi 🔴). Ama para hikâyesi pazarın en çok istediği şey. Yani: **para dili anahtar kelime değil, dönüşüm kopyasıdır.** Anahtar kelime "parking timer" ile alınır, satış "iki park aşımı kadar" ile yapılır.

---

## 2. Metadata paketi (karakter sayıları doğrulandı)

Apple'ın **indekslediği** alanlar: uygulama adı (30) · alt başlık (30) · anahtar kelime alanı (100) · IAP görünen adları (30 her biri) · In-App Event başlığı (30) + kısa açıklaması (50) · geliştirici adı · kategoriler.
Apple'ın **indekslemediği** alanlar: uzun açıklama (4.000) · promosyon metni (170) · önizleme videosu. Bunlar yalnız dönüşüm için.

**Konumlandırma ağırlığı (bağlayıcı):** sayaç/maliyet ağır · araba bulma ikincil · **reklamsızlık öne çıkar** · diğer özellikler kısaca · **AR hiçbir yerde geçmez** (yazılmadı — [screens.md](screens.md) §7b tüm kutular işaretsiz).

### 2.1 en-US / en-CA

```
Name      (28/30)  ParkIQ: Parking Timer & Cost
Subtitle  (30/30)  Find my car. No ads, no login.
Keywords  (97/100) where,did,park,parked,meter,spot,reminder,alarm,garage,lot,street,ticket,fee,location,floor,photo
```

Neden bu üçlü: `parking`+`timer`+`cost` en ağır alandan (ad), `find`+`my`+`car`+`ads`+`login` alt başlıktan, `where`+`did`+`park`+`meter` anahtar alandan. Apple üç alanı birleştirip kombinasyon üretir — "where did i park", "parking spot reminder", "parking meter alarm", "find my parked car", "parking timer no ads" sorgularının hepsi ayrıca yazılmadan kapsanır. Ada/alt başlığa giren kelime anahtar alanda **tekrar edilmez** (boşa karakter).

`no ads` alt başlıkta çünkü **arama talebi ölçüldü**: "parking timer - no ads" US/GB/AU/NZ mağazalarında Apple'ın kendi arama önerilerinde çıkıyor. Yani reklamsızlık hem dönüşüm argümanı hem arama terimi. Ayrıca rakip Find My Car'ın şikayetlerinin **%15'i reklam** — bu satır doğrudan onların kullanıcısını alıyor.

`no login` ikinci farklılaştırıcı: rakiplerde kredi kartı/hesap zorunluluğu şikayetleri yaygın ([market-research.md](market-research.md) §4.7).

⛔ **`tracker` / `locator` / `gps tracker` / `vehicle tracker` kelimeleri hiçbir dilde kullanılmayacak.** Bu kelimeler canlı araç takibi (çalınan araba, çocuğun kullandığı araç) bekleyen kullanıcıyı çekiyor; ParkIQ o işi yapmadığı için o kullanıcı 1★ bırakıyor. Kanıt ve alıntılar [market-research.md](market-research.md) §4.3'te. Aynı sebeple açıklamanın ilk ekranı ParkIQ'nun canlı takip **olmadığını** ima etmeli (park kaydı, iz sürme değil).

⛔ **`tracker` / `locator` / `gps tracker` / `vehicle tracker` kelimeleri hiçbir dilde kullanılmayacak.** Bu kelimeler canlı araç takibi (çalınan araba, çocuğun kullandığı araç) bekleyen kullanıcıyı çekiyor; ParkIQ o işi yapmadığı için o kullanıcı 1★ bırakıyor. Rakiplerin 1★ yorumlarının önemli bir kısmı doğrudan bu beklenti uyuşmazlığı — kanıt ve alıntılar [market-research.md](market-research.md) §4.3'te. Aynı sebeple açıklamanın ilk ekranı ParkIQ'nun canlı takip **olmadığını** ima etmeli (park kaydı, iz sürme değil).

### 2.2 en-GB / en-AU / en-IE / en-NZ

```
Name      (28/30)  ParkIQ: Parking Timer & Cost
Subtitle  (30/30)  Find my car. No ads, no login.
Keywords  (98/100) where,did,park,parked,meter,car park,spot,reminder,alarm,multi storey,street,fine,ticket,fee,floor
```

Fark: `garage`/`lot` yerine **`car park`** ve **`multi storey`** (İngiliz/Avustralya kullanımı), `ticket` yanına **`fine`** (UK'de ceza "fine"). Bu tek değişiklik GB/AU/IE/NZ'de US metniyle kaçırılan trafiği alır.

### 2.3 tr

```
Name      (27/30)  ParkIQ: Park Süresi & Ücret
Subtitle  (25/30)  Arabam nerede. Reklamsız.
Keywords  (99/100) otopark,yeri,bul,bulucu,araç,araba,konum,kaydet,hatırlatıcı,alarm,sayaç,tarife,fiyat,kapalı,kat,not
```

TR'de de sayaç öne alındı (`park süresi` KD 11 — TR'nin en boş terimi), `arabam nerede` (KD 30) alt başlığa indi. `otopark` ada değil anahtar alana konuldu çünkü TR'de o terimin sonuçları oyunlarla dolu — indekste bulunsun ama ada girip niyeti bulandırmasın.

### 2.4 On dil + varyantları

23 mağazada Apple'ın arama önerileri toplandı, ardından her dilde duvar yüksekliği ölçüldü. **Bulgu her dilde aynı çıktı:** "arabamı bul" terimi dolu ve pahalı, "park sayacı / hatırlatıcı" terimi boş.

| Dil | "Arabamı bul" terimi | KD | "Sayaç/hatırlatıcı" terimi | KD |
|---|---|---|---|---|
| 🇩🇪 de | wo ist mein auto | 🟠 58 | **parkzeit erinnerung** | 🟢 **4** |
| 🇫🇷 fr | trouver ma voiture | 🟠 58 | **minuteur stationnement** | 🟢 **4** |
| 🇪🇸 es | buscar mi coche | 🟠 48 | **parquímetro recordatorio** | 🟢 **0** |
| 🇲🇽 es-MX | encontrar mi carro | 🟡 25 | **dónde estacioné** | 🟢 **0** |
| 🇮🇹 it | trova la mia auto | 🟠 54 | **timer parcheggio** | 🟢 **0** |
| 🇳🇱 nl | *waar staat mijn auto* | 🟢 **0** | **parkeertimer** | 🟢 **0** |
| 🇧🇷 pt-BR | encontrar meu carro | 🟢 14 | **temporizador estacionamento** | 🟢 **7** |
| 🇵🇹 pt-PT | encontrar o meu carro | 🟡 33 | **lembrete estacionamento** | 🟢 **0** |
| 🇯🇵 ja | 駐車位置 | 🟡 28 | **駐車 タイマー** | 🟢 **4** |
| 🇰🇷 ko | 내 차 찾기 | 🟢 12 | **주차 타이머** | 🟢 **2** |
| 🇹🇼 zh-Hant | 找到我的車 | 🟠 50 | **停車位置記錄** | 🟢 **0** |
| 🇸🇪 sv | hitta min bil | 🟡 30 | **parkeringstimer** | 🟢 **7** |

**Hollanda tek başına anomali:** *"waar staat mijn auto"* hem gerçek bir arama önerisi hem KD 0 — ilk üç sonucun sıfır oyu var. Avrupa'nın en pahalı park ücretlerine sahip ülkelerinden birinde araba-bulma terimi tamamen boş.

**Yerel sinyaller (çeviriyle bulunamaz, ölçümle bulundu):**
- 🇫🇷 `minuteur` (kronometre) Fransızca aramalarda gerçek bir terim — *"où est ma voiture ? minuteur"* Apple'ın önerisi.
- 🇰🇷 `광고 없음` (reklamsız) Kore'de aranan bir terim — *"주차 타이머 - 광고 없음"* öneri listesinde. Reklamsızlık orada doğrudan arama trafiği.
- 🇧🇷 `zona azul` Brezilya'nın ücretli sokak park sistemi — tarife mantığımızın birebir karşılığı, anahtar alanda.
- 🇯🇵 `駐車位置` (park konumu) Japonya'da başlı başına bir uygulama kategorisi — `駐車位置メモ`, `とめTime`, `TomeLog` hepsi bu terimde.
- 🇮🇹 `strisce blu` İtalya'nın mavi çizgili ücretli park alanları.
- 🇸🇪 `p-skiva` İsveç park diski.

#### Tam metadata

| Locale | Ad | Alt başlık |
|---|---|---|
| de-DE | `ParkIQ: Parkzeit & Kosten` | `Auto finden. Ohne Werbung.` |
| fr-FR | `ParkIQ: Minuteur & Tarif` | `Trouver ma voiture. Sans pub.` |
| fr-CA | `ParkIQ: Minuteur Stationnement` | `Trouver mon auto. Sans pub.` |
| es-ES | `ParkIQ: Temporizador Parking` | `Dónde aparqué. Sin anuncios.` |
| es-MX | `ParkIQ: Parquímetro y Costo` | `Dónde estacioné. Sin anuncios` |
| it | `ParkIQ: Timer Parcheggio` | `Trova la mia auto. Senza pub.` |
| nl-NL | `ParkIQ: Parkeertimer & Kosten` | `Auto vinden. Geen reclame.` |
| pt-BR | `ParkIQ: Timer de Estacionar` | `Onde estacionei. Sem anúncios` |
| pt-PT | `ParkIQ: Temporizador Parque` | `Onde estacionei. Sem anúncios` |
| ja | `ParkIQ: 駐車タイマーと料金` | `車はどこ。広告なし・登録なし` |
| ko | `ParkIQ: 주차 타이머와 요금` | `내 차 찾기. 광고 없음.` |
| zh-Hant | `ParkIQ: 停車計時與費用` | `我的車在哪。無廣告免註冊` |
| sv | `ParkIQ: Parkeringstimer` | `Hitta min bil. Utan reklam.` |

Anahtar kelime alanları, açıklamalar ve promosyon metinleri kanonik dosyalarda: **`metadata/app-info/<locale>.json`** ve **`metadata/version/1.0/<locale>.json`**. Hepsi App Store Connect'e aktarıldı (§7.1).

Her dilde aynı ağırlık korundu: sayaç/maliyet ağır · araba bulma ikincil · reklamsızlık öne çıkan · AR yok. Her açıklamada aynı ayırt edici cümle yerel haliyle geçiyor: *"Çoğu park uygulaması nerede olduğunu söyler. Bu, ne zaman çıkacağını söyler."*

#### Dışarıda bırakılanlar

| Dil | Sebep |
|---|---|
| 🇷🇺 Rusça | Terim boş (`напоминание парковка` KD 2) ama **Apple Rusya'da ödemeleri askıya aldı** — para kazanılamaz. |
| 🇨🇳 zh-Hans | Çin App Store'u ICP lisansı istiyor; uygulama orada dağıtılmıyor. Mapbox/OSM de ayrı sorun. **zh-Hant (Tayvan/Hong Kong) yeterli.** |
| 🇸🇦 Arapça | Arama önerisi **sıfır** — hiçbir talep sinyali yok. |
| 🇮🇩🇹🇭🇻🇳 | Sonuçlar oyunlarla dolu, yardımcı program talebi yok, LTV düşük. |
| 🇵🇱 Lehçe | Terim uygun (`przypomnienie parkowania` KD 0) ama İsveççe'ye göre LTV düşük. **11. sıradaki aday** — İsveççe tutmazsa buraya geç. |
| 🇩🇰🇳🇴🇫🇮 | Öneriler tamamen belediye ödeme uygulamaları; yardımcı program niyeti zayıf. |
| 🇮🇳 Hindistan | Aramalar zaten İngilizce → en-US listesi hizmet ediyor. Ayrı locale gereksiz. |

⚠️ **Almanya'da "Parkscheibe" iddiasında BULUNMA.** Elektronik park diski Almanya'da yalnız **tip onaylı (Typengenehmigung) donanım** olarak geçerli; telefon uygulaması yasal ikame değil. Metadata'da kullanmak hem yanıltıcı hem reddedilme riski. `parkuhr` ve `parkzeit` güvenli — o yüzden ad `Parkzeit & Kosten`.

🔴 **Açık risk — uygulama i18n'i mağaza i18n'ini takip etmeli.** Şu an mağaza 18 dilde, uygulama 2 dilde (EN + TR). Bir Alman kullanıcı Almanca listeden indirip İngilizce uygulama açarsa, bu tam olarak [market-research.md](market-research.md) §4.3'teki **beklenti uyuşmazlığı** tuzağıdır ve 1★ ile sonuçlanır. Uygulama henüz yayında olmadığı için zaman var: **lansmandan önce bu 10 dilin i18n dosyaları eklenmeli.** RN/Expo tarafında bu mimari iş değil, çeviri dosyası işi. Eklenemeyecekse ilgili locale'ler yayından önce silinmeli.

⚠️ **Çeviriler ana dil kontrolünden geçmedi.** Terim seçimleri ölçüme dayanıyor (arama önerileri + duvar yüksekliği) ama pazarlama metninin akıcılığı için ja/ko/zh-Hant/sv/nl'de en azından bir ana dil konuşanına okutulması önerilir.

### 2.5 Kimsenin kullanmadığı bedava indeksli alanlar

Bunlar App Store Connect'te ayrı ayrı doldurulur ve **arama sıralamasına girer**. Rakiplerin hiçbiri kullanmıyor.

| Alan | Limit | ParkIQ değeri | Uzunluk |
|---|---|---|---|
| IAP adı — aylık | 30 | `Pro Monthly - Scan & Compass` | 28 |
| IAP adı — yıllık | 30 | `Pro Yearly - Scan & Compass` | 27 |
| IAP adı — lifetime | 30 | `Pro Lifetime - Scan & Compass` | 29 |
| IAP açıklaması (üçü de aynı) | 45 | `Board scan, compass, auto-detect, filters` | 41 |
| In-App Event başlığı | 30 | `Parking Cost Week` | 17 |
| In-App Event kısa açıklama | 50 | `See what parking really costs you this week` | 43 |

**Dürüstlük kuralı:** Üç IAP de **aynı** `pro` entitlement'ını açıyor. Bu yüzden adları özellik adıyla ayrıştırılmaz (kullanıcı "Pro Monthly — Auto-Detect" görüp yalnız oto-algılama aldığını sanabilir; Apple bunu yanıltıcı sayar). Üçü de aynı özellik ifadesini taşır, yalnız süre değişir.

⛔ IAP adına **`AR` yazılmaz** — AR yazılmadı.

Bu üç IAP adı = **84 ekstra indekslenen karakter**, tamamen ücretsiz. `scan` ve `compass` gibi ana alana sığmayan terimler buraya taşınır. Rakiplerin hiçbiri bu alanı kullanmıyor.

### 2.6 Free / Pro sınırı — kaynak koddur, doküman değil

⚠️ **Bu tablo [CLAUDE.md](../CLAUDE.md)'den değil koddan çıkarıldı.** CLAUDE.md tarife taramasının "herkese ücretsiz" olduğunu yazıyor; **kod aksini söylüyor** ve mağaza metni kodu takip eder.

| Özellik | Durum | Kod kanıtı |
|---|---|---|
| **Tarife panosu tarama** | 🔒 **Pro** | [sessionStore.ts:401](src/state/sessionStore.ts:401) — `if (!isPremium) set({ ocrState: 'locked' })` |
| **Otopark filtreleme** | 🔒 Pro | [SessionSheets.tsx:115](src/sheets/SessionSheets.tsx:115) |
| **Arabamı Bul (pusula)** | 🔒 Pro | [SessionSheets.tsx:647](src/sheets/SessionSheets.tsx:647) |
| **Oto-algılama** | 🔒 Pro | [SettingsSheet.tsx:202](src/sheets/SettingsSheet.tsx:202) |
| Sınırsız geçmiş + istatistik | ✅ Free | [HistorySheet.tsx:197](src/sheets/HistorySheet.tsx:197) yalnız **davet satırı**, kilit değil |
| Live Activity / Dynamic Island / widget | ✅ Free | [SessionSheets.tsx:548](src/sheets/SessionSheets.tsx:548) — §4.10 gereği premium kontrolü yok |
| Sayaç, dilim uyarıları, foto/kat/not, konum paylaşımı, harita | ✅ Free | premium gate'i yok |

🔴 **Neden bu kritik:** açıklamanın "FREE, WITH NO CATCH" başlığı altında paywall arkasındaki bir özelliği saymak hem **App Store 2.3.1 metadata tutarsızlığı** hem de bu kategorinin kanıtlanmış en sert 1★ tetiği ([market-research.md](market-research.md) §4.3). ParkIQ'nun tüm konumlandırması "dürüst, sürprizsiz" olduğu için hasar orantısız olurdu. Düzeltildi: tarama artık PRO bloğunda, 18 locale'in hepsinde.

**Kural:** Free/Pro sınırı değişirse **önce kod, sonra bu tablo, sonra 18 locale açıklaması** güncellenir. Sıra tersine dönemez.

---

## 3. Açıklama (dönüşüm — sıralamaya girmez)

İlk 3 satır kritik: App Store "daha fazla" düğmesinden önce yalnız o kadarını gösterir.

### 3.1 en-US

```
You parked at 14:02. The rate goes up at 15:00.
ParkIQ tells you: leave now and pay $5, or stay and pay $10.

No ads. No account. No sign-up. No tracking.

THE PARKING TIMER
Set the rate once, or point the camera at the price board and
ParkIQ reads it. From then on it counts down to the moment
parking gets more expensive, and warns you before you cross it.

The countdown sits on your Lock Screen and in the Dynamic
Island, so you check it without opening anything. Widgets too.

When you end the session ParkIQ shows what you paid and what
you avoided. Every month it adds that up for you.

Most parking apps tell you where. This one tells you when.

FIND YOUR CAR
One tap saves the spot. Add a photo, the floor number, a note
for the levels that all look identical. When you come back,
a compass points the way. Underground, where GPS gives up,
ParkIQ shows the photo and floor instead of pretending.

Send someone a link and they can find your car too.

ALSO IN THE APP
Nearby car parks and EV chargers on the map. Full history of
every spot you have used. Monthly stats. Light and dark.
English and Turkish.

FREE, WITH NO CATCH
Unlimited parking records. The timer and every price alert.
Live Activity, Dynamic Island, widgets. Photo, floor, notes.
Your car on the map. Location sharing. Full history and stats.
Nearby car parks and EV chargers on the map.

PRO ADDS
Reading the price board with the camera. Compass walk-back to
your car. Automatic saving when your car's Bluetooth
disconnects. Car park filters for EV charging, covered parking
and distance.

ParkIQ is not a tracker. It does not follow your car around.
It remembers where you left it and what it is costing you.

PRIVACY
No account. No login. Nothing about you is stored on our servers.
Your sessions, photos and saved spots live on your iPhone.
Reading the price board runs on the device — that photo never
leaves it.
A shared location travels inside the link itself, so our server
never sees it.
Showing nearby car parks means asking a map service where to look.

No ads. Ever.
```

**Neden bu gizlilik metni bu kadar kısaldı:** önceki hali (`No server`, `Nothing leaves your phone`, `we have no database`) bir proxy ile 30 saniyede çürütülebiliyordu. Kodda **dört canlı ağ kanalı** var:

| Kanal | Ne gidiyor | Kod |
|---|---|---|
| **Overpass API** | Kullanıcının koordinatı sorgunun içinde (`around:r,lat,lon`) | [parkingPoi.ts:6](src/lib/parkingPoi.ts:6) |
| **Mapbox** | Harita viewport'u (kabaca konum) | [config.ts:13](src/config.ts:13) |
| **Twice** | Olaylar + SDK oturumu + kalıcı cihaz tanımlayıcısı | [analytics.ts:22](src/lib/analytics.ts:22) |
| **RevenueCat** | Satın alma + anonim kullanıcı kimliği | [purchases.ts](src/lib/purchases.ts) |

Doğru kalan iddialar: oturum/foto/konum cihazda ([db/](src/db/) SQLite), OCR cihaz üstünde (Apple Vision), paylaşım linki **hash parçasında** taşınıyor ve sunucuya gitmiyor ([share.ts:66](src/lib/share.ts:66) — `/s#${payload}`).

🔴 **App Privacy beyanı (`asc` ile yapılamaz, ASC web arayüzünden girilecek):** "Data Not Collected" **işaretlenmeyecek** — Twice'ın kalıcı tanımlayıcısı ve RevenueCat ile yanlış beyan olur. Girilecekler:

| Veri türü | Sebep | Kimliğe bağlı mı |
|---|---|---|
| Identifiers → Device ID | Twice SDK oturum takibi | Evet (Analytics) |
| Identifiers → User ID | RevenueCat anonim ID | Evet (App Functionality) |
| Purchases → Purchase History | RevenueCat | Evet (App Functionality) |
| Usage Data → Product Interaction | Twice olay bütçesi | Evet (Analytics) |
| Location → Coarse Location | Overpass + Mapbox POI sorgusu | Hayır (App Functionality) |
| Diagnostics → Crash/Performance | Twice tipli hata olayları | Hayır (Analytics) |

Foto, park oturumu ve kayıtlı konum **beyan edilmez** — cihazdan çıkmıyorlar.

### 3.2 tr

```
14:02'de park ettin. Tarife 15:00'te bir üst dilime geçiyor.
ParkIQ söylüyor: şimdi çık ₺50, kalırsan ₺100.

Reklam yok. Hesap yok. Kayıt yok. Takip yok.

PARK SAYACI
Tarifeyi bir kez gir ya da kamerayı panoya tut, ParkIQ okusun.
O andan sonra park ücretinin artacağı ana kadar geri sayar ve
sen o dilimi geçmeden önce uyarır.

Geri sayım kilit ekranında ve Dynamic Island'da durur; kontrol
etmek için hiçbir şey açman gerekmez. Widget'lar da var.

Oturumu bitirince ne ödediğini ve neyden kaçındığını gösterir.
Her ay bunları toplar.

Park uygulamalarının çoğu nerede olduğunu söyler.
Bu, ne zaman çıkman gerektiğini söyler.

ARABANI BUL
Tek dokunuşla yer kaydedilir. Foto ekle, kat numarasını yaz,
birbirinin aynısı katlar için not bırak. Dönerken pusula yönü
gösterir. GPS'in pes ettiği kapalı otoparkta ParkIQ numara
yapmaz — fotoğrafı ve kat notunu önüne koyar.

Link gönder, başkası da arabanı bulsun.

UYGULAMADA AYRICA
Yakındaki otoparklar ve şarj istasyonları haritada. Park
ettiğin her yerin geçmişi. Aylık istatistik. Açık ve koyu tema.
Türkçe ve İngilizce.

ÜCRETSİZ, KOŞULSUZ
Sınırsız park kaydı. Sayaç ve tüm dilim uyarıları. Live
Activity, Dynamic Island, widget'lar. Foto, kat, not. Arabanın
haritada pini. Konum paylaşımı. Sınırsız geçmiş ve istatistik.
Yakındaki otoparklar ve şarj istasyonları.

PRO'DA OLAN
Tarife panosunu kamerayla okuma. Arabaya pusulayla dönüş.
Aracın Bluetooth'u kesilince otomatik kayıt. Otopark
filtresi — şarj, kapalı, mesafe.

ParkIQ bir takip uygulaması değil. Arabanın peşinden gitmez.
Nereye bıraktığını ve sana kaça mal olduğunu hatırlar.

GİZLİLİK
Hesap yok. Giriş yok. Sunucularımızda sana dair hiçbir şey
saklanmıyor.
Oturumların, fotoğrafların ve kayıtlı yerlerin telefonunda
durur.
Pano okuma cihaz üstünde çalışır; o fotoğraf telefondan çıkmaz.
Paylaşılan konum linkin kendi içinde taşınır, sunucumuz onu
görmez.
Yakındaki otoparkları göstermek için harita servisine nereye
bakacağını sormak gerekir.

Reklam yok. Hiç.
```

### 3.3 Promosyon metni (170) — build gerektirmeden değişir

```
en-US (168): Parking rates went up in most cities this year. Set your rate once and ParkIQ warns you on the Lock Screen before it gets more expensive. No ads, no account.
tr    (166): Bu yıl şehirlerin çoğunda park ücretleri arttı. Tarifeni bir kez gir, ParkIQ pahalanmadan önce kilit ekranından uyarsın. Reklam yok, hesap yok.
```

Ayda bir değiştirilir — Apple güncellik sinyali olarak okuyor ve build gerektirmiyor.

### 3.4 What's New (ilk sürüm)

```
en-US: First release. Set your parking rate, get warned before it
       goes up, and find your car when you come back.
       No ads, no account, nothing leaves your phone.

tr:    İlk sürüm. Tarifeni gir, ücret artmadan önce uyarıl,
       dönerken arabanı bul.
       Reklam yok, hesap yok, hiçbir veri telefonundan çıkmıyor.
```

Bunu ayda bir değiştir — Apple güncellik sinyali olarak okuyor ve build gerektirmiyor.

---

## 4. Ekran görüntüleri

Apple Haziran 2025'te ekran görüntüsü altyazılarını OCR ile indekslemeye başladığı **iddia edildi** — ancak bağımsız test (ConsultMyApp, 8 uygulamada 64 ifade) bunu doğrulamadı, 64 ifadeden yalnız 1'i açıklanamaz şekilde sıralandı. **Karar: altyazıları insan için yaz, anahtar kelime için değil.** Sıralama faydası çıkarsa bonus.

İlk 2 kare her şeydir — kullanıcıların çoğu kaydırmaz.

Sıra, §2'deki ağırlığı takip eder: **1–2–3 sayaç ve para, 4 reklamsızlık, 5 araba bulma, 6–7 gerisi.**

| # | Kare | Altyazı (en-US) | Altyazı (tr) |
|---|---|---|---|
| 1 | Aktif oturum: tarife çubuğu amber, para kutusu görünür | **Leave now $5. Stay and it's $10.** | **Şimdi çık ₺50. Kalırsan ₺100.** |
| 2 | Kilit ekranı + Dynamic Island geri sayım | The countdown, without opening the app | Geri sayım, uygulamayı açmadan |
| 3 | Bitiş kutlaması "SAVED $5." + aylık toplam | $34 saved this month | Bu ay ₺340 tasarruf |
| 4 | Sade tipografik kare (ürün ekranı değil) | **No ads. No account. Nothing leaves your phone.** | **Reklam yok. Hesap yok. Veri telefondan çıkmıyor.** |
| 5 | Find My Car — kapalı alan kartı (foto + kat) | Level 3, blue pillar — even with no GPS | Kat 3, mavi kolon — GPS olmasa da |
| 6 | Tarife panosu okuma | Point the camera. Runs on device. | Kamerayı tut. Cihazda çalışır. |
| 7 | Harita — otopark + ⚡ | Car parks and EV chargers nearby | Yakındaki otoparklar ve şarj |

4. kare kasıtlı olarak ürün ekranı değil: bu pazarda reklam ve hesap zorunluluğu en sık şikayet ([market-research.md](market-research.md) §4.6–4.7), ve rakiplerin hiçbirinin ekran görüntülerinde böyle bir iddia yok.

**AR karesi yok** — AR yazılmadı. Yazıldığında 5. karenin yerine değil, 8. kare olarak eklenir.

**Kural:** 1. kare rakam içermeli. Bu pazardaki tüm rakiplerin 1. karesi haritada bir araba pini — birbirinin aynısı. Rakam farklılaştırıcı.

**Yasak** (design.md AI slop listesi): mor-mavi gradyan, emoji ikon, ünlem işareti, "Unlock/Seamless/Effortless" tipi dolgu.

---

## 5. Kategori seçimi

| Seçenek | Değerlendirme |
|---|---|
| **Navigation (birincil)** | ✅ Rakiplerin çoğu burada; "parking timer" arayan buraya bakıyor. Kategori listesinde ilk 200'e girmek zor değil (niş küçük). |
| **Travel (ikincil)** | ✅ Park ödeme uygulamaları burada; ikinci kategori bedava indeksli alan. |
| Utilities | ❌ Çok kalabalık ve alakasız trafik. |

**Karar: Birincil Navigation, ikincil Travel.**

---

## 6. Gelir modeli — $2.000/ay nasıl olur

### 6.1 Hedefin gerçek karşılığı

$2.000 cebe girmesi için:
- Apple Small Business Program %15 kesinti (yıllık $1M altı) → **$2.353 brüt**
- İade oranı ~%4 (yıllık planlarda benchmark) → **$2.451 brüt işlem**

### 6.2 Mevcut fiyatlar yetersiz

| Ürün | Şu anki | Pazar medyanı (Kuzey Amerika, utility) | Değerlendirme |
|---|---|---|---|
| Aylık | $2.99 | ~$8–10 | Çok düşük |
| **Yıllık** | **$14.99** | **~$45–55** | **~3× düşük** |
| Lifetime | $39.99 | — | Yıllığa göre orantısız yüksek |

Yıllık, aylığın 5 katı — pazar medyanı 3 kat. Yani ParkIQ yıllığı fazla ucuza veriyor ve aylıktan da para kazanamıyor.

**Kanıt noktası:** ParkUsher aylık **$10k** kazanıyor, 20k indirme/ay, yalnız 3 şehir, **$30/yıl**. Ve yorumları fiyatı savunuyor: *"I rather pay $30 a year for ParkUsher than close to 1000 for parking tickets."* Fiyat, tasarruf rakamla anlatıldığında savunulabiliyor.

### 6.3 Önerilen fiyat merdiveni

| Ürün | Öneri | Çerçeve |
|---|---|---|
| Aylık | **$4.99** | Denemek isteyen için, öne çıkarılmaz |
| Yıllık | **$24.99** | "Ayda $2 — tek park aşımından az" |
| **Lifetime** | **$29.99** | ⭐ **Öne çıkan.** "Bir kez öde. İki park aşımı kadar." |

Lifetime'ı yıllığın hemen üstüne koy ve **varsayılan seçili yap.** Gerekçe üç kat:
1. Bu nişin yorumları abonelikten nefret ediyor, tek seferliği açıkça ödüllendiriyor (US, DE, TR — üçünde de).
2. Senin konumlandırman zaten lifetime çerçevesi: *"10-15 dolar veririm ama her gün beni x dolardan kurtarır."*
3. Nakit önden gelir — reklamsız, organik büyümede nakit akışı her şeydir.

$39.99 → $29.99 indirimi kayıp değil: yıllık $14.99 → $24.99 çıkışı farkı fazlasıyla kapatıyor ve lifetime/yıllık aralığı ($5) satın alma kararını lifetime'a itiyor.

### 6.4 Ülke bazlı fiyat (Adapty fiyat endeksi, US = 1.0)

| Pazar | Endeks | Lifetime | Yıllık |
|---|---|---|---|
| DE, GB, FR, IT, ES | 1.2 | $35.99 | $29.99 |
| US, IE | 1.0 | $29.99 | $24.99 |
| CA, NZ | 0.9 | $26.99 | $21.99 |
| AU | 0.8 | $23.99 | $19.99 |
| **TR** | **0.7** | **$20.99** | **$17.99** |

Düz global fiyat kullanma — Almanya'yı Türkiye fiyatına satmak doğrudan para yakmaktır.

### 6.5 Kaç indirme gerekiyor

100 ödeyen müşteri başına (karma: %15 aylık, %45 yıllık, %40 lifetime — lifetime öne çıkarıldığı için ağır):

| | Mevcut fiyat | Önerilen fiyat |
|---|---|---|
| 15 aylık | $44.85 | $74.85 |
| 45 yıllık | $674.55 | $1.124.55 |
| 40 lifetime | $1.599.60 | $1.199.60 |
| **Toplam** | **$2.319** | **$2.399** |

Yani ~**100 yeni ödeyen müşteri/ay** ile $2.353 brüt hedefe ulaşılır (her iki fiyatta da benzer — çünkü mevcut yapıda lifetime pahalı olduğu için ağırlık oraya biniyor; ama önerilen yapıda yenilenen yıllık gelir de birikiyor, mevcut yapıda birikmiyor).

Install → paid dönüşümü:

| Dönüşüm | Gerekli indirme/ay | Gerçekçilik |
|---|---|---|
| %3.1 (global benchmark: %11.2 trial × %27.8) | **3.200** | İyimser |
| %2.0 (temkinli indie) | **5.000** | Gerçekçi hedef |
| %1.5 (kötü senaryo) | **6.700** | Ulaşılabilir ama zor |

**Hedef: ayda 5.000 organik indirme.**

### 6.6 Bu gerçekçi mi — ölçülmüş kontrol

| Uygulama | İndirme/ay | Gelir/ay |
|---|---|---|
| Park Smarter | 100k | < $5k (para kazanmıyor) |
| SpotAngels | 30k | $20k |
| ParkUsher | 20k | $10k |
| **Find My Parked Car** (niş lideri) | **< 5k** | **< $5k** |
| Diğer tüm find-my-car uygulamaları | < 5k | < $5k |

⚠️ **Dürüst uyarı:** Saf "find my car" nişi ayda 5.000 indirme üretmiyor — niş liderinin bile indirmesi 5k'nın altında. **$2.000/ay saf araba-bulma konumlandırmasıyla ulaşılamaz.**

Ulaşılabilir yol: **parking timer + maliyet** konumlandırması + 7 mağazada eşzamanlı ASO (US/GB/CA/AU/IE/NZ/TR). Her biri 500–900 indirme/ay → toplam 4–6k. Tek pazarda değil, yedi pazarda küçük birinciliklerle.

ParkUsher kanıtı: **3 şehir, $30/yıl, 20k indirme = $10k/ay.** ParkIQ'nun bunun beşte birine ihtiyacı var.

---

## 7. Uygulama sırası

### Faz 0 — Lansmandan önce
- [x] Metadata: **18 locale App Store Connect'e aktarıldı** (2026-08-15, `asc` CLI) — §7.1'e bak
      `en-US · en-GB · en-AU · en-CA · tr · de-DE · fr-FR · fr-CA · es-ES · es-MX · it · nl-NL · pt-BR · pt-PT · ja · ko · zh-Hant · sv`
- [x] IAP + abonelik adları/açıklamaları indekslenecek şekilde yazıldı (§2.5)
- [x] Kategori: Navigation (birincil) + Travel (ikincil)
- [ ] 🔴 **Uygulama i18n'i 10 dile genişletilir** (§2.4 sonundaki risk) — yapılmazsa ilgili locale'ler silinmeli
- [ ] Ekran görüntüleri: 7 kare (§4) — **eksik olan tek zorunlu alan**. Metin içermeyen kareler tüm locale'lerde paylaşılabilir; altyazılı kareler dil başına üretilir.
- [ ] RevenueCat + ASC fiyatları güncellenir (§6.3, §6.4) — build gerektirmez
- [ ] Paywall: lifetime varsayılan seçili, "iki park aşımı kadar" çerçevesi
- [ ] ja/ko/zh-Hant/sv/nl metinleri ana dil kontrolünden geçirilir
- [ ] **AR ekranını lansman metnine koyma** — screens.md §7b tamamen işaretsiz. Yazdığını yollayamıyorsan yazma.

### 7.1 ASC'ye aktarılan durum (2026-08-15)

Kanonik ayna repoda: **`parkiq-frontend/metadata/`** (`asc metadata pull` çıktısı). Değişiklik yapmak için o dosyaları düzenle, sonra:

```bash
asc metadata validate --dir ./metadata
asc metadata push --app 6756688254 --version 1.0 --dir ./metadata --dry-run
asc metadata push --app 6756688254 --version 1.0 --dir ./metadata
```

Kanonik dosya düzeni: `metadata/app-info/<locale>.json` (name, subtitle, privacyPolicyUrl) · `metadata/version/<sürüm>/<locale>.json` (description, keywords, promotionalText, supportUrl, marketingUrl).

**Aktarım sırasında öğrenilen iki Apple kısıtı:**

1. **`whatsNew` 1.0 sürümünde düzenlenemiyor** — API `Attribute 'whatsNew' cannot be edited at this time` döndürüyor. İlk sürümde "Yenilikler" alanı yok; §3.4'teki metin 1.1'de kullanılacak.
2. **Açıklamada emoji yasak** — `Description can't contain the following character(s): ⚡`. TR açıklamasından ⚡ kaldırıldı. Aynı sebeple IAP adlarında uzun tire (—) yerine düz tire (-) kullanıldı. Bu kısıt [design.md](design.md)'nin emoji yasağıyla zaten örtüşüyor.
3. **Yeni locale `asc localizations update` ile açılmıyor** (`no existing localization found`). Önce `asc metadata push` kanonik dosyayla locale'i yaratır, sonra alanlar yazılır. en-GB eklenirken aynı iki adım gerekecek.

### Faz 1 — Lansman + 0–8 hafta
- [ ] en-AU, en-IE, en-NZ yerelleştirmeleri eklenir (metin en-GB ile aynı, ayrı yerelleştirme ayrı indeksleme demek)
- [ ] Hedef: 7 mağazada "parking timer" ilk 3
- [ ] Promosyon metni ayda bir değiştirilir
- [ ] İlk 30 yorum kritik: iki adımlı yorum isteği yalnız "SAVED" anında (CLAUDE.md kuralı)

### Faz 2 — 2–4. ay
- [ ] **AR Find My Car** biter → alt başlık `Find my car with AR` varyantı test edilir, In-App Event ile duyurulur
- [ ] `where did i park` saldırısı: IE (KD 20) → CA (38) → AU/GB (47/48)
- [ ] In-App Event kurulur (indekslenen 80 ekstra karakter)

### Faz 3 — 4–8. ay
- [ ] **DE yerelleştirmesi** — hem mağaza metni hem uygulama içi i18n. `parkzeit erinnerung` KD 4 ve DE fiyat endeksi 1.2. Bu, ROI'si en yüksek tek pazar genişlemesi. Parkscheibe iddiası yok (§2.4).
- [ ] `find my car` saldırısı: IE/NZ (KD 28/29) → CA/AU (53)

---

## 8. Ölçüm

Anahtar kelime sıralaması ücretsiz araçla takip edilemez; App Store Connect **Impressions** ve **Product Page Views** üzerinden dolaylı okunur.

| Metrik | Nereden | Sağlıklı |
|---|---|---|
| Impressions/ay | ASC Analytics | Faz 1 sonu 40k+ |
| Impression → Product Page View | ASC | > %8 |
| Product Page View → Install | ASC | > %35 |
| Install → Paid | RevenueCat | > %2 |
| İade oranı | ASC | < %4 |
| Yorum hızı | ASC | > 15/ay |

Impression düşükse → anahtar kelime sorunu (§2). Impression yüksek ama install düşükse → ekran görüntüsü sorunu (§4). Install yüksek ama paid düşükse → paywall/fiyat sorunu (§6).

---

## 9. Kanıt notları ve sınırlar

- **SensorTower "< $5k"** bir taban kovasıdır; $0 ile $4.999 arasını ayırt etmez. Bu yüzden "hangi find-my-car uygulaması ne kazanıyor" sorusu tam cevaplanamaz — yalnız "hiçbiri $5k'yı geçmiyor" bilinir.
- **KD skorları iTunes Search API'sinden** hesaplandı; bu, App Store'un gerçek arama indeksiyle **aynı değildir**. Göreli karşılaştırma güvenilir, mutlak sıralama değil. Lansmandan önce bir ASO aracıyla (AppTweak/Sensor Tower deneme sürümü) doğrulanması önerilir.
- **Ekran görüntüsü OCR indekslemesi tartışmalı** (§4) — plan buna bağlı değil.
- **Yorum örneklemi "en yeni" sıralıdır**, ömür boyu ortalamayı değil güncel deneyimi yansıtır. Bu kasıtlı: rakiplerin bugünkü hali önemli.
- Adapty benchmark yüzdeleri (install→trial %11.2, trial→paid %27.8, iade %8.3) **Adapty müşterisi uygulamalardan** gelir — yani monetizasyonla zaten ilgilenen uygulamalar. Gerçek indie ortalaması daha düşüktür; model bu yüzden %2 üzerinden kuruldu.
