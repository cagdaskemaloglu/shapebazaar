"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTranslations, useLocale } from "next-intl";
import { ChevronLeft, Save, CheckCircle, Lock, Layers, Globe } from "lucide-react";

const CATEGORIES = [
  { id: 1, name_tr: "Ev & Ofis",       name_en: "Home & Office"    },
  { id: 2, name_tr: "Aksesuar",        name_en: "Accessories"      },
  { id: 3, name_tr: "Teknoloji",       name_en: "Technology"       },
  { id: 4, name_tr: "Sanat & Dekor",   name_en: "Art & Decor"      },
  { id: 5, name_tr: "Bahçe",           name_en: "Garden"           },
  { id: 6, name_tr: "Oyuncak & Oyun",  name_en: "Toys & Games"     },
  { id: 7, name_tr: "Araç & Gereç",    name_en: "Tools & Hardware" },
  { id: 8, name_tr: "Takı & Aksesuar", name_en: "Jewelry"          },
];
const LICENSES = [
  { value: "standard",    label: "Standart",   desc: "Alıcı yalnızca 1 baskı alabilir.",     icon: Lock   },
  { value: "multi_print", label: "Çoklu Baskı", desc: "Alıcı birden fazla baskı alabilir.",   icon: Layers },
  { value: "open",        label: "Açık",        desc: "Herkes ücretsiz olarak indirebilir.",  icon: Globe  },
] as const;

interface EditableModel {
  id: string;
  title: string;
  title_en: string | null;
  description: string | null;
  description_en: string | null;
  category_id: number | null;
  tags: string[] | null;
  license: "standard" | "multi_print" | "open";
  base_price: number;
  is_free: boolean;
  weight_grams: number | null;
  dimension_x: number | null;
  dimension_y: number | null;
  dimension_z: number | null;
}

