-- ============================================================
-- 007 — orders tablosu: alıcıya verilen yazma haklarını kaldır
-- ============================================================
-- SORUN: 001'deki `orders_own_update` politikası, alıcının KENDİ siparişinin HERHANGİ bir
-- sütununu güncellemesine izin veriyordu. Anon key uygulamada/tarayıcıda zaten herkesin elinde;
-- giriş yapmış herhangi bir kullanıcı Supabase REST API'siyle kendi siparişini
-- `status='paid'` (ödemeden), `status='delivered'` (kazanç akışını atlayarak) veya
-- `total_amount` düşük yapabilirdi. `orders_own_insert` de aynı şekilde `status`/`total_amount`
-- için hiçbir kısıt koymuyordu.
--
-- ÇÖZÜM: orders/order_items'a TÜM yazmalar sunucuda (kimlik doğrulaması yapılmış route'larda)
-- service-role (admin client) ile yapılır — payment/init, payment/callback, confirm-delivery,
-- partner/jobs/ship ve admin route'ları zaten böyle. Alıcıya sadece SELECT kalır
-- (`orders_own_read`, `order_items_buyer_read`).
--
-- !!! SIRA ÖNEMLİ: Bu migration'ı, `payment/init`'in admin client kullanan yeni sürümü
-- Vercel'de yayına alındıktan SONRA çalıştır. Aksi halde eski init, orders INSERT'ünde RLS'e
-- takılır ve ödeme başlatılamaz.

DROP POLICY IF EXISTS "orders_own_update" ON orders;
DROP POLICY IF EXISTS "orders_own_insert" ON orders;

-- Kontrol (elle çalıştır): orders ve order_items'ta kalan politikalar. Panelden elle eklenmiş,
-- migration'larda olmayan INSERT/UPDATE politikası görürsen onu da kaldır.
--   SELECT tablename, policyname, cmd FROM pg_policies
--   WHERE tablename IN ('orders', 'order_items') ORDER BY tablename, cmd;
