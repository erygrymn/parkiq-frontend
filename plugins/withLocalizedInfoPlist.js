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

// Metinler İŞİ anlatır, veri akışı SÖZÜ vermez. "Bu cihazdan çıkmaz" cümlesi
// buradaydı ve tarife havuzu koordinat gönderdiği an yalana dönüyordu (App Store
// 2.3.1); aynı kural mağaza metninde de geçerli (aso.md).
const LOCATION = 'NSLocationWhenInUseUsageDescription';
const CAMERA = 'NSCameraUsageDescription';
// Paylaşım sayfasındaki "Görüntüyü Kaydet" bu anahtar olmadan uygulamayı sonlandırır.
const PHOTOS = 'NSPhotoLibraryAddUsageDescription';

const STRINGS = {
  tr: {
    [LOCATION]:
      'ParkIQ arabanı nereye bıraktığını kaydeder, dönüşte bulman için; çevrendeki otoparkları da gösterir.',
    [CAMERA]:
      'Park yerinin fotoğrafını çek, tarife panosunu okut, kamerayı doğrultup arabana dönüş yolunu gör.',
    [PHOTOS]:
      'Paylaşım sayfasından ParkIQ kartını fotoğraflarına kaydedebilmen için.',
  },
  de: {
    [LOCATION]:
      'ParkIQ merkt sich, wo du geparkt hast, damit du dein Auto wiederfindest, und zeigt Parkplätze in deiner Nähe.',
    [CAMERA]:
      'Fotografiere deinen Stellplatz, lass eine Preistafel auslesen und richte die Kamera aus, um den Weg zurück zum Auto zu sehen.',
    [PHOTOS]:
      'Damit du eine ParkIQ-Karte aus dem Teilen-Menü in deiner Mediathek sichern kannst.',
  },
  fr: {
    [LOCATION]:
      'ParkIQ enregistre où vous vous êtes garé pour que vous retrouviez votre voiture, et affiche les parkings autour de vous.',
    [CAMERA]:
      'Photographiez votre place, faites lire un panneau de tarifs et pointez la caméra pour voir le chemin du retour.',
    [PHOTOS]:
      'Pour enregistrer une carte ParkIQ dans votre photothèque depuis la feuille de partage.',
  },
  es: {
    [LOCATION]:
      'ParkIQ guarda dónde aparcaste para que encuentres tu coche al volver, y muestra aparcamientos cerca de ti.',
    [CAMERA]:
      'Haz una foto de tu plaza, lee un panel de tarifas y apunta la cámara para ver el camino de vuelta al coche.',
    [PHOTOS]:
      'Para guardar una tarjeta de ParkIQ en tu fototeca desde la hoja para compartir.',
  },
  'es-MX': {
    [LOCATION]:
      'ParkIQ guarda dónde estacionaste para que encuentres tu carro al volver, y muestra estacionamientos cerca de ti.',
    [CAMERA]:
      'Toma una foto de tu lugar, lee un tablero de tarifas y apunta la cámara para ver el camino de regreso al carro.',
    [PHOTOS]:
      'Para guardar una tarjeta de ParkIQ en tu fototeca desde la hoja para compartir.',
  },
  it: {
    [LOCATION]:
      'ParkIQ registra dove hai parcheggiato così ritrovi l’auto al ritorno, e mostra i parcheggi intorno a te.',
    [CAMERA]:
      'Fotografa il posto, fai leggere un cartello delle tariffe e punta la fotocamera per vedere la strada verso l’auto.',
    [PHOTOS]:
      'Per salvare una scheda ParkIQ nella tua libreria dal foglio di condivisione.',
  },
  nl: {
    [LOCATION]:
      'ParkIQ onthoudt waar je hebt geparkeerd, zodat je je auto terugvindt, en toont parkeerplekken in de buurt.',
    [CAMERA]:
      'Maak een foto van je plek, laat een tarievenbord uitlezen en richt de camera om de weg terug naar je auto te zien.',
    [PHOTOS]:
      'Om een ParkIQ-kaart vanuit het deelmenu in je fotobibliotheek te bewaren.',
  },
  'pt-BR': {
    [LOCATION]:
      'O ParkIQ guarda onde você estacionou para achar seu carro na volta, e mostra estacionamentos por perto.',
    [CAMERA]:
      'Tire uma foto da vaga, leia um quadro de tarifas e aponte a câmera para ver o caminho de volta ao carro.',
    [PHOTOS]:
      'Para salvar um cartão do ParkIQ na sua fototeca pela folha de compartilhamento.',
  },
  'pt-PT': {
    [LOCATION]:
      'O ParkIQ guarda onde estacionou para encontrar o seu carro no regresso, e mostra estacionamentos por perto.',
    [CAMERA]:
      'Tire uma foto do lugar, leia um quadro de tarifas e aponte a câmara para ver o caminho de volta ao carro.',
    [PHOTOS]:
      'Para guardar um cartão do ParkIQ na sua fototeca a partir da folha de partilha.',
  },
  ja: {
    [LOCATION]:
      'ParkIQ は駐車した場所を記録し、戻るときに車を見つけられるようにします。近くの駐車場も表示します。',
    [CAMERA]:
      '駐車場所の写真を撮り、料金表を読み取り、カメラを向けて車までの道を確認します。',
    [PHOTOS]:
      '共有シートから ParkIQ のカードを写真に保存するために使います。',
  },
  ko: {
    [LOCATION]:
      'ParkIQ가 주차한 위치를 저장해 돌아올 때 차를 찾도록 도와주고, 근처 주차장도 보여줘요.',
    [CAMERA]:
      '주차 자리를 사진으로 찍고, 요금표를 읽고, 카메라를 비춰 차까지 가는 길을 봐요.',
    [PHOTOS]:
      '공유 시트에서 ParkIQ 카드를 사진 보관함에 저장하기 위해 사용해요.',
  },
  'zh-Hant': {
    [LOCATION]:
      'ParkIQ 會記住你停車的位置，讓你回來時找得到車，也會顯示附近的停車場。',
    [CAMERA]:
      '拍下停車位、讀取費率牌，並用相機看回到車子的方向。',
    [PHOTOS]:
      '讓你從分享選單把 ParkIQ 卡片存到照片圖庫。',
  },
  sv: {
    [LOCATION]:
      'ParkIQ sparar var du parkerade så att du hittar tillbaka till bilen, och visar parkeringar i närheten.',
    [CAMERA]:
      'Fotografera din plats, läs av en taxeskylt och rikta kameran för att se vägen tillbaka till bilen.',
    [PHOTOS]:
      'För att spara ett ParkIQ-kort i ditt bildbibliotek från delningsmenyn.',
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
