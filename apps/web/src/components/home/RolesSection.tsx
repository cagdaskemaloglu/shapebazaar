"use client";
import Link from "next/link";
import { Pencil, Printer, ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";

export function RolesSection() {
  const t        = useTranslations("roles");
  const pathname = usePathname();
  const locale   = pathname.split("/")[1] || "tr";

  const roles = [
    { icon: Pencil,      key: "designer", href: `/upload`,         color: "orange", featured: false },
    { icon: Printer,     key: "printer",  href: `/become-partner`, color: "green",  featured: true  },
    { icon: ShoppingBag, key: "buyer",    href: `/models`,         color: "orange", featured: false },
  ] as const;

  return (
    <section className="py-16 border-b border-[var(--border)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">{t("title")}</h2>
          <p className="text-sm text-[var(--text-tertiary)]">{t("subtitle")}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {roles.map((role) => {
            const Icon      = role.icon;
            const isOrange  = role.color === "orange";
            const rk        = role.key as "designer" | "printer" | "buyer";
            return (
              <div
                key={role.key}
                className={`border rounded-2xl p-6 bg-[var(--bg-primary)] transition-all hover:shadow-sm ${role.featured ? "border-[#10B981]/30" : "border-[var(--border)]"}`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${isOrange ? "bg-[rgba(255,107,53,0.1)] text-[#FF6B35]" : "bg-[rgba(16,185,129,0.1)] text-[#10B981]"}`}>
                  <Icon size={20} />
                </div>
                <h3 className="font-medium text-[var(--text-primary)] mb-2">{t(`${rk}.title`)}</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">{t(`${rk}.desc`)}</p>
                <div className={`text-xs font-medium px-3 py-1.5 rounded-lg inline-block mb-5 ${isOrange ? "bg-[rgba(255,107,53,0.1)] text-[#FF6B35]" : "bg-[rgba(16,185,129,0.1)] text-[#10B981]"}`}>
                  {t(`${rk}.earn`)}
                </div>
                <Link
                  href={`/${locale}${role.href}`}
                  className={`flex items-center justify-center w-full h-9 rounded-xl text-sm font-medium transition-all ${role.featured ? "bg-[#FF6B35] text-white hover:bg-[#e85e2a]" : "border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"}`}
                >
                  {t(`${rk}.cta`)} →
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
