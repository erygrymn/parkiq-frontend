import ARKit
import ExpoModulesCore

// RN → ARKit köprüsü. Görünüm ParkiqArView'da; burada yalnız prop/olay bağları var.

public class ParkiqArModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ParkiqAr")

    Function("isSupported") { () -> Bool in
      ARWorldTrackingConfiguration.isSupported
    }

    View(ParkiqArView.self) {
      // onStatus: durum makinesi + koçluk görünürlüğü. onTarget: hedefin ekran izdüşümü,
      // mesafesi ve yönü, ≤6 Hz (kenar göstergesi + yön cümlesi).
      Events("onStatus", "onTarget")

      // Arabanın konumu — oturum boyunca sabittir (konum düzeltilirse yeniden gelir).
      // Doğruluk (m) kayıt anının GPS payıdır; yakındaki belirsizlik halkasına girer.
      Prop("car") { (view: ParkiqArView, value: [String: Double]) in
        guard let latitude = value["latitude"], let longitude = value["longitude"] else { return }
        view.setCar(latitude: latitude, longitude: longitude, accuracy: value["accuracy"])
      }

      // Kullanıcının son GPS düzeltmesi: doğruluk (m) füzyonda ağırlık, zaman damgası (ms)
      // kameranın o andaki yeriyle eşlenir. Konum akışı RN'de tektir; burada ikinci bir
      // CoreLocation aboneliği açmak pil ve tutarlılık kaybıdır. İlk düzeltme gelene kadar null.
      Prop("user") { (view: ParkiqArView, value: [String: Double]?) in
        guard let value, let latitude = value["latitude"], let longitude = value["longitude"] else { return }
        view.setUser(
          latitude: latitude,
          longitude: longitude,
          accuracy: value["accuracy"],
          time: value["timestamp"].map { $0 / 1000 })
      }
    }
  }
}
