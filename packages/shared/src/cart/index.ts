import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import {
  calcPrintCost,
  SCALE_FACTOR,
  INFILL_FACTOR,
  SHIPPING_COST_TL,
  PLATFORM_FEE_RATE,
} from "../pricing/printPricing";

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

export interface CartAddress {
  name: string; phone: string;
  city: string; district: string; line1: string;
}

export interface CartStore {
  items: CartItem[];
  address: CartAddress;
  addItem:    (item: Omit<CartItem, "cartItemId">) => void;
  removeItem: (cartItemId: string) => void;
  clearCart:  () => void;
  setAddress: (addr: CartAddress) => void;

  subtotal:   () => number; // tüm itemTotal'ların toplamı
  shipping:   () => number; // sabit kargo
  grandTotal: () => number; // subtotal + shipping
}

/**
 * Sepet store'unu oluşturur. `storage` verilmezse zustand'ın varsayılan
 * davranışı (web'de `localStorage`, Next.js SSR ile uyumlu lazy-access)
 * korunur — web'in mevcut davranışını bozmamak için bilerek opsiyonel.
 * Mobile'da `AsyncStorage` verilerek çağrılmalı.
 */
export function createCartStore(storage?: StateStorage) {
  return create<CartStore>()(
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
      {
        name: "shapebazaar-cart",
        ...(storage ? { storage: createJSONStorage(() => storage) } : {}),
      }
    )
  );
}

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
