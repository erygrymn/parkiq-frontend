import ARKit
import AVFoundation
import ExpoModulesCore
import RealityKit
import UIKit

// design.md §7.7 — AR: "Yerde mürekkep, varışta nokta."
//
// Sahne dünyaya .gravityAndHeading ile hizalıdır: +x doğu, +y yukarı, −z kuzey.
//
// HEDEF TAHMİNİ (2026-10-03). Eskiden hedef her GPS düzeltmesinde TEK düzeltmeden yeniden
// türüyordu: GPS'in 5–15 m'lik gürültüsü işareti her saniye o kadar zıplatıyordu. Artık her
// düzeltme bir örnektir (kameranın ölçüm anındaki yeri + GPS yeri + doğruluk) ve arabanın AR
// dünyasındaki yeri örneklerin ağırlıklı çözümüdür:
//  - ağırlık = 1 / (GPS hatası² + VIO kayması² + pusula payı²): kötü düzeltme, eski örnek ve
//    arabadan uzakta alınmış örnek az söz sahibidir — yaklaştıkça hata da küçülür;
//  - pusula sapması: gravityAndHeading başlangıçta pusulaya hizalanır ve otoparkta çelik
//    yüzünden 10–20° kayabilir. Yürünen yol (VIO) GPS yoluyla karşılaştırılıp bu açı
//    tahmin edilir; yürünmeden açı gözlenemez, o zaman düzeltme sıfıra çekilir (önsel).
//
// GÖRÜNTÜ. Hedef kare kare yumuşatılır; `move(to:)` animasyonu yok — kare başı billboard ve
// ölçek yazımıyla çakışıp titretiyordu. Yükseklik ve ölçek mesafenin sürekli fonksiyonudur
// (eski 60 m / 20 m basamakları levhayı yere gömüp sonra sıçratıyordu). Disk yolu hedefe
// kilitli aralıklarla dizilir: yürürken diskler yerinde durur. Zemin, kameranın altındaki
// en büyük (varsa "floor" sınıflı) düzlemdir; kaldırım/yol arasında gidip gelmez.
//
// BELİRSİZLİK HALKASI (2026-10-03). Yakında levha "araba tam burada" der ama tahmin birkaç
// metre kayık olabilir; kullanıcı işaretin dibinde arabayı göremeyince uygulamaya güvenini
// kaybediyordu. Yerdeki beyaz halka dürüst cevaptır: "araba bu dairenin içinde". Yarıçap,
// tahminin kendi belirsizliği ile arabanın kayıt anındaki GPS doğruluğunun bileşkesidir.
//
// OKLÜZYON YOK (2026-10-03). Mesh oklüzyonu yere yapışık diskleri yeniden kurulan zemin
// ağıyla çakıştırıp titretiyordu; GPS ±5 m iken "arabanın arkasında kalan işaret" de çoğu
// zaman yanlış arabanın arkasında kalıyordu. Kişi segmentasyonu her karede bir sinir ağı
// koşturuyor ve telefonu ısıtıyordu. İşaret bir tabeladır, her zaman görünür.

private enum Palette {
  static let ink = UIColor(red: 0x14 / 255, green: 0x14 / 255, blue: 0x16 / 255, alpha: 1)
  static let green = UIColor(red: 0x2F / 255, green: 0xE0 / 255, blue: 0x7A / 255, alpha: 1)
}

private enum Scene {
  static let discDiameter: Float = 0.14
  static let discRingDiameter: Float = 0.18
  static let discSpacing: Float = 1.2
  static let discCount = 24
  /// İlk disk kullanıcının bu kadar önünde.
  static let discFirst: Float = 1.2
  static let discAlphaNear: Float = 0.85
  static let discAlphaFar: Float = 0.25
  /// Opaklık basamakları: malzeme kare başı üretilmez, hazır basamaklardan seçilir.
  static let discAlphaSteps = 6
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
  /// Levhanın alt kenarının yerden yüksekliği: yakında alçak, uzakta biraz daha yukarıda.
  static let nearClearance: Float = 0.55
  static let farClearance: Float = 1.15
  static let targetEventInterval: TimeInterval = 1.0 / 6.0
  static let groundCheckInterval: TimeInterval = 0.5
  /// Zemin sayılacak düzlem kameranın bu kadar altında olmalı (masa/duvar sayılmasın).
  static let groundBandMin: Float = 0.8
  static let groundBandMax: Float = 2.2
  /// Rakip düzlem mevcut zeminden bu kadar daha geniş değilse zemin değişmez.
  static let groundSwitchRatio: Float = 1.5
  /// Yumuşatma zaman sabitleri (saniye).
  static let targetTau: Float = 0.45
  static let groundTau: Float = 0.3
  static let dotTau: Float = 0.25
  /// Bundan büyük sıçrama (ilk iyi düzeltme, araba konumu düzeltmesi) yumuşatılmaz:
  /// 40 m'yi yarım saniyede süzülen bir levha "uçan tabela" gibi görünüyordu.
  static let snapDistance: Float = 25
  static let revealDuration: TimeInterval = 0.25
  /// Belirsizlik halkası: yarıçap sınırları (m) ve bant kalınlığı (yarıçapa oranla).
  static let ringMinRadius: Float = 3
  static let ringMaxRadius: Float = 20
  static let ringBand: Float = 0.05
  static let ringSegments = 96
  /// Halka açılırken zemin noktasının kenarından büyür.
  static let ringStartRadius: Float = 0.6
  static let ringTau: Float = 0.35
}

