import ActivityKit
import SwiftUI
import WidgetKit

// design.md §8 — Live Activity + Dynamic Island + ana ekran/kilit ekranı widget'ları.
// Kart: #101012, r-24, kenar ışığı, yeşil piksel ≤%10 (tek istisna: §8.5 bitiş karesi).
// Marka katmanı: sol üst marka işareti + NOKTASIZ overline. "PARKIQ" yazısı yok.
//
// ÜÇ BAĞLAYICI KURAL:
// 1. Matematik yok — fiyat/ton RN'deki tariffMath'ten gelir.
// 2. Sözlük yok — görünen her etiket dile çevrilmiş halde RN'den gelir
//    (Live Activity'de ContentState, widget'ta App Group kutusu üzerinden).
//    Buradaki İngilizce dizgiler yalnız kutu boşken kullanılan son çare.
// 3. Zaman KENDİ KENDİNE akar — süre, geri sayım ve dolum çubuğu tarih aralıklarından
//    türer (`Text(timerInterval:)`, `ProgressView(timerInterval:)`). App arka planda hiç
//    çalışmasa da kart canlı kalır; RN güncellemesi yalnız para metinleri içindir.

private enum Palette {
  static let card = Color(red: 0x10 / 255, green: 0x10 / 255, blue: 0x12 / 255)
  static let green = Color(red: 0x2F / 255, green: 0xE0 / 255, blue: 0x7A / 255)
  static let amber = Color(red: 1.0, green: 0xB3 / 255, blue: 0.0)
  static let ink = Color(red: 0x14 / 255, green: 0x14 / 255, blue: 0x16 / 255)
  static let muted = Color(red: 0x8A / 255, green: 0x8A / 255, blue: 0x93 / 255)
  static let track = Color(red: 0x26 / 255, green: 0x26 / 255, blue: 0x2B / 255)

  /// §5.9 durum makinesi rengi — extension kendi kararını vermez, gelen tone'u çevirir.
  static func fill(for tone: String) -> Color {
    tone == "green" ? green : amber
  }
}

/// Widget GALERİSİ metinleri (isim/açıklama) App Group'tan okunamaz: bunlar
/// widget seçiciye çizilirken RN hiç çalışmamış olabilir. Bu yüzden tek
/// istisna olarak cihaz dilinden seçilir.
private enum Gallery {
  private static var isTurkish: Bool {
    (Locale.preferredLanguages.first ?? "en").hasPrefix("tr")
  }

  static var sessionName: String { "ParkIQ" }
  static var sessionDescription: String {
    isTurkish ? "Süren ve tarife dilimin." : "Your running session and tariff tier."
  }
  static var parkName: String { isTurkish ? "ParkIQ · Park Et" : "ParkIQ · Park" }
  static var parkDescription: String {
    isTurkish ? "Tek dokunuşla yerini kaydet." : "Save where you parked in one tap."
  }
  static var lockName: String { isTurkish ? "ParkIQ · Kilit Ekranı" : "ParkIQ · Lock Screen" }
  static var lockDescription: String {
    isTurkish ? "Süre ve sonraki fiyat artışı." : "Your timer and the next price rise."
  }
}

/// App Group kutusundan dile çevrilmiş metinler. RN her oturum değişiminde ve
/// dil değişiminde yazar; kutu boşsa İngilizceye düşülür (ilk kurulum anı).
private enum Shared {
  static let defaults = UserDefaults(suiteName: "group.parkiq.shared")

  static func text(_ key: String, _ fallback: String) -> String {
    let value = defaults?.string(forKey: key)
    return (value?.isEmpty == false ? value : nil) ?? fallback
  }
}

/// Geçerli bir tarih aralığı: `ProgressView(timerInterval:)` boş/ters aralıkta çöker.
private func liveRange(_ from: Date?, _ to: Date?) -> ClosedRange<Date>? {
  guard let from, let to, to > from else { return nil }
  return from...to
}

// MARK: - Marka glyph'i

private struct BrandGlyph: View {
  var size: CGFloat = 22

  var body: some View {
    // Marka işareti tek bir varlıktan gelir; harflerden kurulan eski "P." her
    // yüzeyde biraz farklı görünüyordu ve ikonla aynı şey değildi.
    Image("BrandMark")
      .resizable()
      .aspectRatio(contentMode: .fit)
      .frame(width: size, height: size)
      .accessibilityHidden(true)
  }
}

// MARK: - Ortak parçalar

/// Overline: 11/heavy, harf aralıklı, tek satır.
private struct Overline: View {
  let text: String
  var color: Color = Palette.muted

  var body: some View {
    Text(text)
      .font(.system(size: 11, weight: .heavy))
      .tracking(1.5)
      .foregroundStyle(color)
      .lineLimit(1)
  }
}

