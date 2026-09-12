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
    // Gizlilik manifesti (5.1.1/5.1.2). Required-reason API'lerini pod'lar kendi
    // manifestleriyle beyan ediyor; burada beyan edilen şey UYGULAMANIN topladığı
    // veri: tarife havuzu park koordinatını sunucuya yolluyor, dolayısıyla hassas
    // konum "toplanıyor" sayılır. ATT yok, izleme yok. Bu tablo App Store Connect
    // gizlilik etiketleriyle BİREBİR aynı kalmalı.
    privacyManifests: {
      NSPrivacyTracking: false,
      NSPrivacyTrackingDomains: [],
      // Her satır App Store Connect'teki App Privacy etiketiyle BİREBİR aynı olmalı.
      // RevenueCat kendi manifestini pod'uyla getiriyor (IDFV, app user ID, satın alma);
      // Twice SDK bizim olduğu için onun topladıkları BURADA beyan ediliyor.
      NSPrivacyCollectedDataTypes: [
        {
          // Tarife havuzu: rızayla, park koordinatı sunucuya gidiyor.
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypePreciseLocation',
          // Gönderim otopark başına türetilmiş bir özet taşıyor: kimliğe bağlı değil.
          NSPrivacyCollectedDataTypeLinked: false,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
        },
        {
          // Tarife havuzu: kullanıcının girdiği fiyat (kullanıcı içeriği).
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeOtherUserContent',
          NSPrivacyCollectedDataTypeLinked: false,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
        },
        {
          // Twice: rastgele kurulum kimliği (twice_user_id) — hesap yok, kişiye bağlanmıyor.
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeUserID',
          NSPrivacyCollectedDataTypeLinked: false,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAnalytics'],
        },
        {
          // Twice: park_started / park_ended / paywall_shown gibi ürün olayları.
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeProductInteraction',
          NSPrivacyCollectedDataTypeLinked: false,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAnalytics'],
        },
        {
          // Twice: satın alma olayları (ürün kimliği, fiyat, para birimi) panoya iletiliyor.
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypePurchaseHistory',
          NSPrivacyCollectedDataTypeLinked: false,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAnalytics'],
        },
        {
          // Twice: tipli hata olayları + OS / uygulama sürümü.
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeOtherDiagnosticData',
          NSPrivacyCollectedDataTypeLinked: false,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAnalytics'],
        },
      ],
      NSPrivacyAccessedAPITypes: [],
    },
    infoPlist: {
      ...((config.ios?.infoPlist as Record<string, unknown>) ?? {}),
      // ActivityKit: Live Activity izni
      NSSupportsLiveActivities: true,
      // AlarmKit (iOS 26+): "Sesli" hatırlatıcı sistem alarmı kurar — sessiz modu deler.
      NSAlarmKitUsageDescription:
        'ParkIQ schedules an alarm so your parking reminder rings even when the phone is on silent.',
    },
  },
  plugins: [
    /*
     * iOS tabanı 18.0.
     *
     * AlarmKit köprüsü (react-native-nitro-ios-alarm-kit) podspec'inde en az iOS 18
     * istiyor; Expo'nun varsayılanıyla `pod install` "compatible versions" hatasıyla
     * duruyordu. Alarmın kendisi zaten iOS 26+; taban 18 olunca eski sürümlerde app
     * hiç kurulmuyor ama alarm sözü tutulabiliyor. Audie'de de aynı taban kullanılıyor.
     */
    [
      'expo-build-properties',
      {
        ios: { deploymentTarget: '18.0' },
      },
    ],
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
