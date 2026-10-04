import ExpoModulesCore
import UIKit

// Ana ekran kısayolları — ikona uzun basınca: oturum yokken "Park Ettim", varken "Arabamı Bul".
//
// Öğeler JS'ten DİNAMİK kurulur (`UIApplication.shortcutItems`): başlıklar zaten dile
// çevrilmiş gelir, Info.plist'te sabit liste ve her dil için ayrı .strings gerekmez. Bedeli,
// kısayolların uygulama ilk açıldıktan sonra görünmesi.
//
// Seçilen eylem JS hazır olana kadar burada bekler: soğuk açılışta eylem, köprü kurulmadan
// gelir ve olay olarak gönderilse kaybolurdu.
//
// Eylem TEK yoldan gelir: `performActionFor`. Expo'nun app delegate'i didFinishLaunching'den
// her zaman true döndürdüğü için iOS soğuk açılıştaki kısayolu da oraya iletir. launchOptions'tan
// ayrıca okumak aynı eylemi iki kez teslim ediyordu; ikinci kopya JS dinlemeye başlamadan kutuda
// kalırsa bir sonraki kök kurulumunda (dil değişimi) istenmeyen bir park başlatıyordu.

enum QuickActionInbox {
  // Kutu ana iş parçacığında yazılır, JS iş parçacığında okunur.
  private static let lock = NSLock()
  private static var pending: String?
  private static weak var listener: ParkiqQuickActionsModule?

  /// Dinleyen varsa olay olarak gönderir, yoksa JS hazır olana kadar saklar.
  static func deliver(_ type: String) {
    lock.lock()
    let target = listener
    if target == nil { pending = type }
    lock.unlock()
    target?.sendEvent("onAction", ["type": type])
  }

  /// JS dinlemeye başladı: kutuda bekleyen eylem varsa hemen gönderilir.
  static func startListening(_ module: ParkiqQuickActionsModule) {
    lock.lock()
    listener = module
    let waiting = pending
    pending = nil
    lock.unlock()
    if let waiting { module.sendEvent("onAction", ["type": waiting]) }
  }

  static func stopListening() {
    lock.lock()
    listener = nil
    lock.unlock()
  }

  /// Bekleyen eylem — bir kez okunur.
  static func take() -> String? {
    lock.lock()
    defer { lock.unlock() }
    let type = pending
    pending = nil
    return type
  }
}

public class ParkiqQuickActionsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ParkiqQuickActions")

    Events("onAction")

    OnStartObserving {
      QuickActionInbox.startListening(self)
    }

    OnStopObserving {
      QuickActionInbox.stopListening()
    }

    /// Soğuk açılışta bekleyen eylem — bir kez okunur.
    Function("takePending") { () -> String? in
      QuickActionInbox.take()
    }

    /// [{ type, title, symbol }] — boş dizi hepsini kaldırır.
    Function("setItems") { (items: [[String: String]]) in
      let shortcuts = items.compactMap { item -> UIApplicationShortcutItem? in
        guard let type = item["type"], let title = item["title"] else { return nil }
        let icon = item["symbol"].map { UIApplicationShortcutIcon(systemImageName: $0) }
        return UIApplicationShortcutItem(
          type: type, localizedTitle: title, localizedSubtitle: nil, icon: icon, userInfo: nil)
      }
      DispatchQueue.main.async {
        UIApplication.shared.shortcutItems = shortcuts
      }
    }
  }
}

/// Kısayolla açılış ve açıkken seçim, ikisi de buradan kutuya düşer.
public class ParkiqQuickActionsAppDelegateSubscriber: ExpoAppDelegateSubscriber {
  public func application(
    _ application: UIApplication,
    performActionFor shortcutItem: UIApplicationShortcutItem,
    completionHandler: @escaping (Bool) -> Void
  ) {
    QuickActionInbox.deliver(shortcutItem.type)
    completionHandler(true)
  }
}