/// Geçen süre — HER ZAMAN ileri sayar (0'dan yukarı), sistem tarafından akıtılır.
/// `.timer` stili dar alanda "6:.." gibi kırpılabildiği için tek satır + küçülme payı.
private struct ElapsedTimer: View {
  let startedAt: Date
  var size: CGFloat = 44
  var weight: Font.Weight = .black
  var color: Color = .white

  var body: some View {
    Text(startedAt, style: .timer)
      .font(.system(size: size, weight: weight))
      .monospacedDigit()
      .foregroundStyle(color)
      .lineLimit(1)
      .minimumScaleFactor(0.5)
      .layoutPriority(1)
  }
}

/// §8.1 hero: fiyat artışına kalan süre. Sınır yoksa geçen süreye düşer —
/// iki sayaç aynı anda hero olmaz.
private struct HeroTimer: View {
  let startedAt: Date
  let boundary: Date?
  let tone: String
  var size: CGFloat = 44

  var body: some View {
    let color: Color = tone == "green" ? .white : Palette.amber
    if let range = liveRange(.now, boundary) {
      Text(timerInterval: range, countsDown: true)
        .font(.system(size: size, weight: .black))
        .monospacedDigit()
        .foregroundStyle(color)
        .lineLimit(1)
        .minimumScaleFactor(0.5)
    } else {
      ElapsedTimer(startedAt: startedAt, size: size, color: color)
    }
  }
}

/// Dilim çubuğu: içinde bulunulan fiyat diliminin ne kadarının geçtiği.
/// Zamanla KENDİ KENDİNE dolar — app kapalıyken de doğru kalan tek çubuk budur.
private struct TariffProgress: View {
  let range: ClosedRange<Date>
  let tone: String

  var body: some View {
    ProgressView(timerInterval: range, countsDown: false) {
      EmptyView()
    } currentValueLabel: {
      EmptyView()
    }
    .progressViewStyle(.linear)
    .tint(Palette.fill(for: tone))
  }
}

// MARK: - Live Activity gövdesi

private struct LiveActivityView: View {
  let state: ParkIQAttributes.ContentState

  private var overline: String {
    [state.placeName, state.floor]
      .compactMap { $0 }
      .filter { !$0.isEmpty }
      .joined(separator: " · ")
      .uppercased()
  }

  var body: some View {
    // §8.5 bitiş karesi: kart ters çevrilir, TÜM tipografi ink olur.
    if let stamp = state.finalStampText {
      VStack(alignment: .leading, spacing: 6) {
        Overline(text: overline, color: Palette.ink.opacity(0.7))
        Text(stamp)
          .font(.system(size: 40, weight: .black))
          .foregroundStyle(Palette.ink)
          .lineLimit(1)
          .minimumScaleFactor(0.5)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .padding(16)
      .background(Palette.green)
    } else {
      VStack(alignment: .leading, spacing: 10) {
        // Marka + yer + ikincil geçen süre. Hero geri sayım olduğunda "ne kadardır
        // parktayım" sorusunu cevaplayan tek yer burasıdır.
        HStack(spacing: 8) {
          BrandGlyph()
          Overline(text: overline)
          Spacer(minLength: 0)
          ElapsedTimer(startedAt: state.startedAt, size: 13, weight: .heavy, color: Palette.muted)
            .frame(maxWidth: 72)
        }

        // §8.1 hero: sonraki fiyat artışına kalan süre — sistemin kendi kendine doğru
        // tutabildiği tek gösterge, o yüzden en büyük yeri o alır.
        VStack(alignment: .leading, spacing: 2) {
          if let label = state.heroLabel {
            Overline(text: label)
          }
          HeroTimer(startedAt: state.startedAt, boundary: state.nextBoundaryAt, tone: state.barTone)
        }

        if let range = liveRange(state.tierStartedAt, state.nextBoundaryAt) {
          TariffProgress(range: range, tone: state.barTone)
        }

        if let footer = state.footerText {
          Text(footer)
            .font(.system(size: 13, weight: .heavy))
            .monospacedDigit()
            .foregroundStyle(.white)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .padding(16)
      .background(Palette.card)
      // Karta dokunmak app'i aktif oturumda açar; "Bitir" düğmesi ayrı yaşar.
      .widgetURL(URL(string: "parkiq://session"))
    }
  }
}

// MARK: - Live Activity kaydı

struct ParkIQLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: ParkIQAttributes.self) { context in
      LiveActivityView(state: context.state)
        .activityBackgroundTint(Palette.card)
        .activitySystemActionForegroundColor(.white)
    } dynamicIsland: { context in
      // Genişletilmiş ada kendi bölgelerini kullanır: tüm kartı .center'a
      // sıkıştırmak metinleri kırpıyordu.
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          HStack(spacing: 6) {
            BrandGlyph()
            Overline(text: (context.state.placeName ?? "").uppercased())
          }
          .padding(.leading, 4)
        }
        DynamicIslandExpandedRegion(.trailing) {
          HeroTimer(
            startedAt: context.state.startedAt,
            boundary: context.state.nextBoundaryAt,
            tone: context.state.barTone,
            size: 20
          )
          .padding(.trailing, 4)
        }
        DynamicIslandExpandedRegion(.bottom) {
          VStack(alignment: .leading, spacing: 8) {
            if let range = liveRange(context.state.tierStartedAt, context.state.nextBoundaryAt) {
              TariffProgress(range: range, tone: context.state.barTone)
            }
            if let footer = context.state.footerText {
              Text(footer)
                .font(.system(size: 13, weight: .heavy))
                .monospacedDigit()
                .foregroundStyle(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            }
          }
          .padding(.horizontal, 4)
        }
      } compactLeading: {
        BrandGlyph(size: 18)
      } compactTrailing: {
        HeroTimer(
          startedAt: context.state.startedAt,
          boundary: context.state.nextBoundaryAt,
          tone: context.state.barTone,
          size: 13
        )
        .frame(maxWidth: 56)
      } minimal: {
        BrandGlyph(size: 18)
      }
      .widgetURL(URL(string: "parkiq://session"))
    }
  }
}

