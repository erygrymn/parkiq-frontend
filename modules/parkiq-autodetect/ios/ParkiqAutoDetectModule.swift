import AVFoundation
import ExpoModulesCore

// §7.4b Oto-algılama (premium). Araç ses cihazı (Bluetooth/CarPlay) BAĞLANTISI
// koptuğunda "araçtan indi" sinyali üretir — RN tarafı konumu kaydeder ve
// kullanıcıya "sayaç başlasın mı?" bildirimi gönderir.
//
// Neden ses rotası: CoreBluetooth taraması sürekli izin + pil ister ve arka planda
// güvenilmezdir. AVAudioSession rota değişimi araç bağlantısı için hem doğru
// hem bedava sinyaldir; CarPlay de aynı olayı üretir.

public class ParkiqAutoDetectModule: Module {
  private var observing = false

  public func definition() -> ModuleDefinition {
    Name("ParkiqAutoDetect")

    Events("onCarDisconnected", "onCarConnected")

    Function("isSupported") { () -> Bool in true }

    /// Şu an araç ses cihazına bağlı mı (kurulum ekranında "aracına bağlan" için).
    Function("isConnectedToCar") { () -> Bool in
      Self.carPortName(in: AVAudioSession.sharedInstance().currentRoute) != nil
    }

    Function("start") {
      guard !self.observing else { return }
      self.observing = true
      try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, options: [.mixWithOthers])
      try? AVAudioSession.sharedInstance().setActive(true, options: [])
      NotificationCenter.default.addObserver(
        self,
        selector: #selector(self.routeChanged(_:)),
        name: AVAudioSession.routeChangeNotification,
        object: nil
      )
    }

    Function("stop") {
      guard self.observing else { return }
      self.observing = false
      NotificationCenter.default.removeObserver(self, name: AVAudioSession.routeChangeNotification, object: nil)
    }

    OnDestroy {
      NotificationCenter.default.removeObserver(self)
    }
  }

  /// YALNIZ CarPlay araç sayılır.
  ///
  /// `.bluetoothA2DP` de buradaydı ama o türü AirPods, kulaklıklar ve taşınabilir
  /// hoparlörler de kullanıyor: kulaklığı çıkarmak "park ettin mi?" sorusu
  /// üretiyordu. Yanlış algı burada iki kat pahalı — kullanıcı hem gereksiz
  /// bildirim alıyor hem de uygulamanın Bluetooth'unu dinlediğini düşünüyor,
  /// ki bu pazarda en sert 1★ sebeplerinden biri.
  private static func carPortName(in route: AVAudioSessionRouteDescription) -> String? {
    for output in route.outputs where output.portType == .carAudio {
      return output.portName
    }
    return nil
  }

  @objc private func routeChanged(_ notification: Notification) {
    guard
      let info = notification.userInfo,
      let rawReason = info[AVAudioSessionRouteChangeReasonKey] as? UInt,
      let reason = AVAudioSession.RouteChangeReason(rawValue: rawReason)
    else { return }

    switch reason {
    case .oldDeviceUnavailable:
      // Bağlantı koptu: önceki rota araçsa "park etti" say.
      let previous = info[AVAudioSessionRouteChangePreviousRouteKey] as? AVAudioSessionRouteDescription
      if let name = previous.flatMap({ Self.carPortName(in: $0) }) {
        sendEvent("onCarDisconnected", ["deviceName": name])
      }
    case .newDeviceAvailable:
      if let name = Self.carPortName(in: AVAudioSession.sharedInstance().currentRoute) {
        sendEvent("onCarConnected", ["deviceName": name])
      }
    default:
      break
    }
  }
}
