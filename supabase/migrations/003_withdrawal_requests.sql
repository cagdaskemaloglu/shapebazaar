-- ============================================================
-- WITHDRAWAL_REQUESTS
-- Bu tablo canlı Supabase projesinde SQL Editor üzerinden elle
-- oluşturulmuştu ve hiçbir migration dosyasına işlenmemişti.
-- Bu dosya, o canlı şemayı geriye dönük olarak repo'ya kaydeder.
--
-- NOT: Eğer tablo canlı DB'de zaten varsa, bu dosyayı olduğu gibi
-- çalıştırma — önce mevcut tabloyu `\d withdrawal_requests` (SQL
-- Editor'de information_schema sorgusu) ile karşılaştır, sadece
-- eksik policy'leri ayrı ayrı ekle. Sıfırdan bir ortamda (yeni
-- Supabase projesi) ise tamamı olduğu gibi çalıştırılabilir.
-- ============================================================

CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount      NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  iban        TEXT NOT NULL,
  full_name   TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  admin_note  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- is_admin(): profiles.role kontrolünü RLS-recursion olmadan
-- yapabilmek için SECURITY DEFINER helper. Zaten varsa CREATE OR
-- REPLACE onu günceller, hata vermez.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Kullanıcı kendi talebini görebilir + oluşturabilir
CREATE POLICY "withdrawals_own_select" ON withdrawal_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "withdrawals_own_insert" ON withdrawal_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin tüm talepleri görebilir (AdminDashboardClient fetchAll
-- browser client + admin oturumuyla okuyor, bu yüzden SELECT
-- policy şart — UPDATE zaten /api/admin/withdrawals/update
-- route'unda service-role ile yapılıyor, ama admin panelinde
-- olası ileri düzey ihtiyaçlar için burada da bırakıyoruz).
CREATE POLICY "withdrawals_admin_select" ON withdrawal_requests
  FOR SELECT USING (is_admin());

CREATE POLICY "withdrawals_admin_update" ON withdrawal_requests
  FOR UPDATE USING (is_admin());
