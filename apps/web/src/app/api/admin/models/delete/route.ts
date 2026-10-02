import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { createAdminClient } from "@/lib/supabase/admin";
import { PRINT_PHOTO_BUCKET, storagePathFromUrl } from "@/lib/printPhotosServer";

// Bu durumlardaki siparişler hâlâ modelin dosyasına / tasarımcı kaydına ihtiyaç duyar:
//  - paid/in_print/printed: yazıcı dosyayı indirip basacak
//  - shipped: teslim onayında tasarımcı kazancı order_items.model_id üzerinden dağıtılır
const ACTIVE = ["paid", "in_print", "printed", "shipped"];
const PENDING_GRACE_MS = 2 * 60 * 60 * 1000; // yeni başlatılmış (henüz ödenmemiş) siparişler de korunur

/**
 * Admin bir modeli kalıcı olarak siler. Sipariş geçmişi korunur (order_items.model_id → NULL,
 * model_title kalır); puanlar ve baskı fotoğrafları modelle birlikte silinir, dosyalar temizlenir.
 */
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { modelId } = await req.json().catch(() => ({}));
  if (typeof modelId !== "string") return NextResponse.json({ error: "modelId gerekli" }, { status: 400 });

  const admin = createAdminClient();

  const { data: model } = await admin
    .from("models")
    .select("id, title, file_url, thumbnail_url")
    .eq("id", modelId)
    .single();
  if (!model) return NextResponse.json({ error: "Model bulunamadı" }, { status: 404 });

  // Aktif siparişi olan model silinemez
  const { data: usage } = await admin
    .from("order_items")
    .select("id, order:orders!inner(status, created_at)")
    .eq("model_id", modelId);
  const blocking = (usage ?? []).filter((u: any) => {
    const o = u.order;
    if (!o) return false;
    if (ACTIVE.includes(o.status)) return true;
    return o.status === "pending" && Date.now() - new Date(o.created_at).getTime() < PENDING_GRACE_MS;
  });
  if (blocking.length > 0) {
    return NextResponse.json(
      { error: `Bu modelin devam eden ${blocking.length} siparişi var. Siparişler teslim edilene kadar silinemez.`, code: "MODEL_IN_USE" },
      { status: 409 }
    );
  }

  // --- Storage temizliği (en iyi çaba: hata silmeyi durdurmaz) ---
  const { data: photos } = await admin.from("print_photos").select("photo_path, thumb_path").eq("model_id", modelId);
  const { data: images } = await admin.from("model_images").select("url").eq("model_id", modelId);

  const filePath  = storagePathFromUrl(model.file_url, "model-files");
  const thumbPath = storagePathFromUrl(model.thumbnail_url, "model-thumbnails");
  const imagePaths = (images ?? []).map((i: any) => storagePathFromUrl(i.url, "model-images")).filter(Boolean) as string[];
  const photoPaths = (photos ?? []).flatMap((p) => [p.photo_path, p.thumb_path]);

  await Promise.allSettled([
    filePath   ? admin.storage.from("model-files").remove([filePath])            : null,
    thumbPath  ? admin.storage.from("model-thumbnails").remove([thumbPath])      : null,
    imagePaths.length ? admin.storage.from("model-images").remove(imagePaths)    : null,
    photoPaths.length ? admin.storage.from(PRINT_PHOTO_BUCKET).remove(photoPaths) : null,
  ]);

  // model_images tablosu migration'larda yok (panelden oluşturulmuş) — FK davranışı bilinmediği için açıkça sil
  await admin.from("model_images").delete().eq("model_id", modelId);

  const { error } = await admin.from("models").delete().eq("id", modelId);
  if (error) {
    console.error("[admin/models/delete] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
