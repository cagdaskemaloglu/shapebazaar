"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Star, TrendingUp, Sparkles, Box } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/utils";

interface DBModel {
  id: string;
  title: string;
  base_price: number;
  is_free: boolean;
  avg_rating: number;
  rating_count: number;
  print_count: number;
  created_at: string;
  thumbnail_url: string | null;
  designer: {
    username: string | null;
    full_name: string | null;
  } | null;
}

// Yeni modeller (son 7 gün) "new", çok baskılananlar (50+) "hot" badge alır
function getBadge(model: DBModel): "hot" | "new" | null {
  if (model.print_count >= 50) return "hot";
  const ageMs = Date.now() - new Date(model.created_at).getTime();
  if (ageMs < 7 * 24 * 60 * 60 * 1000) return "new";
  return null;
}

export function ModelGrid() {
  const t        = useTranslations("models");
  const pathname = usePathname();
  const locale   = pathname.split("/")[1] || "tr";

  const [models,  setModels]  = useState<DBModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchModels() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("models")
        .select(`
          id, title, base_price, is_free,
          avg_rating, rating_count, print_count,
          created_at, thumbnail_url,
          designer:profiles(username, full_name)
        `)
        .order("print_count", { ascending: false })
        .limit(6);

      if (!error && data) setModels(data as unknown as DBModel[]);
      setLoading(false);
    }
    fetchModels();
  }, []);

  return (
    <section className="py-12 border-b border-[var(--border)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-baseline justify-between mb-8">
          <div>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">{t("title")}</h2>
            <p className="text-sm text-[var(--text-tertiary)] mt-1">{t("subtitle")}</p>
          </div>
          <Link href={`/${locale}/models`} className="text-sm text-[#FF6B35] hover:underline">
            {t("viewAll")} →
          </Link>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-[var(--border)] overflow-hidden animate-pulse">
                <div className="h-40 bg-[var(--bg-tertiary)]" />
                <div className="p-3.5 flex flex-col gap-2">
                  <div className="h-3.5 bg-[var(--bg-tertiary)] rounded w-4/5" />
                  <div className="h-3 bg-[var(--bg-tertiary)] rounded w-2/5" />
                  <div className="h-3.5 bg-[var(--bg-tertiary)] rounded w-3/5 mt-1" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && models.length === 0 && (
          <div className="text-center py-16 text-[var(--text-tertiary)]">
            <Box size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">{t("noModels")}</p>
          </div>
        )}

        {/* Grid */}
        {!loading && models.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {models.map((m) => {
              const badge       = getBadge(m);
              const designerTag = m.designer?.username
                ? `@${m.designer.username}`
                : m.designer?.full_name ?? t("designer");

              return (
                <Link key={m.id} href={`/${locale}/models/${m.id}`} className="group block">
                  <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl overflow-hidden hover:border-[var(--border-strong)] hover:shadow-sm transition-all duration-200">

                    {/* Thumbnail */}
                    <div className="h-40 bg-[var(--bg-tertiary)] flex items-center justify-center relative overflow-hidden">
                      {m.thumbnail_url ? (
                        <img
                          src={m.thumbnail_url}
                          alt={m.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="text-[var(--text-tertiary)] opacity-40">
                          <path d="M16 3L29 10V22L16 29L3 22V10L16 3Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                          <path d="M16 3V29M3 10L16 17L29 10" stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 2"/>
                        </svg>
                      )}

                      {badge && (
                        <div className="absolute top-2.5 left-2.5">
                          {badge === "hot"
                            ? <span className="text-[10px] font-medium bg-[rgba(255,107,53,0.12)] text-[#FF6B35] px-2 py-0.5 rounded-full flex items-center gap-1 backdrop-blur-sm"><TrendingUp size={9}/>{t("trend")}</span>
                            : <span className="text-[10px] font-medium bg-[rgba(16,185,129,0.12)] text-[#10B981] px-2 py-0.5 rounded-full flex items-center gap-1 backdrop-blur-sm"><Sparkles size={9}/>{t("new")}</span>
                          }
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-3.5">
                      <div className="font-medium text-sm text-[var(--text-primary)] mb-1 truncate">{m.title}</div>
                      <div className="text-xs text-[var(--text-tertiary)] mb-3 truncate">{designerTag}</div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#FF6B35] text-sm">
                          {m.is_free ? t("free") : formatPrice(m.base_price, locale)}
                        </span>
                        {m.rating_count > 0 && (
                          <span className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
                            <Star size={11} fill="currentColor" className="text-amber-400" />
                            {Number(m.avg_rating).toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>

                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}