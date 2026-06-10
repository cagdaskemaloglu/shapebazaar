-- ============================================================
-- ShapeBazaar — Initial Database Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT,
  username      TEXT UNIQUE,
  avatar_url    TEXT,
  bio           TEXT,
  role          TEXT NOT NULL DEFAULT 'buyer'
                  CHECK (role IN ('buyer', 'designer', 'printer_partner', 'admin')),
  wallet_balance NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_partner_approved BOOLEAN DEFAULT FALSE,
  partner_requested_at TIMESTAMPTZ,
  city          TEXT,
  phone         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE categories (
  id    SERIAL PRIMARY KEY,
  slug  TEXT UNIQUE NOT NULL,
  name_tr TEXT NOT NULL,
  name_en TEXT NOT NULL,
  icon  TEXT,
  parent_id INT REFERENCES categories(id)
);

INSERT INTO categories (slug, name_tr, name_en, icon) VALUES
  ('home-office', 'Ev & Ofis', 'Home & Office', '🏠'),
  ('accessories', 'Aksesuar', 'Accessories', '🎒'),
  ('technology', 'Teknoloji', 'Technology', '💻'),
  ('art-decor', 'Sanat & Dekor', 'Art & Decor', '🎨'),
  ('garden', 'Bahçe', 'Garden', '🌱'),
  ('toys-games', 'Oyuncak & Oyun', 'Toys & Games', '🎮'),
  ('tools', 'Araç & Gereç', 'Tools & Hardware', '🔧'),
  ('jewelry', 'Takı & Aksesuar', 'Jewelry', '💍');

