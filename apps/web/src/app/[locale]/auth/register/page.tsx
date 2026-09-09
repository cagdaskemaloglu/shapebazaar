import { RegisterForm } from "@/components/auth/RegisterForm";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("auth");

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-tertiary)] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href={`/${locale}`} className="inline-block text-xl font-semibold mb-2">
            <span className="text-[#FF6B35]">Shape</span>
            <span className="text-[var(--text-primary)]">Bazaar</span>
          </Link>
          <p className="text-sm text-[var(--text-tertiary)]">{t("registerTitle")}</p>
        </div>
        <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
          <RegisterForm />
        </div>
        <p className="text-center text-sm text-[var(--text-tertiary)] mt-5">
          {t("hasAccount")}{" "}
          <Link href={`/${locale}/auth/login`} className="text-[#FF6B35] hover:underline font-medium">
            {t("loginBtn")}
          </Link>
        </p>
      </div>
    </div>
  );
}
