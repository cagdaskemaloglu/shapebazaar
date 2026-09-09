import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client — RLS'i tamamen bypass eder.
 *
 * SADECE server-side (API route / route handler) kodunda kullanılır.
 * Asla client component'e veya browser'a sızdırılmamalı.
 *
 * Bu client'ı kullanan her yerde, işlemi yapmadan önce çağıranın
 * gerçekten yetkili olduğunu (admin rolü, webhook imzası vb.) MUTLAKA
 * ayrıca doğrula — service role bypass ettiği için RLS artık bir
 * güvenlik katmanı olarak devrede değildir.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY veya NEXT_PUBLIC_SUPABASE_URL tanımlı değil (.env.local kontrol et)"
    );
  }

  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
