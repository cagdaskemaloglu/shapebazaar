import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PRINT_PHOTO_MIN } from "@shapebazaar/shared";

/**
 * Yazıcı ortağı kargo bilgilerini girip işi tamamladığında çağrılır.
 * NOT: Kazanç burada DAĞITILMAZ — kazanç, müşteri "Teslim Aldım" deyip
 * /api/orders/confirm-delivery çağrıldığında dağıtılır.
 */
export async function POST(req: NextRequest) {
  const { jobId, trackingNumber, cargoCompany } = await req.json();
  if (typeof jobId !== "string" || typeof trackingNumber !== "string" || !trackingNumber.trim()) {
    return NextResponse.json({ error: "jobId ve trackingNumber gerekli" }, { status: 400 });
  }

  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Bu işin gerçekten bu yazıcı ortağına ait olduğunu doğrula
  const { data: job, error: jobFindErr } = await admin
    .from("print_jobs")
    .select("id, order_id, printer_id, status, photos_required")
    .eq("id", jobId)
    .single();

  if (jobFindErr || !job || job.printer_id !== user.id) {
    return NextResponse.json({ error: "Bu iş size ait değil" }, { status: 403 });
  }
  if (job.status === "done") {
    return NextResponse.json({ error: "Bu iş zaten tamamlanmış" }, { status: 409 });
  }

  // Her ürün için en az PRINT_PHOTO_MIN baskı fotoğrafı YÜKLENMİŞ olmalı. Admin onayı beklenmez —
  // onay kargolamayı engellemez. (Özellikten önce oluşmuş işlerde `photos_required` = false.)
  if (job.photos_required) {
    const { data: items } = await admin.from("order_items").select("id").eq("order_id", job.order_id);
    const itemIds = (items ?? []).map((i) => i.id);
    const { data: photos } = await admin
      .from("print_photos")
      .select("order_item_id")
      .eq("printer_id", user.id)
      .in("order_item_id", itemIds.length ? itemIds : ["00000000-0000-0000-0000-000000000000"]);
    const counts: Record<string, number> = {};
    for (const ph of photos ?? []) counts[ph.order_item_id] = (counts[ph.order_item_id] ?? 0) + 1;
    if (itemIds.some((id) => (counts[id] ?? 0) < PRINT_PHOTO_MIN)) {
      return NextResponse.json(
        { error: `Her ürün için en az ${PRINT_PHOTO_MIN} fotoğraf yüklemelisiniz`, code: "PHOTOS_REQUIRED" },
        { status: 422 }
      );
    }
  }

  const { error: jobUpdateErr } = await admin
    .from("print_jobs")
    .update({ status: "done", printed_at: new Date().toISOString() })
    .eq("id", jobId);

  if (jobUpdateErr) {
    console.error("[partner/ship] print_jobs update error:", jobUpdateErr);
    return NextResponse.json({ error: "İş güncellenemedi" }, { status: 500 });
  }

  const { error: orderUpdateErr } = await admin
    .from("orders")
    .update({
      status:          "shipped",
      tracking_number: trackingNumber.trim(),
      cargo_company:   (cargoCompany ?? "").trim() || null,
    })
    .eq("id", job.order_id);

  if (orderUpdateErr) {
    console.error("[partner/ship] orders update error:", orderUpdateErr);
    return NextResponse.json({ error: "Sipariş güncellenemedi" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, orderId: job.order_id });
}
