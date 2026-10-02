import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { createAdminClient } from "@/lib/supabase/admin";
import { printPhotoUrl } from "@/lib/printPhotosServer";

/**
 * Admin fotoğraf yönetimi verisi (service-role: order_items/pending fotoğraflar RLS'e takılır).
 *  - pending : onay bekleyen gönderimler (yazıcı + ürün kalemi bazında gruplu)
 *  - approved: yayındaki fotoğraflar, model bazında gruplu (vitrin seçimi/düzenleme için)
 */
export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const admin = createAdminClient();

  const { data: photos, error } = await admin
    .from("print_photos")
    .select("id, order_item_id, model_id, printer_id, photo_path, thumb_path, material, color_name, scale_percent, status, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) {
    console.error("[admin/photos] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const rows = photos ?? [];

  const modelIds   = [...new Set(rows.map((p) => p.model_id).filter(Boolean))] as string[];
  const printerIds = [...new Set(rows.map((p) => p.printer_id).filter(Boolean))] as string[];
  const itemIds    = [...new Set(rows.map((p) => p.order_item_id))];

  const [modelsRes, printersRes, itemsRes] = await Promise.all([
    modelIds.length
      ? admin.from("models").select("id, title, title_en, showcase_photo_id").in("id", modelIds)
      : Promise.resolve({ data: [] as any[] }),
    printerIds.length
      ? admin.from("profiles").select("id, full_name, username").in("id", printerIds)
      : Promise.resolve({ data: [] as any[] }),
    itemIds.length
      ? admin.from("order_items").select("id, model_title").in("id", itemIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const modelMap   = new Map((modelsRes.data ?? []).map((m: any) => [m.id, m]));
  const printerMap = new Map((printersRes.data ?? []).map((p: any) => [p.id, p]));
  const itemMap    = new Map((itemsRes.data ?? []).map((i: any) => [i.id, i]));

  const printerName = (id: string | null) => {
    const p: any = id ? printerMap.get(id) : null;
    return p?.username ? `@${p.username}` : p?.full_name ?? "—";
  };
  const toPhoto = (p: any) => ({
    id: p.id,
    status: p.status,
    photo_url: printPhotoUrl(p.photo_path),
    thumb_url: printPhotoUrl(p.thumb_path),
    created_at: p.created_at,
  });

  // Onay bekleyenler → ürün kalemi bazında
  const submissions = new Map<string, any>();
  for (const p of rows.filter((r) => r.status === "pending")) {
    const model: any = p.model_id ? modelMap.get(p.model_id) : null;
    let sub = submissions.get(p.order_item_id);
    if (!sub) {
      sub = {
        orderItemId: p.order_item_id,
        modelId: p.model_id,
        modelTitle: model?.title ?? (itemMap.get(p.order_item_id) as any)?.model_title ?? "—",
        hasShowcase: !!model?.showcase_photo_id,
        printer: printerName(p.printer_id),
        material: p.material, colorName: p.color_name, scalePercent: p.scale_percent,
        createdAt: p.created_at,
        photos: [] as any[],
      };
      submissions.set(p.order_item_id, sub);
    }
    sub.photos.push(toPhoto(p));
  }

  // Onaylılar → model bazında
  const groups = new Map<string, any>();
  for (const p of rows.filter((r) => r.status === "approved" && r.model_id)) {
    const model: any = modelMap.get(p.model_id!);
    if (!model) continue;
    let g = groups.get(model.id);
    if (!g) {
      g = { modelId: model.id, title: model.title, showcasePhotoId: model.showcase_photo_id ?? null, photos: [] as any[] };
      groups.set(model.id, g);
    }
    g.photos.push({ ...toPhoto(p), printer: printerName(p.printer_id), material: p.material, colorName: p.color_name, scalePercent: p.scale_percent });
  }

  return NextResponse.json({
    pending:  [...submissions.values()],
    approved: [...groups.values()],
  });
}
