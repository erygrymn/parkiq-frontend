import ARKit
import ExpoModulesCore
import RealityKit
import UIKit

// design.md §7.7 — AR: "Yerde mürekkep, varışta nokta."
//
// Sahne dünyaya .gravityAndHeading ile hizalıdır: +x doğu, +y yukarı, −z kuzey. GPS'ten
// hesaplanan doğu/kuzey ofseti doğrudan dünya koordinatına çevrilir. Hedef her GPS
// düzeltmesinde KAMERANIN O ANKİ konumundan yeniden türer; yürüdükçe biriken VIO hatası
// her düzeltmede sıfırlanır.
//
// Üç nesne: (1) kullanıcıdan arabaya mürekkep disk yolu, (2) arabanın üstünde marka işaretini
// taşıyan P. monoliti (PBR — ortam ışığını alır), (3) monolitin altında yeşil zemin noktası.
// Sütun, halka büyümesi ve chevron yok; hiçbir şey döngüde oynamaz (§3).

private enum Palette {
  static let ink = UIColor(red: 0x14 / 255, green: 0x14 / 255, blue: 0x16 / 255, alpha: 1)
  static let green = UIColor(red: 0x2F / 255, green: 0xE0 / 255, blue: 0x7A / 255, alpha: 1)
}

private enum Scene {
  static let discDiameter: Float = 0.14
  static let discRingDiameter: Float = 0.18
  static let discSpacing: Float = 1.2
  static let discCount = 24
  static let discAlphaNear: Float = 0.85
  static let discAlphaFar: Float = 0.25
  static let slabSize = SIMD3<Float>(0.56, 0.72, 0.05)
  static let slabCorner: Float = 0.08
  static let faceSize: Float = 0.50
  static let groundDotDiameter: Float = 0.50
  static let groundRingDiameter: Float = 0.56
  static let groundDotNearScale: Float = 2.4
  /// İlk zemin düzlemi gelene kadar zemin = kamera − göz hizası (metre).
  static let eyeHeight: Float = 1.45
  static let nearDistance: Float = 20
  static let nearExitDistance: Float = 24
  static let farDistance: Float = 60
  /// Hedef bu kadar oynamadıysa sahne tazelenmez (GPS gürültüsü titretmesin).
  static let repositionThreshold: Float = 1.0
  static let relayoutDuration: TimeInterval = 0.3
  static let targetEventInterval: TimeInterval = 1.0 / 6.0
  /// Zemin sayılacak düzlem kameranın bu kadar altında olmalı (masa/duvar sayılmasın).
  static let groundBandMin: Float = 0.8
  static let groundBandMax: Float = 2.2
}

public final class ParkiqArView: ExpoView, ARSessionDelegate {
  private let arView = ARView(frame: .zero)
  private let coaching = ARCoachingOverlayView()
  private let anchor = AnchorEntity(world: .zero)

  private var discs: [Entity] = []
  private let monolithRoot = Entity()
  private var slab: ModelEntity?
  private let groundDot = Entity()

  private var carLatitude: Double?
  private var carLongitude: Double?
  private var userLatitude: Double?
  private var userLongitude: Double?

  private var placedTarget: SIMD3<Float>?
  private var hasLaidOut = false
  private var groundY: Float?
  private var trackingReady = false
  private var near = false
  private var lastTargetEvent: TimeInterval = 0
  private var sessionRunning = false

  let onStatus = EventDispatcher()
  let onTarget = EventDispatcher()

