# ParkIQ — Ekran Checklist'i

Uygulamanın içereceği **tüm** yüzeylerin listesi. Her ekranın görsel/etkileşim spec'i [design.md](design.md)'de — yanındaki § referansına bak. Bir yüzey biterken kutusunu işaretle; burada olmayan bir ekran gerekirse önce buraya ekle.

**Mimari hatırlatma (design.md §7):** Tab bar yok. Root = MapCanvas (asla unmount olmaz) + durum-güdümlü bottom sheet (`idle | parking | active | ending | ended`). Geçmiş/Ayarlar/Paywall = iOS pageSheet. Onboarding, LA/widget, paylaşım kartları = poster katmanı.

---

## 1. Onboarding & izinler (§7.1)

- [ ] S1 manifesto posteri (krem zemin)
- [ ] S2 manifesto posteri (siyah zemin — App Store screenshot kaynağı)
- [ ] S3 manifesto posteri (krem zemin)
- [ ] Onboarding gate (bir kez gösterim, atlama)
- [ ] Konum izni isteme anı (ilk harita açılışında, pre-prompt kopyasıyla)
- [ ] Bildirim izni isteme anı (ilk hatırlatıcı/tarife kurulumunda)
- [ ] Kamera izni isteme anı (ilk foto/OCR'da)
- [ ] Bluetooth izni isteme anı (oto-algılama kurulumunda, premium)

## 2. Keşif — idle sheet + harita (§7.2)

- [ ] MapCanvas: Mapbox custom style light/dark + `calm` varyantı (§6)
- [ ] Arama çubuğu + geocoding sonuç listesi ("Where to?")
- [ ] Filtre chip'leri: All / ⚡ Charging / Covered
- [ ] Otopark pinleri (P) + şarj pinleri (⚡) + cluster kademeleri (§5.8)
- [ ] Pin detay kartı: ad, mesafe/yürüme, tarife hafızası varsa özet, "Directions"
- [ ] Kullanıcı konum noktası + konuma dön butonu (kare cam)
- [ ] Idle sheet: en yakın otopark kartı + "I Parked" CTA
- [ ] Konum izni reddi durumu: haritaya manuel pin bırakma akışı
- [ ] Offline durum satırı (§5.11)

## 3. Park Etme — parking sheet (§7.3)

- [ ] Anında kayıt (2 sn kuralı) + kayıt onay durumu
- [ ] Opsiyonel alan: kat/bölge girişi
- [ ] Opsiyonel alan: not
- [ ] Opsiyonel alan: foto çekimi (spot fotoğrafı)
- [ ] Backdate: "X dk önce park ettim" ofseti
- [ ] Hatırlatıcı hızlı seçimi: 30dk / 1s / 2s / özel
- [ ] Tarife hafızası önerisi: "Geçen seferki: 0–1s ₺50 — kullan?"
- [ ] Zayıf GPS algısı → kat/foto nudge (kapalı otopark)
- [ ] Konum düzeltme: pin'i sürükleyerek ince ayar

## 4. Tarife girişi + OCR (§7.4)

- [ ] Manuel tarife formu — `tiered` (dilim satırları: süre + kümülatif ₺)
- [ ] Manuel tarife formu — `flat` (tek tutar)
- [ ] Manuel tarife formu — `hourly` (₺X/saat → otomatik dilimlere açılır)
- [ ] Para birimi seçimi (locale varsayılanı + düzeltme)
- [ ] OCR kamera akışı: tarife panosu fotoğrafı çek
- [ ] OCR sonuç önizleme + düzeltme ekranı → onay
- [ ] OCR hata/okunamadı → manuel girişe zarif düşüş
- [ ] Free OCR limiti (3/ay) sayacı + dolunca paywall köprüsü

## 5. Aktif Oturum — active sheet (§7.5)

- [ ] Sayaç (geçen süre, tabular)
- [ ] Tarife dilim çubuğu (§5.9 — `tariffMath` çıktısından)
- [ ] Para kutusu (koşullu, §5.10): "Exit before 14:04 and pay ₺50 instead of ₺100"
- [ ] Amber eşik durumu (≤15 dk) — çubuk + rakam + knob dönüşümü
- [ ] Tarifesiz mod: çubuk yerine "Add tariff to see cost →" satırı (§5.12)
- [ ] Aksiyonlar: Find My Car (CTA) · Share Location · End
- [ ] Harita `calm` + scrim durumu, araba pini
- [ ] >24s uyarısı: "Still parked at X? · End / Keep"
- [ ] Cold start: aktif oturum varsa doğrudan bu duruma açılış

## 6. Oto-algılama (premium, §7.4b)

- [ ] Kurulum akışı: araç Bluetooth/CarPlay cihazı eşleştirme (Ayarlar'dan)
- [ ] Kopma algısı → otomatik konum kaydı
- [ ] Onay bildirimi: "Park kaydedildi. Sayaç başlasın mı?" + tek dokunuş başlatma
- [ ] Yanlış algı düzeltme: kaydı yoksay/geri al

## 7. Find My Car (§7.6)

- [ ] Harita modu: araba pini + benim konumum + mesafe
- [ ] Pusula oku (açık alan, heading bazlı)
- [ ] Kapalı alan modu: kat/not/foto kartı öne çıkar (GPS zayıfsa otomatik)
- [ ] Spot fotoğrafı tam ekran görüntüleme
- [ ] Apple Maps'e yürüyüş tarifi devri (opsiyonel çıkış)

## 8. Bitirme + Kutlama — ending / ended (§7.7)

- [ ] Bitirme onayı (ending durumu) + Undo penceresi
- [ ] Özet: süre · ödenen · kaçınılan · aylık toplam tasarruf
- [ ] Kutlama varyant a: tarifesiz oturum ("PARKED 1H 45M." — ink nokta)
- [ ] Kutlama varyant b: dilim aşıldı (saved=0 — yargılamayan kopya)
- [ ] Kutlama varyant c: tasarruf var ("SAVED ₺50." — yeşil nokta)
- [ ] Share Card aksiyonu → 9:16 kart üretimi (§11.1)
- [ ] App Store yorum isteği (yalnız ilk varyant-c anında)
- [ ] Zamanlanmış bildirimlerin iptali

## 9. Geçmiş + İstatistik — pageSheet (§7.8)

- [ ] Oturum listesi (gün gruplu: Today / Yesterday / tarih)
- [ ] Boş durum (3 iskelet satır + kopya, §5.12)
- [ ] Free kilidi: 3 kayıttan eskisi kilitli satır → paywall köprüsü
- [ ] Oturum detayı: mini harita + foto + not + süre + maliyet + tasarruf
- [ ] İstatistik blokları: toplam park · toplam süre · toplam harcama · toplam tasarruf (§11.2 reçetesi)
- [ ] Aylık özet + "Share" (story kartı, §11.1)

## 10. Ayarlar — pageSheet (§7.9)

- [ ] Tema: light / dark / system
- [ ] Dil: EN / TR
- [ ] Para birimi
- [ ] Uyarı eşiği (varsayılan 15 dk)
- [ ] Araçlar: tek araç (free) / çoklu araç yönetimi (premium)
- [ ] Oto-algılama kurulumu girişi (premium, §7.4b'ye köprü)
- [ ] Abonelik durumu + yönet + restore purchases
- [ ] Bildirim/konum izin durumları + Settings deep link satırları (§5.11 kalıbı)
- [ ] Veri: dışa aktar / tümünü sil (cihaz-yerel)
- [ ] Hakkında: sürüm, gizlilik politikası, kullanım şartları, destek, rate us

## 11. Paywall — pageSheet (§7.10)

- [ ] Plan kartları: aylık · yıllık · lifetime (RevenueCat offering)
- [ ] Premium özellik listesi (free/premium tablosuna sadık)
- [ ] Restore purchases + yasal satırlar
- [ ] Tetik noktaları: ilk varyant-c kutlaması sonrası · geçmiş kilidi · OCR limiti · LA teşviki

## 12. Live Activity + Dynamic Island + Widget (§8)

- [ ] LA — tarifeli durum: geri sayım hero + elapsed ikincil + çubuk + para footer'ı
- [ ] LA — tarifesiz durum: elapsed hero, çubuk gizli
- [ ] LA — amber eşik durumu (≤15 dk)
- [ ] LA — bitiş karesi: 3 sn yeşil flip "SAVED ₺50." (§8.5)
- [ ] Dynamic Island: compact / minimal / expanded
- [ ] Widget systemSmall: hero rakam + yer overline
- [ ] Widget systemMedium: mini LA (çubuk dahil)
- [ ] Widget oturumsuz durumu: "No active session" + aylık tasarruf
- [ ] Bildirim: dilim uyarısı (local, eşikten önce zamanlanır — free'nin tek kanalı)
- [ ] Bildirim: oto-algılama onayı (premium)
- [ ] Bildirim: unutulan oturum (24s, nazik)

## 13. Paylaşım yüzeyleri (§11)

- [ ] Konum paylaşım linki üretimi (veri linkin içinde)
- [ ] Paylaşım web sayfası (parkiq-backend): harita + pin + "ParkIQ ile paylaşıldı → indir"
- [ ] Tasarruf kartı 9:16 (oturum sonu)
- [ ] Aylık özet kartı 9:16

## 14. Kesişen durumlar (her ekranda geçerli)

- [ ] Offline satırı (§5.11)
- [ ] İzin reddi satırları: konum / bildirim / kamera (§5.11 kalıbı)
- [ ] Boş durumlar (§5.12)
- [ ] Reduced-motion davranışları (§9)
- [ ] Dynamic Type desteği (poster katmanı hariç, §3.4)
- [ ] Dark mode — her yüzeyin iki tema hali
