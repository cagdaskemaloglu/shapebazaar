"use client";
import { useEffect } from "react";
import { useCartStore } from "@/lib/cart";

/**
 * Ödeme başarı sayfası bir server component olduğu için sepeti (zustand +
 * localStorage) doğrudan orada temizleyemiyoruz. Bu küçük client component
 * mount olduğunda sepeti bir kez temizler.
 */
export function ClearCartOnMount() {
  const clearCart = useCartStore((s) => s.clearCart);

  useEffect(() => {
    clearCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
