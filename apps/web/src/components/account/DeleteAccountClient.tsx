"use client";
import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AlertTriangle, XCircle, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Blocker { code: string; count?: number; amount?: number }
interface Report { blockers: Blocker[]; willCancelOrders: number; willUnpublishModels: number }

// "SİL" / "sil" / "SIL" hepsi kabul: Türkçe i/ı farkı yüzünden kullanıcı takılmasın
const canon = (s: string) => s.trim().toLowerCase().replace(/\u0307/g, "").replace(/ı/g, "i");

export function DeleteAccountClient({ loggedIn }: { loggedIn: boolean }) {
  const t      = useTranslations("accountDelete");
  const locale = useLocale();

  const [report, setReport]       = useState<Report | null>(null);
  const [loading, setLoading]     = useState(loggedIn);
  const [loadError, setLoadError] = useState(false);
  const [typed, setTyped]         = useState("");
  const [deleting, setDeleting]   = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const word = t("confirmWord");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: true }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setReport(await res.json());
    } catch (e) {
      console.warn("[account/delete] dry run", e);
      setLoadError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => { if (loggedIn) load(); }, [loggedIn, load]);

  async function deleteAccount() {
    if (!report) return;
    setDeleting(true);
    setError(null);
    const res = await fetch("/api/account/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: true, acknowledgeCancelOrders: report.willCancelOrders > 0 }),
    });
    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      try { await createClient().auth.signOut(); } catch { /* hesap silindi, oturum zaten geçersiz */ }
      window.location.href = `/${locale}?accountDeleted=1`;
      return;
    }
    setDeleting(false);
    if (res.status === 409 && data.code === "BLOCKED") await load(); // durum arada değişti — engelleri yeniden göster
    else setError(t("failed"));
  }

  const blockerText = (b: Blocker) =>
    t(`blockers.${b.code}`, { count: b.count ?? 0, amount: b.amount != null ? Number(b.amount).toFixed(2) : "" });

  const card = "bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-5";

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-3">{t("title")}</h1>
      <p className="text-[var(--text-secondary)] mb-8">{t("intro")}</p>

      <div className={`${card} mb-6`}>
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">{t("whatTitle")}</h2>
        <ul className="text-sm text-[var(--text-secondary)] space-y-2 list-disc pl-5">
          <li>{t("whatDeleted")}</li>
          <li>{t("whatKept")}</li>
          <li>{t("whatDesigner")}</li>
          <li>{t("whatPhotos")}</li>
        </ul>
      </div>

      {!loggedIn && (
        <div className={card}>
          <p className="text-sm text-[var(--text-secondary)] mb-4">{t("loggedOutDesc")}</p>
          <a href={`/${locale}/auth/login`}
            className="inline-block text-sm bg-[#FF6B35] text-white px-5 py-2.5 rounded-xl hover:bg-[#e85e2a] transition-colors">
            {t("loginCta")}
          </a>
          <p className="text-xs text-[var(--text-tertiary)] mt-4">{t("inApp")}</p>
        </div>
      )}

      {loggedIn && loading && (
        <div className="flex items-center gap-2 text-sm text-[var(--text-tertiary)]"><Loader2 size={16} className="animate-spin" />{t("checking")}</div>
      )}

      {loggedIn && !loading && (loadError || !report) && (
        <div className={card}>
          <p className="text-sm text-[var(--text-secondary)] mb-3">{t("loadFailed")}</p>
          <button onClick={load} className="text-sm bg-[#FF6B35] text-white px-4 py-2 rounded-xl">{t("retry")}</button>
        </div>
      )}

      {/* Silmeyi engelleyen açık yükümlülükler */}
      {loggedIn && !loading && report && report.blockers.length > 0 && (
        <div className={card}>
          <div className="flex items-center gap-2 mb-2">
            <XCircle size={18} className="text-red-500" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t("blockedTitle")}</h2>
          </div>
          <p className="text-sm text-[var(--text-secondary)] mb-3">{t("blockedIntro")}</p>
          <ul className="text-sm text-[var(--text-primary)] space-y-2 list-disc pl-5">
            {report.blockers.map((b) => <li key={b.code}>{blockerText(b)}</li>)}
          </ul>
        </div>
      )}

      {loggedIn && !loading && report && report.blockers.length === 0 && (
        <div className={card}>
          <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 rounded-xl p-3 mb-4 text-sm">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{t("irreversible")}</span>
          </div>
          {report.willUnpublishModels > 0 && (
            <p className="text-sm text-[var(--text-primary)] mb-2">• {t("willUnpublish", { count: report.willUnpublishModels })}</p>
          )}
          {report.willCancelOrders > 0 && (
            <p className="text-sm font-medium text-red-600 mb-2">• {t("willCancel", { count: report.willCancelOrders })}</p>
          )}
          <label className="block text-sm text-[var(--text-secondary)] mt-4 mb-2">{t("confirmPrompt", { word })}</label>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={word}
            autoComplete="off"
            className="w-full px-4 py-2.5 text-sm bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl outline-none focus:border-red-400 mb-4"
          />
          {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
          <button
            onClick={deleteAccount}
            disabled={canon(typed) !== canon(word) || deleting}
            className="w-full text-sm bg-red-600 text-white px-4 py-3 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {deleting ? t("deleting") : t("deleteButton")}
          </button>
        </div>
      )}
    </div>
  );
}
