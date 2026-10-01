/**
 * Bu sabitler daha önce ModelDetailClient.tsx, FeaturedViewer.tsx,
 * UploadPageClient.tsx ve EditModelClient.tsx içinde ayrı ayrı tanımlıydı.
 * Artık tek kaynak burası — hem web hem mobile buradan import eder.
 */

export const CATEGORIES = [
  { id: 1, name_tr: "Ev & Ofis",       name_en: "Home & Office"    },
  { id: 2, name_tr: "Aksesuar",        name_en: "Accessories"      },
  { id: 3, name_tr: "Teknoloji",       name_en: "Technology"       },
  { id: 4, name_tr: "Sanat & Dekor",   name_en: "Art & Decor"      },
  { id: 5, name_tr: "Bahçe",           name_en: "Garden"           },
  { id: 6, name_tr: "Oyuncak & Oyun",  name_en: "Toys & Games"     },
  { id: 7, name_tr: "Araç & Gereç",    name_en: "Tools & Hardware" },
  { id: 8, name_tr: "Takı & Aksesuar", name_en: "Jewelry"          },
] as const;

export const MATERIALS = ["PLA", "PETG", "ABS", "TPU", "Reçine"] as const;

// NOT: `border` alanı HER öğede (true/false olarak) açıkça belirtiliyor —
// bazı öğelerde olup bazılarında olmaması, TypeScript'in union tipini
// tutarsız hale getirip "Property 'border' does not exist" hatasına
// yol açıyordu (mobile'da tespit edildi).
export const COLORS = [
  { name: "Lacivert", hex: "#1E3A8A", border: false },
  { name: "Turuncu",  hex: "#FF6B35", border: false },
  { name: "Yeşil",    hex: "#10B981", border: false },
  { name: "Beyaz",    hex: "#FFFFFF", border: true  },
  { name: "Kırmızı",  hex: "#E24B4A", border: false },
  { name: "Sarı",     hex: "#FBBF24", border: false },
] as const;

export const SCALES = ["50%", "75%", "100%", "150%", "Özel"] as const;

export const INFILLS = [
  "15% (Hafif)",
  "25% (Standart)",
  "40% (Sağlam)",
  "80% (Masif)",
] as const;

/** Dolgu değerinin görünen etiketini çevirmek için anahtar eşlemesi. */
export const INFILL_LABEL_KEY: Record<string, string> = {
  "15% (Hafif)":    "light",
  "25% (Standart)": "standard",
  "40% (Sağlam)":   "solid",
  "80% (Masif)":    "dense",
};

export const LICENSES = [
  { value: "standard",    labelKey: "licenseStandard" },
  { value: "multi_print", labelKey: "licenseMulti"    },
  { value: "open",        labelKey: "licenseOpen"     },
] as const;