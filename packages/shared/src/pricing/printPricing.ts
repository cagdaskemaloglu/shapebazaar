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
  // Arayüzdeki malzeme adı "Reçine" (MATERIALS sabiti). Bu anahtar olmadan reçine seçimi sessizce
  // PLA fiyatına düşüyordu (kg başına 1000 yerine 1400): alıcıdan eksik ücret alınıyordu.
  "Reçine": 1400,
};

/** Modelin ağırlığı kayıtlı değilse (null/0) fiyat hesabında kullanılan varsayılan (gram). Web, mobil ve sunucu aynı kuralı kullanır. */
export const DEFAULT_WEIGHT_GRAMS = 50;

export function resolveWeightGrams(weightGrams: number | string | null | undefined): number {
  const w = Number(weightGrams);
  return Number.isFinite(w) && w > 0 ? w : DEFAULT_WEIGHT_GRAMS;
}

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

/** Ürün kartlarında "baskı ücreti" hesabında kullanılan varsayılan ayarlar (detay sayfasının ilk seçimleriyle aynı). */
export const DEFAULT_PRINT_SETTINGS = { material: "PLA", scale: "100%", infill: "25% (Standart)" } as const;

/**
 * Varsayılan ayarlarla (PLA · %100 · %25 dolgu) baskı ücreti — KARGO HARİÇ.
 * `printWithFee`: tasarım ücretinin üstüne alıcının baskı için ödeyeceği tutar (baskı + komisyon).
 * Ücretsiz modelde bu, sepette görülecek ürün tutarıyla birebir aynıdır; ücretli modelde
 * `designPrice + printWithFee` = detay sayfasındaki varsayılan toplam. Ağırlığı kayıtlı olmayan
 * modelde `DEFAULT_WEIGHT_GRAMS` kullanılır (sepette ve sunucuda da böyle fiyatlanır).
 */
export function defaultPrintPrice(
  weightGrams: number | null | undefined,
  designPrice: number
): { printCost: number; printWithFee: number; total: number } {
  const { material, scale, infill } = DEFAULT_PRINT_SETTINGS;
  const printCost = calcPrintCost(material, resolveWeightGrams(weightGrams), SCALE_FACTOR[scale] ?? 1, INFILL_FACTOR[infill] ?? 1);
  const { total } = calcTotalPrice(designPrice, printCost);
  return { printCost, printWithFee: total - designPrice, total };
}
