import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { createAdminClient } from "@/lib/supabase/admin";
import { PRINT_PHOTO_BUCKET } from "@/lib/printPhotosServer";

const isIdList = (v: unknown): v is string[] =>
  Array.isArray(v) && v.length <= 200 && v.every((x) => typeof x === "string" && x.length <= 64);

/**
 * Admin, fotoğraf durumunu toplu olarak değiştirir. İlk onay ve sonradan düzenleme aynı uçtan geçer:
 *   removeIds           → fotoğrafı (dosyalarıyla) siler
 *   approveIds          → onaylar (herkese görünür)
 *   pendingIds          → onayı kaldırır (tekrar "bekliyor"; vitrinse vitrin de temizlenir — DB trigger'ı)
 *   showcaseId          → bu (onaylı) fotoğrafı ürünün vitrin fotoğrafı yapar (ürün başına tek)
 *   clearShowcaseModelId→ ürünün vitrin fotoğrafını kaldırır
 * Sıra: sil → onayla → onayı kaldır → vitrin seç → vitrin temizle.
 */
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => ({}));
  const { approveIds = [], pendingIds = [], removeIds = [], showcaseId, clearShowcaseModelId } = body ?? {};
  if (![approveIds, pendingIds, removeIds].every(isIdList)) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }
  if ((showcaseId != null && typeof showcaseId !== "string") ||
      (clearShowcaseModelId != null && typeof clearShowcaseModelId !== "string")) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const admin = createAdminClient();

  // 1) Sil
  if (removeIds.length) {
    const { data: rows } = await admin.from("print_photos").select("id, photo_path, thumb_path").in("id", removeIds);
    const paths = (rows ?? []).flatMap((r) => [r.photo_path, r.thumb_path]);
    if (paths.length) await admin.storage.from(PRINT_PHOTO_BUCKET).remove(paths);
    const { error } = await admin.from("print_photos").delete().in("id", removeIds);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 2) Onayla
  if (approveIds.length) {
    const { error } = await admin
      .from("print_photos")
      .update({ status: "approved", reviewed_by: guard.user.id, reviewed_at: new Date().toISOString() })
      .in("id", approveIds);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 3) Onayı kaldır
  if (pendingIds.length) {
    const { error } = await admin.from("print_photos").update({ status: "pending" }).in("id", pendingIds);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 4) Vitrin seç
  if (showcaseId) {
    const { data: photo } = await admin
      .from("print_photos")
      .select("id, model_id, status, photo_path, thumb_path")
      .eq("id", showcaseId)
      .single();
    if (!photo || photo.status !== "approved" || !photo.model_id) {
      return NextResponse.json({ error: "Vitrin için fotoğraf onaylı olmalı" }, { status: 400 });
    }
    const { error } = await admin
      .from("models")
      .update({
        showcase_photo_id:   photo.id,
        showcase_photo_path: photo.photo_path,
        showcase_thumb_path: photo.thumb_path,
      })
      .eq("id", photo.model_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 5) Vitrini kaldır
  if (clearShowcaseModelId) {
    const { error } = await admin
      .from("models")
      .update({ showcase_photo_id: null, showcase_photo_path: null, showcase_thumb_path: null })
      .eq("id", clearShowcaseModelId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
