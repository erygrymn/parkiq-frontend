import type { ConfigContext, ExpoConfig } from 'expo/config';

// app.json taban config'tir; burada yalnız ortama bağlı parçalar eklenir.
// MAPBOX_DOWNLOADS_TOKEN (sk.*) yalnız Mac'te prebuild/pod install sırasında gerekir;
// Windows'ta metro/Expo Go çalışırken yokluğu sorun değildir.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  ios: {
    ...(config.ios ?? {}),
    // Widget extension target'ının imzalanabilmesi için zorunlu (@bacons/apple-targets)
    appleTeamId: 'H935CHT5WL',
    // Live Activity/widget ile ana app arasındaki paylaşılan kutu (§8.3)
    entitlements: {
      ...((config.ios?.entitlements as Record<string, unknown>) ?? {}),
      'com.apple.security.application-groups': ['group.parkiq.shared'],
      // Fiyat artışı uyarısı ve sesli hatırlatıcı Odak modlarını delebilsin (§8.4).
      // Xcode otomatik imzalamada "Time Sensitive Notifications" yeteneğini kendisi ekler.
      'com.apple.developer.usernotifications.time-sensitive': true,
    },
    infoPlist: {
      ...((config.ios?.infoPlist as Record<string, unknown>) ?? {}),
      // ActivityKit: Live Activity izni
      NSSupportsLiveActivities: true,
    },
  },
  plugins: [
    // expo-image: SDWebImage/AVIF/heic desteği için config plugin
    'expo-image',
    [
      '@rnmapbox/maps',
      {
        RNMapboxMapsDownloadToken: process.env.MAPBOX_DOWNLOADS_TOKEN,
      },
    ],
    // WidgetKit extension target'ı (targets/widget) — prebuild sırasında eklenir
    '@bacons/apple-targets',
    // İzin diyaloglarının yerelleştirilmiş metinleri (<dil>.lproj/InfoPlist.strings)
    './plugins/withLocalizedInfoPlist',
  ],
});
