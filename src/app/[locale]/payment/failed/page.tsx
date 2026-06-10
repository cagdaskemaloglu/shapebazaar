import Link from "next/link";
import { XCircle } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { getTranslations } from "next-intl/server";

export default async function PaymentFailed({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("payment");

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/20 flex items-center justify-center mx-auto mb-5">
            <XCircle size={32} className="text-red-400" />
          </div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">{t("failedTitle")}</h1>
          <p className="text-sm text-[var(--text-secondary)] mb-8">{t("failedDesc")}</p>
          <div className="flex gap-3 justify-center">
            <Link href={`/${locale}/models`} className="px-5 py-2.5 rounded-xl bg-[#FF6B35] text-white text-sm font-medium hover:bg-[#e85e2a] transition-colors">
              {t("tryAgain")}
            </Link>
            <Link href={`/${locale}/dashboard`} className="px-5 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors">
              {t("toDashboard")}
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
