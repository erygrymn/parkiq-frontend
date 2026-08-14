import type { OcrBlock } from '../../modules/parkiq-ocr';

// OCR bloklarını PANO SATIRLARINA geri birleştirir. Saf fonksiyon — test edilir.
//
// Neden gerekli: tarife panoları iki sütunlu tablodur ("0-30 DK" | "ÜCRETSİZ")
// ve Vision her hücreyi ayrı bir gözlem olarak döndürür. Blokları sırf dikey
// sıraya dizmek süre ile fiyatı ayrı satırlara düşürür; parser fiyatı aynı
// satırda aradığı için süre sınırını fiyat sanıyordu ("0-30 DK" → ₺30).

/**
 * İki blok aynı satırda mı: dikey merkezleri, ortalama yüksekliklerinin bu
 * oranı kadar yakınsa. Tablo satırları arası boşluk tipik olarak satır
 * yüksekliğinden büyük olduğu için 0.6 güvenli bir eşiktir.
 */
const ROW_TOLERANCE = 0.6;

/**
 * Blokları satırlara böler ve her satırı soldan sağa birleştirir.
 * Çıktı yukarıdan aşağıya sıralıdır (Vision origin'i sol-alt olduğu için y azalan).
 */
export function assembleRows(blocks: OcrBlock[]): string[] {
  const usable = blocks.filter(
    (b) =>
      typeof b.text === 'string' &&
      b.text.trim().length > 0 &&
      Number.isFinite(b.x) &&
      Number.isFinite(b.y) &&
      Number.isFinite(b.height),
  );
  if (usable.length === 0) return [];

  // Yukarıdan aşağıya: Vision'da y büyüdükçe yukarı çıkar.
  const sorted = [...usable].sort((a, b) => b.y - a.y);

  const rows: OcrBlock[][] = [];
  for (const block of sorted) {
    const current = rows[rows.length - 1];
    if (current) {
      // Satırın kendi yüksekliğiyle karşılaştır: uzak bir başlık bloğu
      // kendi büyük yüksekliğiyle alt satırları yutmasın diye ortalama alınır.
      const reference = current[current.length - 1];
      const tolerance = ((reference.height + block.height) / 2) * ROW_TOLERANCE;
      if (Math.abs(reference.y - block.y) <= tolerance) {
        current.push(block);
        continue;
      }
    }
    rows.push([block]);
  }

  return rows.map((row) =>
    [...row]
      .sort((a, b) => a.x - b.x)
      .map((b) => b.text.trim())
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}
