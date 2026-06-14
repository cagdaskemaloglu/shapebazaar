"use client";
import { createContext, useContext, useState } from "react";

interface CartDrawerCtx { isOpen: boolean; open: () => void; close: () => void; }
const Ctx = createContext<CartDrawerCtx>({ isOpen: false, open: () => {}, close: () => {} });

export function CartDrawerProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Ctx.Provider value={{ isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCartDrawer() { return useContext(Ctx); }
