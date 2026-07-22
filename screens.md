# ParkIQ — Ekran Checklist'i

Uygulamanın içereceği **tüm** yüzeylerin listesi. Her ekranın görsel/etkileşim spec'i [design.md](design.md)'de — yanındaki § referansına bak. Bir yüzey biterken kutusunu işaretle; burada olmayan bir ekran gerekirse önce buraya ekle.

**Mimari hatırlatma (design.md §7):** Tab bar yok. Root = MapCanvas (asla unmount olmaz) + durum-güdümlü bottom sheet (`idle | parking | active | ending | ended`). Geçmiş/Ayarlar/Paywall = iOS pageSheet. Onboarding, LA/widget, paylaşım kartları = poster katmanı.

---

## 1. Onboarding & izinler (§7.1)

- [x] S1 manifesto posteri (krem zemin)
- [x] S2 manifesto posteri (siyah zemin — App Store screenshot kaynağı)
- [x] S3 manifesto posteri (krem zemin) + Enable Location CTA
- [x] Onboarding gate (bir kez gösterim, atlama; geliştiricide sıfırlanabilir)
- [x] Konum izni isteme anı (ilk harita açılışında, pre-prompt kopyasıyla)
- [x] Bildirim izni isteme anı (ilk hatırlatıcı/tarife kurulumunda)
- [x] Kamera izni isteme anı (ilk foto/OCR'da)
- [x] Oto-algılama izni: ayrı Bluetooth izni gerekmez (ses rotası sinyali)

## 2. Keşif — idle sheet + harita (§7.2)

- [ ] MapCanvas: [x] Mapbox kuruldu + tema-duyarlı stil + konum puck'ı + araba pini (native build'de aktif) · [ ] §6 özel Studio stili · [ ] `calm` varyantı
- [x] Arama çubuğu + geocoding sonuç listesi ("Where to?") — native geocoder, anahtarsız
- [x] Filtre chip'leri: All / Charging / Covered
- [ ] Pinler: [x] otopark (P) + şarj (bolt) pinleri · [ ] cluster kademeleri (§5.8)
- [x] Pin detay kartı: ad, mesafe/yürüme, tarife hafızası özeti, "Directions" (en yakın 3)
- [x] Kullanıcı konum noktası + konuma dön butonu (kare cam)
- [x] Idle sheet: en yakın otopark kartı (ad/mesafe/yürüme/yol tarifi) + "I Parked" CTA
- [ ] Konum izni reddi durumu: haritaya manuel pin bırakma akışı
- [x] Offline durum satırı (§5.11)

## 3. Park Etme — parking sheet (§7.3)

- [x] Anında kayıt (2 sn kuralı) + kayıt onay durumu
- [x] Opsiyonel alan: kat/bölge girişi
- [x] Opsiyonel alan: not
- [x] Opsiyonel alan: foto çekimi (spot fotoğrafı)
- [x] Backdate: "X dk önce park ettim" ofseti
- [x] Hatırlatıcı: Kapalı/30dk/1s/2s/3s + özel süre girişi
- [x] Tarife hafızası önerisi: "Geçen seferki: 0–1s ₺50 — kullan?"
- [x] Zayıf GPS algısı → kat/foto nudge (kapalı otopark)
- [ ] Konum düzeltme: pin'i sürükleyerek ince ayar

## 4. Tarife girişi + OCR (§7.4)

- [x] Manuel tarife formu — `tiered` (dilim satırları: süre + kümülatif ₺)
- [x] Manuel tarife formu — `flat` (tek tutar)
- [x] Manuel tarife formu — `hourly` (₺X/saat → otomatik dilimlere açılır)
- [x] Para birimi: Ayarlar'dan seçim + cihaz locale'inden varsayılan
- [x] OCR kamera akışı: cihaz üstü Apple Vision (foto telefondan çıkmaz, çevrimdışı çalışır)
- [x] OCR sonucu forma yazılır + elle düzeltilebilir (ayrı önizleme ekranı yerine doğrudan form)
- [x] OCR hata/okunamadı → manuel girişe zarif düşüş
- [x] OCR limiti YOK — cihaz üstü Vision sınırsız ve ücretsiz (free katman güçlendi)

