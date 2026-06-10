"use client";
import { Search, SlidersHorizontal, CreditCard, Package } from "lucide-react";
import { useTranslations } from "next-intl";

export function HowItWorks() {
  const t = useTranslations("howItWorks");

  const steps = [
    { icon: Search,            title: t("step1Title"), desc: t("step1Desc"), color: "orange" },
    { icon: SlidersHorizontal, title: t("step2Title"), desc: t("step2Desc"), color: "orange" },
    { icon: CreditCard,        title: t("step3Title"), desc: t("step3Desc"), color: "green"  },
    { icon: Package,           title: t("step4Title"), desc: t("step4Desc"), color: "green"  },
  ];

  return (
    <section className="py-16 bg-[var(--bg-secondary)] border-b border-[var(--border)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">{t("title")}</h2>
          <p className="text-sm text-[var(--text-tertiary)]">{t("subtitle")}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          <div className="hidden lg:block absolute top-8 left-[12.5%] right-[12.5%] h-px bg-[var(--border)] z-0" />
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="relative z-10 flex flex-col items-center text-center">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${step.color === "orange" ? "bg-[rgba(255,107,53,0.1)] text-[#FF6B35]" : "bg-[rgba(16,185,129,0.1)] text-[#10B981]"}`}>
                  <Icon size={22} />
                </div>
                <div className="w-5 h-5 rounded-full border-2 border-[var(--border)] bg-[var(--bg-secondary)] flex items-center justify-center text-[10px] font-semibold text-[var(--text-tertiary)] mb-3">
                  {i + 1}
                </div>
                <h3 className="font-medium text-sm text-[var(--text-primary)] mb-2">{step.title}</h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-[180px]">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
