"use client";
import { useTranslations } from "next-intl";

export function ValuesSection() {
  const t      = useTranslations("values");
  const values = t.raw("list") as string[];

  return (
    <section className="py-14 bg-[var(--bg-secondary)] border-b border-[var(--border)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-1">{t("title")}</h2>
          <p className="text-sm text-[var(--text-tertiary)]">{t("subtitle")}</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {values.map((v, i) => (
            <div key={v} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-4 py-3 flex items-center gap-2.5">
              <span className={`w-2 h-2 rounded-full shrink-0 ${i % 2 === 0 ? "bg-[#FF6B35]" : "bg-[#10B981]"}`} />
              <span className="text-sm font-medium text-[var(--text-primary)]">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
