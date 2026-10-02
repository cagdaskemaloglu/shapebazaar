-- ============================================================
-- Baskı fotoğrafı özelliği — veritabanı doğrulama (SADECE OKUR, hiçbir şeyi değiştirmez)
-- Supabase SQL Editor'da, uygulamanın bağlandığı projede çalıştır.
-- ÖNEMLİ: Editör yalnızca SON sorgunun sonucunu gösterir; iki sorguyu AYRI AYRI çalıştır.
-- ============================================================

-- SORGU 1: Özelliğin nesneleri kurulu mu? (ok = false olan satırlar eksik demektir)
SELECT 'tablo print_jobs' AS kontrol,
       to_regclass('public.print_jobs') IS NOT NULL AS ok, NULL::text AS detay
UNION ALL SELECT 'tablo print_photos',
       to_regclass('public.print_photos') IS NOT NULL, NULL
UNION ALL SELECT 'kolon print_jobs.photos_required',
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'print_jobs' AND column_name = 'photos_required'), NULL
UNION ALL SELECT 'kolon models.showcase_thumb_path',
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'models' AND column_name = 'showcase_thumb_path'), NULL
UNION ALL SELECT 'bucket print-photos',
       EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'print-photos'), NULL
UNION ALL SELECT 'trigger: vitrin temizleme',
       EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_print_photos_before_delete'), NULL
UNION ALL SELECT 'policy: print_photos herkese açık okuma',
       EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'print_photos' AND policyname = 'print_photos_public_read'), NULL
UNION ALL SELECT 'policy: print_jobs partner okuma',
       EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'print_jobs' AND policyname = 'printjobs_partner_read'), NULL
-- Veri durumu: ok her zaman true, asıl bilgi detay sütununda
UNION ALL SELECT 'veri: açık işler, fotoğraf ZORUNLU', TRUE,
       (SELECT count(*)::text FROM print_jobs WHERE status IN ('available', 'claimed', 'printing') AND photos_required)
UNION ALL SELECT 'veri: açık işler, fotoğraf isteğe bağlı', TRUE,
       (SELECT count(*)::text FROM print_jobs WHERE status IN ('available', 'claimed', 'printing') AND NOT photos_required)
UNION ALL SELECT 'veri: yüklenen fotoğraflar', TRUE,
       (SELECT coalesce(string_agg(status || '=' || c, ', '), 'hiç yok') FROM (SELECT status, count(*) AS c FROM print_photos GROUP BY status) t)
UNION ALL SELECT 'veri: vitrin fotoğrafı seçilmiş model', TRUE,
       (SELECT count(*)::text FROM models WHERE showcase_thumb_path IS NOT NULL);

-- SORGU 2: Yeni kodun okuduğu kolonlardan EKSİK olanlar. Sonuç BOŞ ise hepsi var demektir.
WITH need(tbl, col) AS (VALUES
  ('print_jobs','id'),('print_jobs','order_id'),('print_jobs','printer_id'),('print_jobs','status'),('print_jobs','region'),
  ('print_jobs','claimed_at'),('print_jobs','printed_at'),('print_jobs','deadline'),('print_jobs','printer_notes'),
  ('print_jobs','photos_required'),('print_jobs','created_at'),
  ('orders','id'),('orders','buyer_id'),('orders','status'),('orders','total_amount'),('orders','shipping_cost'),
  ('orders','recipient_name'),('orders','address_line1'),('orders','city'),('orders','district'),('orders','phone'),
  ('orders','tracking_number'),('orders','cargo_company'),('orders','paid_at'),('orders','created_at'),
  ('order_items','id'),('order_items','order_id'),('order_items','model_id'),('order_items','model_title'),
  ('order_items','material'),('order_items','color_name'),('order_items','scale_percent'),('order_items','item_total'),
  ('profiles','id'),('profiles','full_name'),('profiles','username'),('profiles','is_partner_approved'),('profiles','region'),
  ('models','id'),('models','title'),('models','title_en'),('models','is_published'),('models','thumbnail_url'),
  ('models','file_url'),('models','designer_id'),('models','showcase_photo_id'),('models','showcase_thumb_path')
)
SELECT n.tbl AS tablo, n.col AS eksik_kolon
FROM need n
LEFT JOIN information_schema.columns c
  ON c.table_schema = 'public' AND c.table_name = n.tbl AND c.column_name = n.col
WHERE c.column_name IS NULL
ORDER BY 1, 2;
