import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { id, status, adminNote } = await req.json();
  if (typeof id !== "string" || typeof status !== "string") {
    return NextResponse.json({ error: "id ve status gerekli" }, { status: 400 });
  }
  if (!["paid", "rejected", "approved"].includes(status)) {
    return NextResponse.json({ error: "geçersiz status" }, { status: 400 });
  }

  const update: Record<string, unknown> = { status };
  if (status === "rejected") update.admin_note = adminNote ?? null;

  const supabase = createAdminClient();
  const { error, data } = await supabase
    .from("withdrawal_requests")
    .update(update)
    .eq("id", id)
    .select("id")
    .single();

  if (error || !data) {
    console.error("[admin/withdrawals/update] error:", error);
    return NextResponse.json({ error: error?.message ?? "Güncellenemedi" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
