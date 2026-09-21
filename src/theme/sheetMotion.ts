import { makeMutable } from 'react-native-reanimated';

// design.md §3/§4: kök sheet'in animatedIndex'i tek progress değeridir. gorhom yazar; harita
// (scale 1 → 0.97 + scrim) ve yüzen cam kareler (opacity) okur. Modül düzeyinde shared value:
// prop zinciri yok, React re-render yok, her şey UI thread'de interpolasyon.

export const sheetIndex = makeMutable(0);

/**
 * Sheet'in üst kenarının ekran tepesine uzaklığı (px). gorhom `animatedPosition`
 * olarak yazar.
 *
 * Harita bunu ÇERÇEVELEME için okur: Arabamı Bul'da kamera, kullanıcıyı ve arabayı
 * panelin ÜSTÜNDE kalan şeride sığdırmalı. Önceden alt boşluk sabit 380 px'ti; panel
 * bundan yüksekse araba panelin altında kalıyor, alçaksa harita gereksiz sıkışıyordu.
 * 0 = henüz ölçülmedi.
 */
export const sheetTop = makeMutable(0);
