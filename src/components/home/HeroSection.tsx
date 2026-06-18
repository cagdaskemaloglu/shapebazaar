"use client";
import Link from "next/link";
import { Upload, Compass } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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

const STATS_KEYS = ["2.4K+", "180+", "12K+", "81"];

export function HeroSection() {
  const t        = useTranslations("hero");
  const pathname = usePathname();
  const locale   = pathname.split("/")[1] || "tr";
  const [regionLabel, setRegionLabel] = useState("Turkey");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("region")
        .eq("id", user.id)
        .single();
      if (data?.region) {
        setRegionLabel(REGION_LABELS[data.region] ?? data.region);
      }
    });
  }, []);

  const stats = [
    { num: "2.4K+", label: t("stats.models")   },
    { num: "180+",  label: t("stats.partners")  },
    { num: "12K+",  label: t("stats.orders")    },
    { num: "81 İl", label: t("stats.delivery")  },
  ];

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

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-14">
          <Link href={`/${locale}/upload`} className="flex items-center gap-2 bg-[#FF6B35] text-white px-6 py-3 h-11 rounded-xl font-medium text-sm hover:bg-[#e85e2a] transition-colors">
            <Upload size={16} /> {t("uploadCta")}
          </Link>
          <Link href={`/${locale}/models`} className="flex items-center gap-2 border border-[var(--border)] text-[var(--text-primary)] px-6 py-3 h-11 rounded-xl text-sm hover:bg-[var(--bg-secondary)] transition-colors">
            <Compass size={16} /> {t("exploreCta")}
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-xl mx-auto">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-2xl font-semibold text-[var(--text-primary)]">{s.num}</div>
              <div className="text-xs text-[var(--text-tertiary)] mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}