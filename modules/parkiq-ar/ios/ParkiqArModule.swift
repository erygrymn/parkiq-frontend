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
      Events("onStatus")

      // Arabanın konumu — oturum boyunca sabittir.
      Prop("car") { (view: ParkiqArView, value: [String: Double]) in
        guard let latitude = value["latitude"], let longitude = value["longitude"] else { return }
        view.setCar(latitude: latitude, longitude: longitude)
      }

      // Kullanıcının son GPS düzeltmesi. Konum akışı RN'de tektir; burada
      // ikinci bir CoreLocation aboneliği açmak pil ve tutarlılık kaybıdır.
      Prop("user") { (view: ParkiqArView, value: [String: Double]) in
        guard let latitude = value["latitude"], let longitude = value["longitude"] else { return }
        view.setUser(latitude: latitude, longitude: longitude)
      }

      OnViewDidUpdateProps { (view: ParkiqArView) in
        // no-op: prop setter'ları sahneyi zaten tazeliyor.
      }
    }
  }
}
