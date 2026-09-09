import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { userId } = await req.json();
  if (typeof userId !== "string" || !userId) {
    return NextResponse.json({ error: "userId gerekli" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error, data } = await supabase
    .from("profiles")
    .update({ role: "printer_partner", is_partner_approved: true })
    .eq("id", userId)
    .select("id")
    .single();

  if (error || !data) {
    console.error("[admin/partners/approve] error:", error);
    return NextResponse.json({ error: error?.message ?? "Güncellenemedi" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