## 5. Aktif Oturum — active sheet (§7.5)

- [x] Sayaç (geçen süre, tabular)
- [x] Tarife dilim çubuğu (§5.9 — `tariffMath` çıktısından)
- [x] Para kutusu (koşullu, §5.10): "Exit before 14:04 and pay ₺50 instead of ₺100"
- [x] Amber eşik durumu (≤15 dk) — çubuk + rakam + knob dönüşümü
- [x] Tarifesiz mod: çubuk yerine "Add tariff to see cost →" satırı (§5.12)
- [x] Aksiyonlar: Find My Car (CTA) · Share Location · End
- [ ] Harita: [x] scrim + araba pini · [ ] `calm` stil varyantı (Studio stiliyle)
- [x] >24s uyarısı: "Still parked at X? · End / Keep"
- [x] Cold start: aktif oturum varsa doğrudan bu duruma açılış

## 6. Oto-algılama (premium, §7.4b)

- [x] Kurulum: Ayarlar'da oto-algılama anahtarı (premium; free'de kilit → paywall)
- [x] Kopma algısı → otomatik konum kaydı (AVAudioSession araç rotası; kulaklık sayılmaz)
- [x] Onay bildirimi: "Park kaydedildi. Sayaç başlasın mı?"
- [x] Yanlış algı düzeltme: "Burada park etmedin mi? Kaydı sil" satırı

## 7. Find My Car (§7.6)