export function EditModelClient({ model }: { model: EditableModel }) {
  const router = useRouter();
  const locale = useLocale();

  const [title,          setTitle]          = useState(model.title ?? "");
  const [titleEn,        setTitleEn]        = useState(model.title_en ?? "");
  const [description,    setDescription]    = useState(model.description ?? "");
  const [descriptionEn,  setDescriptionEn]  = useState(model.description_en ?? "");
  const [categoryId,     setCategoryId]     = useState<number | "">(model.category_id ?? "");
  const [license,        setLicense]        = useState(model.license);
  const [isFree,         setIsFree]         = useState(model.is_free);
  const [basePrice,      setBasePrice]      = useState(String(model.base_price ?? ""));
  const [weightGrams,    setWeightGrams]    = useState(String(model.weight_grams ?? ""));
  const [dimensionX,     setDimensionX]     = useState(String(model.dimension_x ?? ""));
  const [dimensionY,     setDimensionY]     = useState(String(model.dimension_y ?? ""));
  const [dimensionZ,     setDimensionZ]     = useState(String(model.dimension_z ?? ""));

  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [saved,   setSaved]   = useState(false);

  const isValid =
    title.trim().length > 2 && titleEn.trim().length > 2 &&
    description.trim().length > 0 && descriptionEn.trim().length > 0 &&
    !!categoryId;

  async function handleSave() {
    if (!isValid) return;
    setSaving(true);
    setError("");

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("models")
      .update({
        title, title_en: titleEn,
        description, description_en: descriptionEn,
        category_id: categoryId || null,
        license,
        is_free: isFree,
        base_price: isFree ? 0 : parseFloat(basePrice) || 0,
        weight_grams: weightGrams ? parseFloat(weightGrams) : null,
        dimension_x: dimensionX ? parseFloat(dimensionX) : null,
        dimension_y: dimensionY ? parseFloat(dimensionY) : null,
        dimension_z: dimensionZ ? parseFloat(dimensionZ) : null,
      })
      .eq("id", model.id);

    if (updateError) {
      setError("Kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.");
    } else {
      setSaved(true);
      setTimeout(() => router.push(`/${locale}/dashboard?tab=uploads`), 1200);
    }
    setSaving(false);
  }

  return (
    <div className="min-h-screen bg-[var(--bg-tertiary)]">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <a href={`/${locale}/dashboard?tab=uploads`} className="inline-flex items-center gap-1.5 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] mb-6 transition-colors">
          <ChevronLeft size={16} /> Modellerime dön
        </a>

        <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-6">Modeli Düzenle</h1>

        <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-6 flex flex-col gap-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[var(--text-tertiary)] block mb-1.5">Model Adı (Türkçe) *</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80}
                className="w-full h-10 px-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none focus:border-[#FF6B35] transition-colors" />
            </div>
            <div>
              <label className="text-xs text-[var(--text-tertiary)] block mb-1.5">Model Name (English) *</label>
              <input type="text" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} maxLength={80}
                className="w-full h-10 px-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none focus:border-[#FF6B35] transition-colors" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[var(--text-tertiary)] block mb-1.5">Açıklama (Türkçe) *</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={1000}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none focus:border-[#FF6B35] transition-colors resize-none" />
            </div>
            <div>
              <label className="text-xs text-[var(--text-tertiary)] block mb-1.5">Description (English) *</label>
              <textarea value={descriptionEn} onChange={(e) => setDescriptionEn(e.target.value)} rows={4} maxLength={1000}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none focus:border-[#FF6B35] transition-colors resize-none" />
            </div>
          </div>

          <div>
            <label className="text-xs text-[var(--text-tertiary)] block mb-1.5">Kategori *</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : "")}
              className="w-full h-10 px-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none focus:border-[#FF6B35] transition-colors cursor-pointer">
              <option value="">Seçiniz</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{locale === "en" ? c.name_en : c.name_tr}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-[var(--text-tertiary)] block mb-2">Lisans</label>
            <div className="grid sm:grid-cols-3 gap-2">
              {LICENSES.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => setLicense(l.value)}
                  className={`text-left p-3 rounded-xl border transition-colors ${
                    license === l.value ? "border-[#FF6B35] bg-[rgba(255,107,53,0.06)]" : "border-[var(--border)] bg-[var(--bg-secondary)]"
                  }`}
                >
                  <l.icon size={16} className={license === l.value ? "text-[#FF6B35]" : "text-[var(--text-tertiary)]"} />
                  <div className="text-sm font-medium text-[var(--text-primary)] mt-1.5">{l.label}</div>
                  <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">{l.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer">
              <input type="checkbox" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} className="accent-[#FF6B35]" />
              Bu model ücretsiz
            </label>
          </div>

          {!isFree && (
            <div>
              <label className="text-xs text-[var(--text-tertiary)] block mb-1.5">Tasarım Fiyatı (₺)</label>
              <input type="number" min="0" step="1" value={basePrice} onChange={(e) => setBasePrice(e.target.value)}
                className="w-full h-10 px-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none focus:border-[#FF6B35] transition-colors" />
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-[var(--text-tertiary)] block mb-1.5">Ağırlık (g)</label>
              <input type="number" min="0" value={weightGrams} onChange={(e) => setWeightGrams(e.target.value)}
                className="w-full h-10 px-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none focus:border-[#FF6B35] transition-colors" />
            </div>
            <div>
              <label className="text-xs text-[var(--text-tertiary)] block mb-1.5">X (mm)</label>
              <input type="number" min="0" value={dimensionX} onChange={(e) => setDimensionX(e.target.value)}
                className="w-full h-10 px-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none focus:border-[#FF6B35] transition-colors" />
            </div>
            <div>
              <label className="text-xs text-[var(--text-tertiary)] block mb-1.5">Y (mm)</label>
              <input type="number" min="0" value={dimensionY} onChange={(e) => setDimensionY(e.target.value)}
                className="w-full h-10 px-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none focus:border-[#FF6B35] transition-colors" />
            </div>
            <div>
              <label className="text-xs text-[var(--text-tertiary)] block mb-1.5">Z (mm)</label>
              <input type="number" min="0" value={dimensionZ} onChange={(e) => setDimensionZ(e.target.value)}
                className="w-full h-10 px-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none focus:border-[#FF6B35] transition-colors" />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={!isValid || saving}
            className="w-full h-11 flex items-center justify-center gap-2 bg-[#FF6B35] text-white rounded-xl font-medium text-sm hover:bg-[#e85e2a] disabled:opacity-40 transition-colors"
          >
            {saved ? <><CheckCircle size={16} /> Kaydedildi!</> : saving ? "Kaydediliyor…" : <><Save size={16} /> Değişiklikleri Kaydet</>}
          </button>
        </div>
      </div>
    </div>
  );
}