private enum Fusion {
  /// Bundan kötü düzeltme hiç kullanılmaz (hücre/Wi-Fi konumu).
  static let maxAccuracy: Double = 50
  static let minSigma: Double = 3
  static let unknownSigma: Double = 10
  /// GPS hataları zamanda bağımlı: bağımsız saymak güveni şişirir.
  static let correlationInflation: Double = 1.5
  /// VIO kayması: yürünen yolun yaklaşık %3'ü.
  static let driftPerMeter: Double = 0.03
  /// Pusula payı: uzaktan alınmış örneğin yanal belirsizliği (radyan × mesafe).
  static let headingLever: Double = 0.12
  /// Pusula hizasının önseli (≈12°) ve izin verilen en büyük düzeltme (≈45°).
  static let yawPriorSigma: Double = 0.21
  static let maxYaw: Double = 0.785
  static let maxSamples = 60
  static let maxAge: TimeInterval = 240
  /// Kamera geçmişi: GPS düzeltmesi geldiği ana değil, ÖLÇÜLDÜĞÜ ana eşlenir.
  static let historySeconds: TimeInterval = 6
  static let historyStep: TimeInterval = 0.1
  /// VIO yolu bu adımlarla toplanır; kare başı titreşim yol sayılmasın.
  static let pathStep: Float = 0.25
}

private struct GeoFix: Equatable {
  let latitude: Double
  let longitude: Double
  let accuracy: Double?
  /// Ölçüm anı (saniye, 1970'ten beri). Yoksa geliş anı kullanılır.
  let time: TimeInterval?
}

private struct FusionSample {
  /// Kameranın ölçüm anındaki yatay yeri (doğu, kuzey) — AR dünyası, pusula hizasıyla.
  let camera: SIMD2<Double>
  let latitude: Double
  let longitude: Double
  let sigma: Double
  let pathAtSample: Double
  let time: TimeInterval
}

private struct Pose {
  let time: TimeInterval
  let position: SIMD3<Float>
}

private struct Disc {
  let holder: Entity
  let ring: ModelEntity
  let ink: ModelEntity
  var step: Int
}

/// Kare süresinden bağımsız üstel yumuşatma katsayısı.
private func smoothing(_ dt: Float, _ tau: Float) -> Float {
  guard dt > 0 else { return 0 }
  return 1 - exp(-dt / tau)
}

