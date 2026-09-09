-- ============================================================
-- BÖLÜM 1 — order_items tablosunu migration geçmişine kaydet
-- ============================================================
-- NEDEN: `order_items` tablosu uygulama kodunda (payment/init,
-- payment/callback, dashboard, partner/jobs, admin/dashboard-data vb.)
-- yoğun şekilde kullanılıyor ama hiçbir migration dosyasında
-- tanımlı değildi — muhtemelen Supabase panelinden elle eklenmiş.
-- Bu satır bu tablo zaten canlıda mevcutsa hiçbir şey yapmaz
-- (IF NOT EXISTS), ama migration'lar sıfırdan çalıştırıldığında
-- (yeni bir ortam kurulumunda) artık şema eksiksiz olur.
CREATE TABLE IF NOT EXISTS order_items (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id       UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  model_id       UUID REFERENCES models(id) ON DELETE SET NULL,
  model_title    TEXT,
  material       TEXT,
  color_name     TEXT,
  color_hex      TEXT,
  scale_percent  NUMERIC(5,1) DEFAULT 100,
  infill         TEXT,
  model_price    NUMERIC(10,2) DEFAULT 0,
  print_cost     NUMERIC(10,2) DEFAULT 0,
  item_total     NUMERIC(10,2) DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_model ON order_items(model_id);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Alıcı kendi siparişinin item'larını görebilir.
DROP POLICY IF EXISTS "order_items_buyer_read" ON order_items;
CREATE POLICY "order_items_buyer_read" ON order_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND o.buyer_id = auth.uid()
  ));

-- Tasarımcı, kendi modelini içeren item'ları görebilir (kazanç takibi için).
DROP POLICY IF EXISTS "order_items_designer_read" ON order_items;
CREATE POLICY "order_items_designer_read" ON order_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM models m WHERE m.id = order_items.model_id AND m.designer_id = auth.uid()
  ));

-- Yazma işlemleri sadece service-role (admin client) ile yapılır;
-- ödeme/callback route'ları zaten admin client kullanıyor, bu yüzden
-- ayrıca bir INSERT/UPDATE policy tanımlanmıyor (RLS varsayılan olarak reddeder).

-- ============================================================
-- BÖLÜM 2 — model_ratings: satın alma şartı olmadan herkes
-- puan/yorum bırakabiliyordu. Artık sadece o modeli içeren,
-- kargolanmış/teslim edilmiş bir siparişi olan kullanıcılar
-- değerlendirme yapabilir.
-- ============================================================
DROP POLICY IF EXISTS "ratings_own_write" ON model_ratings;
CREATE POLICY "ratings_own_write" ON model_ratings FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.model_id = model_ratings.model_id
        AND o.buyer_id  = auth.uid()
        AND o.status IN ('shipped', 'delivered')
    )
  );

-- NOT: "ratings_own_update" politikası bilerek değiştirilmedi —
-- bir satır zaten INSERT anında bu kontrolden geçmiş olmalı,
-- sahibi daha sonra sadece kendi yorumunu düzenleyebilir.
