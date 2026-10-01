// Ana sayfa ve Ara sekmesinin ortak filtre/sıralama seçenekleri.

export const PRICE_PRESETS = [
  { key: "all",  labelTr: "Tümü",      labelEn: "All",        min: undefined, max: undefined },
  { key: "free", labelTr: "Ücretsiz",  labelEn: "Free",       min: undefined, max: 0 },
  { key: "u100", labelTr: "₺100 altı", labelEn: "Under ₺100", min: undefined, max: 100 },
  { key: "u250", labelTr: "₺250 altı", labelEn: "Under ₺250", min: undefined, max: 250 },
] as const;

export type PricePresetKey = (typeof PRICE_PRESETS)[number]["key"];

// `fetchModels`'in `sort` seçenekleriyle birebir aynı anahtarlar
export const SORT_OPTIONS = [
  { key: "popular",    labelTr: "En Popüler",      labelEn: "Most Popular" },
  { key: "newest",     labelTr: "En Yeni",         labelEn: "Newest" },
  { key: "price_asc",  labelTr: "Fiyat: Düşük → Yüksek", labelEn: "Price: Low → High" },
  { key: "price_desc", labelTr: "Fiyat: Yüksek → Düşük", labelEn: "Price: High → Low" },
  { key: "rating",     labelTr: "En Yüksek Puan",  labelEn: "Top Rated" },
] as const;

export type SortKey = (typeof SORT_OPTIONS)[number]["key"];
