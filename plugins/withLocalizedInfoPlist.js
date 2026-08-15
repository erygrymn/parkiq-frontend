const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('expo/config-plugins');

// İzin diyalogları uygulamanın ilk temasıdır ve Info.plist'teki metin her zaman
// İngilizce. iOS bu metinleri `<dil>.lproj/InfoPlist.strings` dosyalarından
// yerelleştirir; prebuild o klasörleri üretmediği için burada yazıyoruz.
//
// Yalnız çevirisi OLAN diller yazılır: eksik bir dosya iOS'u Info.plist'teki
// İngilizce karşılığa düşürür, yarım çeviri göstermez.
//
// Klasör adları iOS'un dil kodları — uygulama içi `Locale` birimleriyle birebir
// aynı değil (iOS 'de' der, biz 'de-DE'; iOS bölgesizi tercih eder).

const LOCATION = 'NSLocationWhenInUseUsageDescription';
const CAMERA = 'NSCameraUsageDescription';
const PHOTOS = 'NSPhotoLibraryUsageDescription';

const STRINGS = {
  tr: {
    [LOCATION]:
      'ParkIQ arabanı nereye bıraktığını kaydeder, dönüşte bulman için. Konumun bu cihazda kalır.',
    [CAMERA]:
      'Park yerinin fotoğrafını çek, kamerayı doğrultup arabana dönüş yolunu gör. Fotoğraflar ve kamera görüntüsü bu cihazda kalır.',
    [PHOTOS]:
      'Park yerinin fotoğrafını galerinden seçebilmen için. Fotoğraf bu cihazdan çıkmaz.',
  },
  de: {
    [LOCATION]:
      'ParkIQ merkt sich, wo du geparkt hast, damit du dein Auto wiederfindest. Dein Standort bleibt auf diesem Gerät.',
    [CAMERA]:
      'Fotografiere deinen Stellplatz und richte die Kamera aus, um den Weg zurück zum Auto zu sehen. Fotos und Kamerabild bleiben auf diesem Gerät.',
    [PHOTOS]:
      'Damit du ein Foto deines Stellplatzes aus deiner Mediathek wählen kannst. Das Foto verlässt dieses Gerät nicht.',
  },
  fr: {
    [LOCATION]:
      'ParkIQ enregistre où vous vous êtes garé pour que vous retrouviez votre voiture. Votre position reste sur cet appareil.',
    [CAMERA]:
      'Photographiez votre place et pointez la caméra pour voir le chemin du retour. Les photos et le flux caméra restent sur cet appareil.',
    [PHOTOS]:
      'Pour choisir une photo de votre place depuis votre photothèque. La photo ne quitte pas cet appareil.',
  },
  es: {
    [LOCATION]:
      'ParkIQ guarda dónde aparcaste para que encuentres tu coche al volver. Tu ubicación se queda en este dispositivo.',
    [CAMERA]:
      'Haz una foto de tu plaza y apunta la cámara para ver el camino de vuelta al coche. Las fotos y la cámara se quedan en este dispositivo.',
    [PHOTOS]:
      'Para que elijas una foto de tu plaza desde tu fototeca. La foto no sale de este dispositivo.',
  },
  'es-MX': {
    [LOCATION]:
      'ParkIQ guarda dónde estacionaste para que encuentres tu carro al volver. Tu ubicación se queda en este dispositivo.',
    [CAMERA]:
      'Toma una foto de tu lugar y apunta la cámara para ver el camino de regreso al carro. Las fotos y la cámara se quedan en este dispositivo.',
    [PHOTOS]:
      'Para que elijas una foto de tu lugar desde tu fototeca. La foto no sale de este dispositivo.',
  },
  it: {
    [LOCATION]:
      'ParkIQ registra dove hai parcheggiato così ritrovi l’auto al ritorno. La tua posizione resta su questo dispositivo.',
    [CAMERA]:
      'Fotografa il posto e punta la fotocamera per vedere la strada verso l’auto. Le foto e la fotocamera restano su questo dispositivo.',
    [PHOTOS]:
      'Per scegliere dalla libreria una foto del posto dove hai parcheggiato. La foto non lascia questo dispositivo.',
  },
  nl: {
    [LOCATION]:
      'ParkIQ onthoudt waar je hebt geparkeerd, zodat je je auto terugvindt. Je locatie blijft op dit apparaat.',
    [CAMERA]:
      'Maak een foto van je plek en richt de camera om de weg terug naar je auto te zien. Foto’s en camerabeeld blijven op dit apparaat.',
    [PHOTOS]:
      'Zodat je een foto van je parkeerplek uit je bibliotheek kunt kiezen. De foto verlaat dit apparaat niet.',
  },
  'pt-BR': {
    [LOCATION]:
      'O ParkIQ guarda onde você estacionou para achar seu carro na volta. Sua localização fica neste dispositivo.',
    [CAMERA]:
      'Tire uma foto da vaga e aponte a câmera para ver o caminho de volta ao carro. As fotos e a câmera ficam neste dispositivo.',
    [PHOTOS]:
      'Para escolher uma foto da vaga na sua fototeca. A foto não sai deste dispositivo.',
  },
  'pt-PT': {
    [LOCATION]:
      'O ParkIQ guarda onde estacionou para encontrar o seu carro no regresso. A sua localização fica neste dispositivo.',
    [CAMERA]:
      'Tire uma foto do lugar e aponte a câmara para ver o caminho de volta ao carro. As fotos e a câmara ficam neste dispositivo.',
    [PHOTOS]:
      'Para escolher uma foto do lugar na sua fototeca. A foto não sai deste dispositivo.',
  },
  ja: {
    [LOCATION]:
      'ParkIQ は駐車した場所を記録し、戻るときに車を見つけられるようにします。位置情報はこの端末から出ません。',
    [CAMERA]:
      '駐車場所の写真を撮り、カメラを向けて車までの道を確認します。写真とカメラ映像はこの端末から出ません。',
    [PHOTOS]: '駐車場所の写真をライブラリから選ぶために使います。写真はこの端末から出ません。',
  },
  ko: {
    [LOCATION]:
      'ParkIQ가 주차한 위치를 저장해 돌아올 때 차를 찾도록 도와줘요. 위치 정보는 이 기기에만 남아요.',
    [CAMERA]:
      '주차 자리를 사진으로 찍고, 카메라를 비춰 차까지 가는 길을 봐요. 사진과 카메라 화면은 이 기기에만 남아요.',
    [PHOTOS]: '주차 자리 사진을 보관함에서 고르기 위해 사용해요. 사진은 이 기기를 벗어나지 않아요.',
  },
  'zh-Hant': {
    [LOCATION]:
      'ParkIQ 會記住你停車的位置，讓你回來時找得到車。你的位置只留在這台裝置上。',
    [CAMERA]:
      '拍下停車位，並用相機看回到車子的方向。照片與相機畫面只留在這台裝置上。',
    [PHOTOS]: '讓你從照片圖庫選擇停車位的照片。照片不會離開這台裝置。',
  },
  sv: {
    [LOCATION]:
      'ParkIQ sparar var du parkerade så att du hittar tillbaka till bilen. Din plats stannar på den här enheten.',
    [CAMERA]:
      'Fotografera din plats och rikta kameran för att se vägen tillbaka till bilen. Foton och kamerabilden stannar på den här enheten.',
    [PHOTOS]:
      'För att du ska kunna välja ett foto av din parkeringsplats ur biblioteket. Fotot lämnar aldrig den här enheten.',
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
