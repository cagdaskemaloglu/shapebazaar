import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { orderId, status, trackingNumber, cargoCompany } = await req.json();
  if (typeof orderId !== "string" || typeof status !== "string") {
    return NextResponse.json({ error: "orderId ve status gerekli" }, { status: 400 });
  }

  const update: Record<string, unknown> = { status };
  if (status === "shipped") {
    if (typeof trackingNumber === "string") update.tracking_number = trackingNumber;
    if (typeof cargoCompany === "string") update.cargo_company = cargoCompany;
  }

  const supabase = createAdminClient();
  const { error, data } = await supabase
    .from("orders")
    .update(update)
    .eq("id", orderId)
    .select("id")
    .single();

  if (error || !data) {
    console.error("[admin/orders/status] error:", error);
    return NextResponse.json({ error: error?.message ?? "Güncellenemedi" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