// MARK: - Ana ekran + kilit ekranı widget'ları

struct ParkIQWidgetEntry: TimelineEntry {
  let date: Date
  let startedAt: Date?
  let placeName: String?
  let nextBoundaryAt: Date?
  let barTone: String
  let heroLabel: String?
  let footerText: String?
  let monthlySavedText: String?
  /// Dile çevrilmiş etiketler (App Group kutusundan).
  let noSessionText: String
  let savedLabel: String
  let parkTitle: String
  let parkHint: String
}

struct ParkIQWidgetProvider: TimelineProvider {
  func placeholder(in context: Context) -> ParkIQWidgetEntry { entry() }

  func getSnapshot(in context: Context, completion: @escaping (ParkIQWidgetEntry) -> Void) {
    completion(entry())
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<ParkIQWidgetEntry>) -> Void) {
    let current = entry()
    // Fiyat artışı biliniyorsa tam o anda tazelen: "Sonra ₺100" satırı bir dakika bile
    // yanlış kalmasın. Sayaçlar zaten kendi kendine akar, bu yalnız metinler için.
    let next = current.nextBoundaryAt.map { max($0, Date().addingTimeInterval(60)) }
      ?? Date().addingTimeInterval(900)
    completion(Timeline(entries: [current], policy: .after(next)))
  }

  private func entry() -> ParkIQWidgetEntry {
    let defaults = Shared.defaults
    let started = defaults?.object(forKey: "startedAtMs") as? Double
    let boundary = defaults?.object(forKey: "nextBoundaryAtMs") as? Double
    return ParkIQWidgetEntry(
      date: Date(),
      startedAt: started.map { Date(timeIntervalSince1970: $0 / 1000) },
      placeName: defaults?.string(forKey: "placeName"),
      nextBoundaryAt: boundary.map { Date(timeIntervalSince1970: $0 / 1000) },
      barTone: defaults?.string(forKey: "barTone") ?? "green",
      heroLabel: defaults?.string(forKey: "heroLabel"),
      footerText: defaults?.string(forKey: "footerText"),
      monthlySavedText: defaults?.string(forKey: "monthlySavedText"),
      noSessionText: Shared.text("wNoSession", "No active session"),
      savedLabel: Shared.text("wSavedLabel", "SAVED THIS MONTH"),
      parkTitle: Shared.text("wParkTitle", "Park"),
      parkHint: Shared.text("wParkHint", "Tap to save your spot")
    )
  }
}

struct ParkIQWidgetView: View {
  var entry: ParkIQWidgetEntry

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      HStack(spacing: 6) {
        BrandGlyph()
        if entry.startedAt != nil, let place = entry.placeName, !place.isEmpty {
          Overline(text: place.uppercased())
        }
        Spacer(minLength: 0)
      }

      Spacer(minLength: 0)

