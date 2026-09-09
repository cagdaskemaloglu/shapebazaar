"use client";
import { useState } from "react";
import { Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useTranslations, useLocale } from "next-intl";

export function ForgotPasswordForm() {
  const t      = useTranslations("auth");
  const locale = useLocale();
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [sent,    setSent]    = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/${locale}/auth/reset-password`,
    });

    if (error) {
      setError(t("resetError"));
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="text-center py-4">
        <div className="w-12 h-12 bg-[rgba(16,185,129,0.1)] rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail size={20} className="text-[#10B981]" />
        </div>
        <h3 className="font-medium text-[var(--text-primary)] mb-2">{t("resetEmailSent")}</h3>
        <p className="text-sm text-[var(--text-secondary)]">
          {t.rich("resetEmailSentDesc", { email, b: (chunks) => <strong>{chunks}</strong> })}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <p className="text-sm text-[var(--text-secondary)] mb-1">{t("forgotPasswordDesc")}</p>
      <Input
        label={t("email")}
        type="email"
        placeholder="ornek@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        icon={<Mail size={14} />}
        required
      />

      {error && (
        <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? t("sending") : t("sendResetLink")}
      </Button>
    </form>
  );
}
