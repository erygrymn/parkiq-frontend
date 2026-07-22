import type { ConfigContext, ExpoConfig } from 'expo/config';

// app.json taban config'tir; burada yalnız ortama bağlı parçalar eklenir.
// MAPBOX_DOWNLOADS_TOKEN (sk.*) yalnız Mac'te prebuild/pod install sırasında gerekir;
// Windows'ta metro/Expo Go çalışırken yokluğu sorun değildir.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  ios: {
    ...(config.ios ?? {}),
    // Live Activity/widget ile ana app arasındaki paylaşılan kutu (§8.3)
    entitlements: {
      ...((config.ios?.entitlements as Record<string, unknown>) ?? {}),
      'com.apple.security.application-groups': ['group.parkiq.shared'],
    },
    infoPlist: {
      ...((config.ios?.infoPlist as Record<string, unknown>) ?? {}),
      // ActivityKit: Live Activity izni
      NSSupportsLiveActivities: true,
    },
  },
  plugins: [
    [
      '@rnmapbox/maps',
      {
        RNMapboxMapsDownloadToken: process.env.MAPBOX_DOWNLOADS_TOKEN,
      },
    ],
    // WidgetKit extension target'ı (targets/widget) — prebuild sırasında eklenir
    '@bacons/apple-targets',
  ],
});
