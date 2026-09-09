import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
    .select("id, order_id, printer_id, status")
    .eq("id", jobId)
    .single();

  if (jobFindErr || !job || job.printer_id !== user.id) {
    return NextResponse.json({ error: "Bu iş size ait değil" }, { status: 403 });
  }
  if (job.status === "done") {
    return NextResponse.json({ error: "Bu iş zaten tamamlanmış" }, { status: 409 });
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
