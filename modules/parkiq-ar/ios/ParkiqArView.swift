import ARKit
import ExpoModulesCore
import RealityKit

// §7.6 AR — arabanın konumuna DÜNYAYA SABİTLENMİŞ ışık huzmesi.
//
// Yaklaşım (ar-find-my-car.md): ARWorldTrackingConfiguration +
// worldAlignment = .gravityAndHeading. Bu hizalamada dünya eksenleri gerçek
// kuzeye kilitlenir: +x = doğu, +y = yukarı, −z = kuzey. Böylece GPS'ten
// hesaplanan doğu/kuzey ofseti doğrudan ARKit dünya koordinatına çevrilebilir.
//
// Sürüklenme (drift) yönetimi: sahne bir kez yerleştirilip bırakılmaz. Her yeni
// GPS düzeltmesinde hedef, KAMERANIN O ANKİ dünya konumundan yeniden türetilir.
// Böylece ARKit'in metrelerce yürüyünce biriken hatası her düzeltmede sıfırlanır.

private enum Palette {
  static let green = UIColor(red: 0x2F / 255, green: 0xE0 / 255, blue: 0x7A / 255, alpha: 1)
}

// RealityKit'in `generateCylinder`/`generateCone` ilkelleri iOS 18 istiyor;
// ParkIQ iOS 16.4'ten itibaren çalışıyor. Aynı biçimler iOS 13'ten beri var olan
// ilkellerle kuruluyor ve sonuç görsel olarak ayırt edilemez:
//   silindir = köşe yarıçapı yarım genişliğe eşit KUTU (kesiti daire olur)
//   daire    = köşe yarıçapı yarım genişliğe eşit DÜZLEM
private enum Scene {
  /// Huzme uzaktan da görünsün diye gökyüzüne uzanır (metre).
  static let beamHeight: Float = 60
  static let beamRadius: Float = 0.22
  /// Zemindeki taban halkasının yarıçapı (metre).
  static let ringRadius: Float = 1.1
  /// Zemin oklarının aralığı ve en fazla kaç tanesinin çizileceği.
  static let chevronSpacing: Float = 3
  static let chevronCount = 14
  /// Kameranın göz hizası — zemin bu kadar aşağıdadır (metre).
  static let eyeHeight: Float = 1.5
  /// Hedef bu kadar oynamadıysa sahneyi tazeleme (GPS gürültüsü titretmesin).
  static let repositionThreshold: Float = 1.0
  /// Bu mesafenin altında araba GÖRÜŞ ALANINDADIR: göğe uzanan huzme artık
  /// yardımcı değil, engeldir — yerini zemindeki işarete bırakır (geo.NEAR_DISTANCE_M).
  static let nearDistance: Float = 20
}

public final class ParkiqArView: ExpoView, ARSessionDelegate {
  private let arView = ARView(frame: .zero)
  private let coaching = ARCoachingOverlayView()
  private let anchor = AnchorEntity(world: .zero)

  private var beam: ModelEntity?
  private var ring: ModelEntity?
  private var chevrons: [ModelEntity] = []

  /// Arabanın koordinatı (RN'den gelir).
  private var carLatitude: Double?
  private var carLongitude: Double?
  /// Kullanıcının son GPS düzeltmesi (RN'deki tek konum akışından gelir).
  private var userLatitude: Double?
  private var userLongitude: Double?

  private var placedTarget: SIMD3<Float>?
  private var trackingReady = false

  let onStatus = EventDispatcher()

