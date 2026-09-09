import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Admin API route'larının başında çağrılır.
 * - Giriş yapılmamışsa 401
 * - profiles.role !== 'admin' ise 403
 * - Yetkiliyse { user } döner
 *
 * NOT: profiles tablosunda "public read" RLS politikası olduğu için
 * (profiles_public_read USING (TRUE)) bu kontrol normal (anon-key)
 * client ile güvenle yapılabilir — role bilgisini okumak için service
 * role gerekmez. Asıl RLS-bypass yazma işlemleri, bu kontrolden SONRA
 * admin client ile yapılmalı.
 */
export async function requireAdmin(): Promise<
  { ok: true; user: { id: string } } | { ok: false; response: NextResponse }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, response: NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return { ok: false, response: NextResponse.json({ error: "Bu işlem için admin yetkisi gerekiyor" }, { status: 403 }) };
  }

  return { ok: true, user: { id: user.id } };
}
