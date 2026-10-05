-- ============================================================
-- 010 — Güvenlik sıkılaştırması + cüzdan/çekim muhasebesi
-- ============================================================
-- Denetimde bulunan açıklar (001-009 şemasına göre; canlıda geçerli olup olmadığını
-- supabase/checks/security_audit.sql ile doğrula):
--
--  1) increment_wallet(uid, amount) SECURITY DEFINER ve herkese açık çalıştırılabilir → anon
--     anahtarıyla herhangi bir hesabın cüzdanına istenen tutar eklenebilir/çıkarılabilir.
--  2) profiles_self_update kolon kısıtı yok → kullanıcı kendi `role` (admin!), `wallet_balance`
--     ve `is_partner_approved` değerini değiştirebilir. requireAdmin() sadece profiles.role'e bakar.
--  3) models insert/update politikaları kolon kısıtı yok → tasarımcı kendi modelini admin onayı
--     olmadan yayınlayabilir (is_published), puan/sayaçları ve vitrin fotoğrafını değiştirebilir.
--  4) model_ratings güncellemede model_id değiştirilebilir → satın alma şartı atlanır.
--  5) Çekim talebi tarayıcıdan doğrudan insert ediliyor (miktar/durum sunucuda doğrulanmıyor) ve
--     bakiye HİÇBİR ADIMDA düşmüyor: aynı bakiye için tekrar tekrar çekim istenebilir, "ödendi"
--     onayı bakiyeyi azaltmıyor (hesap silme engeli de bu yüzden hiç kalkmazdı).
--
-- Korumalar `current_user` rolüne bakar: PostgREST kullanıcı isteklerini `anon`/`authenticated`
-- rolüyle çalıştırır. Sunucu (service_role), cron, SECURITY DEFINER fonksiyonlar ve SQL Editor
-- (postgres) etkilenmez. Tetikleyiciler `jsonb_populate_record` ile korunan kolonları ESKİ değerine
-- döndürür; veritabanında olmayan bir kolon adı hata vermez (canlı şema 001'den sapmış durumda).

-- ---------- 1) increment_wallet: sadece service_role ----------
REVOKE ALL ON FUNCTION increment_wallet(UUID, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_wallet(UUID, NUMERIC) TO service_role;

-- ---------- 2) profiles: rol / bakiye / partner onayı kullanıcıdan korunur ----------
CREATE OR REPLACE FUNCTION protect_profile_columns() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    NEW := jsonb_populate_record(NEW, (
      SELECT coalesce(jsonb_object_agg(k, v), '{}'::jsonb)
        FROM jsonb_each(to_jsonb(OLD)) AS t(k, v)
       WHERE k = ANY (ARRAY['role', 'wallet_balance', 'is_partner_approved'])
    ));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_protect_profile_columns ON profiles;
CREATE TRIGGER trg_protect_profile_columns
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION protect_profile_columns();

-- ---------- 3) models: yayın durumu, sayaçlar, vitrin, sahiplik ----------
CREATE OR REPLACE FUNCTION protect_model_columns() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE keep JSONB;
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    IF TG_OP = 'INSERT' THEN
      -- Yeni model her zaman "onay bekliyor" doğar; sayaç/puan/vitrin başlangıç değerinde
      NEW := jsonb_populate_record(NEW, jsonb_build_object(
        'is_published', FALSE, 'is_featured', FALSE,
        'print_count', 0, 'view_count', 0, 'avg_rating', 0, 'rating_count', 0,
        'showcase_photo_id', NULL::text, 'showcase_photo_path', NULL::text, 'showcase_thumb_path', NULL::text
      ));
    ELSE
      SELECT coalesce(jsonb_object_agg(k, v), '{}'::jsonb) INTO keep
        FROM jsonb_each(to_jsonb(OLD)) AS t(k, v)
       WHERE k = ANY (ARRAY['is_featured', 'print_count', 'view_count', 'avg_rating', 'rating_count',
                            'showcase_photo_id', 'showcase_photo_path', 'showcase_thumb_path', 'designer_id']);
      NEW := jsonb_populate_record(NEW, keep);
      -- Tasarımcı modelini yayından kaldırabilir ama YAYINLAYAMAZ (admin onayı gerekir)
      IF coalesce(NEW.is_published, FALSE) AND NOT coalesce(OLD.is_published, FALSE) THEN
        NEW.is_published := FALSE;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_protect_model_columns ON models;
CREATE TRIGGER trg_protect_model_columns
  BEFORE INSERT OR UPDATE ON models FOR EACH ROW EXECUTE FUNCTION protect_model_columns();

-- ---------- 4) model_ratings: puan başka modele/kullanıcıya taşınamaz ----------
CREATE OR REPLACE FUNCTION protect_rating_columns() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    NEW := jsonb_populate_record(NEW, (
      SELECT coalesce(jsonb_object_agg(k, v), '{}'::jsonb)
        FROM jsonb_each(to_jsonb(OLD)) AS t(k, v)
       WHERE k = ANY (ARRAY['user_id', 'model_id'])
    ));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_protect_rating_columns ON model_ratings;
CREATE TRIGGER trg_protect_rating_columns
  BEFORE UPDATE ON model_ratings FOR EACH ROW EXECUTE FUNCTION protect_rating_columns();