  public required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    setUpScene()
  }

  // MARK: - Kurulum

  private func setUpScene() {
    clipsToBounds = true
    arView.frame = bounds
    arView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    // Sahnede gerçek ışık yok; her şey unlit (kendi ışığını veren) malzeme.
    arView.environment.background = .cameraFeed()
    addSubview(arView)

    arView.scene.addAnchor(anchor)
    arView.session.delegate = self

    coaching.session = arView.session
    coaching.goal = .tracking
    coaching.activatesAutomatically = true
    coaching.translatesAutoresizingMaskIntoConstraints = false
    arView.addSubview(coaching)
    NSLayoutConstraint.activate([
      coaching.leadingAnchor.constraint(equalTo: arView.leadingAnchor),
      coaching.trailingAnchor.constraint(equalTo: arView.trailingAnchor),
      coaching.topAnchor.constraint(equalTo: arView.topAnchor),
      coaching.bottomAnchor.constraint(equalTo: arView.bottomAnchor),
    ])

    buildEntities()
    startSession()
  }

  private func startSession() {
    guard ARWorldTrackingConfiguration.isSupported else {
      onStatus(["state": "unsupported"])
      return
    }
    let configuration = ARWorldTrackingConfiguration()
    // KRİTİK: pusulaya hizalanmadan GPS ofseti dünya koordinatına çevrilemez.
    configuration.worldAlignment = .gravityAndHeading
    configuration.planeDetection = []
    arView.session.run(configuration, options: [.resetTracking, .removeExistingAnchors])
    onStatus(["state": "initializing"])
  }

  public func pause() {
    arView.session.pause()
  }

  // MARK: - Sahne

  private func unlit(_ color: UIColor, alpha: CGFloat = 1) -> UnlitMaterial {
    var material = UnlitMaterial(color: color.withAlphaComponent(alpha))
    material.blending = .transparent(opacity: .init(floatLiteral: Float(alpha)))
    return material
  }

  private func buildEntities() {
    let beamEntity = ModelEntity(
      mesh: .generateBox(
        width: Scene.beamRadius * 2,
        height: Scene.beamHeight,
        depth: Scene.beamRadius * 2,
        cornerRadius: Scene.beamRadius
      ),
      materials: [unlit(Palette.green, alpha: 0.85)]
    )
    anchor.addChild(beamEntity)
    beam = beamEntity

    // Tabandaki halka: arabanın durduğu noktayı zeminde işaretler. Zemine yatık
    // bir daire; kalınlığı olmadığı için yukarıdan bakışta fark etmez.
    let ringEntity = ModelEntity(
      mesh: .generatePlane(
        width: Scene.ringRadius * 2,
        depth: Scene.ringRadius * 2,
        cornerRadius: Scene.ringRadius
      ),
      materials: [unlit(Palette.green, alpha: 0.5)]
    )
    anchor.addChild(ringEntity)
    ring = ringEntity

    // Zemin okları: kullanıcıdan arabaya uzanan yol.
    for _ in 0..<Scene.chevronCount {
      let chevron = ModelEntity()
      for side in [Float(-1), Float(1)] {
        let arm = ModelEntity(
          mesh: .generateBox(size: [0.07, 0.02, 0.75], cornerRadius: 0.02),
          materials: [unlit(Palette.green, alpha: 0.7)]
        )
        arm.orientation = simd_quatf(angle: side * .pi / 5, axis: [0, 1, 0])
        arm.position = [side * 0.16, 0, 0]
        chevron.addChild(arm)
      }
      chevron.isEnabled = false
      anchor.addChild(chevron)
      chevrons.append(chevron)
    }
  }

  // MARK: - RN'den gelen değerler

  func setCar(latitude: Double, longitude: Double) {
    carLatitude = latitude
    carLongitude = longitude
    refreshTarget()
  }

  func setUser(latitude: Double, longitude: Double) {
    userLatitude = latitude
    userLongitude = longitude
    refreshTarget()
  }

  /// GPS ofsetini (metre) doğu/kuzey olarak verir.
  private func offsetMeters(fromLat: Double, fromLon: Double, toLat: Double, toLon: Double) -> (
    east: Double, north: Double
  ) {
    let earthRadius = 6_371_000.0
    let toRadians = Double.pi / 180
    let north = (toLat - fromLat) * toRadians * earthRadius
    let east = (toLon - fromLon) * toRadians * earthRadius * cos(fromLat * toRadians)
    return (east, north)
  }

  /// Hedefi KAMERANIN ŞU ANKİ dünya konumundan yeniden türetir.
  /// Sahneyi bir kez yerleştirip bırakmak, yürüdükçe biriken ARKit hatasını
  /// görünür kılardı; her düzeltmede yeniden bağlamak onu sıfırlar.
  private func refreshTarget() {
    guard trackingReady,
      let carLat = carLatitude, let carLon = carLongitude,
      let userLat = userLatitude, let userLon = userLongitude,
      let frame = arView.session.currentFrame
    else { return }

    let cameraTransform = frame.camera.transform
    let cameraPosition = SIMD3<Float>(
      cameraTransform.columns.3.x, cameraTransform.columns.3.y, cameraTransform.columns.3.z)

    let offset = offsetMeters(fromLat: userLat, fromLon: userLon, toLat: carLat, toLon: carLon)
    // gravityAndHeading: +x doğu, −z kuzey.
    let target = SIMD3<Float>(
      cameraPosition.x + Float(offset.east),
      cameraPosition.y - Scene.eyeHeight,
      cameraPosition.z - Float(offset.north)
    )

    if let placed = placedTarget, simd_distance(placed, target) < Scene.repositionThreshold {
      return
    }
    placedTarget = target
    layoutScene(target: target, cameraPosition: cameraPosition)
  }

  private func layoutScene(target: SIMD3<Float>, cameraPosition: SIMD3<Float>) {
    beam?.position = [target.x, target.y + Scene.beamHeight / 2, target.z]
    ring?.position = target

    let ground = SIMD3<Float>(cameraPosition.x, target.y, cameraPosition.z)
    var direction = target - ground
    direction.y = 0
    let distance = simd_length(direction)

    // Yakın mesafe modu: araba zaten önünde. Huzme kapanır, halka büyür ve
    // "şurası" demeye başlar; yol okları da gereksizdir.
    let near = distance <= Scene.nearDistance
    beam?.isEnabled = !near
    ring?.scale = near ? [1.6, 1, 1.6] : [1, 1, 1]
    if near {
      chevrons.forEach { $0.isEnabled = false }
      onStatus(["state": "near"])
      return
    }

    guard distance > 0.1 else {
      chevrons.forEach { $0.isEnabled = false }
      return
    }
    let unit = direction / distance
    // +Z yönündeki oku, hedefe bakacak şekilde Y ekseninde döndür.
    let yaw = atan2(unit.x, unit.z)

    for (index, chevron) in chevrons.enumerated() {
      let along = Float(index + 1) * Scene.chevronSpacing
      // Arabaya vardığında yol kaybolur; oklar yalnız aradaki mesafeyi doldurur.
      guard along < distance - 1 else {
        chevron.isEnabled = false
        continue
      }
      chevron.isEnabled = true
      chevron.position = ground + unit * along
      chevron.orientation = simd_quatf(angle: yaw, axis: [0, 1, 0])
    }
  }

  // MARK: - ARSessionDelegate

  public func session(_ session: ARSession, cameraDidChangeTrackingState camera: ARCamera) {
    switch camera.trackingState {
    case .normal:
      if !trackingReady {
        trackingReady = true
        onStatus(["state": "ready"])
      }
      refreshTarget()
    case .limited:
      onStatus(["state": "initializing"])
    case .notAvailable:
      trackingReady = false
      onStatus(["state": "initializing"])
    }
  }

  public func session(_ session: ARSession, didFailWithError error: Error) {
    onStatus(["state": "failed", "message": error.localizedDescription])
  }
}
