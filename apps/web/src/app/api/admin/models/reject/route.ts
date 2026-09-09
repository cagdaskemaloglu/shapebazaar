import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { modelIds } = await req.json();
  const ids: string[] = Array.isArray(modelIds) ? modelIds : [modelIds];
  if (!ids.length || ids.some((id) => typeof id !== "string")) {
    return NextResponse.json({ error: "modelIds gerekli" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("models").delete().in("id", ids);

  if (error) {
    console.error("[admin/models/reject] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
