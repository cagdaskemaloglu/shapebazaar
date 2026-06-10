"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Star, TrendingUp, Package } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface Designer {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  model_count: number;
  total_prints: number;
  avg_rating: number;
  top_models: {
    id: string;
    title: string;
    base_price: number;
    is_free: boolean;
    avg_rating: number;
    print_count: number;
  }[];
}

export function DesignersPageClient() {
  const pathname = usePathname();
  const locale   = pathname.split("/")[1] || "tr";

  const [designers, setDesigners] = useState<Designer[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      const supabase = createClient();

      // Yayınlanmış modeli olan tasarımcıları çek
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url, bio, city")
        .in("id", (
          await supabase
            .from("models")
            .select("designer_id")
            .eq("is_published", true)
            .then(({ data }) => [...new Set((data ?? []).map((m) => m.designer_id))])
        ));

      if (!profiles?.length) { setLoading(false); return; }

      // Her tasarımcı için model istatistiklerini çek
      const enriched: Designer[] = await Promise.all(
        profiles.map(async (p) => {
          const { data: models } = await supabase
            .from("models")
            .select("id, title, base_price, is_free, avg_rating, print_count")
            .eq("designer_id", p.id)
            .eq("is_published", true)
            .order("print_count", { ascending: false })
            .limit(4);

          const totalPrints = (models ?? []).reduce((s, m) => s + (m.print_count ?? 0), 0);
          const avgRating   = (models ?? []).reduce((s, m) => s + (m.avg_rating ?? 0), 0) / Math.max((models ?? []).length, 1);

          return {
            ...p,
            model_count:  (models ?? []).length,
            total_prints: totalPrints,
            avg_rating:   avgRating,
            top_models:   (models ?? []).slice(0, 4),
          };
        })
      );

      // En fazla baskıya göre sırala
      enriched.sort((a, b) => b.total_prints - a.total_prints);
      setDesigners(enriched);
      setLoading(false);
    }
    fetch();
  }, []);

  const topDesigners = designers.slice(0, 3);
  const allDesigners = designers;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Tasarımcılar</h1>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">ShapeBazaar topluluğunun yaratıcı üyeleri</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
          {[1,2,3].map((i) => (
            <div key={i} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-[var(--bg-tertiary)]" />
                <div className="flex-1">
                  <div className="h-4 bg-[var(--bg-tertiary)] rounded w-2/3 mb-2" />
                  <div className="h-3 bg-[var(--bg-tertiary)] rounded w-1/2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[1,2].map((j) => <div key={j} className="h-16 bg-[var(--bg-tertiary)] rounded-xl" />)}
              </div>
            </div>
          ))}
        </div>
      ) : designers.length === 0 ? (
        <div className="text-center py-20 text-[var(--text-tertiary)]">
          <Package size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Henüz yayınlanmış model sahibi tasarımcı yok.</p>
        </div>
      ) : (
        <>
          {/* Top 3 - öne çıkan */}
          {topDesigners.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center gap-2 mb-5">
                <TrendingUp size={16} className="text-[#FF6B35]" />
                <h2 className="text-base font-semibold text-[var(--text-primary)]">En Trend Tasarımcılar</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {topDesigners.map((d, rank) => (
                  <FeaturedDesignerCard key={d.id} designer={d} rank={rank + 1} locale={locale} />
                ))}
              </div>
            </div>
          )}

          {/* Tüm tasarımcılar */}
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)] mb-5">
              En Başarılı Tasarımcılar
              <span className="text-[var(--text-tertiary)] font-normal text-sm ml-2">({allDesigners.length} tasarımcı)</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {allDesigners.map((d) => (
                <DesignerCard key={d.id} designer={d} locale={locale} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Featured designer card (top 3) ─────────────── */
function FeaturedDesignerCard({ designer: d, rank, locale }: { designer: Designer; rank: number; locale: string }) {
  const name = d.username ? `@${d.username}` : d.full_name ?? "Tasarımcı";
  return (
    <Link href={`/${locale}/designers/${d.id}`} className="group block">
      <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-5 hover:border-[#FF6B35]/40 hover:shadow-sm transition-all">
        {/* Rank badge */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {d.avatar_url ? (
              <img src={d.avatar_url} className="w-12 h-12 rounded-full object-cover" alt="" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-[rgba(255,107,53,0.1)] flex items-center justify-center text-[#FF6B35] text-base font-semibold">
                {(d.full_name ?? d.username ?? "T")[0].toUpperCase()}
              </div>
            )}
            <div>
              <div className="font-medium text-sm text-[var(--text-primary)]">{name}</div>
              {d.city && <div className="text-xs text-[var(--text-tertiary)]">{d.city}</div>}
            </div>
          </div>
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${rank === 1 ? "bg-amber-400" : rank === 2 ? "bg-slate-400" : "bg-amber-700"}`}>
            {rank}
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-3 mb-4 text-xs text-[var(--text-tertiary)]">
          <span><strong className="text-[var(--text-primary)]">{d.model_count}</strong> model</span>
          <span><strong className="text-[var(--text-primary)]">{d.total_prints}</strong> baskı</span>
          {d.avg_rating > 0 && (
            <span className="flex items-center gap-0.5">
              <Star size={10} fill="#FBBF24" className="text-amber-400" />
              <strong className="text-[var(--text-primary)]">{d.avg_rating.toFixed(1)}</strong>
            </span>
          )}
        </div>

        {/* Top models grid */}
        {d.top_models.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {d.top_models.slice(0, 4).map((m) => (
              <div key={m.id} className="bg-[var(--bg-tertiary)] rounded-xl p-2.5 text-center">
                <div className="text-xs font-medium text-[var(--text-primary)] truncate mb-1">{m.title}</div>
                <div className="text-xs text-[#FF6B35] font-semibold">{m.is_free ? "Ücretsiz" : formatPrice(m.base_price)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

/* ── Regular designer card ───────────────────────── */
function DesignerCard({ designer: d, locale }: { designer: Designer; locale: string }) {
  const name = d.username ? `@${d.username}` : d.full_name ?? "Tasarımcı";
  return (
    <Link href={`/${locale}/designers/${d.id}`} className="group block">
      <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-4 hover:border-[var(--border-strong)] hover:shadow-sm transition-all">
        <div className="flex items-center gap-3 mb-3">
          {d.avatar_url ? (
            <img src={d.avatar_url} className="w-10 h-10 rounded-full object-cover" alt="" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[rgba(255,107,53,0.1)] flex items-center justify-center text-[#FF6B35] text-sm font-semibold">
              {(d.full_name ?? d.username ?? "T")[0].toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <div className="font-medium text-sm text-[var(--text-primary)] truncate">{name}</div>
            <div className="text-xs text-[var(--text-tertiary)]">{d.city ?? ""}</div>
          </div>
        </div>
        <div className="flex gap-3 text-xs text-[var(--text-tertiary)]">
          <span><strong className="text-[var(--text-primary)]">{d.model_count}</strong> model</span>
          <span><strong className="text-[var(--text-primary)]">{d.total_prints}</strong> baskı</span>
          {d.avg_rating > 0 && (
            <span className="flex items-center gap-0.5">
              <Star size={10} fill="#FBBF24" className="text-amber-400" />
              {d.avg_rating.toFixed(1)}
            </span>
          )}
        </div>
        {d.bio && (
          <p className="text-xs text-[var(--text-secondary)] mt-2 line-clamp-2">{d.bio}</p>
        )}
      </div>
    </Link>
  );
}
