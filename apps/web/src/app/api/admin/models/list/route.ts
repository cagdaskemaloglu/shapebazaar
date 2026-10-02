import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { createAdminClient } from "@/lib/supabase/admin";

/** Admin katalog listesi (yayında + bekleyen), başlığa göre arama. Silme işlemi için. */
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  // `,()%*\` PostgREST .or()/ilike söz diziminde özel anlam taşır
  const q = (req.nextUrl.searchParams.get("q") ?? "").replace(/[,()%*\\]/g, " ").trim();

  const admin = createAdminClient();
  let query = admin
    .from("models")
    .select("id, title, base_price, is_free, is_published, created_at, designer:profiles(full_name, username)")
    .order("created_at", { ascending: false })
    .limit(50);
  if (q) query = query.ilike("title", `%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ models: data ?? [] });
}
