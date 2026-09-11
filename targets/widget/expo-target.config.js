/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
  type: 'widget',
  name: 'ParkIQWidget',
  // Live Activity + widget aynı extension'da yaşar (design.md §8 mimari notu).
  entitlements: {
    'com.apple.security.application-groups': ['group.parkiq.shared'],
  },
  frameworks: ['SwiftUI', 'WidgetKit', 'ActivityKit'],
  // Marka işareti extension'ın kendi asset catalog'una girer: widget ve Live
  // Activity ana app'in bundle'ını okuyamaz, kendi kopyası olmak zorunda.
  images: {
    BrandMark: './brand-mark.png',
  },
};
