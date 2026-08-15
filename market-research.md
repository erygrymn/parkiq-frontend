# ParkIQ — Pazar Araştırması

> Ölçüm tarihi: **2026-08-15** · Bölgeler: us, gb, de, tr, ca, au, ie, nz
> Örneklem: **259 park uygulaması** (SensorTower gerçek gelir verisi) · **2.188 yorum** · 8 mağazada anahtar kelime duvarı
> Kardeş dokümanlar: [CLAUDE.md](../CLAUDE.md) · [design.md](design.md) · [screens.md](screens.md) · [aso.md](aso.md)
>
> Bu dosya **ne inşa edileceğinin kanıt tabanı**. Bir özellik tartışılırken "kullanıcı bunu istiyor mu" sorusu buradan cevaplanır. Metadata/fiyat kararları [aso.md](aso.md)'de.
>
> **Rakip verisi 2026-08-15'te dondu — "ParkIQ'da durum" sütunları koda karşı 2026-08-15'te doğrulandı.** Pazar tarafı (gelir, yorum, KD) tekrar ölçülene kadar geçerlidir; ParkIQ tarafı ise **kod değişince eskir**. Bir özelliğin durumu tartışılıyorsa önce koda bak, sonra bu tabloyu güncelle — tersi değil.

---

## 0. Beş cümlelik özet

1. **259 park uygulamasının 253'ü aylık $5k'nın altında kazanıyor.** Gerçekten para kazanan üç park uygulaması var ve üçü de araba-bulma uygulaması değil.
2. **Niş lideri ölü.** Find My Parked Car (12.105 oy, ★4.59) **Kasım 2023'ten beri güncellenmedi**; son yorumlarının ortalaması **2.91** ve en sık şikayet "harita bembeyaz".
3. **83 tüketici uygulamasının yalnız 6'sı hem canlı hem >100 oylu.** Gerçek rakip sayısı altı, seksen üç değil.
4. **Altı rakibin altısında da aynı temel arıza var:** uygulama arabayı yanlış yerde gösteriyor. Bu bir özellik boşluğu değil, kategori çapında bir güven krizi.
5. **Pazarın en çok istediği şey para** (7 uygulamada 11 anma) ve hiçbir araba-bulma uygulamasında yok.

---

## 1. Pazar iki katmanlı — bunu karıştırmak strateji hatası

| Katman | Kim | Gelir nereden | ParkIQ'nun rakibi mi |
|---|---|---|---|
| **A — Ödeme geçitleri** | ParkMobile (1,3M oy), EasyPark, PayByPhone, RingGo, Flowbird, ParkNYC | Belediye sözleşmeleri + işlem ücreti. App Store'dan gelir **yok**. | ❌ Hayır — ama anahtar kelimeleri kapatıyorlar |
| **B — Park pazaryerleri** | SpotHero (407k oy), ParkWhiz, JustPark, Parking.com | Rezervasyon komisyonu | ❌ Hayır — ama anahtar kelimeleri kapatıyorlar |
| **C — Park keşif + freemium** | **SpotAngels ($20k/ay), ParkUsher ($10k/ay), AppyParking ($6k/ay)** | IAP aboneliği | ⚠️ Kısmen — **iş modeli örneği bunlar** |
| **D — Tüketici araba-bulma** | Find My Parked Car, Find My Car, Find Your Car with AR… (83 uygulama) | IAP, hepsi < $5k/ay | ✅ **Doğrudan rakip** |

ParkIQ D katmanında doğuyor ama **C katmanının gelirini hedeflemek zorunda.** Bu raporun tamamı bu geçişin nasıl yapılacağıyla ilgili.

---

## 2. Rakipler — gerçek gelir (SensorTower)

