-- ============================================================
-- 012 — profiles: telefon ve cüzdan bakiyesi artık herkese açık okunamaz (KVKK)
-- ============================================================
-- SORUN: `profiles_public_read USING (true)` + tablo düzeyi SELECT yetkisi → anon anahtarıyla
-- (uygulamaya/sitenin JS'ine gömülü, herkesin elinde) TÜM kullanıcıların telefon numarası ve cüzdan
-- bakiyesi okunabiliyordu: GET /rest/v1/profiles?select=full_name,phone,wallet_balance
--
-- ÇÖZÜM: SELECT yetkisi KOLON bazına indirilir. Hassas kolonlar (aşağıdaki `deny`) anon ve
-- authenticated rollerinden alınır; geri kalan her kolon (ad, kullanıcı adı, avatar, rol, şehir, dükkân
-- bilgisi…) mevcut davranışı korur. Kullanıcı KENDİ telefon/bakiyesini `my_profile_private()` ile okur.
-- Sunucu (service_role) etkilenmez.
--
-- ETKİ — istemci kodunda:
--   * `.from("profiles").select("*")` ARTIK ÇALIŞMAZ (yıldız, kapalı kolonları da ister → permission denied).
--     Açık kolon listesi kullan. (dashboard/page.tsx buna göre güncellendi.)
--   * Sunucuda kullanıcı JWT'li istemciyle `phone`/`wallet_balance` okuyan yer varsa service-role'e
--     alınmalı (payment/init güncellendi).
--   * Sonradan profiles'a eklenen yeni kolonlar, GRANT edilene kadar istemciden OKUNAMAZ (güvenli varsayılan):
--       GRANT SELECT (yeni_kolon) ON profiles TO anon, authenticated;
--   * UPDATE etkilenmez (ayrı yetki). RLS politikalarında kullanılan `id`, `role`, `is_partner_approved` açık kalır.

DO $$
DECLARE
  deny   TEXT[] := ARRAY['phone', 'wallet_balance', 'email', 'iban', 'tc_kimlik_no', 'tax_number'];
  cols   TEXT;
  hidden TEXT;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position) INTO cols
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name <> ALL (deny);

  SELECT string_agg(column_name, ', ') INTO hidden
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = ANY (deny);

  EXECUTE 'REVOKE SELECT ON public.profiles FROM anon, authenticated';
  EXECUTE format('GRANT SELECT (%s) ON public.profiles TO anon, authenticated', cols);
  RAISE NOTICE 'profiles: istemcilerden GİZLENEN kolonlar: %', coalesce(hidden, '(yok)');
END $$;

-- Kullanıcı kendi hassas bilgilerini okur (SECURITY DEFINER: kolon yetkisini aşar, ama sadece auth.uid() satırı)
CREATE OR REPLACE FUNCTION my_profile_private()
RETURNS TABLE (phone TEXT, wallet_balance NUMERIC)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.phone::text, p.wallet_balance::numeric FROM profiles p WHERE p.id = auth.uid();
$$;

REVOKE ALL ON FUNCTION my_profile_private() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION my_profile_private() TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
