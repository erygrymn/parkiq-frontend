import ActivityKit
import ExpoModulesCore
import WidgetKit

// RN → Live Activity köprüsü. RN yalnız tariffMath ÇIKTISINI gönderir;
// bu modül onu ContentState'e yazar, extension render eder (design.md §8).
// Kendi matematiğini türeten hiçbir satır yoktur.

public class ParkiqLiveActivityModule: Module {
  private let appGroup = "group.parkiq.shared"

  public func definition() -> ModuleDefinition {
    Name("ParkiqLiveActivity")

    Function("isSupported") { () -> Bool in
      if #available(iOS 16.2, *) {
        return ActivityAuthorizationInfo().areActivitiesEnabled
      }
      return false
    }

    AsyncFunction("start") { (payload: [String: Any]) -> String? in
      guard #available(iOS 16.2, *) else { return nil }
      let attributes = ParkIQAttributes(
        placeName: payload["placeName"] as? String,
        floor: payload["floor"] as? String
      )
      guard let state = Self.contentState(from: payload) else { return nil }
      do {
        let activity = try Activity.request(
          attributes: attributes,
          content: .init(state: state, staleDate: Self.staleDate(from: payload))
        )
        return activity.id
      } catch {
        return nil
      }
    }

    AsyncFunction("update") { (payload: [String: Any]) in
      guard #available(iOS 16.2, *), let state = Self.contentState(from: payload) else { return }
      for activity in Activity<ParkIQAttributes>.activities {
        await activity.update(.init(state: state, staleDate: Self.staleDate(from: payload)))
      }
    }

    // §8.5 bitiş karesi: son güncelleme yeşil flip'i gösterir, 3 sn sonra kalkar.
    AsyncFunction("end") { (payload: [String: Any]) in
      guard #available(iOS 16.2, *) else { return }
      let finalState = Self.contentState(from: payload)
      for activity in Activity<ParkIQAttributes>.activities {
        if let finalState {
          await activity.end(.init(state: finalState, staleDate: nil), dismissalPolicy: .after(.now + 3))
        } else {
          await activity.end(nil, dismissalPolicy: .immediate)
        }
      }
    }

    /// Widget'ın okuduğu paylaşılan kutu (§8.3). Oturum yoksa alanlar temizlenir.
    Function("setWidgetData") { (payload: [String: Any]) in
      let defaults = UserDefaults(suiteName: self.appGroup)
      if let startedAtMs = payload["startedAtMs"] as? Double {
        defaults?.set(startedAtMs, forKey: "startedAtMs")
      } else {
        defaults?.removeObject(forKey: "startedAtMs")
      }
      defaults?.set(payload["placeName"] as? String, forKey: "placeName")
      defaults?.set(payload["monthlySavedText"] as? String, forKey: "monthlySavedText")
      if #available(iOS 14.0, *) {
        WidgetCenter.shared.reloadAllTimelines()
      }
    }
  }

  @available(iOS 16.2, *)
  private static func contentState(from payload: [String: Any]) -> ParkIQAttributes.ContentState? {
    guard let startedAtMs = payload["startedAtMs"] as? Double else { return nil }

    let rawSegments = payload["segments"] as? [[String: Any]] ?? []
    let segments = rawSegments.map { segment in
      TariffSegmentState(
        widthPct: segment["widthPct"] as? Double ?? 0,
        cumulativePriceText: segment["cumulativePriceText"] as? String ?? "",
        passed: segment["passed"] as? Bool ?? false,
        active: segment["active"] as? Bool ?? false
      )
    }

    return ParkIQAttributes.ContentState(
      startedAt: Date(timeIntervalSince1970: startedAtMs / 1000),
      nextBoundaryAt: (payload["nextBoundaryAtMs"] as? Double).map {
        Date(timeIntervalSince1970: $0 / 1000)
      },
      barTone: payload["barTone"] as? String ?? "green",
      segments: segments,
      knobPct: payload["knobPct"] as? Double,
      nowPriceText: payload["nowPriceText"] as? String,
      nextPriceText: payload["nextPriceText"] as? String,
      finalStampText: payload["finalStampText"] as? String
    )
  }

  @available(iOS 16.2, *)
  private static func staleDate(from payload: [String: Any]) -> Date? {
    // Sınır geçilince içerik bayatlar; sistem bir sonraki güncellemeyi bekler.
    (payload["nextBoundaryAtMs"] as? Double).map { Date(timeIntervalSince1970: $0 / 1000) }
  }
}
