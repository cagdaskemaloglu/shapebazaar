-- increment_wallet() fonksiyonu 001_initial_schema.sql içinde tanımlıydı
-- ancak ilk kurulumda canlı veritabanına hiç uygulanmamıştı (ya da migration
-- yarıda kesilmişti). Bu dosya, o durumu tekrar canlıya güvenle uygulanabilir
-- (idempotent) hale getirir. Fonksiyon zaten varsa CREATE OR REPLACE hata
-- vermez, sorunsuz üzerine yazar.

CREATE OR REPLACE FUNCTION increment_wallet(uid UUID, amount NUMERIC)
RETURNS NUMERIC LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE profiles
  SET wallet_balance = wallet_balance + amount
  WHERE id = uid
  RETURNING wallet_balance;
$$;

NOTIFY pgrst, 'reload schema';