  public required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    setUpScene()
    NotificationCenter.default.addObserver(
      self, selector: #selector(pauseSession), name: UIApplication.didEnterBackgroundNotification, object: nil)
    NotificationCenter.default.addObserver(
      self, selector: #selector(resumeSession), name: UIApplication.willEnterForegroundNotification, object: nil)
  }

  deinit {
    NotificationCenter.default.removeObserver(self)
  }

  // MARK: - Kurulum

  private func setUpScene() {
    clipsToBounds = true
    arView.frame = bounds
    arView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
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
    configuration.planeDetection = [.horizontal]
    // Monolitin PBR malzemesi ortam ışığını buradan alır.
    configuration.environmentTexturing = .automatic
    // Araçlar ve insanlar işareti gerçekten örtsün (destekleyen cihazlarda).
    if ARWorldTrackingConfiguration.supportsSceneReconstruction(.mesh) {
      configuration.sceneReconstruction = .mesh
      arView.environment.sceneUnderstanding.options.insert(.occlusion)
    }
    if ARWorldTrackingConfiguration.supportsFrameSemantics(.personSegmentationWithDepth) {
      configuration.frameSemantics.insert(.personSegmentationWithDepth)
    }
    arView.session.run(configuration, options: [.resetTracking, .removeExistingAnchors])
    sessionRunning = true
    onStatus(["state": "initializing"])
  }

  @objc private func pauseSession() {
    guard sessionRunning else { return }
    arView.session.pause()
    sessionRunning = false
  }

  @objc private func resumeSession() {
    guard !sessionRunning, window != nil else { return }
    trackingReady = false
    placedTarget = nil
    hasLaidOut = false
    groundY = nil
    startSession()
  }

  public func pause() {
    pauseSession()
  }

  // Görünüm ekrandan çıkınca kamera ve dünya takibi durur: telefon ısınmaz, pil gitmez.
  public override func willMove(toWindow newWindow: UIWindow?) {
    super.willMove(toWindow: newWindow)
    if newWindow == nil { pauseSession() }
  }

  public override func didMoveToWindow() {
    super.didMoveToWindow()
    if window != nil, !sessionRunning { resumeSession() }
  }

  // MARK: - Malzemeler

  private func unlit(_ color: UIColor, alpha: Float) -> UnlitMaterial {
    var material = UnlitMaterial(color: color.withAlphaComponent(CGFloat(alpha)))
    material.blending = .transparent(opacity: .init(floatLiteral: alpha))
    return material
  }

  /// Monolit gövdesi: ortam ışığına tepki veren mat mürekkep.
  private func slabMaterial() -> PhysicallyBasedMaterial {
    var material = PhysicallyBasedMaterial()
    material.baseColor = .init(tint: Palette.ink)
    material.roughness = .init(floatLiteral: 0.55)
    material.metallic = .init(floatLiteral: 0)
    return material
  }

  /// Ön yüz: app ikonunun kendisi (opak mürekkep kare + beyaz P + yeşil nokta) doku olarak.
  /// Marka tek varlıktır; harflerden kurulmaz (design.md §2).
  private func faceMaterial() -> UnlitMaterial? {
    for bundle in [Bundle.main, Bundle(for: ParkiqArView.self)] {
      guard let url = bundle.url(forResource: "parkiq-ar-mark", withExtension: "png"),
        let texture = try? TextureResource.load(contentsOf: url)
      else { continue }
      var material = UnlitMaterial()
      material.color = .init(tint: .white, texture: .init(texture))
      return material
    }
    return nil
  }

  // MARK: - Sahne

  private func buildEntities() {
    // Yol: mürekkep diskler, altında beyaz halka (koyu zeminde okunurluk — harita pin ring kuralı).
    for index in 0..<Scene.discCount {
      let t = Float(index) / Float(max(1, Scene.discCount - 1))
      let alpha = Scene.discAlphaNear + (Scene.discAlphaFar - Scene.discAlphaNear) * t
      let holder = Entity()
      let ring = ModelEntity(
        mesh: .generatePlane(
          width: Scene.discRingDiameter, depth: Scene.discRingDiameter, cornerRadius: Scene.discRingDiameter / 2),
        materials: [unlit(.white, alpha: min(0.9, alpha + 0.1))])
      let disc = ModelEntity(
        mesh: .generatePlane(width: Scene.discDiameter, depth: Scene.discDiameter, cornerRadius: Scene.discDiameter / 2),
        materials: [unlit(Palette.ink, alpha: alpha)])
      disc.position.y = 0.002
      holder.addChild(ring)
      holder.addChild(disc)
      holder.isEnabled = false
      anchor.addChild(holder)
      discs.append(holder)
    }

    // Varış: P. monoliti.
    let slabEntity = ModelEntity(
      mesh: .generateBox(size: Scene.slabSize, cornerRadius: Scene.slabCorner),
      materials: [slabMaterial()])
    if let face = faceMaterial() {
      let facePlane = ModelEntity(
        mesh: .generatePlane(width: Scene.faceSize, height: Scene.faceSize, cornerRadius: 0),
        materials: [face])
      facePlane.position = [0, 0, Scene.slabSize.z / 2 + 0.002]
      slabEntity.addChild(facePlane)
    } else {
      // Doku yüklenemezse marka harfi metinle kurulur; yeşil nokta harfin karnında.
      let mesh = MeshResource.generateText(
        "P", extrusionDepth: 0.006, font: .systemFont(ofSize: 0.34, weight: .black),
        containerFrame: .zero, alignment: .center, lineBreakMode: .byClipping)
      let letter = ModelEntity(mesh: mesh, materials: [unlit(.white, alpha: 1)])
      let bounds = mesh.bounds
      letter.position = [-bounds.center.x, -bounds.center.y, Scene.slabSize.z / 2 + 0.002]
      slabEntity.addChild(letter)
      let dot = ModelEntity(
        mesh: .generatePlane(width: 0.11, height: 0.11, cornerRadius: 0.055),
        materials: [unlit(Palette.green, alpha: 1)])
      dot.position = [0.03, 0.08, Scene.slabSize.z / 2 + 0.012]
      slabEntity.addChild(dot)
    }
    if #available(iOS 18.0, *) {
      slabEntity.components.set(GroundingShadowComponent(castsShadow: true))
    }
    monolithRoot.addChild(slabEntity)
    monolithRoot.isEnabled = false
    anchor.addChild(monolithRoot)
    slab = slabEntity

    // Zemin noktası: "araba burada."
    let groundRing = ModelEntity(
      mesh: .generatePlane(
        width: Scene.groundRingDiameter, depth: Scene.groundRingDiameter, cornerRadius: Scene.groundRingDiameter / 2),
      materials: [unlit(.white, alpha: 0.9)])
    let groundDisc = ModelEntity(
      mesh: .generatePlane(
        width: Scene.groundDotDiameter, depth: Scene.groundDotDiameter, cornerRadius: Scene.groundDotDiameter / 2),
      materials: [unlit(Palette.green, alpha: 0.95)])
    groundDisc.position.y = 0.002
    groundDot.addChild(groundRing)
    groundDot.addChild(groundDisc)
    groundDot.isEnabled = false
    anchor.addChild(groundDot)
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

  // MARK: - Geometri

  private func cameraPosition(_ frame: ARFrame) -> SIMD3<Float> {
    let column = frame.camera.transform.columns.3
    return [column.x, column.y, column.z]
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

  private func floorY(camera: SIMD3<Float>) -> Float {
    groundY ?? (camera.y - Scene.eyeHeight)
  }

  private func slabHeight(distance: Float) -> Float {
    if distance > Scene.farDistance { return 2.4 }
    if distance > Scene.nearDistance { return 1.5 }
    return 0.9
  }

  /// Hedefi KAMERANIN ŞU ANKİ dünya konumundan yeniden türetir.
  private func refreshTarget() {
    guard trackingReady,
      let carLat = carLatitude, let carLon = carLongitude,
      let userLat = userLatitude, let userLon = userLongitude,
      let frame = arView.session.currentFrame
    else { return }

    let camera = cameraPosition(frame)
    let offset = offsetMeters(fromLat: userLat, fromLon: userLon, toLat: carLat, toLon: carLon)
    // gravityAndHeading: +x doğu, −z kuzey. y zemin yerleşiminde çözülür.
    let target = SIMD3<Float>(camera.x + Float(offset.east), 0, camera.z - Float(offset.north))

    if let placed = placedTarget,
      simd_distance(SIMD2(placed.x, placed.z), SIMD2(target.x, target.z)) < Scene.repositionThreshold
    {
      return
    }
    placedTarget = target
    layoutScene(camera: camera, animated: hasLaidOut)
    hasLaidOut = true
  }

  private func move(_ entity: Entity, to transform: Transform, duration: TimeInterval) {
    if duration > 0 {
      entity.move(to: transform, relativeTo: nil, duration: duration, timingFunction: .easeInOut)
    } else {
      entity.transform = transform
    }
  }

  private func updateNear(distance: Float) {
    if !near, distance <= Scene.nearDistance {
      near = true
      onStatus(["state": "near"])
    } else if near, distance > Scene.nearExitDistance {
      near = false
      onStatus(["state": "ready"])
    }
  }

  private func layoutScene(camera: SIMD3<Float>, animated: Bool) {
    guard let target = placedTarget else { return }
    let floor = floorY(camera: camera)
    let targetGround = SIMD3<Float>(target.x, floor, target.z)
    let userGround = SIMD3<Float>(camera.x, floor, camera.z)
    var direction = targetGround - userGround
    direction.y = 0
    let distance = simd_length(direction)
    updateNear(distance: distance)
    let duration = animated ? Scene.relayoutDuration : 0

    monolithRoot.isEnabled = true
    groundDot.isEnabled = true
    move(
      monolithRoot,
      to: Transform(scale: .one, rotation: monolithRoot.orientation, translation: targetGround),
      duration: duration)
    let dotScale: Float = near ? Scene.groundDotNearScale : 1
    move(
      groundDot,
      to: Transform(scale: [dotScale, 1, dotScale], rotation: simd_quatf(angle: 0, axis: [0, 1, 0]), translation: targetGround),
      duration: duration)
    if let slab {
      move(
        slab,
        to: Transform(scale: slab.scale, rotation: simd_quatf(angle: 0, axis: [0, 1, 0]), translation: [0, slabHeight(distance: distance), 0]),
        duration: duration)
    }

    // Yakın modda araba zaten görüş alanında: yol gereksiz, zemin noktası büyür.
    guard distance > 0.1, !near else {
      discs.forEach { $0.isEnabled = false }
      return
    }
    let unit = direction / distance
    for (index, disc) in discs.enumerated() {
      let along = Float(index + 1) * Scene.discSpacing
      let visible = along < distance - 1.0
      disc.isEnabled = visible
      guard visible else { continue }
      move(
        disc,
        to: Transform(scale: .one, rotation: simd_quatf(angle: 0, axis: [0, 1, 0]), translation: userGround + unit * along),
        duration: duration)
    }
  }

  private func emitTarget(frame: ARFrame, camera: SIMD3<Float>, distance: Float) {
    guard let target = placedTarget else { return }
    let worldPoint = SIMD3<Float>(target.x, floorY(camera: camera) + (slab?.position.y ?? 1.5), target.z)
    let columns = frame.camera.transform.columns
    let forward = -SIMD3<Float>(columns.2.x, columns.2.y, columns.2.z)
    let right = SIMD3<Float>(columns.0.x, columns.0.y, columns.0.z)
    let toTarget = worldPoint - camera
    let inFront = simd_dot(forward, toTarget) > 0

    var point = arView.project(worldPoint)
    var onScreen = false
    if inFront, let projected = point, bounds.contains(projected) {
      onScreen = true
    }
    if point == nil || !inFront {
      // Arkadaysa: yatay tarafa göre ekran dışında bir nokta üret; RN kenara kırpar.
      let side: CGFloat = simd_dot(right, toTarget) >= 0 ? 1 : -1
      point = CGPoint(x: bounds.midX + side * bounds.width, y: bounds.midY)
    }
    guard let resolved = point else { return }
    onTarget([
      "x": Double(resolved.x),
      "y": Double(resolved.y),
      "onScreen": onScreen,
      "distanceM": Double(distance),
      "near": near,
    ])
  }

  // MARK: - Zemin düzlemi

  private func considerPlanes(_ anchors: [ARAnchor]) {
    guard let frame = arView.session.currentFrame else { return }
    let cameraY = frame.camera.transform.columns.3.y
    var best: (y: Float, area: Float)?
    for case let plane as ARPlaneAnchor in anchors where plane.alignment == .horizontal {
      let y = plane.transform.columns.3.y
      let drop = cameraY - y
      guard drop >= Scene.groundBandMin, drop <= Scene.groundBandMax else { continue }
      let area: Float
      if #available(iOS 16.0, *) {
        area = plane.planeExtent.width * plane.planeExtent.height
      } else {
        area = plane.extent.x * plane.extent.z
      }
      if let current = best, current.area >= area { continue }
      best = (y, area)
    }
    guard let candidate = best else { return }
    if let current = groundY, abs(current - candidate.y) < 0.05 { return }
    groundY = candidate.y
    if placedTarget != nil { layoutScene(camera: cameraPosition(frame), animated: true) }
  }

  // MARK: - ARSessionDelegate

  public func session(_ session: ARSession, didAdd anchors: [ARAnchor]) {
    considerPlanes(anchors)
  }

  public func session(_ session: ARSession, didUpdate anchors: [ARAnchor]) {
    considerPlanes(anchors)
  }

  /// Karede: monolit kameraya döner (yalnız yaw), uzaklıkla ölçeklenir; hedef olayı ≤6 Hz.
  public func session(_ session: ARSession, didUpdate frame: ARFrame) {
    guard let target = placedTarget, monolithRoot.isEnabled else { return }
    let camera = cameraPosition(frame)
    let dx = camera.x - target.x
    let dz = camera.z - target.z
    monolithRoot.orientation = simd_quatf(angle: atan2(dx, dz), axis: [0, 1, 0])
    let distance = simd_length(SIMD2(dx, dz))
    let scale = min(5, max(1, distance / 12))
    if let slab, abs(slab.scale.x - scale) > 0.01 {
      slab.scale = [scale, scale, scale]
    }
    if frame.timestamp - lastTargetEvent >= Scene.targetEventInterval {
      lastTargetEvent = frame.timestamp
      emitTarget(frame: frame, camera: camera, distance: distance)
    }
  }

  public func session(_ session: ARSession, cameraDidChangeTrackingState camera: ARCamera) {
    switch camera.trackingState {
    case .normal:
      if !trackingReady {
        trackingReady = true
        onStatus(["state": near ? "near" : "ready"])
      }
      refreshTarget()
    case .limited:
      onStatus(["state": "limited"])
    case .notAvailable:
      trackingReady = false
      onStatus(["state": "initializing"])
    }
  }

  public func session(_ session: ARSession, didFailWithError error: Error) {
    onStatus(["state": "failed", "message": error.localizedDescription])
  }
}
