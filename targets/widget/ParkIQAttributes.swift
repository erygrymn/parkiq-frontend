import ActivityKit
import Foundation

// design.md §8 — Live Activity veri sözleşmesi.
//
// BAĞLAYICI: Bu extension KENDİ MATEMATİĞİNİ ASLA TÜRETMEZ. Segment yüzdeleri,
// knob konumu, amber durumu ve sınır zamanları RN tarafındaki paylaşılan saf
// modülden (tariffMath) gelir ve ContentState'e yazılır. Burada yalnız render var.
// Aynı token + aynı formül + tek veri kaynağı (§5.9).
//
// Aynı kural METİN için de geçerli: görünen her etiket dile çevrilmiş halde
// RN'den gelir; extension'ın kendi sözlüğü yoktur.
//
// ⚠️ İKİZ DOSYA — modules/parkiq-live-activity/ios/ParkIQAttributes.swift ile
// BİREBİR AYNI kalmalı. Sebebi için oradaki nota bak.

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
