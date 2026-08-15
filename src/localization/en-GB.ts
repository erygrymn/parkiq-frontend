import type { CopyKey } from './en';

// en-GB ÜST KATMANI — yalnız en-US'ten ayrılan anahtarlar.
//
// market-research.md §7: GB'de rekabet yarı yarıya zayıf ama kelimeler farklı.
// Otopark "car park"tır, kapalı otopark "multi-storey"dir, ceza "ticket" değil
// "fine"dır. Amerikan kelimesi kullanmak burada yabancı app sinyali veriyor.
export const enGB: Partial<Record<CopyKey, string>> = {
  poiParking: 'Car park',
  noNearbyForFilter: 'No car parks nearby match this filter',
  noResults: 'No places found.',
  filterCovered: 'Multi-storey',
  poiError: 'Could not load nearby car parks — check your connection',
  proFeatureFilter: 'Filter car parks by charger, cover and distance',
  goProUpsell: 'Scan boards, get guided back, filter car parks',
  onbBody1:
    'One tap marks where you left the car. Floor, photo and note are optional — add them only when the car park is confusing.',
  onbBody3:
    'Compass and map walk you back. Underground, where GPS gives up, the photo and floor you saved take over.',
  floorPlaceholder: 'Level −2, C',
  unitsMetric: 'Metres',
};
