// ⚠️ İKİZ DOSYA — targets/widget/ParkIQAttributes.swift ile BİREBİR AYNI kalmalı.
//
// Live Activity'de app ve widget extension ayrı ikililerdir; ActivityKit tipleri
// isim + Codable gösterimi üzerinden eşleştirir, o yüzden tanımın iki hedefte de
// derlenmesi gerekir (Apple'ın kendi örnekleri de dosyayı iki hedefe ekler).
// Bu kopya olmadan modülün Swift'i `ParkIQAttributes`'ı göremez.
// Biri değişirse diğeri de değişecek.

import ActivityKit
import Foundation

struct TariffSegmentState: Codable, Hashable {
  let widthPct: Double
  let cumulativePriceText: String
  let passed: Bool
  let active: Bool
}

struct ParkIQAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    /// Etkin başlangıç (backdate uygulanmış) — geçen süre sayacı bundan akar.
    let startedAt: Date
    /// Sonraki FİYAT ARTIŞI sınırı; yoksa nil (tarifesiz/son dilim).
    /// Yalnız bayatlama (staleDate) ve ton için; ekranda geri sayım GÖSTERİLMEZ.
    let nextBoundaryAt: Date?
    /// "green" | "amber-approaching" | "amber-exceeded" — §5.9 durum makinesi.
    let barTone: String
    /// Çubuk segmentleri; boşsa çubuk gizlenir (tarifesiz/flat mod).
    let segments: [TariffSegmentState]
    /// Knob konumu 0–100; nil ise knob çizilmez.
    let knobPct: Double?
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

  /// Oturum boyunca değişmeyen bilgi.
  let placeName: String?
  let floor: String?
}