| # | Uygulama | Gelir/ay | İndirme/ay | ★ (ömür) | Oy | Son güncelleme |
|---|---|---|---|---|---|---|
| 1 | SpotAngels Parking & Gas | **$20k** | 30k | 4.73 | 12.727 | aktif |
| 2 | ParkUsher | **$10k** | 20k | 4.60 | 666 | aktif |
| 3 | AppyParking+ | **$6k** | 7k | 4.35 | 2.227 | aktif |
| 4 | ParkMobile | < $5k | 500k | 4.76 | 1.343.659 | aktif |
| 5 | Park Smarter | < $5k | **100k** | 4.50 | 11.855 | aktif |
| 6 | **Find My Parked Car** | < $5k | < 5k | 4.59 | 12.105 | **2023-11-15** ☠️ |
| 7 | Find My Car - Car Tracker | < $5k | < 5k | 4.50 | 5.988 | 2025-01-24 |
| 8 | Find My Car | < $5k | < 5k | 4.66 | 5.122 | 2026-02-27 |
| 9 | Find My Car GPS Auto Park | < $5k | < 5k | 4.69 | 1.753 | 2026-06-20 |
| 10 | Find My Car - Vehicle Tracker | < $5k | < 5k | 4.51 | 920 | 2026-07-09 |
| 11 | Find Your Car with AR | < $5k | < 5k | 4.63 | 471 | 2026-05-14 |
| 12 | Find My Car with AR Tracker | < $5k | < 5k | 4.35 | 360 | 2026-05-28 |

**Park Smarter paradoksu:** ayda 100.000 indirme, aylık gelir < $5k. Hacim tek başına para değil.

---

## 3. Pazar zorluğu: 🟡 42/100 — ama tek skor yanıltıcı

| Metrik | Değer | Okuma |
|---|---|---|
| Tüketici araba-bulma uygulaması sayısı | 83 | Yüksek arz |
| Bunların sıfır oylu olanı | **37 (%45)** | Arz sahte |
| ≥50 oyu olan | 13 | Gerçek alan dar |
| 18 aydır güncellenmemiş | 25 (%30) | Terk edilmiş |
| **Hem aktif hem >100 oylu** | **6** | ← gerçek rakip sayısı |
| Son 12 ayda çıkan | 35 | Yoğun ama etkisiz giriş |
| Kalite tavanı — ömür boyu ★ | 4.50–4.69 | Yüksek **görünüyor** |
| **Kalite tavanı — son yorumlar ★** | **2.24–3.92** | Gerçek deneyim çökmüş |
| Lider hakimiyeti | 24× medyan | Lider var ama uyuyor |

**Giriş bariyeri oy sayısı değil, çalışan bir ürün.** 83 rakibin 77'si ya ölü ya sıfır oylu.

---

## 4. İnsanlar tam olarak neden şikayetçi

