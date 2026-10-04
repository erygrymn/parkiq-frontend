require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

# Yerel Expo modülü podspec'i (bkz. ParkiqAr.podspec): bu dosya olmadan autolinking
# Swift kaynağını derlemez ve modül sessizce no-op kalır.
Pod::Spec.new do |s|
  s.name           = 'ParkiqQuickActions'
  s.version        = package['version']
  s.summary        = 'ParkIQ home screen quick actions'
  s.description    = 'ParkIQ home screen quick actions'
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
