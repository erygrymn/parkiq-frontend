import ActivityKit
import SwiftUI
import WidgetKit

// design.md §8 — Live Activity + Dynamic Island + widget.
// Kart: #101012, r-24, kenar ışığı, yeşil piksel ≤%10 (tek istisna: §8.5 bitiş karesi).
// Marka katmanı: sol üst marka işareti + NOKTASIZ overline. "PARKIQ" yazısı yok.
//
// İKİ BAĞLAYICI KURAL:
// 1. Matematik yok — segment/knob/ton RN'deki tariffMath'ten gelir.
// 2. Sözlük yok — görünen her etiket dile çevrilmiş halde RN'den gelir
//    (Live Activity'de ContentState, widget'ta App Group kutusu üzerinden).
//    Buradaki İngilizce dizgiler yalnız kutu boşken kullanılan son çare.

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

// MARK: - Marka glyph'i

private struct BrandGlyph: View {
  var body: some View {
    // Marka işareti tek bir varlıktan gelir; harflerden kurulan eski "P." her
    // yüzeyde biraz farklı görünüyordu ve ikonla aynı şey değildi.
    Image("BrandMark")
      .resizable()
      .aspectRatio(contentMode: .fit)
      .frame(width: 22, height: 22)
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

/// Geçen süre — HER ZAMAN ileri sayar (0'dan yukarı).
/// `.timer` stili dar alanda "6:.." gibi kırpılabildiği için burada tek satır +
/// küçülme payı verilir ve sıkıştırma direnci yükseltilir.
private struct ElapsedTimer: View {
  let startedAt: Date
  var size: CGFloat = 44
  var color: Color = .white

  var body: some View {
    Text(startedAt, style: .timer)
      .font(.system(size: size, weight: .black))
      .monospacedDigit()
      .foregroundStyle(color)
      .lineLimit(1)
      .minimumScaleFactor(0.5)
      .layoutPriority(1)
  }
}

// MARK: - Tarife çubuğu (yalnız render)

private struct TariffBar: View {
  let state: ParkIQAttributes.ContentState

  var body: some View {
    GeometryReader { geo in
      let width = geo.size.width
      ZStack(alignment: .leading) {
        HStack(spacing: 2) {
          ForEach(Array(state.segments.enumerated()), id: \.offset) { _, segment in
            RoundedRectangle(cornerRadius: 4, style: .continuous)
              .fill(Palette.track)
              .frame(width: max(0, width * segment.widthPct / 100 - 2))
          }
        }
        if let knob = state.knobPct {
          RoundedRectangle(cornerRadius: 4, style: .continuous)
            .fill(Palette.fill(for: state.barTone))
            .frame(width: max(0, width * knob / 100))
        }
      }
    }
    .frame(height: 8)
  }
}

// MARK: - Live Activity gövdesi

private struct LiveActivityView: View {
  let attributes: ParkIQAttributes
  let state: ParkIQAttributes.ContentState

  private var overline: String {
    [attributes.placeName, attributes.floor]
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
        HStack(spacing: 8) {
          BrandGlyph()
          Overline(text: overline)
          Spacer(minLength: 0)
        }

        // §8.1 hero: sonraki fiyat artışına KALAN SÜRE.
        //
        // App askıdayken hiçbir kodumuz çalışmaz — para rakamı son ön plan
        // değerinde donar. Sistemin kendi kendine doğru tutabildiği tek gösterge
        // budur, o yüzden en büyük yeri o alır. Sınır yoksa (son dilim, sabit
        // tarife) geçen süreye düşülür; iki sayaç aynı anda gösterilmez.
        VStack(alignment: .leading, spacing: 2) {
          if let label = state.heroLabel {
            Overline(text: label)
          }
          if let boundary = state.nextBoundaryAt, boundary > .now {
            Text(timerInterval: Date.now...boundary, countsDown: true)
              .font(.system(size: 44, weight: .black))
              .monospacedDigit()
              .foregroundStyle(state.barTone == "green" ? .white : Palette.amber)
              .lineLimit(1)
              .minimumScaleFactor(0.5)
          } else {
            ElapsedTimer(
              startedAt: state.startedAt,
              color: state.barTone == "green" ? .white : Palette.amber
            )
          }
        }

        if !state.segments.isEmpty {
          TariffBar(state: state)
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
    }
  }
}

// MARK: - Live Activity kaydı

struct ParkIQLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: ParkIQAttributes.self) { context in
      LiveActivityView(attributes: context.attributes, state: context.state)
        .activityBackgroundTint(Palette.card)
        .activitySystemActionForegroundColor(.white)
    } dynamicIsland: { context in
      // Genişletilmiş ada kendi bölgelerini kullanır: tüm kartı .center'a
      // sıkıştırmak metinleri kırpıyordu.
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          HStack(spacing: 6) {
            BrandGlyph()
            Overline(text: (context.attributes.placeName ?? "").uppercased())
          }
          .padding(.leading, 4)
        }
        DynamicIslandExpandedRegion(.trailing) {
          ElapsedTimer(startedAt: context.state.startedAt, size: 20)
            .padding(.trailing, 4)
        }
        DynamicIslandExpandedRegion(.bottom) {
          VStack(alignment: .leading, spacing: 8) {
            if !context.state.segments.isEmpty {
              TariffBar(state: context.state)
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
        BrandGlyph()
      } compactTrailing: {
        ElapsedTimer(
          startedAt: context.state.startedAt,
          size: 13,
          color: context.state.barTone == "green" ? .white : Palette.amber
        )
        .frame(maxWidth: 56)
      } minimal: {
        BrandGlyph()
      }
    }
  }
}

// MARK: - Ana ekran widget'ı

struct ParkIQWidgetEntry: TimelineEntry {
  let date: Date
  let startedAt: Date?
  let placeName: String?
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
    completion(Timeline(entries: [entry()], policy: .after(Date().addingTimeInterval(900))))
  }

  private func entry() -> ParkIQWidgetEntry {
    let defaults = Shared.defaults
    let started = defaults?.object(forKey: "startedAtMs") as? Double
    return ParkIQWidgetEntry(
      date: Date(),
      startedAt: started.map { Date(timeIntervalSince1970: $0 / 1000) },
      placeName: defaults?.string(forKey: "placeName"),
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
        ElapsedTimer(startedAt: started, size: 34)
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

/// Tek işi olan kısayol: dokunulunca app açılır ve park kaydı başlar.
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

@main
struct ParkIQWidgetBundle: WidgetBundle {
  var body: some Widget {
    ParkIQWidget()
    ParkIQQuickParkWidget()
    ParkIQLiveActivity()
  }
}
