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

  // Durum geçişi, reddedilirse bakiye iadesi ve cüzdan kaydı tek işlemde (veritabanı fonksiyonu).
  // Geçersiz geçişler (paid/rejected sonrası tekrar işlem, çift iade) reddedilir.
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("resolve_withdrawal", {
    rid: id,
    p_status: status,
    p_note: status === "rejected" ? adminNote ?? null : null,
  });

  if (error) {
    const m = error.message ?? "";
    if (m.includes("INVALID_TRANSITION")) return NextResponse.json({ error: "Bu talep artık bu duruma geçirilemez", code: "INVALID_TRANSITION" }, { status: 409 });
    if (m.includes("WITHDRAWAL_NOT_FOUND")) return NextResponse.json({ error: "Talep bulunamadı" }, { status: 404 });
    console.error("[admin/withdrawals/update] error:", error);
    return NextResponse.json({ error: m || "Güncellenemedi" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ...(data as object) });

}