private func smoothstep(_ edge0: Float, _ edge1: Float, _ x: Float) -> Float {
  let t = min(1, max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

public final class ParkiqArView: ExpoView, ARSessionDelegate, ARCoachingOverlayViewDelegate {
  // Oturumu biz kurarız: otomatik kurulum ikinci bir yapılandırma çalıştırıp bizimkiyle yarışıyordu.
  private let arView = ARView(frame: .zero, cameraMode: .ar, automaticallyConfigureSession: false)
  private let coaching = ARCoachingOverlayView()
  private let anchor = AnchorEntity(world: .zero)

  // Hedef kökü yalnız konumdur; billboard dönüşü ve levha ölçeği alt varlıklarda yaşar.
  private let targetRoot = Entity()
  private let billboard = Entity()
  private var slab: ModelEntity?
  private let groundDot = Entity()
  private let uncertaintyRing = ModelEntity()
  private var discs: [Disc] = []
  private var discInkMaterials: [UnlitMaterial] = []
  private var discRingMaterials: [UnlitMaterial] = []

  private var car: (latitude: Double, longitude: Double)?
  /// Arabanın kayıt anındaki GPS doğruluğu (m); elle bırakılan pinde 0, bilinmiyorsa nil.
  private var carAccuracy: Double?
  private var lastFix: GeoFix?
  private var pendingFix: GeoFix?

  private var samples: [FusionSample] = []
  private var estimate: SIMD2<Float>?
  /// Tahminin kendi belirsizliği (m, ~1σ).
  private var estimateSigma: Double?
  private var ringRadius: Float = 0
  private var smoothedTarget: SIMD2<Float>?
  private var cameraHistory: [Pose] = []
  private var pathLength: Double = 0
  private var pathAnchor: SIMD2<Float>?

  private var groundY: Float?
  private var groundGoal: Float?
  private var groundPlane: UUID?
  private var lastGroundCheck: TimeInterval = 0

  private var dotScale: Float = 1
  private var lastPathLayout: (user: SIMD2<Float>, target: SIMD2<Float>, floor: Float)?
  private var lastFrameTime: TimeInterval?
  private var lastTargetEvent: TimeInterval = 0

  private var trackingReady = false
  /// initializing | limited | normal
  private var tracking = "initializing"
  private var near = false
  private var coachingActive = false
  /// unsupported | cameraDenied | failed — oturum bir daha kendiliğinden başlamaz.
  private var terminalState: String?
  private var lastEmitted: (state: String, coaching: Bool)?
  private var revealed = false
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
    // İşaretler tabela gibi okunmalı: hareket bulanıklığı, alan derinliği ve kamera greni
    // yürürken onları lekeliyordu (titreme gibi algılanıyor) ve GPU'ya bedava değiller.
    arView.renderOptions.formUnion([.disableMotionBlur, .disableDepthOfField, .disableCameraGrain])
    // Kamera ilk kare gelene kadar görünmez: altta kararmış harita durur (RN), kamera onun
    // üstüne açılır. Siyah bir ekranla başlamıyor.
    arView.alpha = 0
    addSubview(arView)

    arView.scene.addAnchor(anchor)
    arView.session.delegate = self

    coaching.session = arView.session
    coaching.goal = .tracking
    coaching.activatesAutomatically = true
    coaching.delegate = self
    coaching.translatesAutoresizingMaskIntoConstraints = false
    arView.addSubview(coaching)
    NSLayoutConstraint.activate([
      coaching.leadingAnchor.constraint(equalTo: arView.leadingAnchor),
      coaching.trailingAnchor.constraint(equalTo: arView.trailingAnchor),
      coaching.topAnchor.constraint(equalTo: arView.topAnchor),
      coaching.bottomAnchor.constraint(equalTo: arView.bottomAnchor),
    ])

    buildEntities()
    // Oturum pencereye girince başlar (didMoveToWindow): init sırasında yayılan durum
    // olayı RN'e ulaşmıyordu — reddedilmiş kamera izni kullanıcıyı siyah ekranda bırakırdı.
  }

  private func startSession() {
    guard ARWorldTrackingConfiguration.isSupported else {
      finish(with: "unsupported")
      return
    }
    // Reddedilmiş izinle ARKit sessizce siyah kare verir; durum açıkça söylenir ki RN
    // haritaya dönüp Ayarlar bağlantısını gösterebilsin.
    switch AVCaptureDevice.authorizationStatus(for: .video) {
    case .denied, .restricted:
      finish(with: "cameraDenied")
      return
    default:
      break
    }
    let configuration = ARWorldTrackingConfiguration()
    // KRİTİK: pusulaya hizalanmadan GPS ofseti dünya koordinatına çevrilemez.
    configuration.worldAlignment = .gravityAndHeading
    configuration.planeDetection = [.horizontal]
    // Monolitin PBR malzemesi ortam ışığını buradan alır.
    configuration.environmentTexturing = .automatic
    arView.session.run(configuration, options: [.resetTracking, .removeExistingAnchors])
    sessionRunning = true
    tracking = "initializing"
    emitStatus()
  }

  private func finish(with state: String) {
    terminalState = state
    if sessionRunning {
      arView.session.pause()
      sessionRunning = false
    }
    emitStatus()
  }

  @objc private func pauseSession() {
    guard sessionRunning else { return }
    arView.session.pause()
    sessionRunning = false
  }

  @objc private func resumeSession() {
    guard !sessionRunning, window != nil, terminalState == nil else { return }
    // .resetTracking dünyanın başlangıcını sıfırlar: eski örneklerin hiçbiri yeni dünyada geçerli değil.
    resetEstimation()
    startSession()
  }

  private func resetEstimation() {
    trackingReady = false
    tracking = "initializing"
    near = false
    samples.removeAll()
    estimate = nil
    estimateSigma = nil
    ringRadius = 0
    uncertaintyRing.isEnabled = false
    smoothedTarget = nil
    cameraHistory.removeAll()
    pathLength = 0
    pathAnchor = nil
    groundY = nil
    groundGoal = nil
    groundPlane = nil
    lastPathLayout = nil
    lastFrameTime = nil
    dotScale = 1
    targetRoot.isEnabled = false
    for disc in discs { disc.holder.isEnabled = false }
    pendingFix = lastFix
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
    for step in 0..<Scene.discAlphaSteps {
      let t = Float(step) / Float(Scene.discAlphaSteps - 1)
      let alpha = Scene.discAlphaNear + (Scene.discAlphaFar - Scene.discAlphaNear) * t
      discInkMaterials.append(unlit(Palette.ink, alpha: alpha))
      discRingMaterials.append(unlit(.white, alpha: min(0.9, alpha + 0.1)))
    }
    let ringMesh = MeshResource.generatePlane(
      width: Scene.discRingDiameter, depth: Scene.discRingDiameter, cornerRadius: Scene.discRingDiameter / 2)
    let inkMesh = MeshResource.generatePlane(
      width: Scene.discDiameter, depth: Scene.discDiameter, cornerRadius: Scene.discDiameter / 2)
    for _ in 0..<Scene.discCount {
      let holder = Entity()
      let ring = ModelEntity(mesh: ringMesh, materials: [discRingMaterials[0]])
      let ink = ModelEntity(mesh: inkMesh, materials: [discInkMaterials[0]])
      ink.position.y = 0.002
      holder.addChild(ring)
      holder.addChild(ink)
      holder.isEnabled = false
      anchor.addChild(holder)
      discs.append(Disc(holder: holder, ring: ring, ink: ink, step: 0))
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
    slabEntity.position = [0, Scene.nearClearance + Scene.slabSize.y / 2, 0]
    billboard.addChild(slabEntity)
    targetRoot.addChild(billboard)
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
    targetRoot.addChild(groundDot)

    // Belirsizlik halkası: birim halka bir kez kurulur, yarıçap ölçekle verilir (kare başı
    // mesh üretimi yok). Yol disklerinin (0 / 0.002) üstünde durur; kesiştikleri yerde titremez.
    if let mesh = unitRingMesh() {
      uncertaintyRing.model = ModelComponent(mesh: mesh, materials: [unlit(.white, alpha: 0.85)])
    }
    uncertaintyRing.position.y = 0.004
    uncertaintyRing.isEnabled = false
    targetRoot.addChild(uncertaintyRing)

    targetRoot.isEnabled = false
    anchor.addChild(targetRoot)
  }

  /// İç kenarı 1 − bant/2, dış kenarı 1 + bant/2 olan yatay halka. İki sargı birlikte yazılır:
  /// yüz ayıklama hangisini ön sayarsa saysın halka yukarıdan görünür.
  private func unitRingMesh() -> MeshResource? {
    let inner = 1 - Scene.ringBand / 2
    let outer = 1 + Scene.ringBand / 2
    var positions: [SIMD3<Float>] = []
    positions.reserveCapacity(Scene.ringSegments * 2)
    for index in 0..<Scene.ringSegments {
      let angle = Float(index) / Float(Scene.ringSegments) * 2 * .pi
      let direction = SIMD3<Float>(cos(angle), 0, sin(angle))
      positions.append(direction * inner)
      positions.append(direction * outer)
    }
    let count = UInt32(positions.count)
    var indices: [UInt32] = []
    indices.reserveCapacity(Scene.ringSegments * 12)
    for segment in 0..<UInt32(Scene.ringSegments) {
      let a = segment * 2
      let b = a + 1
      let c = (a + 2) % count
      let d = (a + 3) % count
      indices += [a, c, b, b, c, d]
      indices += [a, b, c, b, d, c]
    }
    var descriptor = MeshDescriptor(name: "parkiq-uncertainty-ring")
    descriptor.positions = MeshBuffers.Positions(positions)
    descriptor.primitives = .triangles(indices)
    return try? MeshResource.generate(from: [descriptor])
  }

  // MARK: - RN'den gelen değerler

  func setCar(latitude: Double, longitude: Double, accuracy: Double?) {
    // Doğruluk yalnız halkayı etkiler; araba yerinde kaldıkça çözüm yeniden kurulmaz.
    carAccuracy = accuracy
    if let car, car.latitude == latitude, car.longitude == longitude { return }
    car = (latitude, longitude)
    // Örnekler kullanıcının mutlak konumunu taşır; araba taşınınca çözüm yeniden kurulur.
    recomputeEstimate()
    ingestPendingFix()
  }

  func setUser(latitude: Double, longitude: Double, accuracy: Double?, time: TimeInterval?) {
    let fix = GeoFix(latitude: latitude, longitude: longitude, accuracy: accuracy, time: time)
    // RN aynı düzeltmeyi yeniden gönderebilir (yeniden çizim); aynı ölçüm iki kez sayılmaz.
    if fix == lastFix { return }
    lastFix = fix
    pendingFix = fix
    ingestPendingFix()
  }

  // MARK: - Füzyon

  private func ingestPendingFix() {
    guard trackingReady, car != nil, let fix = pendingFix else { return }
    let now = Date().timeIntervalSince1970
    let measured = fix.time ?? now
    // Kamera geçmişi henüz boşsa düzeltme bekletilir, atılmaz: hazır olur olmaz gelen ilk
    // düzeltme kaybolsaydı duran kullanıcı hiç işaret görmezdi.
    guard let camera = cameraPosition(at: measured) else { return }
    pendingFix = nil
    if let accuracy = fix.accuracy, accuracy > Fusion.maxAccuracy { return }
    samples.append(
      FusionSample(
        camera: SIMD2(Double(camera.x), Double(-camera.z)),
        latitude: fix.latitude,
        longitude: fix.longitude,
        sigma: max(fix.accuracy ?? Fusion.unknownSigma, Fusion.minSigma),
        pathAtSample: pathLength,
        time: measured))
    samples.removeAll { now - $0.time > Fusion.maxAge }
    if samples.count > Fusion.maxSamples { samples.removeFirst(samples.count - Fusion.maxSamples) }
    recomputeEstimate()
  }

  /// Kameranın verilen andaki yeri (geçmişte doğrusal ara değer).
  private func cameraPosition(at time: TimeInterval) -> SIMD3<Float>? {
    guard let latest = cameraHistory.last, let earliest = cameraHistory.first else { return nil }
    if time >= latest.time { return latest.position }
    if time <= earliest.time { return earliest.position }
    var upper = cameraHistory.count - 1
    while upper > 1, cameraHistory[upper - 1].time > time { upper -= 1 }
    let a = cameraHistory[upper - 1]
    let b = cameraHistory[upper]
    let span = b.time - a.time
    let t = span > 0 ? Float((time - a.time) / span) : 1
    return a.position + (b.position - a.position) * t
  }

  /// GPS ofsetini (metre) doğu/kuzey olarak verir.
  private func offsetMeters(fromLat: Double, fromLon: Double, toLat: Double, toLon: Double) -> SIMD2<Double> {
    let earthRadius = 6_371_000.0
    let toRadians = Double.pi / 180
    let north = (toLat - fromLat) * toRadians * earthRadius
    let east = (toLon - fromLon) * toRadians * earthRadius * cos(fromLat * toRadians)
    return SIMD2(east, north)
  }

  /// Arabanın AR dünyasındaki yeri: ağırlıklı katı dönüşüm (dönüş + öteleme) çözümü.
  ///
  /// Model: kullanıcının arabaya göre GPS yeri p ≈ R(θ)·c + t (c: kameranın AR yeri).
  /// Araba GPS'te orijindedir; AR'daki yeri c̄ − Rᵀ(θ)·p̄. θ yalnız örnekler yayıldıkça
  /// (kullanıcı yürüdükçe) gözlenir; önsel onu sıfıra, yani pusulanın hizasına çeker.
  private func recomputeEstimate() {
    guard let car, !samples.isEmpty else { return }
    var points: [(c: SIMD2<Double>, p: SIMD2<Double>, w: Double)] = []
    points.reserveCapacity(samples.count)
    var totalWeight = 0.0
    for sample in samples {
      let p = offsetMeters(fromLat: car.latitude, fromLon: car.longitude, toLat: sample.latitude, toLon: sample.longitude)
      let gps = sample.sigma * Fusion.correlationInflation
      let drift = Fusion.driftPerMeter * (pathLength - sample.pathAtSample)
      let lever = Fusion.headingLever * simd_length(p)
      let weight = 1 / (gps * gps + drift * drift + lever * lever)
      points.append((c: sample.camera, p: p, w: weight))
      totalWeight += weight
    }
    guard totalWeight > 0 else { return }
    // Ardışık GPS hataları bağımsız değil: örnek biriktikçe belirsizlik sonsuza küçülmez,
    // en iyi örneğin yarısının altına inmez.
    let bestSigma = samples.map(\.sigma).min() ?? Fusion.unknownSigma
    estimateSigma = max((1 / totalWeight).squareRoot(), bestSigma / 2)

    var cBar = SIMD2<Double>(0, 0)
    var pBar = SIMD2<Double>(0, 0)
    for point in points {
      cBar += point.c * point.w
      pBar += point.p * point.w
    }
    cBar /= totalWeight
    pBar /= totalWeight

    var cross = 0.0
    var dot = 0.0
    var information = 0.0
    for point in points {
      let dc = point.c - cBar
      let dp = point.p - pBar
      cross += point.w * (dc.x * dp.y - dc.y * dp.x)
      dot += point.w * (dc.x * dp.x + dc.y * dp.y)
      information += point.w * simd_length_squared(dc)
    }
    var yaw = 0.0
    if information > 0, cross != 0 || dot != 0 {
      let prior = 1 / (Fusion.yawPriorSigma * Fusion.yawPriorSigma)
      yaw = atan2(cross, dot) * information / (information + prior)
      yaw = min(Fusion.maxYaw, max(-Fusion.maxYaw, yaw))
    }
    let cosYaw = cos(yaw)
    let sinYaw = sin(yaw)
    let east = cBar.x - (cosYaw * pBar.x + sinYaw * pBar.y)
    let north = cBar.y - (-sinYaw * pBar.x + cosYaw * pBar.y)
    // AR dünyasında x = doğu, z = −kuzey. Tahmin yatay düzlemde tutulur (x, z).
    estimate = SIMD2<Float>(Float(east), Float(-north))
  }

  // MARK: - Zemin

  private func planeArea(_ plane: ARPlaneAnchor) -> Float {
    if #available(iOS 16.0, *) {
      return plane.planeExtent.width * plane.planeExtent.height
    }
    return plane.extent.x * plane.extent.z
  }

  /// Kameranın altındaki zemin düzlemi. Yalnız güncellenen çapalara değil sahnedeki TÜM
  /// yatay düzlemlere bakılır; mevcut zemin açıkça daha iyi bir rakip çıkmadıkça korunur.
  /// (Eskiden her çapa güncellemesinde son güncellenen düzleme geçiliyordu ve sahne
  /// kaldırımla yol arasında yukarı aşağı oynuyordu.)
  private func updateGround(frame: ARFrame, camera: SIMD3<Float>) {
    var best: (id: UUID, y: Float, score: Float)?
    var current: (y: Float, score: Float)?
    for case let plane as ARPlaneAnchor in frame.anchors where plane.alignment == .horizontal {
      let y = plane.transform.columns.3.y
      let drop = camera.y - y
      guard drop >= Scene.groundBandMin, drop <= Scene.groundBandMax else { continue }
      var score = planeArea(plane)
      if ARPlaneAnchor.isClassificationSupported {
        switch plane.classification {
        case .floor: score *= 4
        case .table, .seat: continue
        default: break
        }
      }
      if plane.identifier == groundPlane { current = (y: y, score: score) }
      if let leader = best, leader.score >= score { continue }
      best = (id: plane.identifier, y: y, score: score)
    }

    if let current, let best, best.id != groundPlane, best.score < current.score * Scene.groundSwitchRatio {
      groundGoal = current.y
      return
    }
    if let best {
      groundPlane = best.id
      groundGoal = best.y
      return
    }
    // Hiç düzlem yok: eski zemin hâlâ kameranın altındaysa korunur; değilse (rampa,
    // merdiven) göz hizasına dönülür.
    if let goal = groundGoal {
      let drop = camera.y - goal
      if drop < Scene.groundBandMin || drop > Scene.groundBandMax {
        groundPlane = nil
        groundGoal = camera.y - Scene.eyeHeight
      }
    } else {
      groundGoal = camera.y - Scene.eyeHeight
    }
  }

  // MARK: - Kare

  public func session(_ session: ARSession, didUpdate frame: ARFrame) {
    revealCamera()
    let column = frame.camera.transform.columns.3
    let camera = SIMD3<Float>(column.x, column.y, column.z)
    let dt = lastFrameTime.map { Float(min(0.1, max(0, frame.timestamp - $0))) } ?? 0
    lastFrameTime = frame.timestamp
    guard trackingReady else { return }

    recordPose(frame: frame, camera: camera)
    if pendingFix != nil { ingestPendingFix() }

    if frame.timestamp - lastGroundCheck >= Scene.groundCheckInterval {
      lastGroundCheck = frame.timestamp
      updateGround(frame: frame, camera: camera)
    }
    if let goal = groundGoal {
      if let y = groundY {
        groundY = y + (goal - y) * smoothing(dt, Scene.groundTau)
      } else {
        groundY = goal
      }
    }
    let floor = groundY ?? (camera.y - Scene.eyeHeight)

    guard let goal = estimate else { return }
    let target: SIMD2<Float>
    if let previous = smoothedTarget, simd_distance(previous, goal) <= Scene.snapDistance {
      target = previous + (goal - previous) * smoothing(dt, Scene.targetTau)
    } else {
      target = goal
    }
    smoothedTarget = target

    targetRoot.position = [target.x, floor, target.y]
    if !targetRoot.isEnabled { targetRoot.isEnabled = true }

    let dx = camera.x - target.x
    let dz = camera.z - target.y
    let distance = (dx * dx + dz * dz).squareRoot()
    updateNear(distance)

    // Monolit kameraya döner (yalnız yaw), uzaklıkla ölçeklenir: uzaktan okunur, yakında doğal.
    billboard.orientation = simd_quatf(angle: atan2(dx, dz), axis: [0, 1, 0])
    if let slab {
      let scale = min(5, max(1, distance / 12))
      let clearance = Scene.nearClearance + (Scene.farClearance - Scene.nearClearance) * smoothstep(20, 60, distance)
      slab.scale = SIMD3<Float>(repeating: scale)
      slab.position = [0, clearance + Scene.slabSize.y / 2 * scale, 0]
    }
    let dotGoal: Float = near ? Scene.groundDotNearScale : 1
    dotScale += (dotGoal - dotScale) * smoothing(dt, Scene.dotTau)
    groundDot.scale = [dotScale, 1, dotScale]
    updateRing(dt: dt)

    layoutPath(camera: camera, target: target, floor: floor, distance: distance)

    if frame.timestamp - lastTargetEvent >= Scene.targetEventInterval {
      lastTargetEvent = frame.timestamp
      emitTarget(frame: frame, camera: camera, target: target, floor: floor, distance: distance)
    }
  }

  /// Kamera geçmişi (duvar saatiyle) ve VIO yol uzunluğu.
  private func recordPose(frame: ARFrame, camera: SIMD3<Float>) {
    let wall = Date().timeIntervalSince1970 - (ProcessInfo.processInfo.systemUptime - frame.timestamp)
    if cameraHistory.last.map({ wall - $0.time >= Fusion.historyStep }) ?? true {
      cameraHistory.append(Pose(time: wall, position: camera))
      if let first = cameraHistory.first, wall - first.time > Fusion.historySeconds {
        cameraHistory.removeFirst()
      }
    }
    let flat = SIMD2<Float>(camera.x, camera.z)
    if let previous = pathAnchor {
      let step = simd_distance(previous, flat)
      if step >= Fusion.pathStep {
        pathLength += Double(step)
        pathAnchor = flat
      }
    } else {
      pathAnchor = flat
    }
  }

  private func updateNear(_ distance: Float) {
    let next = near ? distance <= Scene.nearExitDistance : distance <= Scene.nearDistance
    guard next != near else { return }
    near = next
    lastPathLayout = nil
    emitStatus()
  }

  /// Halka yalnız yakında görünür: uzaktan levha yol gösterir, yakında "araba bu dairenin
  /// içinde" der. Açılırken zemin noktasından dışarı büyür; hareketi azalt açıksa yerinde belirir.
  private func updateRing(dt: Float) {
    guard near, let sigma = estimateSigma else {
      if uncertaintyRing.isEnabled { uncertaintyRing.isEnabled = false }
      ringRadius = 0
      return
    }
    let carSigma = max(carAccuracy ?? Fusion.unknownSigma, Fusion.minSigma)
    let combined = Float((sigma * sigma + carSigma * carSigma).squareRoot())
    let goal = min(Scene.ringMaxRadius, max(Scene.ringMinRadius, combined))
    if !uncertaintyRing.isEnabled {
      ringRadius = UIAccessibility.isReduceMotionEnabled ? goal : Scene.ringStartRadius
      uncertaintyRing.isEnabled = true
    }
    ringRadius += (goal - ringRadius) * smoothing(dt, Scene.ringTau)
    uncertaintyRing.scale = [ringRadius, 1, ringRadius]
  }

  private func alphaStep(fromUser: Float, span: Float) -> Int {
    let t = min(1, max(0, fromUser / span))
    return Int((t * Float(Scene.discAlphaSteps - 1)).rounded())
  }

  /// Diskler hedefe kilitli aralıklarla (k × aralık) durur: kullanıcı çizgi boyunca yürüdükçe
  /// yerinde kalırlar, geride kalan söner, ileride yenisi belirir. Yakın modda yol gizlenir.
  private func layoutPath(camera: SIMD3<Float>, target: SIMD2<Float>, floor: Float, distance: Float) {
    let user = SIMD2<Float>(camera.x, camera.z)
    if let last = lastPathLayout,
      simd_distance(last.user, user) < 0.3,
      simd_distance(last.target, target) < 0.15,
      abs(last.floor - floor) < 0.03
    {
      return
    }
    lastPathLayout = (user: user, target: target, floor: floor)

    var used = 0
    if !near, distance > Scene.discFirst + 0.5 {
      let toUser = (user - target) / distance
      let span = Float(Scene.discCount) * Scene.discSpacing
      var k = Int(((distance - Scene.discFirst) / Scene.discSpacing).rounded(.down))
      while used < discs.count, k >= 1 {
        let along = Float(k) * Scene.discSpacing
        let fromUser = distance - along
        if fromUser > Scene.discFirst + span { break }
        let spot = target + toUser * along
        var disc = discs[used]
        disc.holder.position = [spot.x, floor, spot.y]
        let step = alphaStep(fromUser: fromUser - Scene.discFirst, span: span)
        if step != disc.step {
          disc.ring.model?.materials = [discRingMaterials[step]]
          disc.ink.model?.materials = [discInkMaterials[step]]
          disc.step = step
          discs[used] = disc
        }
        if !disc.holder.isEnabled { disc.holder.isEnabled = true }
        used += 1
        k -= 1
      }
    }
    for index in used..<discs.count where discs[index].holder.isEnabled {
      discs[index].holder.isEnabled = false
    }
  }

  /// HUD için hedefin ekran izdüşümü, mesafesi ve kullanıcının baktığı yöne göre açısı (≤6 Hz).
  private func emitTarget(frame: ARFrame, camera: SIMD3<Float>, target: SIMD2<Float>, floor: Float, distance: Float) {
    let height = slab?.position.y ?? 1.5
    let worldPoint = SIMD3<Float>(target.x, floor + height, target.y)
    let columns = frame.camera.transform.columns
    let forward = -SIMD3<Float>(columns.2.x, columns.2.y, columns.2.z)
    // Portrede ekranın üstü kameranın −x eksenidir (x ana düğme tarafına, yani aşağı bakar).
    // Telefon dikken ileri, yere eğikken üst kenar yürüme yönünü söyler; ikisinin yatay
    // izdüşümleri toplanınca her eğimde kararlı bir "baktığım yön" çıkar.
    let top = -SIMD3<Float>(columns.0.x, columns.0.y, columns.0.z)
    var facing = SIMD2<Float>(forward.x + top.x, forward.z + top.z)
    let toTarget = SIMD2<Float>(target.x - camera.x, target.y - camera.z)
    var relative: Float = 0
    if simd_length(facing) > 0.001, simd_length(toTarget) > 0.001 {
      facing = simd_normalize(facing)
      let direction = simd_normalize(toTarget)
      // Pozitif = hedef sağda.
      relative = atan2(facing.x * direction.y - facing.y * direction.x, simd_dot(facing, direction))
    }

    let inFront = simd_dot(forward, worldPoint - camera) > 0
    var point = CGPoint(x: bounds.midX + (relative >= 0 ? 1 : -1) * bounds.width, y: bounds.midY)
    var onScreen = false
    if inFront, let projected = arView.project(worldPoint) {
      point = projected
      onScreen = bounds.insetBy(dx: 8, dy: 8).contains(projected)
    }
    onTarget([
      "x": Double(point.x),
      "y": Double(point.y),
      "onScreen": onScreen,
      "distanceM": Double(distance),
      "near": near,
      "relativeDeg": Double(relative * 180 / .pi),
    ])
  }

  private func revealCamera() {
    guard !revealed else { return }
    revealed = true
    UIView.animate(withDuration: Scene.revealDuration, delay: 0, options: [.curveEaseOut, .allowUserInteraction]) {
      self.arView.alpha = 1
    }
  }

  // MARK: - Durum

  private var publicState: String {
    if let terminalState { return terminalState }
    if tracking == "normal" { return near ? "near" : "ready" }
    return tracking
  }

  private func emitStatus() {
    let state = publicState
    if let last = lastEmitted, last.state == state, last.coaching == coachingActive { return }
    lastEmitted = (state: state, coaching: coachingActive)
    onStatus(["state": state, "coaching": coachingActive])
  }

  public func session(_ session: ARSession, cameraDidChangeTrackingState camera: ARCamera) {
    switch camera.trackingState {
    case .normal:
      tracking = "normal"
      if !trackingReady {
        trackingReady = true
        // Hazır olmadan önceki pozlar güvenilmez; geçmiş buradan başlar.
        cameraHistory.removeAll()
        pathAnchor = nil
        ingestPendingFix()
      }
    case .limited(let reason):
      switch reason {
      case .initializing, .relocalizing:
        tracking = trackingReady ? "limited" : "initializing"
      default:
        tracking = "limited"
      }
    case .notAvailable:
      tracking = trackingReady ? "limited" : "initializing"
    }
    // Takip toparlanınca durum geri döner. Eskiden "limited"den sonra .normal geldiğinde
    // hiçbir şey yayılmıyordu ve HUD "takip zayıf" yazısında kalıyordu.
    emitStatus()
  }

  public func session(_ session: ARSession, didFailWithError error: Error) {
    if let arError = error as? ARError, arError.code == .cameraUnauthorized {
      finish(with: "cameraDenied")
    } else {
      finish(with: "failed")
    }
  }

  // Koçluk açıkken HUD gizlenir (§7.7): sistem yönergesiyle yarışan ikinci bir metin olmasın.
  public func coachingOverlayViewWillActivate(_ coachingOverlayView: ARCoachingOverlayView) {
    coachingActive = true
    emitStatus()
  }

  public func coachingOverlayViewDidDeactivate(_ coachingOverlayView: ARCoachingOverlayView) {
    coachingActive = false
    emitStatus()
  }
}
