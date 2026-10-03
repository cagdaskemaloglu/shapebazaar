import type { SupabaseClient } from "@supabase/supabase-js";

export const PRINT_PHOTO_BUCKET = "print-photos";
/** Yazıcı, kargolamadan önce her ürün için en az bu kadar fotoğraf yüklemeli */
export const PRINT_PHOTO_MIN = 2;
export const PRINT_PHOTO_MAX = 5;

/**
 * Herkese açık fotoğraf URL'si. `supabaseUrl` her uygulamanın kendi env'inden gelir
 * (web: NEXT_PUBLIC_SUPABASE_URL, mobil: EXPO_PUBLIC_SUPABASE_URL) — client oluşturmaya gerek yok.
 */
export function buildPrintPhotoUrl(supabaseUrl: string, path: string): string {
  return `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/${PRINT_PHOTO_BUCKET}/${path}`;
}

export interface PrintPhoto {
  id: string;
  order_item_id: string;
  model_id: string | null;
  photo_path: string;
  thumb_path: string;
  material: string | null;
  color_name: string | null;
  scale_percent: number | null;
  created_at: string;
  printer: { username: string | null; full_name: string | null } | null;
}

const PHOTO_SELECT = `
  id, order_item_id, model_id, photo_path, thumb_path,
  material, color_name, scale_percent, created_at,
  printer:profiles!print_photos_printer_id_fkey(username, full_name)
`;

/** Bir modelin ONAYLI baskı fotoğrafları (yeniden eskiye). RLS zaten sadece onaylıları döndürür. */
export async function fetchModelPrintPhotos(supabase: SupabaseClient, modelId: string): Promise<PrintPhoto[]> {
  const { data, error } = await supabase
    .from("print_photos")
    .select(PHOTO_SELECT)
    .eq("model_id", modelId)
    .eq("status", "approved")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as PrintPhoto[];
}

/** Verilen sipariş kalemlerinin ONAYLI fotoğrafları (alıcının sipariş detayı için). */
export async function fetchOrderPrintPhotos(supabase: SupabaseClient, orderItemIds: string[]): Promise<PrintPhoto[]> {
  if (orderItemIds.length === 0) return [];
  const { data, error } = await supabase
    .from("print_photos")
    .select(PHOTO_SELECT)
    .in("order_item_id", orderItemIds)
    .eq("status", "approved")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as PrintPhoto[];
}

export type PrintPhotoGate =
  | { ok: true }
  /** UPLOAD_MORE: yüklenen fotoğraf sayısı yetersiz — AWAITING_APPROVAL: yeterli yüklenmiş ama onaylı sayısı yetersiz */
  | { ok: false; reason: "UPLOAD_MORE" | "AWAITING_APPROVAL" };

/**
 * Yazıcı, kargo bilgisini girebilmek için HER ürün (order_item) için en az `min` fotoğraf yüklemiş
 * VE admin bunlardan en az `min` tanesini onaylamış olmalı. (Uzaktaki yazıcının modeli düzgün
 * basıp basmadığını admin görsün diye.) Sunucu (ship route) ve arayüz aynı kuralı kullanır.
 */
export function evaluatePrintPhotoGate(
  itemIds: string[],
  photos: { order_item_id: string; status: string }[],
  min: number = PRINT_PHOTO_MIN
): PrintPhotoGate {
  const uploaded: Record<string, number> = {};
  const approved: Record<string, number> = {};
  for (const p of photos) {
    uploaded[p.order_item_id] = (uploaded[p.order_item_id] ?? 0) + 1;
    if (p.status === "approved") approved[p.order_item_id] = (approved[p.order_item_id] ?? 0) + 1;
  }
  if (itemIds.some((id) => (uploaded[id] ?? 0) < min)) return { ok: false, reason: "UPLOAD_MORE" };
  if (itemIds.some((id) => (approved[id] ?? 0) < min)) return { ok: false, reason: "AWAITING_APPROVAL" };
  return { ok: true };
}
