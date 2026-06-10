"use client";
import { useState, useEffect, useCallback } from "react";
import { Search, SlidersHorizontal, Star, TrendingUp, Sparkles, Grid3X3, List } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/utils";

const CATEGORIES = [
  { slug: "all",         label: "Tümü"         },
  { slug: "Ev & Ofis",  label: "Ev & Ofis"    },
  { slug: "Aksesuar",   label: "Aksesuar"      },
  { slug: "Teknoloji",  label: "Teknoloji"     },
  { slug: "Sanat & Dekor", label: "Sanat & Dekor" },
  { slug: "Bahçe",      label: "Bahçe"         },
  { slug: "Araç & Gereç", label: "Araç & Gereç" },
  { slug: "Oyuncak",    label: "Oyuncak"       },
];

const SORT_OPTIONS = [
  { value: "popular",    label: "En Popüler"             },
  { value: "newest",     label: "En Yeni"                },
  { value: "price_asc",  label: "Fiyat: Düşük → Yüksek" },
  { value: "price_desc", label: "Fiyat: Yüksek → Düşük" },
  { value: "rating",     label: "En Yüksek Puan"         },
];

interface Model {
  id: string;
  title: string;
  base_price: number;
  is_free: boolean;
  thumbnail_url: string | null;
  avg_rating: number;
  rating_count: number;
  print_count: number;
  created_at: string;
  file_format: string;
  designer: { full_name: string | null; username: string | null } | null;
  category: { name_tr: string } | null;
}

