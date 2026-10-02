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
