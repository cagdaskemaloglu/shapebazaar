import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export const metadata = {
  title: "Reset Password | ShapeBazaar",
};

export default async function ForgotPasswordPage({
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
          <p className="text-sm text-[var(--text-tertiary)]">{t("forgotPasswordTitle")}</p>
        </div>
        <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
          <ForgotPasswordForm />
        </div>
        <p className="text-center text-sm text-[var(--text-tertiary)] mt-5">
          <Link href={`/${locale}/auth/login`} className="text-[#FF6B35] hover:underline font-medium">
            ← {t("backToLogin")}
          </Link>
        </p>
      </div>
    </div>
  );
}
