"use client";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Star, Package, MapPin, AlertCircle, TrendingUp } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface DesignerProfile {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  created_at: string;
}

interface DesignerModel {
  id: string;
  title: string;
  base_price: number;
  is_free: boolean;
  avg_rating: number;
  rating_count: number;
  print_count: number;
  thumbnail_url: string | null;
  file_format: string;
  created_at: string;
  category: { name_tr: string; name_en: string | null } | null;
}

export function DesignerProfileClient({ designerId }: { designerId: string }) {
  const t      = useTranslations("designerProfile");
  const tFree  = useTranslations("modelsPage");
  const pathname = usePathname();
  const locale   = pathname.split("/")[1] || "tr";

  const [designer, setDesigner] = useState<DesignerProfile | null>(null);
  const [models,   setModels]   = useState<DesignerModel[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [sort,     setSort]     = useState<"popular" | "newest" | "rating">("popular");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const supabase = createClient();

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url, bio, city, created_at")
        .eq("id", designerId)
        .single();

      if (error || !profile) { setNotFound(true); setLoading(false); return; }
      setDesigner(profile as DesignerProfile);

      const { data: modelData } = await supabase
        .from("models")
        .select("id, title, base_price, is_free, avg_rating, rating_count, print_count, thumbnail_url, file_format, created_at, category:categories(name_tr, name_en)")
        .eq("designer_id", designerId)
        .eq("is_published", true);

      setModels((modelData ?? []) as unknown as DesignerModel[]);
      setLoading(false);
    }
    load();
  }, [designerId]);

  const sortedModels = [...models].sort((a, b) => {
    if (sort === "popular") return b.print_count - a.print_count;
    if (sort === "newest")  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    return b.avg_rating - a.avg_rating;
  });

  const totalPrints  = models.reduce((s, m) => s + m.print_count, 0);
  const avgRating    = models.length
    ? models.reduce((s, m) => s + m.avg_rating, 0) / models.length
    : 0;

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 animate-pulse">
        <div className="flex items-center gap-5 mb-8">
          <div className="w-20 h-20 rounded-full bg-[var(--bg-secondary)]" />
          <div className="flex-1">
            <div className="h-6 bg-[var(--bg-secondary)] rounded w-1/3 mb-2" />
            <div className="h-4 bg-[var(--bg-secondary)] rounded w-1/4" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[1,2,3,4].map((i) => <div key={i} className="h-20 bg-[var(--bg-secondary)] rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map((i) => <div key={i} className="h-48 bg-[var(--bg-secondary)] rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (notFound || !designer) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20 text-center">
        <AlertCircle size={40} className="mx-auto mb-4 text-[var(--text-tertiary)] opacity-40" />
        <h2 className="text-lg font-medium text-[var(--text-primary)] mb-2">{t("notFound")}</h2>
        <a href={`/${locale}/designers`} className="text-sm text-[#FF6B35] hover:underline">{t("backToDesigners")}</a>
      </div>
    );
  }

  const displayName = designer.username ? `@${designer.username}` : designer.full_name ?? "Tasarımcı";

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] mb-8">
        <Link href={`/${locale}`} className="hover:text-[#FF6B35]">{t("home")}</Link>
        <span>›</span>
        <Link href={`/${locale}/designers`} className="hover:text-[#FF6B35]">{t("designers")}</Link>
        <span>›</span>
        <span className="text-[var(--text-primary)]">{displayName}</span>
      </div>

      {/* Profile header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 mb-8">
        {designer.avatar_url ? (
          <img src={designer.avatar_url} className="w-20 h-20 rounded-full object-cover border-2 border-[var(--border)]" alt="" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-[rgba(255,107,53,0.1)] flex items-center justify-center text-[#FF6B35] text-2xl font-semibold border-2 border-[rgba(255,107,53,0.2)]">
            {(designer.full_name ?? designer.username ?? "T")[0].toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-1">{displayName}</h1>
          {designer.city && (
            <div className="flex items-center gap-1 text-sm text-[var(--text-tertiary)] mb-2">
              <MapPin size={13} /> {designer.city}
            </div>
          )}
          {designer.bio && (
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-lg">{designer.bio}</p>
          )}
          <div className="text-xs text-[var(--text-tertiary)] mt-2">
            Üye olma tarihi: {new Date(designer.created_at).toLocaleDateString("tr-TR", { year: "numeric", month: "long" })}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: t("publishedModels"), value: models.length,          icon: Package,    color: "orange" },
          { label: t("totalPrints"),     value: totalPrints,            icon: TrendingUp, color: "green"  },
          { label: t("avgRating"),       value: avgRating > 0 ? avgRating.toFixed(1) : "—", icon: Star, color: "orange" },
          { label: t("communityRank"),   value: "—",                    icon: TrendingUp, color: "green"  },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-4">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${s.color === "orange" ? "bg-[rgba(255,107,53,0.1)] text-[#FF6B35]" : "bg-[rgba(16,185,129,0.1)] text-[#10B981]"}`}>
                <Icon size={16} />
              </div>
              <div className="text-lg font-semibold text-[var(--text-primary)]">{s.value}</div>
              <div className="text-xs text-[var(--text-tertiary)]">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Models */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            {t("models")} <span className="text-[var(--text-tertiary)] font-normal text-sm">({models.length})</span>
          </h2>
          <div className="flex gap-1 border border-[var(--border)] rounded-xl p-1">
            {[
              { id: "popular", label: t("sort.popular") },
              { id: "newest",  label: t("sort.newest")  },
              { id: "rating",  label: t("sort.rating")  },
            ].map((s) => (
              <button key={s.id} onClick={() => setSort(s.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all ${sort === s.id ? "bg-[rgba(255,107,53,0.1)] text-[#FF6B35] font-medium" : "text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"}`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {models.length === 0 ? (
          <div className="text-center py-16 text-[var(--text-tertiary)]">
            <Package size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">{t("noModels")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {sortedModels.map((m) => (
              <Link key={m.id} href={`/${locale}/models/${m.id}`} className="group block">
                <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl overflow-hidden hover:border-[var(--border-strong)] hover:shadow-sm transition-all">
                  <div className="h-36 bg-[var(--bg-tertiary)] flex items-center justify-center relative overflow-hidden">
                    {m.thumbnail_url ? (
                      <img src={m.thumbnail_url} alt={m.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="text-[var(--text-tertiary)] opacity-30">
                        <path d="M16 3L29 10V22L16 29L3 22V10L16 3Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                        <path d="M16 3V29M3 10L16 17L29 10" stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 2"/>
                      </svg>
                    )}
                    {m.is_free && (
                      <div className="absolute top-2 right-2 text-[10px] font-medium bg-[rgba(16,185,129,0.12)] text-[#10B981] px-2 py-0.5 rounded-full">{tFree("free")}</div>
                    )}
                  </div>
                  <div className="p-3">
                    {m.category && <div className="text-xs text-[var(--text-tertiary)] mb-0.5">{locale === "en" ? m.category.name_en : m.category.name_tr}</div>}
                    <div className="font-medium text-sm text-[var(--text-primary)] truncate mb-2">{m.title}</div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[#FF6B35]">{m.is_free ? tFree("free") : formatPrice(m.base_price, locale)}</span>
                      {m.rating_count > 0 && (
                        <span className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
                          <Star size={10} fill="currentColor" className="text-amber-400" />
                          {Number(m.avg_rating).toFixed(1)}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[var(--text-tertiary)] mt-1">{m.print_count} {t("prints")}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}