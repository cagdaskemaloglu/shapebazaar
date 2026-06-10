"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";

export function Footer() {
  const t        = useTranslations("footer");
  const pathname = usePathname();
  const locale   = pathname.split("/")[1] || "tr";

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--bg-secondary)] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1">
            <div className="text-base font-semibold mb-2">
              <span className="text-[#FF6B35]">Shape</span>
              <span className="text-[var(--text-primary)]">Bazaar</span>
            </div>
            <p className="text-xs text-[var(--text-tertiary)] leading-relaxed max-w-[200px]">
              ShapeBazaar is where digital designs become real products.
            </p>
          </div>
          <div>
            <div className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-3">{t("platform")}</div>
            <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
              <li><Link href={`/${locale}/models`}         className="hover:text-[#FF6B35] transition-colors">{useTranslations("nav")("models")}</Link></li>
              <li><Link href={`/${locale}/how-it-works`}   className="hover:text-[#FF6B35] transition-colors">{useTranslations("nav")("howItWorks")}</Link></li>
              <li><Link href={`/${locale}/become-partner`} className="hover:text-[#FF6B35] transition-colors">{useTranslations("nav")("becomePartner")}</Link></li>
              <li><Link href={`/${locale}/designers`}      className="hover:text-[#FF6B35] transition-colors">{useTranslations("nav")("designers")}</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-3">{t("company")}</div>
            <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
              <li><Link href={`/${locale}/about`}   className="hover:text-[#FF6B35] transition-colors">{t("about")}</Link></li>
              <li><Link href={`/${locale}/mission`} className="hover:text-[#FF6B35] transition-colors">{t("mission")}</Link></li>
              <li><Link href={`/${locale}/blog`}    className="hover:text-[#FF6B35] transition-colors">{t("blog")}</Link></li>
              <li><Link href={`/${locale}/contact`} className="hover:text-[#FF6B35] transition-colors">{t("contact")}</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-3">{t("legal")}</div>
            <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
              <li><Link href={`/${locale}/privacy`} className="hover:text-[#FF6B35] transition-colors">{t("privacy")}</Link></li>
              <li><Link href={`/${locale}/terms`}   className="hover:text-[#FF6B35] transition-colors">{t("terms")}</Link></li>
              <li><Link href={`/${locale}/cookies`} className="hover:text-[#FF6B35] transition-colors">{t("cookies")}</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-[var(--border)] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[var(--text-tertiary)]">
            © {new Date().getFullYear()} ShapeBazaar · Print Farm Network · {t("rights")}
          </p>
          <div className="flex items-center gap-4 text-xs text-[var(--text-tertiary)]">
            <span>Türkiye 🇹🇷</span>
            <span>·</span>
            <span>₺ TRY</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
