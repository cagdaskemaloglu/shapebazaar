-- ============================================================
-- 009 — Hesap silme (Apple Guideline 5.1.1(v) uygulama içi hesap silme zorunluluğu)
-- ============================================================
-- Kararlar:
--  * Eski siparişler saklanır, kişisel verileri (ad, adres, telefon) hesap silindikten 30 gün sonra
--    anonimleştirilir (cron: /api/cron/scrub-order-pii).
--  * Tasarımcının modelleri yayından kaldırılır; bu modelleri içeren, henüz KARGOYA VERİLMEMİŞ
--    (paid / in_print / printed) siparişler iptal edilir ve iade bekliyor olarak işaretlenir
--    (iade şu an elle yapılır: koda bağlı otomatik iade yok). Kargodaki siparişler teslim edilene
--    kadar silmeyi ENGELLER (tasarımcı kazancı teslim onayında dağıtılır).
--  * Cüzdan bakiyesi > 0 ya da bekleyen çekim talebi varsa silme engellenir.
--  * Aktif işi olan yazıcı ortağı, aktif siparişi olan alıcı ve admin hesabı silinemez.
--
-- İki fonksiyon service-role içindir; kullanıcılar (anon/authenticated) ÇAĞIRAMAZ.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancel_reason    TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_pending   BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pii_scrub_at     TIMESTAMPTZ;   -- bu tarihten sonra kişisel veriler silinir
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pii_scrubbed_at  TIMESTAMPTZ;   -- silindiği an

CREATE INDEX IF NOT EXISTS idx_orders_pii_scrub_due
  ON orders(pii_scrub_at) WHERE pii_scrub_at IS NOT NULL AND pii_scrubbed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_refund_pending
  ON orders(created_at) WHERE refund_pending;

-- ---------- Rapor: engeller + etki (hiçbir şeyi değiştirmez) ----------
CREATE OR REPLACE FUNCTION account_deletion_report(uid UUID) RETURNS JSONB
LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_role    TEXT;
  v_balance NUMERIC;
  v_n       INT;
  v_cancel  INT;
  v_models  INT;
  blockers  JSONB := '[]'::jsonb;
BEGIN
  SELECT role, wallet_balance INTO v_role, v_balance FROM profiles WHERE id = uid;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('blockers', jsonb_build_array(jsonb_build_object('code', 'NOT_FOUND')),
                              'willCancelOrders', 0, 'willUnpublishModels', 0);
  END IF;

  IF v_role = 'admin' THEN
    blockers := blockers || jsonb_build_array(jsonb_build_object('code', 'ADMIN_ACCOUNT'));
  END IF;

  IF coalesce(v_balance, 0) > 0 THEN
    blockers := blockers || jsonb_build_array(jsonb_build_object('code', 'WALLET_BALANCE', 'amount', v_balance));
  END IF;

  SELECT count(*) INTO v_n FROM withdrawal_requests WHERE user_id = uid AND status IN ('pending', 'approved');
  IF v_n > 0 THEN
    blockers := blockers || jsonb_build_array(jsonb_build_object('code', 'PENDING_WITHDRAWAL', 'count', v_n));
  END IF;

  -- Alıcı olarak: ödemesi alınmış, henüz teslim edilmemiş siparişler
  SELECT count(*) INTO v_n FROM orders WHERE buyer_id = uid AND status IN ('paid', 'in_print', 'printed', 'shipped');
  IF v_n > 0 THEN
    blockers := blockers || jsonb_build_array(jsonb_build_object('code', 'ACTIVE_BUYER_ORDERS', 'count', v_n));
  END IF;

  -- Yazıcı ortağı olarak: üstlendiği/basmakta olduğu işler
  SELECT count(*) INTO v_n FROM print_jobs WHERE printer_id = uid AND status IN ('claimed', 'printing');
  IF v_n > 0 THEN
    blockers := blockers || jsonb_build_array(jsonb_build_object('code', 'ACTIVE_PRINT_JOBS', 'count', v_n));
  END IF;

  -- Yazıcı ortağı olarak: kargolanmış ama alıcı teslimi onaylamadığı için kazancı henüz yatmamış işler
  SELECT count(*) INTO v_n
    FROM print_jobs j JOIN orders o ON o.id = j.order_id
   WHERE j.printer_id = uid AND j.status = 'done' AND o.status = 'shipped';
  IF v_n > 0 THEN
    blockers := blockers || jsonb_build_array(jsonb_build_object('code', 'AWAITING_DELIVERY_PAYOUT', 'count', v_n));
  END IF;

  -- Tasarımcı olarak: modeli kargodaki bir siparişte (kazanç teslim onayında dağıtılır)
  SELECT count(DISTINCT o.id) INTO v_n
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    JOIN models m ON m.id = oi.model_id
   WHERE m.designer_id = uid AND o.status = 'shipped';
  IF v_n > 0 THEN
    blockers := blockers || jsonb_build_array(jsonb_build_object('code', 'DESIGNER_SHIPPED_ORDERS', 'count', v_n));
  END IF;

  -- Etki: bu tasarımcının modellerini içeren, kargolanmamış ödenmiş siparişler iptal edilecek
  SELECT count(DISTINCT o.id) INTO v_cancel
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    JOIN models m ON m.id = oi.model_id
   WHERE m.designer_id = uid
     AND o.status IN ('paid', 'in_print', 'printed')
     AND o.buyer_id IS DISTINCT FROM uid;

  SELECT count(*) INTO v_models FROM models WHERE designer_id = uid AND is_published;

  RETURN jsonb_build_object('blockers', blockers, 'willCancelOrders', v_cancel, 'willUnpublishModels', v_models);
