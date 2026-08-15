const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('expo/config-plugins');

// İzin diyalogları uygulamanın ilk temasıdır ve Info.plist'teki metin her zaman
// İngilizce. iOS bu metinleri `<dil>.lproj/InfoPlist.strings` dosyalarından
// yerelleştirir; prebuild o klasörleri üretmediği için burada yazıyoruz.
//
// Anahtar başına yalnız çevirisi OLAN diller yazılır: eksik bir dosya iOS'u
// Info.plist'teki İngilizce karşılığa düşürür, yarım çeviri göstermez.

const STRINGS = {
  tr: {
    NSLocationWhenInUseUsageDescription:
      'ParkIQ arabanı nereye bıraktığını kaydeder, dönüşte bulman için. Konumun bu cihazda kalır.',
    NSCameraUsageDescription:
      'Park yerinin fotoğrafını çek, kamerayı doğrultup arabana dönüş yolunu gör. Fotoğraflar ve kamera görüntüsü bu cihazda kalır.',
    NSPhotoLibraryUsageDescription:
      'Park yerinin fotoğrafını galerinden seçebilmen için. Fotoğraf bu cihazdan çıkmaz.',
  },
};

function escape(value) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

module.exports = function withLocalizedInfoPlist(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const projectRoot = cfg.modRequest.platformProjectRoot;
      for (const [locale, entries] of Object.entries(STRINGS)) {
        const dir = path.join(projectRoot, `${locale}.lproj`);
        fs.mkdirSync(dir, { recursive: true });
        const body = Object.entries(entries)
          .map(([key, value]) => `"${key}" = "${escape(value)}";`)
          .join('\n');
        // UTF-8 kabul edilir; BOM yazmıyoruz çünkü Xcode onu metnin parçası sayabiliyor.
        fs.writeFileSync(path.join(dir, 'InfoPlist.strings'), `${body}\n`, 'utf8');
      }
      return cfg;
    },
  ]);
};
