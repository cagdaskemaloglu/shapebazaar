"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Star, TrendingUp, Sparkles, Grid3X3, List, ChevronDown, Box, Camera } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { fetchModels as fetchModelsApi } from "@/lib/models";
import { buildPrintPhotoUrl } from "@shapebazaar/shared";
import { formatPrice } from "@/lib/utils";

const SORT_VALUES = ["popular", "newest", "price_asc", "price_desc", "rating"];
const MAX_PRICE = 500;
const PRICE_STEP = 10;

interface Category {
  id: number;
  name_tr: string;
  name_en: string | null;
}

interface Model {
  id: string;
  title: string;
  title_en: string | null;
  base_price: number;
  is_free: boolean;
  thumbnail_url: string | null;
  avg_rating: number;
  rating_count: number;
  print_count: number;
  created_at: string;
  file_format: string;
  showcase_thumb_path?: string | null;
  designer: { full_name: string | null; username: string | null } | null;
  category: { name_tr: string; name_en: string } | null;
}

export function ModelsPageClient() {
  const PAGE_SIZE = 24;

  const t      = useTranslations("modelsPage");
  const locale = useLocale();
  const [search,     setSearch]     = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [sort,       setSort]       = useState("popular");
  const [view,       setView]       = useState<"grid" | "list">("grid");
  const [models,     setModels]     = useState<Model[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);

  // Uygulanan fiyat aralığı (sorguya giden)
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(MAX_PRICE);
  // Slider açıkken kullanılan taslak değerler (Uygula'ya basılana kadar sorguya gitmez)
  const [draftMin, setDraftMin] = useState(0);
  const [draftMax, setDraftMax] = useState(MAX_PRICE);
  const [priceOpen, setPriceOpen] = useState(false);
  const priceRef = useRef<HTMLDivElement>(null);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Fiyat popover'ının dışına tıklanınca kapat
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (priceRef.current && !priceRef.current.contains(e.target as Node)) {
        setPriceOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const priceLabel =
    priceMin === 0 && priceMax === MAX_PRICE
      ? t("price")
      : `${priceMin === 0 ? t("free") : formatPrice(priceMin, locale)} – ${priceMax >= MAX_PRICE ? `${formatPrice(priceMax, locale)}${t("andUp")}` : formatPrice(priceMax, locale)}`;

  // Kategorileri bir kez çek
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("categories")
      .select("id, name_tr, name_en")
      .order("name_tr")
      .then(({ data }) => {
        if (data) setCategories(data as Category[]);
      });
  }, []);

  const loadModels = useCallback(async () => {
    setLoading(true);
    try {
      const { data, count } = await fetchModelsApi({
        search, categoryId,
        priceMin: priceMin > 0 ? priceMin : undefined,
        priceMax: priceMax < MAX_PRICE ? priceMax : undefined,
        sort: sort as "popular" | "newest" | "price_asc" | "price_desc" | "rating",
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
        withCount: true,
      });
      setModels(data as unknown as Model[]);
      setTotal(count);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [search, categoryId, sort, page, priceMin, priceMax]);

  // Filtre veya arama değişince 1. sayfaya dön
  useEffect(() => { setPage(1); }, [search, categoryId, sort, priceMin, priceMax]);

  useEffect(() => {
    const timer = setTimeout(loadModels, 300);
    return () => clearTimeout(timer);
  }, [loadModels]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">{t("title")}</h1>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          {loading ? t("loading") : t("found", { count: total })}
        </p>
      </div>

      {/* Search + controls */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            type="text"
            placeholder={t("search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none focus:border-[#FF6B35] transition-colors placeholder:text-[var(--text-tertiary)]"
          />
        </div>

        {/* Kategori dropdown */}
        <select
          value={categoryId ?? ""}
          onChange={(e) => setCategoryId(e.target.value === "" ? null : Number(e.target.value))}
          className="h-10 px-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none focus:border-[#FF6B35] transition-colors cursor-pointer max-w-[160px]"
        >
          <option value="">{t("all")}</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {locale === "en" && cat.name_en ? cat.name_en : cat.name_tr}
            </option>
          ))}
        </select>

        {/* Fiyat dropdown — slider */}
        <div className="relative" ref={priceRef}>
          <button
            type="button"
            onClick={() => {
              if (!priceOpen) { setDraftMin(priceMin); setDraftMax(priceMax); }
              setPriceOpen((o) => !o);
            }}
            className={`h-10 px-3 flex items-center gap-1.5 text-sm rounded-xl border transition-colors cursor-pointer whitespace-nowrap ${
              priceMin > 0 || priceMax < MAX_PRICE
                ? "border-[#FF6B35] text-[#FF6B35] bg-[rgba(255,107,53,0.06)]"
                : "border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)]"
            }`}
          >
            {priceLabel}
            <ChevronDown size={14} className={`transition-transform ${priceOpen ? "rotate-180" : ""}`} />
          </button>

          {priceOpen && (
            <div className="absolute z-20 top-12 left-0 w-72 bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl shadow-lg p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-4">{t("price")}</div>

              <div className="flex items-center justify-between text-sm text-[var(--text-primary)] font-medium mb-3">
                <span>{draftMin === 0 ? t("free") : formatPrice(draftMin, locale)}</span>
                <span>{draftMax >= MAX_PRICE ? `${formatPrice(draftMax, locale)}${t("andUp")}` : formatPrice(draftMax, locale)}</span>
              </div>

              <div className="relative h-4 flex items-center mb-4">
                <div className="absolute inset-x-0 h-1.5 rounded-full bg-[var(--bg-tertiary)]" />
                <div
                  className="absolute h-1.5 rounded-full bg-[#FF6B35]"
                  style={{
                    left: `${(draftMin / MAX_PRICE) * 100}%`,
                    right: `${100 - (draftMax / MAX_PRICE) * 100}%`,
                  }}
                />
                <input
                  type="range"
                  min={0}
                  max={MAX_PRICE}
                  step={PRICE_STEP}
                  value={draftMin}
                  onChange={(e) => setDraftMin(Math.min(Number(e.target.value), draftMax - PRICE_STEP))}
                  className="dual-range absolute inset-x-0 w-full h-4"
                />
                <input
                  type="range"
                  min={0}
                  max={MAX_PRICE}
                  step={PRICE_STEP}
                  value={draftMax}
                  onChange={(e) => setDraftMax(Math.max(Number(e.target.value), draftMin + PRICE_STEP))}
                  className="dual-range absolute inset-x-0 w-full h-4"
                />
              </div>

              {/* Hızlı işaretler */}
              <div className="flex justify-between text-[10px] text-[var(--text-tertiary)] mb-4">
                <span>{t("free")}</span>
                <span>{formatPrice(100, locale)}</span>
                <span>{formatPrice(250, locale)}</span>
                <span>{formatPrice(MAX_PRICE, locale)}{t("andUp")}</span>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setDraftMin(0); setDraftMax(MAX_PRICE); }}
                  className="flex-1 h-9 text-sm rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
                >
                  {t("reset")}
                </button>
                <button
                  type="button"
                  onClick={() => { setPriceMin(draftMin); setPriceMax(draftMax); setPriceOpen(false); }}
                  className="flex-1 h-9 text-sm rounded-xl bg-[#FF6B35] text-white font-medium hover:bg-[#e85e2a] transition-colors"
                >
                  {t("apply")}
                </button>
              </div>
            </div>
          )}
        </div>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="h-10 px-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none focus:border-[#FF6B35] transition-colors cursor-pointer"
        >
          {SORT_VALUES.map((v) => (
            <option key={v} value={v}>{t(`sort.${v === "price_asc" ? "priceAsc" : v === "price_desc" ? "priceDesc" : v}`)}</option>
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

      {/* Grid */}
      <div>
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
              <p className="text-sm">{t("noResults")}</p>
              <button onClick={() => { setSearch(""); setCategoryId(null); setPriceMin(0); setPriceMax(MAX_PRICE); }} className="text-sm text-[#FF6B35] hover:underline mt-2">
                {t("clearFilters")}
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8 flex-wrap">
              <button
                onClick={() => { setPage((p) => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                disabled={page === 1}
                className="h-9 px-4 text-sm rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← {t("prev")}
              </button>

              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce<(number | "…")[]>((acc, p, i, arr) => {
                    if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push("…");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === "…" ? (
                      <span key={`e${i}`} className="h-9 w-9 flex items-center justify-center text-sm text-[var(--text-tertiary)]">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => { setPage(p as number); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        className={`h-9 w-9 text-sm rounded-xl transition-colors ${
                          page === p
                            ? "bg-[#FF6B35] text-white font-medium"
                            : "border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
              </div>

              <button
                onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                disabled={page === totalPages}
                className="h-9 px-4 text-sm rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {t("next")} →
              </button>
            </div>
          )}
          {totalPages > 1 && (
            <p className="text-center text-xs text-[var(--text-tertiary)] mt-2">
              {t("pageInfo", { current: page, total: totalPages })}
            </p>
          )}
      </div>
    </div>
  );
}

function GridCard({ model }: { model: Model }) {
  const t      = useTranslations("modelsPage");
  const locale = useLocale();
  const title  = locale === "en" && model.title_en ? model.title_en : model.title;
  const designer = model.designer?.username
    ? `@${model.designer.username}`
    : model.designer?.full_name ?? t("designer");
  const tp = useTranslations("printPhotos");

  // Admin'in seçtiği vitrin baskı fotoğrafı (yoksa kart eskisi gibi, buton görünmez)
  const showcaseUrl = model.showcase_thumb_path
    ? buildPrintPhotoUrl(process.env.NEXT_PUBLIC_SUPABASE_URL!, model.showcase_thumb_path)
    : null;
  const [flipped, setFlipped] = useState(false);

  function toggleFlip(e: React.MouseEvent) {
    e.preventDefault();   // kart bir <a>: butona basmak sayfaya gitmesin
    e.stopPropagation();
    setFlipped((f) => !f);
  }

  return (
    <a href={`/${locale}/models/${model.id}`} className="group block">
      <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl overflow-hidden hover:border-[var(--border-strong)] hover:shadow-sm transition-all duration-200">
        <div className="h-36 relative" style={{ perspective: "900px" }}>
          <div
            className="absolute inset-0 transition-transform duration-500 ease-in-out motion-reduce:transition-none"
            style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "none" }}
          >
            {/* Ön yüz: 3D model görseli */}
            <div
              className="absolute inset-0 bg-[var(--bg-tertiary)] flex items-center justify-center overflow-hidden"
              style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
            >
              {model.thumbnail_url ? (
                <img src={model.thumbnail_url} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              ) : (
                <ModelIcon />
              )}
              {model.print_count > 50 && (
                <div className="absolute bottom-2 left-2">
                  <span className="text-[10px] font-medium bg-[rgba(255,107,53,0.12)] text-[#FF6B35] px-2 py-0.5 rounded-full flex items-center gap-1">
                    <TrendingUp size={9} /> {t("trend")}
                  </span>
                </div>
              )}
              {isNew(model.created_at) && (
                <div className="absolute bottom-2 left-2">
                  <span className="text-[10px] font-medium bg-[rgba(16,185,129,0.12)] text-[#10B981] px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles size={9} /> {t("new")}
                  </span>
                </div>
              )}
              {model.is_free && (
                <div className="absolute top-2 right-2">
                  <span className="text-[10px] font-medium bg-[rgba(16,185,129,0.12)] text-[#10B981] px-2 py-0.5 rounded-full">{t("free")}</span>
                </div>
              )}
            </div>
            {/* Arka yüz: gerçek baskı fotoğrafı */}
            {showcaseUrl && (
              <div
                className="absolute inset-0 bg-[var(--bg-tertiary)] overflow-hidden"
                style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
              >
                <img src={showcaseUrl} alt="" className="w-full h-full object-cover" />
                <span className="absolute bottom-2 left-2 text-[10px] font-medium bg-black/55 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Camera size={9} /> {tp("realPrint")}
                </span>
              </div>
            )}
          </div>

          {/* Sol üst buton: önce mini baskı fotoğrafı; çevrildikten sonra "3D'ye dön" butonu */}
          {showcaseUrl && (
            <button
              type="button"
              onClick={toggleFlip}
              aria-label={flipped ? tp("cardShow3d") : tp("cardShowPhoto")}
              title={flipped ? tp("cardShow3d") : tp("cardShowPhoto")}
              className="absolute top-2 left-2 z-10 shadow-md transition-transform hover:scale-105 active:scale-95"
            >
              {flipped ? (
                <span className="h-9 px-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-strong)] text-[var(--text-primary)] text-xs font-semibold flex items-center gap-1.5">
                  <Box size={14} className="text-[#FF6B35]" /> {tp("label3d")}
                </span>
              ) : (
                <img src={showcaseUrl} alt="" className="w-9 h-9 rounded-lg object-cover border-2 border-white" />
              )}
            </button>
          )}
        </div>
        <div className="p-3">
          <div className="text-xs text-[var(--text-tertiary)] mb-0.5">{designer}</div>
          <div className="font-medium text-sm text-[var(--text-primary)] truncate mb-2">{title}</div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[#FF6B35]">
              {model.is_free ? t("free") : formatPrice(model.base_price, locale)}
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
  const t      = useTranslations("modelsPage");
  const locale = useLocale();
  const title  = locale === "en" && model.title_en ? model.title_en : model.title;
  const designer = model.designer?.username
    ? `@${model.designer.username}`
    : model.designer?.full_name ?? t("designer");

  return (
    <a href={`/${locale}/models/${model.id}`} className="group block">
      <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-4 flex items-center gap-4 hover:border-[var(--border-strong)] transition-all">
        <div className="w-16 h-16 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center shrink-0 overflow-hidden">
          {model.thumbnail_url
            ? <img src={model.thumbnail_url} alt={title} className="w-full h-full object-cover" />
            : <ModelIcon />
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-[var(--text-primary)] truncate">{title}</div>
          <div className="text-xs text-[var(--text-tertiary)] mt-0.5">{designer} · {locale === "en" ? model.category?.name_en : model.category?.name_tr}</div>
          {model.rating_count > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <Star size={10} fill="currentColor" className="text-amber-400" />
              <span className="text-xs text-[var(--text-tertiary)]">{Number(model.avg_rating).toFixed(1)} ({model.rating_count})</span>
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="font-semibold text-[#FF6B35]">{model.is_free ? t("free") : formatPrice(model.base_price, locale)}</div>
          <div className="text-xs text-[var(--text-tertiary)] mt-0.5">{model.print_count} {t("prints")}</div>
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