"use client";
import { ShoppingCart } from "lucide-react";
import { useCartStore } from "@/lib/cart";
import { useCartDrawer } from "@/components/cart/CartDrawerContext";

export function CartButton() {
  const items  = useCartStore((s) => s.items);
  const { open } = useCartDrawer();

  return (
    <button
      onClick={open}
      className="relative w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
      aria-label="Sepet"
    >
      <ShoppingCart size={16} />
      {items.length > 0 && (
        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#FF6B35] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
          {items.length > 9 ? "9+" : items.length}
        </span>
      )}
    </button>
  );
}
