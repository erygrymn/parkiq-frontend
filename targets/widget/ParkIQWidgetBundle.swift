import ActivityKit
import SwiftUI
import WidgetKit

// design.md §8 — Live Activity + Dynamic Island + widget.
// Kart: #101012, r-24, kenar ışığı, yeşil piksel ≤%10 (tek istisna: §8.5 bitiş karesi).
// Marka katmanı: sol üst "P." glyph + NOKTASIZ overline. "PARKIQ" yazısı yok.

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

// MARK: - Marka glyph'i

private struct BrandGlyph: View {
  var body: some View {
    ZStack {
      RoundedRectangle(cornerRadius: 7, style: .continuous)
        .fill(Palette.ink)
        .overlay(RoundedRectangle(cornerRadius: 7, style: .continuous).stroke(Palette.green, lineWidth: 1))
      HStack(spacing: 0) {
        Text("P").font(.system(size: 12, weight: .black)).foregroundStyle(.white)
        Text(".").font(.system(size: 12, weight: .black)).foregroundStyle(Palette.green)
      }
    }
    .frame(width: 22, height: 22)
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
      VStack(alignment: .leading, spacing: 8) {
        Text(overline)
          .font(.system(size: 11, weight: .heavy))
          .tracking(1.5)
          .foregroundStyle(Palette.ink.opacity(0.7))
        Text(stamp)
          .font(.system(size: 44, weight: .black))
          .foregroundStyle(Palette.ink)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .padding(16)
      .background(Palette.green)
    } else {
      VStack(alignment: .leading, spacing: 12) {
        HStack(spacing: 8) {
          BrandGlyph()
          Text(overline)
            .font(.system(size: 11, weight: .heavy))
            .tracking(1.5)
            .foregroundStyle(Palette.muted)
            .lineLimit(1)
        }

        HStack(alignment: .lastTextBaseline) {
          // §8.1 hero: tarifeliyse sonraki dilime GERİ SAYIM, değilse geçen süre
          if let boundary = state.nextBoundaryAt {
            VStack(alignment: .leading, spacing: 2) {
              Text(state.nextPriceText.map { "NEXT TIER \($0)" } ?? "NEXT TIER")
                .font(.system(size: 11, weight: .heavy))
                .tracking(1.5)
                .foregroundStyle(Palette.muted)
              Text(timerInterval: Date()...boundary, countsDown: true)
                .font(.system(size: 44, weight: .black, design: .default))
                .monospacedDigit()
                .foregroundStyle(state.barTone == "green" ? .white : Palette.amber)
            }
          } else {
            VStack(alignment: .leading, spacing: 2) {
              Text("PARKED")
                .font(.system(size: 11, weight: .heavy))
                .tracking(1.5)
                .foregroundStyle(Palette.muted)
              Text(state.startedAt, style: .timer)
                .font(.system(size: 44, weight: .black))
                .monospacedDigit()
                .foregroundStyle(.white)
            }
          }

          Spacer()

          if state.nextBoundaryAt != nil {
            VStack(alignment: .trailing, spacing: 2) {
              Text("ELAPSED")
                .font(.system(size: 11, weight: .heavy))
                .tracking(1.5)
                .foregroundStyle(Palette.muted)
              Text(state.startedAt, style: .timer)
                .font(.system(size: 17, weight: .semibold))
                .monospacedDigit()
                .foregroundStyle(.white)
            }
          }
        }

        if !state.segments.isEmpty {
          TariffBar(state: state)
        }

        if let now = state.nowPriceText, let next = state.nextPriceText {
          Text("Now \(now) · Next \(next)")
            .font(.system(size: 13, weight: .heavy))
            .monospacedDigit()
            .foregroundStyle(.white)
        }
      }
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
      DynamicIsland {
        DynamicIslandExpandedRegion(.center) {
          LiveActivityView(attributes: context.attributes, state: context.state)
        }
      } compactLeading: {
        BrandGlyph()
      } compactTrailing: {
        if let boundary = context.state.nextBoundaryAt {
          Text(timerInterval: Date()...boundary, countsDown: true)
            .font(.system(size: 13, weight: .heavy))
            .monospacedDigit()
            .foregroundStyle(Palette.fill(for: context.state.barTone))
            .frame(maxWidth: 52)
        } else {
          Text(context.state.startedAt, style: .timer)
            .font(.system(size: 13, weight: .heavy))
            .monospacedDigit()
            .foregroundStyle(.white)
            .frame(maxWidth: 52)
        }
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
}

struct ParkIQWidgetProvider: TimelineProvider {
  private let defaults = UserDefaults(suiteName: "group.parkiq.shared")

  func placeholder(in context: Context) -> ParkIQWidgetEntry {
    ParkIQWidgetEntry(date: Date(), startedAt: nil, placeName: nil, monthlySavedText: nil)
  }

  func getSnapshot(in context: Context, completion: @escaping (ParkIQWidgetEntry) -> Void) {
    completion(entry())
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<ParkIQWidgetEntry>) -> Void) {
    completion(Timeline(entries: [entry()], policy: .after(Date().addingTimeInterval(900))))
  }

  private func entry() -> ParkIQWidgetEntry {
    let started = defaults?.object(forKey: "startedAtMs") as? Double
    return ParkIQWidgetEntry(
      date: Date(),
      startedAt: started.map { Date(timeIntervalSince1970: $0 / 1000) },
      placeName: defaults?.string(forKey: "placeName"),
      monthlySavedText: defaults?.string(forKey: "monthlySavedText")
    )
  }
}

struct ParkIQWidgetView: View {
  var entry: ParkIQWidgetEntry

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      HStack(spacing: 6) {
        BrandGlyph()
        if let place = entry.placeName {
          Text(place.uppercased())
            .font(.system(size: 11, weight: .heavy))
            .tracking(1.5)
            .foregroundStyle(Palette.muted)
            .lineLimit(1)
        }
      }
      Spacer(minLength: 0)
      if let started = entry.startedAt {
        Text(started, style: .timer)
          .font(.system(size: 34, weight: .black))
          .monospacedDigit()
          .foregroundStyle(.white)
      } else {
        // §8.3 oturumsuz durum
        Text("No active session")
          .font(.system(size: 13))
          .foregroundStyle(Palette.muted)
        if let saved = entry.monthlySavedText {
          Text(saved)
            .font(.system(size: 17, weight: .heavy))
            .monospacedDigit()
            .foregroundStyle(Palette.green)
        }
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    .padding(16)
    .containerBackground(Palette.card, for: .widget)
  }
}

struct ParkIQWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "ParkIQWidget", provider: ParkIQWidgetProvider()) { entry in
      ParkIQWidgetView(entry: entry)
    }
    .configurationDisplayName("ParkIQ")
    .description("Your active parking session.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

@main
struct ParkIQWidgetBundle: WidgetBundle {
  var body: some Widget {
    ParkIQWidget()
    ParkIQLiveActivity()
  }
}