export function ModelsPageClient() {
  const [search,   setSearch]   = useState("");
  const [category, setCategory] = useState("all");
  const [sort,     setSort]     = useState("popular");
  const [view,     setView]     = useState<"grid" | "list">("grid");
  const [models,   setModels]   = useState<Model[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [total,    setTotal]    = useState(0);

  const fetchModels = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    let query = supabase
      .from("models")
      .select(`
        id, title, base_price, is_free, thumbnail_url,
        avg_rating, rating_count, print_count, created_at, file_format,
        designer:profiles(full_name, username),
        category:categories(name_tr)
      `, { count: "exact" })
      .eq("is_published", true);

    if (search.trim()) {
      query = query.ilike("title", `%${search.trim()}%`);
    }
    if (category !== "all") {
      query = query.eq("categories.name_tr", category);
    }

    if (sort === "popular")    query = query.order("print_count", { ascending: false });
    if (sort === "newest")     query = query.order("created_at",  { ascending: false });
    if (sort === "price_asc")  query = query.order("base_price",  { ascending: true  });
    if (sort === "price_desc") query = query.order("base_price",  { ascending: false });
    if (sort === "rating")     query = query.order("avg_rating",  { ascending: false });

    const { data, count, error } = await query.limit(48);

    if (!error) {
      setModels((data ?? []) as unknown as Model[]);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }, [search, category, sort]);

  useEffect(() => {
    const t = setTimeout(fetchModels, 300);
    return () => clearTimeout(t);
  }, [fetchModels]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">3D Modeller</h1>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          {loading ? "Yükleniyor…" : `${total} model bulundu`}
        </p>
      </div>

      {/* Search + controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            type="text"
            placeholder="Model ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none focus:border-[#FF6B35] transition-colors placeholder:text-[var(--text-tertiary)]"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="h-10 px-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none focus:border-[#FF6B35] transition-colors cursor-pointer"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <div className="flex gap-1 border border-[var(--border)] rounded-xl p-1">
          <button
            onClick={() => setView("grid")}
            className={`p-1.5 rounded-lg transition-colors ${view === "grid" ? "bg-[rgba(255,107,53,0.1)] text-[#FF6B35]" : "text-[var(--text-tertiary)]"}`}
          ><Grid3X3 size={16} /></button>
          <button
            onClick={() => setView("list")}
            className={`p-1.5 rounded-lg transition-colors ${view === "list" ? "bg-[rgba(255,107,53,0.1)] text-[#FF6B35]" : "text-[var(--text-tertiary)]"}`}
          ><List size={16} /></button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <aside className="hidden md:block w-48 shrink-0">
          <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-3">Kategori</div>
            <div className="flex flex-col gap-0.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c.slug}
                  onClick={() => setCategory(c.slug)}
                  className={`text-left text-sm px-2.5 py-1.5 rounded-lg transition-colors ${
                    category === c.slug
                      ? "bg-[rgba(255,107,53,0.1)] text-[#FF6B35] font-medium"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="border-t border-[var(--border)] mt-4 pt-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-3">Fiyat</div>
              <div className="flex flex-col gap-2">
                {["Ücretsiz", "₺0–₺100", "₺100–₺250", "₺250+"].map((p) => (
                  <label key={p} className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer">
                    <input type="checkbox" className="accent-[#FF6B35]" />
                    {p}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Grid */}
        <div className="flex-1">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl overflow-hidden animate-pulse">
                  <div className="h-36 bg-[var(--bg-tertiary)]" />
                  <div className="p-3 flex flex-col gap-2">
                    <div className="h-3 bg-[var(--bg-tertiary)] rounded w-3/4" />
                    <div className="h-3 bg-[var(--bg-tertiary)] rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : models.length === 0 ? (
            <div className="text-center py-20 text-[var(--text-tertiary)]">
              <Search size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Arama kriterlerinize uygun model bulunamadı.</p>
              <button onClick={() => { setSearch(""); setCategory("all"); }} className="text-sm text-[#FF6B35] hover:underline mt-2">
                Filtreleri temizle
              </button>
            </div>
          ) : view === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {models.map((m) => <GridCard key={m.id} model={m} />)}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {models.map((m) => <ListCard key={m.id} model={m} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GridCard({ model }: { model: Model }) {
  const designer = model.designer?.username
    ? `@${model.designer.username}`
    : model.designer?.full_name ?? "Tasarımcı";

  return (
    <a href={`/models/${model.id}`} className="group block">
      <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl overflow-hidden hover:border-[var(--border-strong)] hover:shadow-sm transition-all duration-200">
        <div className="h-36 bg-[var(--bg-tertiary)] flex items-center justify-center relative overflow-hidden">
          {model.thumbnail_url ? (
            <img src={model.thumbnail_url} alt={model.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <ModelIcon />
          )}
          {model.print_count > 50 && (
            <div className="absolute top-2 left-2">
              <span className="text-[10px] font-medium bg-[rgba(255,107,53,0.12)] text-[#FF6B35] px-2 py-0.5 rounded-full flex items-center gap-1">
                <TrendingUp size={9} /> Trend
              </span>
            </div>
          )}
          {isNew(model.created_at) && (
            <div className="absolute top-2 left-2">
              <span className="text-[10px] font-medium bg-[rgba(16,185,129,0.12)] text-[#10B981] px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles size={9} /> Yeni
              </span>
            </div>
          )}
          {model.is_free && (
            <div className="absolute top-2 right-2">
              <span className="text-[10px] font-medium bg-[rgba(16,185,129,0.12)] text-[#10B981] px-2 py-0.5 rounded-full">Ücretsiz</span>
            </div>
          )}
        </div>
        <div className="p-3">
          <div className="text-xs text-[var(--text-tertiary)] mb-0.5">{designer}</div>
          <div className="font-medium text-sm text-[var(--text-primary)] truncate mb-2">{model.title}</div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[#FF6B35]">
              {model.is_free ? "Ücretsiz" : formatPrice(model.base_price)}
            </span>
            {model.rating_count > 0 && (
              <span className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
                <Star size={10} fill="currentColor" className="text-amber-400" />
                {Number(model.avg_rating).toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </div>
    </a>
  );
}

function ListCard({ model }: { model: Model }) {
  const designer = model.designer?.username
    ? `@${model.designer.username}`
    : model.designer?.full_name ?? "Tasarımcı";

  return (
    <a href={`/models/${model.id}`} className="group block">
      <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-4 flex items-center gap-4 hover:border-[var(--border-strong)] transition-all">
        <div className="w-16 h-16 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center shrink-0 overflow-hidden">
          {model.thumbnail_url
            ? <img src={model.thumbnail_url} alt={model.title} className="w-full h-full object-cover" />
            : <ModelIcon />
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-[var(--text-primary)] truncate">{model.title}</div>
          <div className="text-xs text-[var(--text-tertiary)] mt-0.5">{designer} · {model.category?.name_tr}</div>
          {model.rating_count > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <Star size={10} fill="currentColor" className="text-amber-400" />
              <span className="text-xs text-[var(--text-tertiary)]">{Number(model.avg_rating).toFixed(1)} ({model.rating_count})</span>
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="font-semibold text-[#FF6B35]">{model.is_free ? "Ücretsiz" : formatPrice(model.base_price)}</div>
          <div className="text-xs text-[var(--text-tertiary)] mt-0.5">{model.print_count} baskı</div>
        </div>
      </div>
    </a>
  );
}

function ModelIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="text-[var(--text-tertiary)] opacity-30">
      <path d="M16 3L29 10V22L16 29L3 22V10L16 3Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
      <path d="M16 3V29M3 10L16 17L29 10" stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 2"/>
    </svg>
  );
}

function isNew(dateStr: string) {
  const d = new Date(dateStr);
  const diff = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
  return diff < 14;
}
