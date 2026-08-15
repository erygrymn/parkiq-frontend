import type { CopyKey } from './en';
import { enGB } from './en-GB';

// en-AU ÜST KATMANI. Avustralya sözlüğü büyük ölçüde İngiliz İngilizcesiyle
// aynı ("car park", "multi-storey", metrik), o yüzden en-GB'nin üstüne biner;
// burada yalnız Avustralya'ya özgü ayrımlar durur.
export const enAU: Partial<Record<CopyKey, string>> = {
  ...enGB,
  // "Level −2" yerine yaygın kullanım "Level B2"; harfli kat adı daha seyrek.
  floorPlaceholder: 'Level B2',
};
