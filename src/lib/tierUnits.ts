// Dilim süresinin editörde hangi sayı + birimle görüneceği. Saf — test edilir.
//
// Tek birim (saat) dayatmak yarım saatlik dilimi "0.5" diye yazdırıyordu.
// Hiçbir tarife panosu öyle yazmaz; pano "30 DK" der. Tam saat olmayan her
// süre dakika gösterilir.

export type TierUnit = 'min' | 'hour';

export const minutesOf = (unit: TierUnit): number => (unit === 'min' ? 1 : 60);

export function fromMinutes(endMin: number): { amount: string; unit: TierUnit } {
  const wholeHours = endMin >= 60 && endMin % 60 === 0;
  return wholeHours
    ? { amount: String(endMin / 60), unit: 'hour' }
    : { amount: String(endMin), unit: 'min' };
}

/**
 * Bir dilimin BAŞLANGICI, o satırın birimine göre okunur biçimde.
 * Başlangıç önceki dilimin bitişidir; birimler satır satır değişebildiği için
 * ("30 dk" sonra "3 sa") dönüşmeyen değer kendi birimiyle yazılır.
 */
export function formatRangeStart(previousEndMin: number, unit: TierUnit): string {
  if (previousEndMin <= 0) return '0';
  if (unit === 'min') return String(previousEndMin);
  if (previousEndMin % 60 === 0) return String(previousEndMin / 60);
  return `${previousEndMin}dk`;
}