Sınıflandırılan 1–3★ yorumlar. Fiyat şikayetleri hariç tutuldu (§6'da ayrı).

| Kategori | FMParkedCar | FMC-Tracker | Find My Car | GPS AutoPark | FindYourCar AR | SpotAngels |
|---|---|---|---|---|---|---|
| **Temel iş başarısız** | 12% | **25%**⚠️ | 18% | 17% | 23% | 16% |
| **Konum yanlış** | 7% | 12% | 11% | 6% | 15% | 7% |
| Detaysız 1★ öfke | 56%⚠️ | 45%⚠️ | 36%⚠️ | 53%⚠️ | 31%⚠️ | 51%⚠️ |
| Bug / beyaz ekran | 8% | – | 3% | 4% | 7% | 6% |
| UX / talimat yok | 10% | 2% | 4% | – | 1% | 7% |
| Reklam | 2% | 3% | **15%** | – | 5% | 3% |
| Batarya / yavaşlık | 2% | – | – | 4% | 5% | 4% |

### 4.1 🔴 Konum yanlış — kategorinin ölüm sebebi

Altı rakibin altısında da var. Bunlar birebir alıntı:

> "I was standing next to my car and it registered that I was 250 feet from it." — 1★ US

> "We just got back from the farmers market by the ferry building in San Francisco. I forgot where I parked the car and I opened the find my car App. The car was apparently in another county and showed the route that it took and was now in the Parking Lot of a Best Buy in San Carlos." — 1★ US

> "It told me to drive 45 minutes away from where my car was parked. I'd say that was a fail." — 1★ US

> "one one occasion it took em to a completely wrong location, on another it told me i was 57 miles from my car -- the one i could see from the street." — 1★ GB

> "Set it when leaving my car at the airport parking. When I visually found and returned to my car, the app said it was 400 feet away, even though I was standing right at it." — 1★ US

> "Hep yanlış yerleri gösteriyor boşuna yüklemeyin" — 1★ TR

> "Hiç bi işe yaramıyor bugün 1 saat arabayı aradım yanlış yönlendiriyor" — 1★ TR

> "Habe meinen Audi heute über die Grenze in die Werkstatt nach Braunau gebracht. FindMyCar sagt, dass er vor dem Haus steht." — 1★ DE

**Teknik teşhis:** "arabam evde görünüyor" deseni tekrar ediyor. Sebep: kayıt anında GPS kilidi oturmadan konum yazılıyor, cihaz son bilinen konuma düşüyor.

**ParkIQ karşılığı:** Kayıt anında **çoklu GPS örneği ortalaması** ([screens.md](screens.md) §7b'de işaretsiz — **öncelik yükseltilmeli**) + **elle pin düzeltme** (hiçbir rakipte yok).

### 4.2 🔴 Kapalı otopark — AR'ın çöktüğü yer

> "Nice concept and works ok outside with open sky available. However in multi-level parking garages it constantly changes direction, gives inaccurate distance and is not capable of indicating whether a vehicle is on an upper or lower level. The app frequently tried to tell me my car was in a parking garage across the street!" — 2★ US, Find Your Car with AR

> "I've used this app about 10 times now, and less than half of those times took me to my car. Usually, it's accurate in direction if I'm very far away (about 1 or 2 blocks), but as I get closer, it points 45-90 degrees in another direction, and as I'm sitting in my car, the app says I still have 20 feet to go!" — 3★ US

> "The app sends you in the wrong direction sometimes and of course doesn't work if you park in a garage. Overall better than nothing but only by a bit" — 2★ US

**Bu, AR'ı öne çıkarmama gerekçesinin kanıtı.** İnsanların arabayı en çok kaybettiği yer kapalı otopark, ve AR tam orada işe yaramıyor. ParkIQ'nun kapalı alan modu (kat/foto/not kartı, GPS >35 m'de otomatik devreye giren) bu boşluğun tam karşılığı.

### 4.3 🔴 Beklenti uyuşmazlığı — "tracker" kelimesinin bedeli

1★ yorumların büyük bir kısmı **canlı GPS takip cihazı bekleyen** kullanıcılardan geliyor. Uygulama hatası değil, metadata hatası:

> "u can hit ur locks to find ur car… i need to track my vehicle when Im not in it or near it… say I let my kids drive. I want to locate my car" — 1★ US

> "It does not track only tells you where you parked 😡" — 1★ US

> "If my car is in the area of my iPhone this app works. BUT when not close (600 miles away) it shows my car where my iPhone is located." — 2★ US

> "This is not accurate at all! It says my car was parked in my driveway, which is IMPOSSIBLE because my brother took off with it last night!!" — 1★ US

> "The app says my car is outside. My car is not outside. It has been stolen. That's why I downloaded the app so that you can find my car" — 1★ US

> "Car stolen and your app can't find it🤬" — 1★ GB

> "False advertising for locating parked cars not live location" — 1★ US

> "How does this app know your car when you are not in it??? How Does it activate and set to your car ? Do you need a vin number???" — 1★ US

**Aksiyon:** `tracker`, `locator`, `gps tracker`, `vehicle tracker` kelimeleri metadata'ya **girmemeli**. Bu kelimeler hırsızlık/takip niyetli kullanıcıyı çekiyor, o kullanıcı 1★ bırakıyor. [aso.md](aso.md) §2 bu kurala göre düzeltildi.

Ayrıca açıklamanın ilk ekranında **ne olmadığı** yazmalı: canlı takip değil, park kaydı.

### 4.4 🟠 "Zaten Apple Maps yapıyor" itirazı

Üç ayrı pazarda çıktı. ParkIQ'nun buna hazır cevabı olmalı:

> "Werde den Hype um diese App nicht verstehen. Mein iPhone merkt sich immer wo mein Auto steht. Kennt ihr die Funktionen eures eigenen iPhone nicht? Einfach die Apple Maps öffnen, dort seht ihr den Standort. Was kann die App denn besser und dann noch eine Werbefreischaltung für 6,99€ 😂😂😂" — 1★ DE

> "Thankfully Apple maps will do exactly what this app is intending to do and yet Apple maps will do it automatically, so no need for this ever buggy app." — 1★ GB

> "Apple Maps will keep the location of your parked car, and I can read the signs and set alarms myself." — 1★ US

**Cevap:** Apple Maps sadece pin bırakır. Tarifeyi bilmez, sayaç tutmaz, dilim atlamadan önce uyarmaz, kat/foto/not tutmaz, kapalı otoparkta çalışmaz. **ParkIQ'nun konumlandırması bu yüzden "arabamı bul" değil "ne kadar sürem var" olmalı** — Apple Maps'in cevaplayamadığı soru bu.

### 4.5 🟠 Talimat yok

> "The icons are not self-explanatory. It should have an icon under which it says 'here is where I parked,' and another icon under which it says 'take me to my car.' It doesn't." — 3★ US

> "No instructions on how to use - just use google maps or Waze" — 1★ US

> "Where's the instructions? I set a marker then when I needed to find my car, I couldn't figure out how to get to the marker !!!" — 1★ AU

> "You have to press buttons and eventually a menu comes up in German. Press one of the choices and you lose the location of your car." — 1★ GB

Kullanıcı **"kaydet"** ile **"bul"** düğmesini ayırt edemiyor. ParkIQ'nun "2 saniye kuralı" tam olarak bunu çözüyor ama etiketlerin fiil olması şart.

### 4.6 🟠 Reklamlar

> "Only 3 stars instead of 5 because of the horrible adds with buttons that say 'START' intended to fool you into thinking it is part of the app." — 3★ US

> "Not only can you not pay a fee to get ad free, the ads you can't stop include audio!" — 1★ US

> "Good App with stupid game ads even after paying. Ridiculous." — 1★ US

> "Wenn man ein Foto macht und die Werbung schaltet sich dazwischen, hängt sich die App auf. Desweiteren ist das Erscheinen der Werbung BEI JEDEM TAP absolut nervig." — 2★ DE

**"Reklam asla yok" kararı ([CLAUDE.md](../CLAUDE.md)) burada doğrudan pazarlama malzemesi.** Açıklamanın son satırı "No ads. Ever." olmalı.

### 4.7 🟠 Gizlilik ihlalleri ve dolandırıcılık

> "To get this free app, you have to submit credit card information. I did that, and within minutes, began getting notice of odd charge attempts (declined, of course) to that card. Now I have to replace the card" — 1★ US

> "This app directs user to a portal for an entertainment venue…games, movies etc. User is asked for credit card information without revealing that it is a subscription… User is immediately charged $39.95 with a monthly charge of the same amount." — 1★ US

> "It seems to only work if you give it access to your location ALL the time…not just when you are using the app. I don't like the idea of it tracking me all the time." — 1★ US

> "App uses phone's GPS but nevertheless REQUIRES being given access to the camera even if you tell it to use your map app instead. Thus granting this app access to your camera SHOULD be optional but it is NOT" — 2★ US

> "With Bluetooth fully turned off in the app, spotangel detected my car via Bluetooth and attempted to pair. It's acting like spyware on your phone." — 1★ US

**ParkIQ'nun "hesap yok / sunucu yok / foto cihazdan çıkmaz" mimarisi bu pazarda savunma değil, saldırı silahı.** Açıklamada açıkça yazılmalı: *"We have no database to leak because we have no database."*

---

## 5. Diğer uygulamalarda ne eksik

Talep = kaç kullanıcı istedi · Durum = pazarda şu an ne var.

| Özellik | Talep | Pazardaki durum | Aksiyon | ParkIQ |
|---|---|---|---|---|
| **Maliyet / fiyat / tasarruf** | ✓✓✓ 11 anma / 7 uygulama | **eksik** — hiçbir araba-bulma uygulamasında yok | 🔴 BUILD | ✅ Tarife çubuğu + "SAVED ₺X" |
| **Sayaç / süre hatırlatıcı** | ✓✓✓ 9 anma / 4 uygulama | **eksik** veya belediye app'inde kilitli | 🔴 BUILD | ✅ Omurga |
| **Elle pin düzeltme** | ✓✓ 3 anma | **eksik** — hiçbirinde yok | 🔴 BUILD | ✅ **Var** — `startPickingLocation` / `confirmPickedLocation` ([sessionStore.ts:598](src/state/sessionStore.ts:598)) |
| Oto-algılama | ✓✓✓ 7 anma / 6 uygulama | var ama kötü (batarya) | 🟠 FIX | ✅ Premium |
| Foto + not + kat | ✓✓ 5 anma / 5 uygulama | var ama kötü (foto kaydedilmiyor) | 🟠 FIX | ✅ Free |
| Kapalı otopark doğruluğu | ✓✓ 3 anma | **kırık** | 🟠 FIX | ✅ Kapalı alan modu |
| Başka harita app'i | ✓✓ 3 anma | eksik | 🟡 | ❌ Yalnız Apple Maps |
| AR / pusula | ✓ 2 anma | var ama kötü | 🟠 FIX | ✅ **Var** — `modules/parkiq-ar` (ARKit/RealityKit), [FindMyCar.tsx:247](src/screens/FindMyCar.tsx:247) |
| Widget / kilit ekranı | ✓ | eksik | 🟡 | ✅ Free |
| Apple Watch | ✓ | var ama kırık | 🟠 | ❌ Yok |
| CarPlay | ✓ | eksik | 🟡 | ❌ MVP dışı |
| Çoklu araç | ✓✓ 2 anma (DE) | eksik | 🟡 | ❌ Kaldırıldı |

### 5.1 Birebir istek alıntıları

**Oto-algılama:**
> "I wish the app would 'find my car' whenever I switched off my ignition and not wait for me to press any buttons to engage the location activity. I keep forgetting to press the button to allow the locator to start. I've paid the small membership so I can keep in touch with any improvements." — 5★ AU

> "Works great - now if only I could remember to tag my car when I park it I'd be sorted..." — 4★ GB

**Elle pin düzeltme — pazarda hiç yok:**
> "es wäre schön, wenn man den Standort seines Autos auch manuell auf der Karte markieren könnte, wenn man vergessen hat, den Standort zu markieren. Dann gibt es von mir den fünften Stern." — 4★ DE

> "A shortfall is the inability to modify the location you want to save. Instead, being limited to where the phone shows your location. The ability to add notes is a great touch." — 3★ US

> "Cool, unique app! ... Only one feature missing. The ability to manually enter a location." — 5★ US

**Foto + not + kat:**
> "The fact you can integrate a photo and note about your vehicle's location is key, particularly for those multi-level parking mazes that all look exactly the same on each level and spin you around like you're playing Pin the Tail on the [Donkey]" — 4★ US

> "I like the clean straightforward look. Don't need fancy VR for parking ! But a simple note linked to the car location would be great. (there are parking regulations which vary by day and street in my city. NYC.) would be a 4 stars if it had a note taking function." — 2★ US

> "Accurate enough. But I need to be able to add a note to a saved setting. Previous app I had could add a note and a picture of where the car was parked. Would be great if those functions were added." — 3★ US

**Kilit ekranı sayacı — ParkIQ'nun Live Activity'sinin tam doğrulaması:**
> "Love the app, really helps me remember where my car is parked and when I need to move it by. I really rely on having the timer on my lockscreen. It's the best feature. But it goes away after a few hours." — 4★ US, ParkUsher

**Başka harita uygulaması:**
> "Wish it could allow other map apps besides Apple Maps" — 4★ US
> "this would be much better if it could use google maps instead of apple maps" — 3★ US
> "İnternet olmadan gideceğin geleceğin yerleri bulabilmek için yandexe de bağlanabilmesi" — 3★ TR

**Apple Watch:**
> "Super praktische und schön gestaltete App! Gerade in (Fremden) Großstädten genial. Ich vermisse allerdings eine Unterstützung der Apple Watch. Gerade auf der Uhr wäre es Mega praktisch schnell den Autostandort zu speichern..." — 4★ DE

**Oturumu erken bitirip yalnız kullanılanı ödeme:**
> "4 stars because I wish they have an End Session button where you can end your parking and pay for just the time spent if all time is not used up and you leave earlier than anticipated" — 4★ US

---

## 6. Fiyatlandırma manzarası

### 6.1 Ne cezalandırılıyor

| Uygulama | Fiyat | Sonuç |
|---|---|---|
| GPS Car Tracker | $59.99/yıl | Yorumlarının çoğu iade talebi |
| SpotAngels | $29.99–34.99/yıl | 28 ayrı fiyat şikayeti, "scammy billing" |
| ParKing | €6.99 reklam kaldırma | "Apple Maps zaten yapıyor, ne diye ödeyeyim" |

> "I tried to get the 3 day free trial, and it charged me the $59.99 automatically. Don't fall into the scam like I did." — 1★ US

> "Canceled the free trial the same day, and they still charged me for a full year." — 1★ US

### 6.2 Ne ödüllendiriliyor

> "This is how most apps should be! With hefty subscription based prices most of the apps won't go anywhere! But this one with its reasonable **lifetime** subscription based cost— I wish it all the very best!" — 5★ US

> "Für das doch recht begrenzte Anwendungsfeld ist das Abo geradezu absurd teuer. **Einen einstelligen Euro-Betrag als Einmal-Zahlung** hielte ich für angemessener" — 3★ DE

> "I rather pay **$30 a year for ParkUsher than close to 1000 for parking tickets**." — 5★ US

> "I live in downtown and the parking price is crazy. One right next to me is 8 bucks for 30 minutes. Found free parking right next to me only 5 minutes walk. **The membership fee is so low.** Strongly recommend." — 5★ US

> "I have easily **saved hundreds of dollars** using this. It is one of my favorite apps I've ever found" — 5★ US

**Kural:** Bu pazarda ödeme, **tasarruf rakamla gösterildiğinde** kabul ediliyor; gösterilmediğinde "pin bırakmaya para mı verilir" diye reddediliyor. Fiyat merdiveni [aso.md](aso.md) §6'da.

---

## 7. Bölgesel farklar

| Bölge | Gözlem | Sonuç |
|---|---|---|
| **US** | En büyük hacim, en gürültülü. Reklam nefreti tavan (Find My Car'da %15). Dolandırıcılık/kredi kartı şikayetleri yaygın. Beklenti uyuşmazlığı (§4.3) en çok burada. | Metadata'da "tracker" kesinlikle yok, "no ads" öne çıkar |
| **GB** | Şikayetler US ile aynı, **rekabet yarı yarıya zayıf**. Kelime farkı: "car park", "multi storey", ceza = "fine". | Ayrı en-GB yerelleştirmesi şart |
| **DE** | Ayrı talep kümesi: *Parkzeit / Parkuhr*. Kalite beklentisi en yüksek, abonelik direnci en sert, tek seferlik ödeme açıkça talep ediliyor. Apple Maps itirazı en net burada. Çoklu araç talebi yalnız DE'den geldi. | Faz 3 genişlemesi, fiyat endeksi 1.2 |
| **TR** | Gerçek talep var ama arama sonuçları **oyunlarla dolu** ("otopark oyunu", "araba oyunları", "parkur oyunları"). Şikayetler tek tip ve sert. Fiyat endeksi 0.7. | Yorum/puan hızı için değerli, gelir için değil |
| **CA/AU/IE/NZ** | Neredeyse boş. IE ve NZ'de "find my car" duvarı 50 oy. | Bedava birincilik, en-GB metniyle |

---

## 8. Fırsat boşlukları — öncelik sırasıyla

| # | Boşluk | Kanıt | ParkIQ'da durum |
|---|---|---|---|
| 1 | **Para dilini konuşan tek araba-bulma uygulaması** | En çok istenen tema, hiçbirinde yok | ✅ Var — öne çıkarılmalı |
| 2 | **"Parking timer" terimini sahiplenmek** | Terim tüm İngilizce mağazalarda boş | ✅ Var — metadata kararı |
| 3 | **Gerçekten çalışan doğruluk** | 6/6 rakipte temel arıza | ✅ **Var** — 5 sn bütçede 4 GPS örneği, en doğrusu seçilir ([location.ts:40](src/lib/location.ts:40)) |
| 4 | **Elle pin düzeltme** | 3 talep, pazarda **hiç yok** | ✅ **Var** ([sessionStore.ts:598](src/state/sessionStore.ts:598)) |
| 5 | **Kapalı otoparkta çalışan çözüm** | AR'ın çöktüğü tek yer | ✅ Kapalı alan modu |
| 6 | **Reklamsız + hesapsız** | Rakiplerde şikayet dolu | ✅ Mimari karar |
| 7 | **Terk edilmiş lideri devralmak** | Lider 3 yıldır uyuyor | ✅ Aktif geliştirme |

> **Bu tablonun anlamı 2026-08-15'te değişti.** 3 ve 4 numaralı satırlar "eksik" değil, **yapılmış**. Yani bunlar artık yol haritası değil, **pazarlama malzemesi**: pazarda hiç kimsenin yapmadığı iki şeyi ParkIQ yapıyor ve bunu hiçbir yerde söylemiyor.

---

## 9. Bu araştırmanın ürüne söylediği üç şey

1. **Doğruluk bir özellik değil, bütün üründür.** Rakiplerin %100'ü burada ölüyor. ParkIQ'nun cevabı yazıldı: kayıt anında 5 saniyelik bütçede 4 GPS örneği alınıp en doğrusu seçiliyor ([location.ts:40](src/lib/location.ts:40)) ve "2 saniye kuralı" bunu beklemiyor — kayıt anında bitiyor, konum arkadan oturuyor.
2. **AR yazıldı ama lansmanda öne çıkarılmıyor** — sebep "hazır değil" değil, **kanıt**: AR'lı iki rakibin yorumları AR'ın kapalı otoparkta çöktüğünü gösteriyor (§4.2) ve insanların arabayı en çok kaybettiği yer orası. AR açık alanda bir kanca; güvenilirlik hikâyesi kapalı alan kartıdır. ([FindMyCar.tsx:247](src/screens/FindMyCar.tsx:247) — AR yalnız premium + açık alan + cihaz destekliyorsa açılır.)
3. **Elle pin düzeltme pazarda hiç kimsede yok ve ParkIQ'da var.** Bu, "yanlış yeri kaydetti" şikayetinin panzehiri — yani kategorinin en büyük arızasını kullanıcının kendisinin kapatabilmesi. Ekran görüntüsü veya mağaza metninde henüz **hiç anlatılmıyor**; anlatılmalı.

---

## 10. Yöntem ve sınırlar

**Nasıl toplandı:** iTunes Search API (10 dilde 60+ sorgu, 8 mağaza) → 404 aday → park-ilgisi filtresi → 259 uygulama → SensorTower public endpoint (`app.sensortower.com/api/ios/apps`, 259/259 veri döndü) → 18 doğrudan rakip için 8 bölgede RSS yorumları (2.188 yorum) → 475 sinyal yorumu (1–3★ + istek içeren 4–5★) elle okundu → anahtar-kelime destekli sınıflandırma.

**Sınırlar:**
- **SensorTower "< $5k" bir taban kovasıdır** — $0 ile $4.999 arasını ayırt etmez. "Hangi araba-bulma uygulaması ne kazanıyor" tam cevaplanamaz; yalnız "hiçbiri $5k'yı geçmiyor" bilinir.
- **Yorumlar "en yeni" sıralı çekildi**, ömür boyu ortalamayı değil güncel deneyimi yansıtır. Ömür boyu ★4.59 ile son yorum ★2.91 farkı bu yüzden. Bu kasıtlı — rakiplerin bugünkü hali önemli.
- **"Detaysız 1★ öfke" kategorisi %31–56 arası.** Bunlar "Terrible", "Junk", "Useless" gibi tek kelimelik yorumlar; büyük çoğunluğu temel arızayı anlatıyor ama regexle ayrıştırılamadı. Yani "temel iş başarısız" oranı raporda **olduğundan düşük** görünüyor.
- **Anahtar kelime zorluğu iTunes Search API'sinden** hesaplandı; App Store'un gerçek arama indeksiyle aynı değil. Göreli karşılaştırma güvenilir, mutlak sıralama değil.
- **Kategori dışı kaçaklar temizlendi ama tam değil:** Radarbot ($600k, radar detektörü), Vehicle Smart ($40k, araç sorgulama), Tachimetro GPS ($30k, hız göstergesi) filtreye takıldı ve rakip sayılmadı.
