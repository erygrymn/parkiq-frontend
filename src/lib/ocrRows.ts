import type { OcrBlock } from '../../modules/parkiq-ocr';

// OCR bloklarını PANO SATIRLARINA geri birleştirir. Saf fonksiyon — test edilir.
//
// Neden gerekli: tarife panoları iki sütunlu tablodur ("0-30 DK" | "ÜCRETSİZ")
// ve Vision her hücreyi ayrı bir gözlem olarak döndürür. Blokları sırf dikey
// sıraya dizmek süre ile fiyatı ayrı satırlara düşürür.
//
// Neden eğim düzeltmesi: pano elde, hafif eğik çekilir. Birkaç derece eğimde
// satırın sağ ucu sol ucundan bir satır aralığından fazla kayar. O zaman sabit
// eşikli gruplama ya satırı ikiye böler (tarife hiç okunmaz) ya da her fiyatı
// BİR SONRAKİ dilimle eşler — ikincisi sessizce yanlış tarife üretir, tehlikeli
// olan budur. Bu yüzden önce sayfanın eğimi verinin kendisinden kestirilir.

/**
 * İki blok aynı satırda mı: eğim düzeltilmiş dikey konumları, satır
 * yüksekliğinin bu oranı kadar yakınsa.
 */
const ROW_TOLERANCE = 0.6;

/** Taranan eğim aralığı (normalize koordinatlarda dy/dx) ve adım sayısı. */
const SLOPE_LIMIT = 0.3;
const SLOPE_STEPS = 61;

interface Row {
  blocks: OcrBlock[];
  /** Satırın eğim düzeltilmiş dikey konumu (çalışan ortalama). */
  mean: number;
}

/**
 * Blokları verilen eğime göre satırlara böler. Anahtar `y - slope * x`:
 * doğru eğimde bir satırın tüm hücreleri aynı değere düşer.
 */
function clusterRows(blocks: OcrBlock[], slope: number, tolerance: number): OcrBlock[][] {
  const keyed = blocks
    .map((block) => ({ block, key: block.y - slope * block.x }))
    .sort((a, b) => b.key - a.key); // yukarıdan aşağıya (Vision origin'i sol-alt)

  const rows: Row[] = [];
  for (const { block, key } of keyed) {
    const current = rows[rows.length - 1];
    if (current && Math.abs(current.mean - key) <= tolerance) {
      current.mean = (current.mean * current.blocks.length + key) / (current.blocks.length + 1);
      current.blocks.push(block);
    } else {
      rows.push({ blocks: [block], mean: key });
    }
  }
  return rows.map((row) => row.blocks);
}

/**
 * Blokları satırlara böler ve her satırı soldan sağa birleştirir.
 * Çıktı yukarıdan aşağıya sıralıdır.
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

  const heights = usable.map((b) => b.height).sort((a, b) => a - b);
  const medianHeight = heights[Math.floor(heights.length / 2)];
  const tolerance = Math.max(medianHeight * ROW_TOLERANCE, 1e-4);

  // Eğimi veriden kestir: DOĞRU eğim satır sayısını en aza indirir.
  //
  // Alt sınır bellidir — aynı sütundaki bloklar aynı x'te olduğu için hiçbir
  // eğim onları birleştiremez; yani satır sayısı asla en kalabalık sütunun
  // altına inemez. O sınıra ancak hücreler doğru eşleştiğinde ulaşılır. Bir
  // satır kaymış eşleme uçlarda tek başına blok bırakır ve sayıyı artırır.
  // Beraberlikte eğimi en küçük olan kazanır: düz çekilmiş panoyu bozmayalım.
  let best: { rows: OcrBlock[][]; count: number; slope: number } | null = null;
  for (let step = 0; step < SLOPE_STEPS; step += 1) {
    const slope = -SLOPE_LIMIT + (2 * SLOPE_LIMIT * step) / (SLOPE_STEPS - 1);
    const rows = clusterRows(usable, slope, tolerance);
    const better =
      best === null ||
      rows.length < best.count ||
      (rows.length === best.count && Math.abs(slope) < Math.abs(best.slope));
    if (better) best = { rows, count: rows.length, slope };
  }

  return (best?.rows ?? []).map((row) =>
    [...row]
      .sort((a, b) => a.x - b.x)
      .map((b) => b.text.trim())
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}
