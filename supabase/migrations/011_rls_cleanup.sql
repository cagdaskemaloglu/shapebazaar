-- ============================================================
-- 011 — Canlı veritabanında bulunan (migration dosyalarında OLMAYAN) tehlikeli politikaların temizliği
-- ============================================================
-- 4 Ekim 2026 policy dökümünde (supabase/checks/security_audit.sql, sorgu 2) görülenler:
--
--  1) order_items "System inserts order items" (INSERT, alıcı kendi siparişine): alıcı ÖDENMİŞ kendi
--     siparişine istediği model_id / model_price ile sahte kalem ekleyebilirdi. Teslim onayında tasarımcı
--     kazancı order_items.model_price'tan dağıtıldığı için: alıcı = tasarımcı hesabıyla, kendi modeline
--     yüksek fiyatlı kalem ekleyip teslim sonrası cüzdanına para yazdırabilirdi (sonra çekim).
--     Kalemleri artık sadece sunucu (service-role) yazıyor: payment/init ve admin test route'u.
--  2) print_jobs "System can insert print jobs" (INSERT, WITH CHECK true): kimliksiz (anon) dahil herkes
--     havuza sahte iş ekleyebilir / kendini yazıcı olarak atayabilirdi. İşleri sadece callback (service-role) açıyor.
--  3) print_jobs "Partners can view print jobs" / "Partners can update own print jobs": 008'deki sıkı
--     politikaların YANINDA duruyordu (politikalar OR'lanır) → onaylı her yazıcı tüm işleri görüyor,
--     kolon/durum kısıtı gevşek kalıyordu.
--  4) models_designer_delete: tasarımcı, devam eden siparişi olan modelini silebilirdi → yazıcı dosyayı
--     indiremez, kargodaki siparişte tasarımcı kazancı kaybolurdu (admin silme route'u bunu zaten engelliyor).

DROP POLICY IF EXISTS "System inserts order items"            ON order_items;
DROP POLICY IF EXISTS "System can insert print jobs"          ON print_jobs;
DROP POLICY IF EXISTS "Partners can view print jobs"          ON print_jobs;
DROP POLICY IF EXISTS "Partners can update own print jobs"    ON print_jobs;

-- Savunma derinliği: RLS politikası olmasa da kullanıcı rolleri bu tablolara yazamasın
REVOKE INSERT, UPDATE, DELETE ON order_items FROM anon, authenticated;
REVOKE INSERT, DELETE         ON print_jobs  FROM anon, authenticated;

-- ---------- 4) Devam eden siparişi olan model, kullanıcı isteğiyle silinemez ----------
-- SECURITY DEFINER: tasarımcı başkalarının siparişlerini RLS yüzünden göremez; sayım tüm siparişlere bakmalı.
-- Kullanıcı isteği mi olduğunu `role` GUC'si söyler (SET ROLE değerini definer içinde de korur);
-- service-role, cron ve SQL Editor (postgres) serbest.
CREATE OR REPLACE FUNCTION protect_model_delete() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_n INT;
BEGIN
  IF current_setting('role', true) IN ('anon', 'authenticated') THEN
    SELECT count(DISTINCT o.id) INTO v_n
      FROM order_items oi JOIN orders o ON o.id = oi.order_id
     WHERE oi.model_id = OLD.id AND o.status IN ('paid', 'in_print', 'printed', 'shipped');
    IF v_n > 0 THEN
      RAISE EXCEPTION 'MODEL_IN_USE' USING DETAIL = v_n::text;
    END IF;
  END IF;
  RETURN OLD;
END $$;

REVOKE ALL ON FUNCTION protect_model_delete() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_protect_model_delete ON models;
CREATE TRIGGER trg_protect_model_delete
  BEFORE DELETE ON models FOR EACH ROW EXECUTE FUNCTION protect_model_delete();

NOTIFY pgrst, 'reload schema';