-- ============================================================
-- MODELS
-- ============================================================
CREATE TABLE models (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  designer_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  category_id   INT REFERENCES categories(id),
  tags          TEXT[] DEFAULT '{}',
  file_url      TEXT NOT NULL,
  file_format   TEXT NOT NULL CHECK (file_format IN ('stl', 'obj', '3mf')),
  file_size_mb  NUMERIC(8,2),
  thumbnail_url TEXT,
  preview_urls  TEXT[] DEFAULT '{}',
  license       TEXT NOT NULL DEFAULT 'standard'
                  CHECK (license IN ('standard', 'multi_print', 'open')),
  base_price    NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_free       BOOLEAN DEFAULT FALSE,
  is_published  BOOLEAN DEFAULT FALSE,
  is_featured   BOOLEAN DEFAULT FALSE,
  print_count   INT DEFAULT 0,
  view_count    INT DEFAULT 0,
  avg_rating    NUMERIC(3,2) DEFAULT 0,
  rating_count  INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MODEL RATINGS
-- ============================================================
CREATE TABLE model_ratings (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_id   UUID REFERENCES models(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  rating     SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (model_id, user_id)
);

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TABLE orders (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  model_id       UUID REFERENCES models(id) ON DELETE SET NULL,
  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','paid','in_print','printed','shipped','delivered','cancelled','refunded')),
  -- print config
  material       TEXT NOT NULL DEFAULT 'PLA',
  color_name     TEXT,
  color_hex      TEXT,
  scale_percent  NUMERIC(5,1) DEFAULT 100,
  custom_notes   TEXT,
  -- pricing
  model_price    NUMERIC(10,2) NOT NULL,
  material_cost  NUMERIC(10,2) DEFAULT 0,
  shipping_cost  NUMERIC(10,2) DEFAULT 25,
  platform_fee   NUMERIC(10,2) DEFAULT 0,
  total_amount   NUMERIC(10,2) NOT NULL,
  -- shipping address
  recipient_name TEXT,
  address_line1  TEXT,
  address_line2  TEXT,
  city           TEXT,
  district       TEXT,
  postal_code    TEXT,
  phone          TEXT,
  -- tracking
  tracking_number TEXT,
  cargo_company   TEXT,
  -- payment
  payment_id      TEXT,
  payment_method  TEXT,
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PRINT JOBS (yazıcı ortağı - sipariş eşleşmesi)
-- ============================================================
CREATE TABLE print_jobs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  printer_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'available'
                    CHECK (status IN ('available','claimed','printing','done','failed')),
  claimed_at      TIMESTAMPTZ,
  printed_at      TIMESTAMPTZ,
  printer_notes   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- WALLET TRANSACTIONS
-- ============================================================
CREATE TABLE wallet_transactions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('earn','spend','refund','admin_adjustment')),
  amount      NUMERIC(10,2) NOT NULL,
  description TEXT,
  ref_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ADDRESSES (saved addresses)
-- ============================================================
CREATE TABLE addresses (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE,
  label         TEXT DEFAULT 'Ev',
  recipient_name TEXT NOT NULL,
  line1         TEXT NOT NULL,
  line2         TEXT,
  city          TEXT NOT NULL,
  district      TEXT,
  postal_code   TEXT,
  phone         TEXT,
  is_default    BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE models ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_ratings ENABLE ROW LEVEL SECURITY;

-- Profiles: public read, self write
CREATE POLICY "profiles_public_read"   ON profiles FOR SELECT USING (TRUE);
CREATE POLICY "profiles_self_update"   ON profiles FOR UPDATE USING (auth.uid() = id);

-- Models: published = public, self manage
CREATE POLICY "models_public_read"     ON models FOR SELECT USING (is_published = TRUE);
CREATE POLICY "models_self_select"     ON models FOR SELECT USING (auth.uid() = designer_id);
CREATE POLICY "models_designer_insert" ON models FOR INSERT WITH CHECK (auth.uid() = designer_id);
CREATE POLICY "models_designer_update" ON models FOR UPDATE USING (auth.uid() = designer_id);
CREATE POLICY "models_designer_delete" ON models FOR DELETE USING (auth.uid() = designer_id);

-- Orders: own orders only
CREATE POLICY "orders_own_read"   ON orders FOR SELECT USING (auth.uid() = buyer_id);
CREATE POLICY "orders_own_insert" ON orders FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "orders_own_update" ON orders FOR UPDATE USING (auth.uid() = buyer_id);

-- Print jobs: available jobs visible to all partners
CREATE POLICY "printjobs_read"   ON print_jobs FOR SELECT USING (TRUE);
CREATE POLICY "printjobs_claim"  ON print_jobs FOR UPDATE USING (
  status = 'available' OR auth.uid() = printer_id
);

-- Wallet: own transactions
CREATE POLICY "wallet_own" ON wallet_transactions FOR SELECT USING (auth.uid() = user_id);

-- Addresses: own
CREATE POLICY "addresses_own_select" ON addresses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "addresses_own_insert" ON addresses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "addresses_own_update" ON addresses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "addresses_own_delete" ON addresses FOR DELETE USING (auth.uid() = user_id);

-- Ratings: public read, own write
CREATE POLICY "ratings_public_read"  ON model_ratings FOR SELECT USING (TRUE);
CREATE POLICY "ratings_own_write"    ON model_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ratings_own_update"   ON model_ratings FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_models_designer      ON models(designer_id);
CREATE INDEX idx_models_category      ON models(category_id);
CREATE INDEX idx_models_published     ON models(is_published, created_at DESC);
CREATE INDEX idx_models_featured      ON models(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_orders_buyer         ON orders(buyer_id);
CREATE INDEX idx_orders_status        ON orders(status);
CREATE INDEX idx_print_jobs_available ON print_jobs(status) WHERE status = 'available';
CREATE INDEX idx_wallet_user          ON wallet_transactions(user_id, created_at DESC);

-- ============================================================
-- RPC FUNCTIONS
-- ============================================================

-- Increment model view count (safe, no auth required)
CREATE OR REPLACE FUNCTION increment_model_views(model_id UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE models SET view_count = view_count + 1 WHERE id = model_id;
$$;

-- Update model avg_rating after a new rating
CREATE OR REPLACE FUNCTION update_model_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE models
  SET
    avg_rating   = (SELECT AVG(rating)   FROM model_ratings WHERE model_id = NEW.model_id),
    rating_count = (SELECT COUNT(*)      FROM model_ratings WHERE model_id = NEW.model_id)
  WHERE id = NEW.model_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_rating_change
  AFTER INSERT OR UPDATE ON model_ratings
  FOR EACH ROW EXECUTE FUNCTION update_model_rating();

-- Wallet balance increment helper
CREATE OR REPLACE FUNCTION increment_wallet(uid UUID, amount NUMERIC)
RETURNS NUMERIC LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE profiles
  SET wallet_balance = wallet_balance + amount
  WHERE id = uid
  RETURNING wallet_balance;
$$;
