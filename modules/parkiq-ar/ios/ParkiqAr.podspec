require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

# Yerel Expo modülü podspec'i. Bu dosya OLMADAN expo-modules-autolinking modülün
# Swift kaynağını derlemez: modül sessizce atlanır ve köprü no-op olur.
# ARKit/RealityKit sistem framework'leridir — ek pod bağımlılığı yoktur.
Pod::Spec.new do |s|
  s.name           = 'ParkiqAr'
  s.version        = package['version']
  s.summary        = 'ParkIQ ARKit find-my-car view'
  s.description    = 'ParkIQ ARKit find-my-car view'
  s.author         = 'TwiceApps'
  s.homepage       = 'https://parkiq.app'
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'ARKit', 'RealityKit', 'CoreLocation'

  s.source_files = "**/*.{h,m,swift}"
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES'
  }
end
