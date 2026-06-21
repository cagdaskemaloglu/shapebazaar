"use client";
import Link from "next/link";
import { Upload, Compass } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";

const REGION_LABELS: Record<string, string> = {
  TR:    "Turkey",
  US:    "United States",
  GB:    "United Kingdom",
  DE:    "Germany",
  FR:    "France",
  NL:    "Netherlands",
  AE:    "UAE",
  SA:    "Saudi Arabia",
  OTHER: "Global",
};

export function HeroSection({ userRegion = "TR" }: { userRegion?: string }) {
  const t        = useTranslations("hero");
  const pathname = usePathname();
  const locale   = pathname.split("/")[1] || "tr";

  const regionLabel = REGION_LABELS[userRegion] ?? userRegion;

  return (
    <section className="relative overflow-hidden border-b border-[var(--border)] bg-[var(--bg-primary)]">
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
        style={{ backgroundImage: `linear-gradient(var(--text-primary) 1px, transparent 1px), linear-gradient(90deg, var(--text-primary) 1px, transparent 1px)`, backgroundSize: "40px 40px" }}
      />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] rounded-full bg-[#FF6B35] opacity-[0.06] blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-16 pb-14 text-center">
        <div className="inline-flex items-center gap-2 bg-[rgba(255,107,53,0.1)] text-[#FF6B35] text-xs font-medium px-3 py-1.5 rounded-full mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B35] animate-pulse" />
          Print Farm Network — {regionLabel}
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold leading-[1.15] tracking-tight mb-5">
          {t("title")}
          <br />
          <span className="text-[#FF6B35]">{t("titleHighlight")}</span>
        </h1>

        <p className="text-base sm:text-lg text-[var(--text-secondary)] max-w-xl mx-auto mb-8 leading-relaxed">
          {t("subtitle")}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href={`/${locale}/upload`} className="flex items-center gap-2 bg-[#FF6B35] text-white px-6 py-3 h-11 rounded-xl font-medium text-sm hover:bg-[#e85e2a] transition-colors">
            <Upload size={16} /> {t("uploadCta")}
          </Link>
          <Link href={`/${locale}/models`} className="flex items-center gap-2 border border-[var(--border)] text-[var(--text-primary)] px-6 py-3 h-11 rounded-xl text-sm hover:bg-[var(--bg-secondary)] transition-colors">
            <Compass size={16} /> {t("exploreCta")}
          </Link>
        </div>
      </div>
    </section>
  );
}