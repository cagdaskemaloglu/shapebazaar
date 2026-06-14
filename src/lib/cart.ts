import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  calcPrintCost,
  SCALE_FACTOR,
  INFILL_FACTOR,
  SHIPPING_COST_TL,
  PLATFORM_FEE_RATE,
} from "@/lib/printPricing";

export interface CartItem {
  cartItemId: string;
  modelId: string;
  modelTitle: string;
  thumbnailUrl?: string;
  material: string;
  colorName: string;
  colorHex: string;
  scale: string;
  infill: string;
  weightGrams: number;
  designPrice: number;
  printCost: number;
  itemTotal: number; // designPrice + printCost + platformFee (model sayfasıyla eşleşir)
}

interface CartStore {
  items: CartItem[];
  address: {
    name: string; phone: string;
    city: string; district: string; line1: string;
  };
  addItem:    (item: Omit<CartItem, "cartItemId">) => void;
  removeItem: (cartItemId: string) => void;
  clearCart:  () => void;
  setAddress: (addr: CartStore["address"]) => void;

  subtotal:   () => number; // tüm itemTotal'ların toplamı
  shipping:   () => number; // sabit kargo
  grandTotal: () => number; // subtotal + shipping
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      address: { name: "", phone: "", city: "", district: "", line1: "" },

      addItem: (item) => {
        const cartItemId = `${item.modelId}-${Date.now()}`;
        set((s) => ({ items: [...s.items, { ...item, cartItemId }] }));
      },

      removeItem: (cartItemId) =>
        set((s) => ({ items: s.items.filter((i) => i.cartItemId !== cartItemId) })),

      clearCart: () => set({ items: [] }),

      setAddress: (addr) => set({ address: addr }),

      subtotal: () => get().items.reduce((sum, i) => sum + i.itemTotal, 0),

      shipping: () => (get().items.length > 0 ? SHIPPING_COST_TL : 0),

      grandTotal: () => get().subtotal() + get().shipping(),
    }),
    { name: "shapebazaar-cart" }
  )
);

/** Sepete eklenecek item verisini hesaplar */
export function buildCartItem(params: {
  modelId: string;
  modelTitle: string;
  thumbnailUrl?: string;
  material: string;
  colorName: string;
  colorHex: string;
  scale: string;
  infill: string;
  weightGrams: number;
  isFree: boolean;
  basePrice: number;
}): Omit<CartItem, "cartItemId"> {
  const designPrice = params.isFree ? 0 : params.basePrice;
  const printCost   = calcPrintCost(
    params.material,
    params.weightGrams,
    SCALE_FACTOR[params.scale]   ?? 1,
    INFILL_FACTOR[params.infill] ?? 1,
  );
  const platformFee = (designPrice + printCost) * PLATFORM_FEE_RATE;
  return {
    modelId:      params.modelId,
    modelTitle:   params.modelTitle,
    thumbnailUrl: params.thumbnailUrl,
    material:     params.material,
    colorName:    params.colorName,
    colorHex:     params.colorHex,
    scale:        params.scale,
    infill:       params.infill,
    weightGrams:  params.weightGrams,
    designPrice,
    printCost,
    itemTotal: designPrice + printCost + platformFee,
  };
}