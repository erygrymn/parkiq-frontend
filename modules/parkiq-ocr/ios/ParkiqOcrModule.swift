import ExpoModulesCore
import Vision
import UIKit

// Cihaz üstü metin tanıma — Apple Vision. Görsel telefondan ÇIKMAZ:
// ağ isteği yok, üçüncü parti servis yok, kota yok, çevrimdışı çalışır.
// Otopark bodrumunda sinyal olmadan da tarife panosu okunabilsin diye böyle.

public class ParkiqOcrModule: Module {
  /// Bölgenin pano dili: kullanıcının telefonu İngilizce olsa da Tokyo'daki pano Japoncadır.
  private static let regionLanguage: [String: String] = [
    "TR": "tr-TR", "DE": "de-DE", "AT": "de-DE", "CH": "de-DE", "FR": "fr-FR", "BE": "fr-FR",
    "ES": "es-ES", "MX": "es-ES", "IT": "it-IT", "NL": "nl-NL", "SE": "sv-SE", "PT": "pt-BR",
    "BR": "pt-BR", "JP": "ja-JP", "KR": "ko-KR", "TW": "zh-Hant", "HK": "zh-Hant", "MO": "zh-Hant",
    "CN": "zh-Hans",
  ]

  /**
   * Tanıma dilleri: önce kullanıcının dilleri, sonra bulunduğu bölgenin dili, sonra İngilizce
   * ve Türkçe. Japonca, Korece ve Çince karakterler yalnız o dil listede varsa tanınıyor; liste
   * sabit tr/en iken o panolar hiç okunmuyordu. Liste kısa tutulur: her ek dil doğruluğu düşürür.
   */
  static func recognitionLanguages(supported: [String]) -> [String] {
    var wanted = Locale.preferredLanguages
    if let region = Locale.current.region?.identifier, let language = regionLanguage[region] {
      wanted.append(language)
    }
    wanted += ["en-US", "tr-TR"]
    var result: [String] = []
    for identifier in wanted {
      guard let match = visionLanguage(for: identifier, supported: supported), !result.contains(match) else {
        continue
      }
      result.append(match)
      if result.count == 4 { break }
    }
    return result
  }

  /// "pt-PT" → "pt-BR", "zh-Hant-TW" → "zh-Hant", "en-GB" → "en-US": dil eşleşir, bölge eşleşmese de.
  private static func visionLanguage(for identifier: String, supported: [String]) -> String? {
    if supported.contains(identifier) { return identifier }
    let parts = identifier.split(separator: "-").map(String.init)
    guard let language = parts.first else { return nil }
    if language == "zh" {
      let traditional = parts.contains("Hant") || parts.contains("TW") || parts.contains("HK") || parts.contains("MO")
      let script = traditional ? "zh-Hant" : "zh-Hans"
      return supported.contains(script) ? script : nil
    }
    return supported.first { $0 == language || $0.hasPrefix(language + "-") }
  }

  public func definition() -> ModuleDefinition {
    Name("ParkiqOcr")

    // Girdi: file:// URI. Çıktı: metin BLOKLARI + normalize konumları.
    // Konum şart: tarife panoları iki sütunlu tablodur ("0-30 DK" | "ÜCRETSİZ")
    // ve Vision her hücreyi AYRI gözlem döndürür. Sırf metin dönersek süre ile
    // fiyat eşleşemez; satırları TS tarafı geometriden yeniden kurar.
    AsyncFunction("recognizeText") { (uri: String, promise: Promise) in
      guard let url = URL(string: uri),
            let data = try? Data(contentsOf: url),
            let image = UIImage(data: data),
            let cgImage = image.cgImage else {
        promise.reject("E_IMAGE", "Could not read image at \(uri)")
        return
      }

      let request = VNRecognizeTextRequest { request, error in
        if let error = error {
          promise.reject("E_VISION", error.localizedDescription)
          return
        }
        let observations = request.results as? [VNRecognizedTextObservation] ?? []
        // Vision'ın origin'i sol-ALT, koordinatlar 0–1 normalize.
        let blocks: [[String: Any]] = observations.compactMap { observation in
          guard let text = observation.topCandidates(1).first?.string,
                !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return nil }
          let box = observation.boundingBox
          return [
            "text": text,
            "x": box.minX,
            "y": box.midY,
            "height": box.height,
          ]
        }
        promise.resolve(blocks)
      }

      request.recognitionLevel = .accurate
      // Fiyat/rakam okurken dil düzeltmesi zarar verir (50 → "SO" gibi).
      request.usesLanguageCorrection = false

      // Örnek üstündeki sorgu, isteğin KENDİ seviyesi ve revizyonu için yanıt verir —
      // tip üstündeki karşılığı iOS 15'te bırakıldı ve revizyonu elle yazmayı gerektiriyordu.
      if let supported = try? request.supportedRecognitionLanguages() {
        let preferred = ParkiqOcrModule.recognitionLanguages(supported: supported)
        if !preferred.isEmpty {
          request.recognitionLanguages = preferred
        }
      }

      let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
      DispatchQueue.global(qos: .userInitiated).async {
        do {
          try handler.perform([request])
        } catch {
          promise.reject("E_VISION", error.localizedDescription)
        }
      }
    }
  }
}
