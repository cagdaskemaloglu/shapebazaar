/**
 * BASKI FİYATLANDIRMA SABİTLERİ
 * ─────────────────────────────────────────────────────────────
 * Fiyatları güncellemek için SADECE bu dosyayı düzenleyin.
 * Tüm bileşenler (ModelDetailClient, FeaturedViewer vb.) buradan okur.
 *
 * Filament fiyatları: 1 kg için TL cinsinden
 * Dolar kuru       : TL/USD (fiyatları USD'ye çevirmek için kullanılır)
 * İşçilik          : Her baskıya eklenen sabit TL tutarı
 * Kargo            : Sabit kargo ücreti (TL)
 * Platform komisyon: Oransal (0.10 = %10)
 */

export const EXCHANGE_RATE_TL_PER_USD = 45; // 1 USD = 45 TL

/** 1 kg filament fiyatı (TL) */
export const FILAMENT_PRICE_PER_KG: Record<string, number> = {
  PLA:   1000,
  PETG:  1100,
  ABS:   1200,
  TPU:   1300,
  Resin: 1400,
};

/** Gram başına filament maliyeti (TL) — KG fiyatından otomatik türetilir */
export const FILAMENT_PRICE_PER_GRAM: Record<string, number> = Object.fromEntries(
  Object.entries(FILAMENT_PRICE_PER_KG).map(([mat, kgPrice]) => [mat, kgPrice / 1000])
);

/** Baskıya eklenen sabit işçilik ücreti (TL) */
export const LABOR_COST_TL = 50;

/** Sabit kargo ücreti (TL) */
export const SHIPPING_COST_TL = 50;

/** Platform komisyon oranı */
export const PLATFORM_FEE_RATE = 0.10;

/** Ölçek çarpanları */
export const SCALE_FACTOR: Record<string, number> = {
  "50%":  0.5,
  "75%":  0.75,
  "100%": 1,
  "150%": 1.5,
  "Özel": 1,
};

/** Dolgu yoğunluğu çarpanları */
export const INFILL_FACTOR: Record<string, number> = {
  "15% (Hafif)":    0.75,
  "25% (Standart)": 1.00,
  "40% (Sağlam)":   1.30,
  "80% (Masif)":    1.75,
};

/**
 * Baskı maliyetini hesaplar.
 *
 * @param material   - Malzeme adı (PLA, PETG …)
 * @param weightGrams - Modelin gram cinsinden ağırlığı
 * @param scaleFactor - Ölçek çarpanı (SCALE_FACTOR'dan)
 * @param infillFactor - Dolgu çarpanı (INFILL_FACTOR'dan)
 * @returns TL cinsinden baskı maliyeti
 */
export function calcPrintCost(
  material: string,
  weightGrams: number,
  scaleFactor: number,
  infillFactor = 1
): number {
  const pricePerGram = FILAMENT_PRICE_PER_GRAM[material] ?? FILAMENT_PRICE_PER_GRAM["PLA"];
  const filamentCost = pricePerGram * weightGrams * scaleFactor * infillFactor;
  return filamentCost + LABOR_COST_TL;
}

/**
 * Toplam sipariş fiyatını hesaplar.
 */
export function calcTotalPrice(
  designPrice: number,
  printCost: number
): { platformFee: number; total: number } {
  const platformFee = (designPrice + printCost) * PLATFORM_FEE_RATE;
  const total = designPrice + printCost + platformFee + SHIPPING_COST_TL;
  return { platformFee, total };
}

/**
 * TL → USD çevirimi
 */
export function tlToUsd(tl: number): number {
  return tl / EXCHANGE_RATE_TL_PER_USD;
}