END $$;

-- ---------- Hazırlık: engel yoksa tek işlemde uygular (auth kullanıcısını sunucu ayrıca siler) ----------
CREATE OR REPLACE FUNCTION account_deletion_prepare(uid UUID, retention_days INT DEFAULT 30) RETURNS JSONB
LANGUAGE plpgsql AS $$
DECLARE
  rep          JSONB;
  affected_ids UUID[];
  v_cancelled  INT := 0;
  v_models     INT := 0;
  v_scrubs     INT := 0;
BEGIN
  PERFORM 1 FROM profiles WHERE id = uid FOR UPDATE;          -- aynı kullanıcı için eşzamanlı çağrıyı sırala
  rep := account_deletion_report(uid);                        -- engelleri işlem İÇİNDE tekrar doğrula
  IF jsonb_array_length(rep->'blockers') > 0 THEN
    RAISE EXCEPTION 'ACCOUNT_DELETION_BLOCKED' USING DETAIL = rep::text;
  END IF;

  -- 1) Tasarımcının modellerini içeren, kargolanmamış ödenmiş siparişler → iptal + iade bekliyor
  SELECT array_agg(DISTINCT o.id) INTO affected_ids
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    JOIN models m ON m.id = oi.model_id
   WHERE m.designer_id = uid
     AND o.status IN ('paid', 'in_print', 'printed')
     AND o.buyer_id IS DISTINCT FROM uid;
  affected_ids := coalesce(affected_ids, '{}');

  UPDATE orders
     SET status = 'cancelled', cancel_reason = 'designer_account_deleted', refund_pending = TRUE
   WHERE id = ANY(affected_ids);
  GET DIAGNOSTICS v_cancelled = ROW_COUNT;

  -- İptal edilen siparişlerin yazıcı işleri havuzdan/yazıcıdan kalkar
  UPDATE print_jobs SET status = 'failed'
   WHERE order_id = ANY(affected_ids) AND status IN ('available', 'claimed', 'printing');

  -- 2) Ödemesi tamamlanmamış (pending) siparişler: kullanıcının kendi siparişleri ve modellerini içerenler → iptal (iade yok)
  UPDATE orders
     SET status = 'cancelled', cancel_reason = 'account_deleted'
   WHERE status = 'pending'
     AND (buyer_id = uid
          OR id IN (SELECT oi.order_id FROM order_items oi JOIN models m ON m.id = oi.model_id WHERE m.designer_id = uid));

  -- 3) Modeller yayından kalkar (silinmez: siparişlerde referansı var)
  UPDATE models SET is_published = FALSE WHERE designer_id = uid AND is_published;
  GET DIAGNOSTICS v_models = ROW_COUNT;

  -- 4) Kullanıcının siparişlerindeki kişisel veriler `retention_days` gün sonra anonimleştirilir
  UPDATE orders
     SET pii_scrub_at = now() + make_interval(days => retention_days)
   WHERE buyer_id = uid AND pii_scrub_at IS NULL AND pii_scrubbed_at IS NULL;
  GET DIAGNOSTICS v_scrubs = ROW_COUNT;

  RETURN jsonb_build_object('cancelledPaidOrders', v_cancelled, 'unpublishedModels', v_models, 'scheduledOrderScrubs', v_scrubs);
END $$;

-- Sadece service-role çağırabilir (anon/authenticated bir uid vererek başkasının siparişini iptal edemesin)
REVOKE ALL ON FUNCTION account_deletion_report(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION account_deletion_prepare(UUID, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION account_deletion_report(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION account_deletion_prepare(UUID, INT) TO service_role;

NOTIFY pgrst, 'reload schema';

-- İade bekleyen siparişleri görmek için (elle):
--   SELECT id, created_at, total_amount, cancel_reason FROM orders WHERE refund_pending ORDER BY created_at;
-- İadeyi ödeme sağlayıcının panelinden yaptıktan sonra:
--   UPDATE orders SET refund_pending = FALSE, status = 'refunded' WHERE id = '<sipariş id>';
