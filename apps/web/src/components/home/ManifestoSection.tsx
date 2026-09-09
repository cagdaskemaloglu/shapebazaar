"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";

export function ManifestoSection() {
  const t        = useTranslations("manifesto");
  const pathname = usePathname();
  const locale   = pathname.split("/")[1] || "tr";

  return (
    <section className="py-20 text-center">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <div className="w-8 h-1 bg-[#FF6B35] rounded-full mx-auto mb-8" />
        <blockquote className="text-lg sm:text-xl text-[var(--text-secondary)] leading-relaxed italic mb-10">
          {t("quote")}
        </blockquote>
        <p className="text-sm text-[var(--text-tertiary)] mb-8">{t("sub")}</p>
        <Link
          href={`/${locale}/auth/register`}
          className="inline-flex items-center gap-2 bg-[#FF6B35] text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-[#e85e2a] transition-colors"
        >
          {t("cta")}
        </Link>
      </div>
    </section>
  );
}