-- ---------- 5) Çekim talepleri: sunucu fonksiyonlarıyla, bakiye düşerek ----------
-- balance_held: bakiye talep anında düşüldü mü? (Bu migration'dan ÖNCEKİ talepler FALSE kalır; onlar
-- için bakiye hiç düşülmemişti, reddedilirse iade EDİLMEZ — yoksa para yoktan var olur.)
ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS balance_held BOOLEAN NOT NULL DEFAULT FALSE;

-- Kullanıcı artık tarayıcıdan doğrudan talep OLUŞTURAMAZ/güncelleyemez; sadece kendi taleplerini okur.
DROP POLICY IF EXISTS "withdrawals_own_insert" ON withdrawal_requests;
REVOKE INSERT, UPDATE, DELETE ON withdrawal_requests FROM anon, authenticated;

-- Talep oluştur: bakiyeyi kilitleyip düşer, talep + cüzdan hareketini tek işlemde yazar
CREATE OR REPLACE FUNCTION request_withdrawal(uid UUID, p_amount NUMERIC, p_iban TEXT, p_full_name TEXT, p_min NUMERIC DEFAULT 50)
RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
  bal NUMERIC;
  rid UUID;
BEGIN
  IF p_amount IS NULL OR p_amount < p_min THEN RAISE EXCEPTION 'WITHDRAWAL_BELOW_MIN'; END IF;
  SELECT wallet_balance INTO bal FROM profiles WHERE id = uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PROFILE_NOT_FOUND'; END IF;
  IF bal < p_amount THEN RAISE EXCEPTION 'INSUFFICIENT_BALANCE'; END IF;

  UPDATE profiles SET wallet_balance = wallet_balance - p_amount WHERE id = uid;
  INSERT INTO withdrawal_requests (user_id, amount, iban, full_name, status, balance_held)
       VALUES (uid, p_amount, p_iban, p_full_name, 'pending', TRUE)
    RETURNING id INTO rid;
  INSERT INTO wallet_transactions (user_id, type, amount, description)
       VALUES (uid, 'spend', p_amount, 'Çekim talebi #' || left(rid::text, 8));
  RETURN rid;
END $$;

-- Talebi sonuçlandır: durum geçişlerini doğrular; reddedilirse düşülmüş bakiyeyi iade eder
CREATE OR REPLACE FUNCTION resolve_withdrawal(rid UUID, p_status TEXT, p_note TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
  w        withdrawal_requests%ROWTYPE;
  refunded BOOLEAN := FALSE;
BEGIN
  IF p_status NOT IN ('approved', 'paid', 'rejected') THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;
  SELECT * INTO w FROM withdrawal_requests WHERE id = rid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'WITHDRAWAL_NOT_FOUND'; END IF;

  -- pending → approved/paid/rejected, approved → paid/rejected. paid ve rejected SON durumdur.
  IF NOT ((w.status = 'pending'  AND p_status IN ('approved', 'paid', 'rejected'))
       OR (w.status = 'approved' AND p_status IN ('paid', 'rejected'))) THEN
    RAISE EXCEPTION 'INVALID_TRANSITION';
  END IF;

  IF p_status = 'rejected' AND w.balance_held THEN
    UPDATE profiles SET wallet_balance = wallet_balance + w.amount WHERE id = w.user_id;
    INSERT INTO wallet_transactions (user_id, type, amount, description)
         VALUES (w.user_id, 'refund', w.amount, 'Çekim talebi reddedildi, iade #' || left(rid::text, 8));
    refunded := TRUE;
  END IF;

  UPDATE withdrawal_requests
     SET status = p_status,
         admin_note = CASE WHEN p_status = 'rejected' THEN p_note ELSE admin_note END,
         updated_at = now()
   WHERE id = rid;

  RETURN jsonb_build_object('id', rid, 'status', p_status, 'refunded', refunded);
END $$;

REVOKE ALL ON FUNCTION request_withdrawal(UUID, NUMERIC, TEXT, TEXT, NUMERIC) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION resolve_withdrawal(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION request_withdrawal(UUID, NUMERIC, TEXT, TEXT, NUMERIC) TO service_role;
GRANT EXECUTE ON FUNCTION resolve_withdrawal(UUID, TEXT, TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- OPSİYONEL (çalıştırmadan önce oku): bu migration'dan ÖNCE açılmış, bekleyen/onaylı talepler
-- ============================================================
-- Eski taleplerde bakiye düşülmemişti. Gerçek (test olmayan) bekleyen talep varsa durumu gör:
--   SELECT w.id, w.user_id, w.amount, w.status, p.wallet_balance
--     FROM withdrawal_requests w JOIN profiles p ON p.id = w.user_id
--    WHERE w.status IN ('pending', 'approved') AND NOT w.balance_held;
-- Ödemeyi yapmadan önce bu kullanıcıların bakiyesini elle düş ve talebi işaretle:
--   UPDATE profiles SET wallet_balance = wallet_balance - <tutar> WHERE id = '<user_id>';
--   UPDATE withdrawal_requests SET balance_held = TRUE WHERE id = '<talep id>';
