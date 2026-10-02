-- ============================================================
-- 008 — print_jobs (yoksa kurulur) + yazıcı baskı fotoğrafları + ürün vitrin fotoğrafı
-- ============================================================
-- Canlı veritabanında `print_jobs` tablosu hiç yoktu (001'den kurulmamış; veritabanı panelden elle
-- büyütülmüş). Kod ise sipariş ödenince bu tabloya kayıt ekliyor ve partner paneli onu okuyor.
-- Bu migration tabloyu, kodun beklediği tam kolon setiyle (001'dekine ek olarak `region`,
-- `deadline`, `photos_required`) oluşturur; tablo zaten varsa eksik kolonları ekler. Tekrar
-- çalıştırılabilir (idempotent).
--
-- Fotoğraf akışı:
--  1) Yazıcı, işi kargolamadan önce her ürün (order_item) için en az 2 fotoğraf yükler
--     (sunucu route'u: /api/partner/photos). Fotoğraflar `pending` doğar.
--  2) Admin onaylar / siler. Onay, kargolamayı ENGELLEMEZ (kargo sadece "yüklendi" şartına bağlı).
--  3) Onaylı fotoğraflar ürünün kendi sayfasında görünür. Admin ürün başına TEK bir fotoğrafı
--     "vitrin" seçer; ürün kartında bu fotoğraf sol üstte mini buton olarak görünür.
--
-- Tüm fotoğraf yazmaları sunucuda service-role ile yapılır; kullanıcılara yazma hakkı verilmez.

-- ---------- 1) print_jobs ----------
-- Aşağıdaki RLS politikaları bu kolona bağlı (admin partner onayı bunu yazar); yoksa politika kurulamaz.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_partner_approved BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS print_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  printer_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'available'
                    CHECK (status IN ('available', 'claimed', 'printing', 'done', 'failed')),
  region          TEXT DEFAULT 'TR',          -- partner havuzu alıcının bölgesine göre filtrelenir
  claimed_at      TIMESTAMPTZ,
  printed_at      TIMESTAMPTZ,
  deadline        TIMESTAMPTZ,                -- claimed/printing için süre; cron süresi dolanı havuza döndürür
  printer_notes   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tablo daha önce (elle) oluşturulmuşsa eksik olabilecek kolonlar
ALTER TABLE print_jobs ADD COLUMN IF NOT EXISTS region        TEXT DEFAULT 'TR';
ALTER TABLE print_jobs ADD COLUMN IF NOT EXISTS deadline      TIMESTAMPTZ;
ALTER TABLE print_jobs ADD COLUMN IF NOT EXISTS printer_notes TEXT;
ALTER TABLE print_jobs ADD COLUMN IF NOT EXISTS printed_at    TIMESTAMPTZ;
ALTER TABLE print_jobs ADD COLUMN IF NOT EXISTS claimed_at    TIMESTAMPTZ;

-- Fotoğraf zorunluluğu sadece bu migration'dan SONRA oluşan işler için geçerli: mevcut satırlar
-- FALSE kalır, yeni satırlar TRUE doğar (baskıdaki işler fotoğraf yükleyemeden kilitlenmesin).
ALTER TABLE print_jobs ADD COLUMN IF NOT EXISTS photos_required BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE print_jobs ALTER COLUMN photos_required SET DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_print_jobs_available ON print_jobs(status) WHERE status = 'available';
CREATE INDEX IF NOT EXISTS idx_print_jobs_printer   ON print_jobs(printer_id);

-- RLS: sadece ONAYLI yazıcı ortakları, havuzdaki (available) işleri ve kendi işlerini görür/günceller.
-- Siparişi oluşturan, listeleyen ve kargolayan sunucu route'ları service-role kullanır (RLS'i aşar).
ALTER TABLE print_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "printjobs_read"           ON print_jobs;  -- 001'deki herkese açık okuma
DROP POLICY IF EXISTS "printjobs_claim"          ON print_jobs;  -- 001'deki WITH CHECK'siz güncelleme
DROP POLICY IF EXISTS "printjobs_partner_read"   ON print_jobs;
DROP POLICY IF EXISTS "printjobs_partner_update" ON print_jobs;

CREATE POLICY "printjobs_partner_read" ON print_jobs FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_partner_approved)
  AND (status = 'available' OR printer_id = auth.uid())
);
CREATE POLICY "printjobs_partner_update" ON print_jobs FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_partner_approved)
  AND (status = 'available' OR printer_id = auth.uid())
) WITH CHECK (printer_id = auth.uid());

-- Kolon bazlı kısıt: tarayıcıdan (anon key) yalnızca "üstlen / baskıya al" kolonları güncellenebilir.
-- Böylece bir yazıcı kendi işinde `photos_required`'ı kapatamaz, `order_id`/`region` değiştiremez.
REVOKE ALL ON print_jobs FROM anon, authenticated;
GRANT SELECT ON print_jobs TO authenticated;
GRANT UPDATE (status, printer_id, claimed_at, deadline) ON print_jobs TO authenticated;

