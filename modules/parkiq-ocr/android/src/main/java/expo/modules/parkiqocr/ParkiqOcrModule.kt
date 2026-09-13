package expo.modules.parkiqocr

import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Cihaz üstü metin tanıma — ML Kit (paketle gelen model). iOS'taki Vision
// modülünün birebir karşılığı: görsel telefondan ÇIKMAZ, ağ isteği yok, kota yok,
// çevrimdışı çalışır. Otopark bodrumunda sinyal olmadan da pano okunabilsin diye.
//
// TS tarafı (ocrRows + tariffParser, ~590 satır) platformdan bağımsızdır ve
// DEĞİŞMEZ; bu dosyanın tek işi ML Kit çıktısını Vision'ın koordinat uzayına
// çevirmek.

class ParkiqOcrModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ParkiqOcr")

    // Girdi: file:// URI. Çıktı: metin BLOKLARI + normalize konumları.
    // Konum şart: tarife panoları iki sütunlu tablodur ("0-30 DK" | "ÜCRETSİZ")
    // ve tanıyıcı her hücreyi ayrı döndürür. Sırf metin dönersek süre ile fiyat
    // eşleşemez; satırları TS tarafı geometriden yeniden kurar.
    AsyncFunction("recognizeText") { uri: String, promise: Promise ->
      val context = appContext.reactContext
      if (context == null) {
        promise.reject("E_CONTEXT", "No React context", null)
        return@AsyncFunction
      }

      val image = try {
        InputImage.fromFilePath(context, Uri.parse(uri))
      } catch (error: Throwable) {
        promise.reject("E_IMAGE", "Could not read image at $uri", error)
        return@AsyncFunction
      }

      // Genişlik/yükseklik döndürmeden SONRA okunur: 90°/270° çekilmiş fotoğrafta
      // ML Kit kutuları döndürülmüş çerçeveye göre verir, ham piksele göre değil.
      val rotated = image.rotationDegrees == 90 || image.rotationDegrees == 270
      val width = (if (rotated) image.height else image.width).toFloat()
      val height = (if (rotated) image.width else image.height).toFloat()
      if (width <= 0f || height <= 0f) {
        promise.reject("E_IMAGE", "Image has no size", null)
        return@AsyncFunction
      }

      TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
        .process(image)
        .addOnSuccessListener { result ->
          val blocks = mutableListOf<Map<String, Any>>()
          for (block in result.textBlocks) {
            for (line in block.lines) {
              val text = line.text
              if (text.isBlank()) continue
              val box = line.boundingBox ?: continue
              /* KOORDİNAT ÇEVİRİSİ — bu satırlar atlanırsa tarife SESSİZCE yanlış okunur.
                 ML Kit: piksel, origin SOL-ÜST, y aşağı büyür.
                 Vision (TS tarafının beklediği): 0–1 normalize, origin SOL-ALT, y yukarı büyür.
                 `ocrRows` satırları y'ye göre azalan sıralıyor; çevirmezsek pano baş aşağı
                 okunur ve her fiyat bir sonraki dilimle eşleşir. */
              blocks.add(
                mapOf(
                  "text" to text,
                  "x" to (box.left / width),
                  "y" to (1f - (box.exactCenterY() / height)),
                  "height" to (box.height() / height),
                )
              )
            }
          }
          promise.resolve(blocks)
        }
        .addOnFailureListener { error ->
          promise.reject("E_MLKIT", error.localizedMessage ?: "Text recognition failed", error)
        }
    }
  }
}
