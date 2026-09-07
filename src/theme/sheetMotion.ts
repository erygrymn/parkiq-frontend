import { makeMutable } from 'react-native-reanimated';

// design.md §3/§4: kök sheet'in animatedIndex'i tek progress değeridir. gorhom yazar; harita
// (scale 1 → 0.97 + scrim) ve yüzen cam kareler (opacity) okur. Modül düzeyinde shared value:
// prop zinciri yok, React re-render yok, her şey UI thread'de interpolasyon.

export const sheetIndex = makeMutable(0);