      if let started = entry.startedAt {
        // Aynı hiyerarşi kilit ekranı kartıyla: etiket → büyük sayaç → para satırı.
        if let label = entry.heroLabel {
          Overline(text: label)
        }
        HeroTimer(startedAt: started, boundary: entry.nextBoundaryAt, tone: entry.barTone, size: 34)
        if let footer = entry.footerText {
          Text(footer)
            .font(.system(size: 12, weight: .heavy))
            .monospacedDigit()
            .foregroundStyle(Palette.muted)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
        }
      } else {
        // §8.3 oturumsuz durum: aylık tasarruf öne çıkar, "oturum yok" ikincil.
        if let saved = entry.monthlySavedText, !saved.isEmpty {
          Overline(text: entry.savedLabel)
          Text(saved)
            .font(.system(size: 28, weight: .black))
            .monospacedDigit()
            .foregroundStyle(Palette.green)
            .lineLimit(1)
            .minimumScaleFactor(0.6)
        } else {
          Text(entry.noSessionText)
            .font(.system(size: 13))
            .foregroundStyle(Palette.muted)
            .lineLimit(2)
        }
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    .padding(16)
    .containerBackground(Palette.card, for: .widget)
    // Oturum varken app'i aç; yokken doğrudan park kaydına git.
    .widgetURL(URL(string: entry.startedAt == nil ? "parkiq://park" : "parkiq://session"))
  }
}

/// Tek işi olan kısayol: dokunulunca app açılır ve park kaydı başlar (§7.3 hızlı sorular).
struct ParkIQQuickParkView: View {
  var entry: ParkIQWidgetEntry

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      BrandGlyph()
      Spacer(minLength: 0)
      Text(entry.parkTitle)
        .font(.system(size: 28, weight: .black))
        .foregroundStyle(.white)
        .lineLimit(1)
        .minimumScaleFactor(0.6)
      Text(entry.parkHint)
        .font(.system(size: 11))
        .foregroundStyle(Palette.muted)
        .lineLimit(2)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    .padding(16)
    .containerBackground(Palette.card, for: .widget)
    .widgetURL(URL(string: "parkiq://park"))
  }
}

struct ParkIQQuickParkWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "ParkIQQuickPark", provider: ParkIQWidgetProvider()) { entry in
      ParkIQQuickParkView(entry: entry)
    }
    .configurationDisplayName(Gallery.parkName)
    .description(Gallery.parkDescription)
    .supportedFamilies([.systemSmall])
  }
}

struct ParkIQWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "ParkIQWidget", provider: ParkIQWidgetProvider()) { entry in
      ParkIQWidgetView(entry: entry)
    }
    .configurationDisplayName(Gallery.sessionName)
    .description(Gallery.sessionDescription)
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

/// Kilit ekranı: oturum yokken tek dokunuşla park kaydı (`parkiq://park` → hızlı sorular),
/// oturum varken canlı sayaç. Sistem tek renk çizer; renk seçilmez, hiyerarşi tipografiden.
struct ParkIQLockView: View {
  @Environment(\.widgetFamily) private var family
  var entry: ParkIQWidgetEntry

  var body: some View {
    Group {
      switch family {
      case .accessoryRectangular:
        VStack(alignment: .leading, spacing: 1) {
          if entry.startedAt != nil {
            Text((entry.heroLabel ?? entry.placeName ?? "").uppercased())
              .font(.system(size: 11, weight: .heavy))
              .tracking(1.2)
              .lineLimit(1)
              .widgetAccentable()
            // Kilit ekranında renk sistemindir: sayaç kendi rengini dayatmaz.
            if let range = liveRange(.now, entry.nextBoundaryAt) {
              Text(timerInterval: range, countsDown: true)
                .font(.system(size: 22, weight: .black))
                .monospacedDigit()
                .lineLimit(1)
                .minimumScaleFactor(0.5)
            } else if let started = entry.startedAt {
              Text(started, style: .timer)
                .font(.system(size: 22, weight: .black))
                .monospacedDigit()
                .lineLimit(1)
                .minimumScaleFactor(0.5)
            }
            if let footer = entry.footerText {
              Text(footer)
                .font(.system(size: 12, weight: .semibold))
                .monospacedDigit()
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            }
          } else {
            Text(entry.parkTitle)
              .font(.system(size: 20, weight: .black))
              .lineLimit(1)
              .widgetAccentable()
            Text(entry.parkHint)
              .font(.system(size: 12))
              .lineLimit(2)
          }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      default:
        if let started = entry.startedAt {
          Text(started, style: .timer)
        } else {
          Text(entry.parkTitle)
        }
      }
    }
    .containerBackground(.clear, for: .widget)
    .widgetURL(URL(string: entry.startedAt == nil ? "parkiq://park" : "parkiq://session"))
  }
}

struct ParkIQLockWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "ParkIQLock", provider: ParkIQWidgetProvider()) { entry in
      ParkIQLockView(entry: entry)
    }
    .configurationDisplayName(Gallery.lockName)
    .description(Gallery.lockDescription)
    // Dairesel aile YOK: o boyutta yalnız bir halka kalıyor, ne olduğu anlaşılmıyor.
    .supportedFamilies([.accessoryRectangular, .accessoryInline])
  }
}

@main
struct ParkIQWidgetBundle: WidgetBundle {
  var body: some Widget {
    ParkIQWidget()
    ParkIQQuickParkWidget()
    ParkIQLockWidget()
    ParkIQLiveActivity()
  }
}