- [ ] Harita modu: [x] mesafe + araba pini (harita katmanı Mapbox build'inde) · [ ] gömülü harita görünümü
- [x] Pusula oku (açık alan, heading bazlı)
- [x] Kapalı alan modu: kat/not/foto kartı öne çıkar (GPS doğruluğu >35 m ise otomatik)
- [x] Spot fotoğrafı tam ekran görüntüleme
- [x] Apple Maps'e yürüyüş tarifi devri (opsiyonel çıkış)

### 7b. AR Find My Car (flagship adayı — yalnız açık alan, native ARKit modülü)

Uygulama dokümanı: **[ar-find-my-car.md](ar-find-my-car.md)** — mimari, koordinat matematiği, Swift/RN iskeletleri, v2 rota kuralları, iş sırası. Bu yüzeyde çalışmadan önce onu oku.

- [ ] AR ekranı: kamera + arabanın konumuna yerden yükselen ışık huzmesi (Expo Modules API + RealityKit; yalnız `expo run:ios` build'inde)
- [ ] Zemin chevron okları: arabaya yön (v1 düz hat — "NFS hissi")
- [ ] Mesafe HUD'ı: tabular rakam, LA kart dili (§8 yüzey ailesi)
- [ ] Yakın mesafe modu (<20 m): huzme → yere inen pin/pulse ("yaklaştın")
- [ ] Doğruluk UX: zayıf GPS/kapalı alanda foto-kat kartına zarif düşüş; pusula kalibrasyon yönlendirmesi
- [ ] Park anında çoklu GPS örneği ortalaması (kayıt hassasiyeti artışı)
- [ ] v2: Mapbox Directions yürüyüş rotası AR zemin yolu olarak
- [ ] design.md'ye AR yüzey dili eklentisi (huzme/chevron/HUD token'ları — §7.6 uzantısı)

## 8. Bitirme + Kutlama — ending / ended (§7.7)

- [x] Bitirme onayı (ending durumu) + Undo penceresi
- [x] Özet: süre · ödenen · kaçınılan · aylık toplam tasarruf
- [x] Kutlama varyant a: tarifesiz oturum ("PARKED 1H 45M." — ink nokta)
- [x] Kutlama varyant b: dilim aşıldı (saved=0 — yargılamayan kopya)
- [x] Kutlama varyant c: tasarruf var ("SAVED ₺50." — yeşil nokta)
- [x] Share Card aksiyonu → 9:16 kart üretimi (§11.1)
- [x] App Store yorum isteği (yalnız ilk varyant-c anında, bir kez)
- [x] Zamanlanmış bildirimlerin iptali

## 9. Geçmiş + İstatistik — pageSheet (§7.8)

- [x] Oturum listesi (gün gruplu: Today / Yesterday / tarih)
- [x] Boş durum (3 iskelet satır + kopya, §5.12)
- [x] Free kilidi: 3 kayıttan eskisi kilitli satır → paywall köprüsü (KİLİT ŞU AN AÇIK — premium.ts)
- [ ] Oturum detayı: [x] foto + not + süre + maliyet + tasarruf + Haritada aç · [ ] gömülü mini harita (Mapbox bekliyor)
- [x] İstatistik: KPI satırı + aylık kolon grafiği (§11.2b)
- [x] Aylık özet + "Share" (story kartı, §11.1)

## 10. Ayarlar — pageSheet (§7.9)

- [x] Tema: light / dark / system
- [x] Dil: EN / TR
- [x] Para birimi
- [x] Uyarı eşiği (varsayılan 15 dk)
- [x] Araçlar: tek araç (free) / çoklu araç yönetimi (premium) — plaka hiçbir yüzeye çıkmaz
- [x] Oto-algılama kurulumu girişi (premium, §7.4b'ye köprü)
- [x] Abonelik: durum satırı + paywall köprüsü + yönet/iptal derin bağlantısı
- [x] Bildirim/konum izin durumları + Settings deep link satırları (§5.11 kalıbı)
- [x] Veri: dışa aktar (JSON paylaşımı) + tümünü sil (cihaz-yerel)
- [x] Hakkında: sürüm, gizlilik politikası, kullanım şartları, destek, rate us

## 11. Paywall — pageSheet (§7.10)

- [x] Plan kartları: aylık · yıllık · lifetime (RevenueCat offering; anahtar girilince dolar)
- [x] Premium özellik listesi (4 satır — OCR premium değil, herkese ücretsiz)
- [x] Restore purchases + yasal satırlar
- [ ] Tetik noktaları: [x] geçmiş kilidi · [x] Ayarlar satırı · [x] ilk varyant-c kutlaması sonrası · [ ] LA teşviki

## 12. Live Activity + Dynamic Island + Widget (§8)

- [x] LA — tarifeli durum: geri sayım hero + elapsed ikincil + çubuk + para footer'ı
- [x] LA — tarifesiz durum: elapsed hero, çubuk gizli
- [x] LA — amber eşik durumu (≤15 dk)
- [x] LA — bitiş karesi: 3 sn yeşil flip "SAVED ₺50." (§8.5)
- [x] Dynamic Island: compact / minimal / expanded
- [x] Widget systemSmall: hero rakam + yer overline
- [x] Widget systemMedium: mini LA
- [x] Widget oturumsuz durumu: "No active session" + aylık tasarruf
- [x] Bildirim: dilim uyarısı (local, eşikten önce zamanlanır — free'nin tek kanalı)
- [x] Bildirim: oto-algılama onayı (premium)
- [x] Bildirim: unutulan oturum (24s, nazik)

## 13. Paylaşım yüzeyleri (§11)

- [x] Konum paylaşım linki üretimi (veri linkin hash'inde — sunucu görmez)
- [x] Paylaşım web sayfası (parkiq-backend): harita + pin + App Store köprüsü · süre dolmuş/hata durumları
- [x] Tasarruf kartı 9:16 (oturum sonu)
- [x] Aylık özet kartı 9:16

## 14. Kesişen durumlar (her ekranda geçerli)

- [x] Offline satırı (§5.11)
- [x] İzin reddi satırları: konum · bildirim · kamera (§5.11 kalıbı)
- [x] Boş durumlar (§5.12)
- [x] Reduced-motion davranışları (§9 — onboarding girişi; başka animasyon yok)
- [x] Dynamic Type desteği (display max 1.3×, poster katmanı sabit — §3.4)
- [x] Dark mode — her yüzeyin iki tema hali
