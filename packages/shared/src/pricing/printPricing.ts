/**
 * BASKI FİYATLANDIRMA SABİTLERİ
 * ─────────────────────────────────────────────────────────────
 * Fiyatları güncellemek için SADECE bu dosyayı düzenleyin.
 */

export const EXCHANGE_RATE_TL_PER_USD = 45;

/** 1 kg filament fiyatı (TL) */
export const FILAMENT_PRICE_PER_KG: Record<string, number> = {
  PLA:   1000,
  PETG:  1100,
  ABS:   1200,
  TPU:   1300,
  Resin: 1400,
};

/** Gram başına filament maliyeti — KG fiyatından otomatik türetilir */
export const FILAMENT_PRICE_PER_GRAM: Record<string, number> = Object.fromEntries(
  Object.entries(FILAMENT_PRICE_PER_KG).map(([mat, kgPrice]) => [mat, kgPrice / 1000])
);

/** Baskıya eklenen sabit işçilik ücreti (TL) */
export const LABOR_COST_TL = 50;

/** Sabit kargo ücreti (TL) — sipariş başına bir kez eklenir */
export const SHIPPING_COST_TL = 150;

/** Platform komisyon oranı — sadece iç hesap için, kullanıcıya gösterilmez */
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
 * Baskı maliyetini hesaplar (filament + işçilik).
 */
export function calcPrintCost(
  material: string,
  weightGrams: number,
  scaleFactor: number,
  infillFactor = 1
): number {
  const pricePerGram = FILAMENT_PRICE_PER_GRAM[material] ?? FILAMENT_PRICE_PER_GRAM["PLA"];
  return pricePerGram * weightGrams * scaleFactor * infillFactor + LABOR_COST_TL;
}

/**
 * Ürün toplamı: tasarım + baskı.
 * Komisyon iç hesap için döner ama kullanıcıya gösterilmez.
 */
export function calcTotalPrice(
  designPrice: number,
  printCost: number
): { platformFee: number; total: number } {
  const platformFee = (designPrice + printCost) * PLATFORM_FEE_RATE;
  // total = kullanıcının gördüğü ürün fiyatı (kargo HARİÇ, komisyon DAHİL — iç maliyet)
  const total = designPrice + printCost + platformFee;
  return { platformFee, total };
}

/** TL → USD */
export function tlToUsd(tl: number): number {
  return tl / EXCHANGE_RATE_TL_PER_USD;
}