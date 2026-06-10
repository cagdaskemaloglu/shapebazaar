"use client";
import Link from "next/link";
import { Star, TrendingUp, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";

const MODELS = [
  { id: 1, name: "Araç Organizeri Pro",  designer: "@MakerTR",   price: 145, rating: 4.8, reviews: 124, badge: "hot" },
  { id: 2, name: "Telefon Standı Pro",   designer: "@designlab", price: 89,  rating: 4.9, reviews: 57,  badge: "new" },
  { id: 3, name: "Duvar Kancası Seti",   designer: "@3dpro",     price: 210, rating: 4.7, reviews: 89,  badge: "hot" },
  { id: 4, name: "Masaüstü Kalemlik",    designer: "@studioX",   price: 95,  rating: 4.6, reviews: 43,  badge: null  },
  { id: 5, name: "Kablo Düzenleyici",    designer: "@teknoprint",price: 130, rating: 4.8, reviews: 201, badge: "hot" },
  { id: 6, name: "Bahçe Etiket Seti",    designer: "@greenmaker", price: 75, rating: 4.5, reviews: 31,  badge: "new" },
];

export function ModelGrid() {
  const t        = useTranslations("models");
  const pathname = usePathname();
  const locale   = pathname.split("/")[1] || "tr";

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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {MODELS.map((m) => (
            <Link key={m.id} href={`/${locale}/models/${m.id}`} className="group block">
              <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl overflow-hidden hover:border-[var(--border-strong)] hover:shadow-sm transition-all duration-200">
                <div className="h-40 bg-[var(--bg-tertiary)] flex items-center justify-center relative">
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="text-[var(--text-tertiary)] opacity-40">
                    <path d="M16 3L29 10V22L16 29L3 22V10L16 3Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                    <path d="M16 3V29M3 10L16 17L29 10" stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 2"/>
                  </svg>
                  {m.badge && (
                    <div className="absolute top-2.5 left-2.5">
                      {m.badge === "hot"
                        ? <span className="text-[10px] font-medium bg-[rgba(255,107,53,0.12)] text-[#FF6B35] px-2 py-0.5 rounded-full flex items-center gap-1"><TrendingUp size={9}/>{t("trend")}</span>
                        : <span className="text-[10px] font-medium bg-[rgba(16,185,129,0.12)] text-[#10B981] px-2 py-0.5 rounded-full flex items-center gap-1"><Sparkles size={9}/>{t("new")}</span>
                      }
                    </div>
                  )}
                </div>
                <div className="p-3.5">
                  <div className="font-medium text-sm text-[var(--text-primary)] mb-1 truncate">{m.name}</div>
                  <div className="text-xs text-[var(--text-tertiary)] mb-3">{m.designer}</div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#FF6B35] text-sm">₺ {m.price}</span>
                    <span className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
                      <Star size={11} fill="currentColor" className="text-amber-400" />
                      {m.rating}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
