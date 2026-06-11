import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { EXCHANGE_RATE_TL_PER_USD } from "@/lib/printPricing";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Fiyat formatlar.
 * locale "en" ise TL tutarı USD'ye çevrilir ve $ ile gösterilir.
 * Varsayılan locale "tr" → ₺ sembolü.
 */
export function formatPrice(amount: number, locale = "tr") {
  if (locale === "en") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount / EXCHANGE_RATE_TL_PER_USD);
  }
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat("tr-TR").format(n);
}