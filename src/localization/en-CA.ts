import type { CopyKey } from './en';

// en-CA ÜST KATMANI. Kanada sözlüğü Amerikan İngilizcesine yakın ("parking
// lot", "parkade" bölgesel), ama ölçü sistemi metrik ve yazım İngiliz tarafına
// düşüyor (metre, centre). Bu yüzden en-GB'nin değil en-US'in üstüne biner.
export const enCA: Partial<Record<CopyKey, string>> = {
  unitsMetric: 'Metres',
  filterCovered: 'Covered',
};
