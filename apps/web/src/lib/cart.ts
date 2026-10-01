import { createCartStore, buildCartItem, type CartItem } from "@shapebazaar/shared";

export type { CartItem };
export { buildCartItem };

// storage verilmiyor — zustand'ın varsayılan davranışı (localStorage,
// Next.js SSR ile uyumlu lazy-access) korunuyor, web'de hiçbir davranış
// değişikliği yok.
export const useCartStore = createCartStore();
