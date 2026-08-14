import ExpoModulesCore
import Vision
import UIKit

// Cihaz üstü metin tanıma — Apple Vision. Görsel telefondan ÇIKMAZ:
// ağ isteği yok, üçüncü parti servis yok, kota yok, çevrimdışı çalışır.
// Otopark bodrumunda sinyal olmadan da tarife panosu okunabilsin diye böyle.

public class ParkiqOcrModule: Module {
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

      // Türkçe destekleniyorsa ekle; desteklenmiyorsa varsayılan dil seti kullanılır.
      if let supported = try? VNRecognizeTextRequest.supportedRecognitionLanguages(
        for: .accurate, revision: VNRecognizeTextRequestRevision3
      ) {
        let preferred = ["tr-TR", "en-US"].filter { supported.contains($0) }
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
