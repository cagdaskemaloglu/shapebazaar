import type { OrderStatus } from "@shapebazaar/shared";

/** Zaman çizelgesi adımları. Mobilde sadece ödemesi alınmış siparişler listelenir, bu yüzden "pending" yok. */
export const TIMELINE_STEPS = ["paid", "in_print", "shipped", "delivered"] as const;

/** Durumun zaman çizelgesindeki adım indeksi (iptal/iade/pending → -1). `printed` baskı adımının parçası. */
export function timelineIndex(status: OrderStatus): number {
  switch (status) {
    case "paid": return 0;
    case "in_print":
    case "printed": return 1;
    case "shipped": return 2;
    case "delivered": return 3;
    default: return -1;
  }
}

export function formatMoney(n: number | string | null | undefined): string {
  const v = Number(n ?? 0);
  return `₺${Number.isInteger(v) ? v.toFixed(0) : v.toFixed(2)}`;
}

export function formatDate(iso: string, locale: "tr" | "en"): string {
  return new Date(iso).toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US", {
    day: "numeric", month: "long", year: "numeric",
  });
}

export const shortOrderNo = (id: string) => `#${id.slice(0, 8).toUpperCase()}`;
