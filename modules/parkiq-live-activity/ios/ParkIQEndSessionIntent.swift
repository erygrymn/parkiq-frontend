// ⚠️ İKİZ DOSYA — targets/widget/ParkIQEndSessionIntent.swift ile
// modules/parkiq-live-activity/ios/ParkIQEndSessionIntent.swift BİREBİR AYNI kalmalı.
//
// Kilit ekranındaki "Bitir" düğmesi (design.md §8). LiveActivityIntent uygulamanın
// SÜRECİNDE koşar (app kapalıysa arka planda açılır); düğme ise widget extension'da
// çizilir. Tip iki hedefte de derlenmek zorunda — ParkIQAttributes ile aynı sebep.
//
// Burada oturum matematiği yok: niyet yalnız bitiş anını App Group kutusuna yazar ve
// kartı söndürür. Kaydı RN kapatır (o anı okur, `endSession(at)`), kutlama kapağı app
// açılınca görülür. Bu yüzden düğmeye basmak app'i açmaz — tek dokunuş, bitti.

import ActivityKit
import AppIntents
import Foundation

@available(iOS 17.0, *)
struct ParkIQEndSessionIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "End parking"
  static var isDiscoverable: Bool = false

  func perform() async throws -> some IntentResult {
    if let defaults = UserDefaults(suiteName: "group.parkiq.shared") {
      defaults.set(Date().timeIntervalSince1970 * 1000, forKey: "pendingEndAtMs")
      // Ana ekran widget'ı bir sonraki tazelemede "oturum yok" durumuna döner.
      defaults.removeObject(forKey: "startedAtMs")
    }
    for activity in Activity<ParkIQAttributes>.activities {
      await activity.end(nil, dismissalPolicy: .immediate)
    }
    return .result()
  }
}
