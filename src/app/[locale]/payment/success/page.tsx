import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { getTranslations } from "next-intl/server";

export default async function PaymentSuccess({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ orderId?: string }>;
}) {
  const { locale } = await params;
  const { orderId } = await searchParams;
  const t = await getTranslations("payment");

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-[rgba(16,185,129,0.1)] flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={32} className="text-[#10B981]" />
          </div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">{t("successTitle")}</h1>
          <p className="text-sm text-[var(--text-secondary)] mb-2">{t("successDesc")}</p>
          {orderId && (
            <p className="text-xs text-[var(--text-tertiary)] mb-6">
              {t("orderNo")} <span className="font-mono">{orderId.slice(0, 8).toUpperCase()}</span>
            </p>
          )}
          <p className="text-sm text-[var(--text-secondary)] mb-8">{t("successInfo")}</p>
          <div className="flex gap-3 justify-center">
            <Link href={`/${locale}/dashboard`} className="px-5 py-2.5 rounded-xl bg-[#FF6B35] text-white text-sm font-medium hover:bg-[#e85e2a] transition-colors">
              {t("viewOrders")}
            </Link>
            <Link href={`/${locale}/models`} className="px-5 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors">
              {t("backToModels")}
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
