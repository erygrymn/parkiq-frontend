require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

# Yerel Expo modülü podspec'i. Bu dosya OLMADAN expo-modules-autolinking modülün
# Swift kaynağını derlemez: modül sessizce atlanır, requireNativeModule fırlatır ve
# köprü no-op olur (LA/widget/OCR/oto-algılama "hiç çalışmıyor" görünür).
Pod::Spec.new do |s|
  s.name           = 'ParkiqLiveActivity'
  s.version        = package['version']
  s.summary        = 'ParkIQ parkiq-live-activity native module'
  s.description    = 'ParkIQ parkiq-live-activity native module'
  s.author         = 'TwiceApps'
  s.homepage       = 'https://parkiq.app'
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = "**/*.{h,m,swift}"
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES'
  }
end
