"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { useLocale } from "next-intl";

interface CartDrawerCtx { isOpen: boolean; open: () => void; close: () => void; }
const Ctx = createContext<CartDrawerCtx>({ isOpen: false, open: () => {}, close: () => {} });

export function CartDrawerProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const locale = useLocale();

  // Dil değiştiğinde drawer'ı otomatik kapat
  useEffect(() => {
    setIsOpen(false);
  }, [locale]);

  return (
    <Ctx.Provider value={{ isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCartDrawer() { return useContext(Ctx); }