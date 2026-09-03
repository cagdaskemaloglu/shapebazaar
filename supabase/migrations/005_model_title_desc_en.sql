-- Modellere İngilizce başlık/açıklama alanları ekler.
-- Mevcut `title` / `description` kolonları Türkçe içerik olarak kalır.
-- Yeni yüklenen modellerde her iki dil de zorunludur (uygulama katmanında,
-- upload formunda doğrulanır); eski kayıtlarda title_en/description_en NULL
-- olabilir — arayüz bu durumda Türkçe metne geri döner (fallback).

ALTER TABLE models
  ADD COLUMN IF NOT EXISTS title_en TEXT,
  ADD COLUMN IF NOT EXISTS description_en TEXT;

COMMENT ON COLUMN models.title IS 'Model adı (Türkçe)';
COMMENT ON COLUMN models.title_en IS 'Model adı (İngilizce)';
COMMENT ON COLUMN models.description IS 'Model açıklaması (Türkçe)';
COMMENT ON COLUMN models.description_en IS 'Model açıklaması (İngilizce)';
