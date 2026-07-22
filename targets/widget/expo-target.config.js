/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
  type: 'widget',
  name: 'ParkIQWidget',
  // Live Activity + widget aynı extension'da yaşar (design.md §8 mimari notu).
  entitlements: {
    'com.apple.security.application-groups': ['group.parkiq.shared'],
  },
  frameworks: ['SwiftUI', 'WidgetKit', 'ActivityKit'],
};
