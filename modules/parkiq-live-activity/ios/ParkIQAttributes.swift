// ⚠️ İKİZ DOSYA — targets/widget/ParkIQAttributes.swift ile BİREBİR AYNI kalmalı.
//
// Live Activity'de app ve widget extension ayrı ikililerdir; ActivityKit tipleri
// isim + Codable gösterimi üzerinden eşleştirir, o yüzden tanımın iki hedefte de
// derlenmesi gerekir (Apple'ın kendi örnekleri de dosyayı iki hedefe ekler).
// Bu kopya olmadan modülün Swift'i `ParkIQAttributes`'ı göremez.
// Biri değişirse diğeri de değişecek.
//
// design.md §8 — Live Activity veri sözleşmesi.
//
// BAĞLAYICI: Extension KENDİ MATEMATİĞİNİ ASLA TÜRETMEZ ve SÖZLÜK TAŞIMAZ. Fiyatlar
// `tariffMath`ten, metinler dile çevrilmiş olarak RN'den gelir; burada yalnız render var.
//
// Değişmez alan YOKTUR: yer adı ve kat da ContentState'tedir. ActivityAttributes alanları
// oturum boyunca sabittir; park anından SONRA girilen kat/konum kilit ekranında hiç
// görünmüyordu.
//
// Zaman alanları (`startedAt`, `tierStartedAt`, `nextBoundaryAt`) sözleşmenin canlı
// tarafıdır: SwiftUI bunları `Text(timerInterval:)` ve `ProgressView(timerInterval:)` ile
// KENDİ KENDİNE akıtır. App arka planda hiç çalışmasa da sayaç ve çubuk ilerler; RN'den
// gelen güncelleme yalnız para metinleri ve dilim değişimi için gerekir.

import ActivityKit
import Foundation

struct ParkIQAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    /// Etkin başlangıç (backdate uygulanmış) — geçen süre sayacı bundan akar.
    let startedAt: Date
    /// Yer adı ve kat: oturum sürerken düzenlenebilir, o yüzden değişken tarafta.
    let placeName: String?
    let floor: String?
    /// İçinde bulunulan dilimin başlangıcı — çubuk bu aralıkta kendi kendine dolar.
    let tierStartedAt: Date?
    /// Sonraki FİYAT ARTIŞI sınırı; yoksa nil (tarifesiz/son dilim).
    let nextBoundaryAt: Date?
    /// "green" | "amber-approaching" | "amber-exceeded" — §5.9 durum makinesi.
    let barTone: String
    /// Biçimlenmiş para metinleri — extension formatlama yapmaz.
    let nowPriceText: String?
    let nextPriceText: String?
    /// Bitiş karesi (§8.5): 3 sn'lik yeşil flip için doldurulur.
    let finalStampText: String?
    /// Sayacın üstündeki etiket, DİLE ÇEVRİLMİŞ olarak RN'den gelir
    /// ("PARK EDİLDİ" / "SONRAKİ DİLİM ₺300"). Extension'ın sözlüğü yoktur.
    let heroLabel: String?
    /// Alt satır, dile çevrilmiş ("Şimdi ₺150 · Sonra ₺300").
    let footerText: String?
  }
}