-- ---------- 2) print_photos ----------
CREATE TABLE IF NOT EXISTS print_photos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  print_job_id  UUID REFERENCES print_jobs(id) ON DELETE SET NULL,
  -- order_items.model_id model silinince NULL'a düşer; fotoğraflar ise model ile birlikte silinir
  model_id      UUID REFERENCES models(id) ON DELETE CASCADE,
  printer_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  photo_path    TEXT NOT NULL,   -- bucket: print-photos (≤1600px)
  thumb_path    TEXT NOT NULL,   -- bucket: print-photos (≤640px) — kart/mini için
  -- order_items RLS'i herkese açık okumayı engellediği için sipariş bilgisi buraya kopyalanır
  material      TEXT,
  color_name    TEXT,
  scale_percent NUMERIC(5,1),    -- order_items.scale_percent ile aynı tip (ör. 87.5)
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved')),
  reviewed_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_print_photos_model_status ON print_photos(model_id, status);
CREATE INDEX IF NOT EXISTS idx_print_photos_order_item   ON print_photos(order_item_id);
CREATE INDEX IF NOT EXISTS idx_print_photos_job          ON print_photos(print_job_id);

ALTER TABLE print_photos ENABLE ROW LEVEL SECURITY;
-- Herkes sadece ONAYLI fotoğrafları okur; yazıcı kendi yüklediklerini (bekleyenler dahil) görür.
DROP POLICY IF EXISTS "print_photos_public_read"  ON print_photos;
DROP POLICY IF EXISTS "print_photos_printer_read" ON print_photos;
CREATE POLICY "print_photos_public_read"  ON print_photos FOR SELECT USING (status = 'approved');
CREATE POLICY "print_photos_printer_read" ON print_photos FOR SELECT USING (auth.uid() = printer_id);
-- Yazma hakkı yok (policy zaten yok); ayrıca ayrıcalıkları da kaldır
REVOKE INSERT, UPDATE, DELETE ON print_photos FROM anon, authenticated;

-- ---------- 3) Ürün başına tek vitrin fotoğrafı (admin seçer) ----------
-- Kart sorgusu join yapmasın diye yollar modele kopyalanır.
-- NOT: 001'deki `models_designer_update` politikası tasarımcıya kendi modelinin TÜM kolonlarını
-- güncelleme izni verir; showcase_* kolonları da buna dahildir (ileride kolon bazlı kısıtlanabilir).
ALTER TABLE models
  ADD COLUMN IF NOT EXISTS showcase_photo_id    UUID REFERENCES print_photos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS showcase_photo_path  TEXT,
  ADD COLUMN IF NOT EXISTS showcase_thumb_path  TEXT;

-- Vitrin fotoğrafı silinir ya da onayı kaldırılırsa modeldeki kopyaları da temizle
CREATE OR REPLACE FUNCTION clear_showcase_if_unavailable() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' OR NEW.status <> 'approved' THEN
    UPDATE models
       SET showcase_photo_id = NULL, showcase_photo_path = NULL, showcase_thumb_path = NULL
     WHERE showcase_photo_id = OLD.id;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_print_photos_before_delete ON print_photos;
DROP TRIGGER IF EXISTS trg_print_photos_after_status  ON print_photos;

CREATE TRIGGER trg_print_photos_before_delete
  BEFORE DELETE ON print_photos
  FOR EACH ROW EXECUTE FUNCTION clear_showcase_if_unavailable();

CREATE TRIGGER trg_print_photos_after_status
  AFTER UPDATE OF status ON print_photos
  FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION clear_showcase_if_unavailable();

-- ---------- 4) Storage ----------
-- Herkese açık bucket (yükleme/silme sadece sunucudan, service-role ile). Dosya adları tahmin
-- edilemez UUID'ler; silinen fotoğrafların dosyaları da silinir.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('print-photos', 'print-photos', TRUE, 3145728, ARRAY['image/jpeg'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "print_photos_objects_public_read" ON storage.objects;
CREATE POLICY "print_photos_objects_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'print-photos');

-- ============================================================
-- OPSİYONEL (çalıştırmadan önce oku): GEÇMİŞ SİPARİŞLERİ HAVUZA EKLEME
-- ============================================================
-- print_jobs tablosu yokken ödenen siparişlerde callback'in print_jobs insert'i sessizce hata vermişti;
-- yani o siparişler hiçbir yazıcıya düşmedi. Gerçek müşteri siparişleri varsa aşağıdaki sorgu onları
-- havuza ekler (fotoğraf zorunluluğu OLMADAN). Test siparişleri de eklenir — önce kontrol et:
--   SELECT id, created_at, total_amount FROM orders WHERE status = 'paid' AND paid_at IS NOT NULL
--     AND NOT EXISTS (SELECT 1 FROM print_jobs j WHERE j.order_id = orders.id);
-- Sonra istediklerin için:
--   INSERT INTO print_jobs (order_id, status, region, photos_required)
--   SELECT o.id, 'available', COALESCE(p.region, 'TR'), FALSE
--     FROM orders o LEFT JOIN profiles p ON p.id = o.buyer_id
--    WHERE o.status = 'paid' AND o.paid_at IS NOT NULL
--      AND NOT EXISTS (SELECT 1 FROM print_jobs j WHERE j.order_id = o.id);
