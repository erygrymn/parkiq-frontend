import ExpoModulesCore
import Vision
import UIKit

// Cihaz üstü metin tanıma — Apple Vision. Görsel telefondan ÇIKMAZ:
// ağ isteği yok, üçüncü parti servis yok, kota yok, çevrimdışı çalışır.
// Otopark bodrumunda sinyal olmadan da tarife panosu okunabilsin diye böyle.

public class ParkiqOcrModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ParkiqOcr")

    // Girdi: file:// URI. Çıktı: tanınan metin satırları (yukarıdan aşağıya).
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
        // Vision'ın origin'i sol-ALT; panoyu okuma sırasına çevirmek için y'ye göre tersten sırala.
        let lines = observations
          .sorted { $0.boundingBox.maxY > $1.boundingBox.maxY }
          .compactMap { $0.topCandidates(1).first?.string }
        promise.resolve(lines)
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
