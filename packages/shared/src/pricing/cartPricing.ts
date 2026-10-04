import {
  FILAMENT_PRICE_PER_KG,
  SCALE_FACTOR,
  INFILL_FACTOR,
  SHIPPING_COST_TL,
  PLATFORM_FEE_RATE,
  calcPrintCost,
  resolveWeightGrams,
} from "./printPricing";

/**
 * SUNUCU TARAFI SEPET FİYATLAMASI
 * ─────────────────────────────────────────────────────────────
 * `payment/init` istemcinin gönderdiği fiyatlara GÜVENMEZ: model, malzeme, ölçek ve dolguyu alır;
 * tasarım ücreti ve ağırlığı veritabanından okur, tutarı burada yeniden hesaplar. İstemciler de
 * aynı formülleri (`buildCartItem`) kullandığı için doğru bir istemcide sonuçlar aynı çıkar.
 *
 * Saf fonksiyonlar — veritabanı/ağ yok; birim testle doğrulanabilir.
 */

export const MAX_CART_ITEMS = 20;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const has = (obj: object, key: string) => Object.prototype.hasOwnProperty.call(obj, key);

/** Veritabanından okunan, fiyat için gereken model alanları */
export interface ModelPricingRow {
  id: string;
  title: string | null;
  base_price: number | string | null;
  is_free: boolean | null;
  weight_grams: number | string | null;
  is_published: boolean | null;
}

export interface PricedItem {
  modelId: string;
  modelTitle: string;     // veritabanındaki başlık (istemcinin gönderdiği değil)
  material: string;
  scale: string;
  infill: string;
  colorName: string;
  colorHex: string;
  designPrice: number;
  printCost: number;
  platformFee: number;
  itemTotal: number;      // 2 ondalığa yuvarlanmış: tasarım + baskı + komisyon
}

export type CartPricingError =
  | "EMPTY_CART" | "TOO_MANY_ITEMS" | "INVALID_ITEM" | "INVALID_OPTION" | "MODEL_NOT_FOUND" | "MODEL_UNAVAILABLE";

export type CartPricingResult =
  | { ok: true; items: PricedItem[]; subtotal: number; shipping: number; grandTotal: number; platformFee: number }
  | { ok: false; code: CartPricingError; message: string; modelId?: string };

const fail = (code: CartPricingError, message: string, modelId?: string): CartPricingResult =>
  ({ ok: false, code, message, modelId });

/** Sepet kalemlerinden model id'lerini toplar; biçim bozuksa `null` (veritabanına geçersiz id gitmesin). */
export function collectModelIds(items: unknown): string[] | null {
  if (!Array.isArray(items)) return null;
  const ids = new Set<string>();
  for (const it of items) {
    const id = (it as { modelId?: unknown } | null)?.modelId;
    if (typeof id !== "string" || !UUID_RE.test(id)) return null;
    ids.add(id);
  }
  return [...ids];
}

/** Para birimini kuruş (tamsayı) üzerinden topla: kayan nokta hatası yüzünden iyzico "sepet toplamı tutmuyor" demesin. */
const toKurus = (tl: number) => Math.round(tl * 100);
const fromKurus = (k: number) => k / 100;

export function priceCart(rawItems: unknown, models: Map<string, ModelPricingRow>): CartPricingResult {
  if (!Array.isArray(rawItems) || rawItems.length === 0) return fail("EMPTY_CART", "Sepet boş");
  if (rawItems.length > MAX_CART_ITEMS) return fail("TOO_MANY_ITEMS", `Sepette en fazla ${MAX_CART_ITEMS} ürün olabilir`);

  const priced: PricedItem[] = [];
  let subtotalK = 0;
  let feeK = 0;

  for (const raw of rawItems) {
    const it = (raw ?? {}) as Record<string, unknown>;
    const { modelId, material, scale, infill, colorName, colorHex } = it;

    if (typeof modelId !== "string" || !UUID_RE.test(modelId)) return fail("INVALID_ITEM", "Geçersiz ürün");
    if (typeof material !== "string" || typeof scale !== "string" || typeof infill !== "string") {
      return fail("INVALID_OPTION", "Geçersiz baskı seçeneği", modelId);
    }
    // Bilinmeyen seçenekler sessizce varsayılana düşmesin (eskiden `?? PLA` / `?? 1` ile ucuza gidebiliyordu)
    if (!has(FILAMENT_PRICE_PER_KG, material) || !has(SCALE_FACTOR, scale) || !has(INFILL_FACTOR, infill)) {
      return fail("INVALID_OPTION", "Geçersiz malzeme, ölçek veya dolgu seçimi", modelId);
    }
    if (typeof colorName !== "string" || colorName.length === 0 || colorName.length > 32 ||
        typeof colorHex !== "string" || !HEX_RE.test(colorHex)) {
      return fail("INVALID_OPTION", "Geçersiz renk seçimi", modelId);
    }

    const model = models.get(modelId);
    if (!model) return fail("MODEL_NOT_FOUND", "Sepetteki bir model bulunamadı (silinmiş olabilir)", modelId);
    if (!model.is_published) return fail("MODEL_UNAVAILABLE", "Sepetteki bir model artık yayında değil", modelId);

    const basePrice = Number(model.base_price ?? 0);
    const designPrice = model.is_free ? 0 : Number.isFinite(basePrice) && basePrice > 0 ? basePrice : 0;

    const printCost = calcPrintCost(material, resolveWeightGrams(model.weight_grams), SCALE_FACTOR[scale], INFILL_FACTOR[infill]);

    const designK = toKurus(designPrice);
    const printK  = toKurus(printCost);
    const itemFeeK = Math.round((designK + printK) * PLATFORM_FEE_RATE);
    const itemTotalK = designK + printK + itemFeeK;

    subtotalK += itemTotalK;
    feeK += itemFeeK;
    priced.push({
      modelId,
      modelTitle: model.title ?? "Model",
      material, scale, infill,
      colorName, colorHex,
      designPrice: fromKurus(designK),
      printCost: fromKurus(printK),
      platformFee: fromKurus(itemFeeK),
      itemTotal: fromKurus(itemTotalK),
    });
  }

  const shippingK = toKurus(SHIPPING_COST_TL);
  return {
    ok: true,
    items: priced,
    subtotal: fromKurus(subtotalK),
    shipping: fromKurus(shippingK),
    grandTotal: fromKurus(subtotalK + shippingK),
    platformFee: fromKurus(feeK),
  };
}

/** İstemcinin gördüğü toplam ile sunucunun hesapladığı arasındaki izin verilen fark (TL). */
export const PRICE_TOLERANCE_TL = 1;
