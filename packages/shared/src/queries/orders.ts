import type { SupabaseClient } from "@supabase/supabase-js";

/** `orders.status` CHECK kısıtıyla birebir aynı (supabase/migrations/001_initial_schema.sql) */
export const ORDER_STATUSES = [
  "pending", "paid", "in_print", "printed", "shipped", "delivered", "cancelled", "refunded",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface OrderListItem {
  id: string;
  created_at: string;
  status: OrderStatus;
  total_amount: number;
  order_items: { model_title: string | null }[];
}

export interface OrderItemRow {
  id: string;
  model_id: string | null;
  model_title: string | null;
  material: string | null;
  color_name: string | null;
  scale_percent: number | null;
  item_total: number | null;
  print_cost: number | null;
}

export interface OrderDetail {
  id: string;
  status: OrderStatus;
  total_amount: number;
  shipping_cost: number | null;
  recipient_name: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  district: string | null;
  phone: string | null;
  created_at: string;
  paid_at: string | null;
  tracking_number: string | null;
  cargo_company: string | null;
  order_items: OrderItemRow[];
}

/**
 * Alıcının siparişleri (yeniden eskiye).
 *
 * Sadece ÖDEMESİ ALINMIŞ siparişler (`paid_at` dolu) döner: `payment/init` siparişi ödeme
 * bitmeden `pending` olarak kaydeder, vazgeçilen/başarısız ödemeler `pending`/`cancelled`
 * kalır. Onlar kullanıcı için "sipariş" değil. Ödemeden sonra iptal/iade edilenler
 * `paid_at` dolu olduğu için listede kalır.
 */
export async function fetchMyOrders(
  supabase: SupabaseClient,
  buyerId: string,
  opts: { limit?: number; offset?: number } = {}
): Promise<OrderListItem[]> {
  const limit = opts.limit ?? 20;
  const offset = opts.offset ?? 0;
  const { data, error } = await supabase
    .from("orders")
    .select("id, created_at, status, total_amount, order_items(model_title)")
    .eq("buyer_id", buyerId)
    .not("paid_at", "is", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return (data ?? []) as unknown as OrderListItem[];
}

/** Tek sipariş + kalemleri. Başkasının siparişi / olmayan sipariş → `null`. */
export async function fetchOrderDetail(
  supabase: SupabaseClient,
  orderId: string,
  buyerId: string
): Promise<OrderDetail | null> {
  const { data, error } = await supabase
    .from("orders")
    .select(`
      id, status, total_amount, shipping_cost,
      recipient_name, address_line1, address_line2, city, district, phone,
      created_at, paid_at, tracking_number, cargo_company,
      order_items(id, model_id, model_title, material, color_name, scale_percent, item_total, print_cost)
    `)
    .eq("id", orderId)
    .eq("buyer_id", buyerId)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as OrderDetail | null) ?? null;
}
