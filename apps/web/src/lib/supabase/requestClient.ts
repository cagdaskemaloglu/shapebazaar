import { createServerClient } from "@supabase/ssr";
import {
  createClient as createSupabaseClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

/**
 * Mobile app'ten gelen isteklerde `Authorization: Bearer <access_token>`
 * header'ı bulunur — web hiçbir zaman bunu göndermez (cookie kullanır).
 *
 * Önemli: Sadece "bu token geçerli mi" diye kontrol etmek yetmez — dönen
 * `supabase` client'ının SONRAKİ TÜM sorguları da (`.from("profiles")...`
 * gibi) bu kullanıcı olarak RLS'e tabi çalışmalı. Bu yüzden mobile için
 * anon-key client'ı token'ı `Authorization` header'ına koyarak oluşturuyoruz.
 *
 * NOT: `@supabase/ssr`'ın `createServerClient()`'ı ile `@supabase/supabase-js`'in
 * `createClient()`'ı, TypeScript'in generic parametreleri açısından birebir
 * aynı `SupabaseClient<...>` tipini döndürmüyor (bilinen bir uyumsuzluk) —
 * bu yüzden ikisini de sade `SupabaseClient` tipine cast ediyoruz.
 */
export async function createRequestClient(
  req: NextRequest
): Promise<{ supabase: SupabaseClient; user: User | null }> {
  const authHeader = req.headers.get("authorization");

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    ) as SupabaseClient;
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (!error && user) return { supabase, user };
    // Token geçersizse web akışına düşmüyoruz — mobile isteği zaten
    // Authorization header'ı gönderdi, cookie'ye düşmek anlamsız.
    return { supabase, user: null };
  }

  // Web: mevcut cookie tabanlı davranış, hiç değişmedi.
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  ) as SupabaseClient;
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}