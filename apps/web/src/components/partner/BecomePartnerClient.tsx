"use client";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Printer, CheckCircle, Shield, Wallet, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PartnerDashboardClient } from "@/components/partner/PartnerDashboardClient";

const PRINTER_TYPES  = ["FDM (PLA/PETG/ABS)", "FDM (Multi-renk)", "Resin (SLA/DLP)", "SLS", "Diğer"];
const MATERIALS_LIST = ["PLA", "PETG", "ABS", "TPU", "Resin", "Nylon", "ASA"];

type AuthState = "loading" | "unauthenticated" | "pending" | "approved" | "not_applied";

export function BecomePartnerClient() {
  const t        = useTranslations("partner");
  const pathname = usePathname();
  const router   = useRouter();
  const locale   = pathname.split("/")[1] || "tr";

  const [authState, setAuthState] = useState<AuthState>("loading");
  const [userId,    setUserId]    = useState<string | null>(null);
  const [step,      setStep]      = useState<"info" | "form" | "done">("info");
  const [loading,   setLoading]   = useState(false);
  const [form,      setForm]      = useState({
    printerTypes:  [] as string[],
    materials:     [] as string[],
    buildVolume:   "",
    city:          "",
    district:      "",
    dailyCapacity: "",
    notes:         "",
  });

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setAuthState("unauthenticated"); return; }
      setUserId(user.id);
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_partner_approved, partner_requested_at")
        .eq("id", user.id)
        .single();
      if (profile?.is_partner_approved)       setAuthState("approved");
      else if (profile?.partner_requested_at) setAuthState("pending");
      else                                     setAuthState("not_applied");
    }
    checkAuth();
  }, []);

  function togglePrinterType(pt: string) {
    setForm((f) => ({
      ...f,
      printerTypes: f.printerTypes.includes(pt)
        ? f.printerTypes.filter((x) => x !== pt)
        : [...f.printerTypes, pt],
    }));
  }

  function toggleMaterial(m: string) {
    setForm((f) => ({
      ...f,
      materials: f.materials.includes(m)
        ? f.materials.filter((x) => x !== m)
        : [...f.materials, m],
    }));
  }

  async function handleSubmit() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push(`/${locale}/auth/login?redirect=/become-partner`); return; }
    await supabase.from("profiles").update({
      partner_requested_at: new Date().toISOString(),
      city: form.city,
      bio: [
        form.printerTypes.length  ? `Yazıcılar: ${form.printerTypes.join(", ")}` : null,
        form.materials.length     ? `Malzemeler: ${form.materials.join(", ")}`    : null,
        form.buildVolume          ? `Hacim: ${form.buildVolume}`                  : null,
        form.dailyCapacity        ? `Kapasite: ${form.dailyCapacity}/gün`         : null,
        form.notes                ? form.notes                                     : null,
      ].filter(Boolean).join(" | "),
    }).eq("id", user.id);
    setLoading(false);
    setStep("done");
    setAuthState("pending");
  }

  /* ── Onaylı partner → PartnerDashboard (Navbar/Footer page.tsx'te) ── */
  if (authState === "approved" && userId) {
    return (
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
        <PartnerDashboardClient userId={userId} />
      </div>
    );
  }

  /* ── Yükleniyor ── */
  if (authState === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  /* ── Başvurusu bekliyor ── */
  if (authState === "pending") {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="max-w-lg text-center">
          <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-5">
            <Clock size={32} className="text-amber-500" />
          </div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-3">
            {locale === "tr" ? "Başvurunuz İnceleniyor" : "Application Under Review"}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mb-8">
            {locale === "tr"
              ? "Ekibimiz başvurunuzu inceliyor. Onaylandığınızda bu sayfa otomatik olarak sipariş paneline dönüşecek. Genellikle 2-3 iş günü sürer."
              : "Our team is reviewing your application. Once approved, this page will automatically become the order panel. Usually takes 2-3 business days."
            }
          </p>
          <button
            onClick={() => router.push(`/${locale}/dashboard`)}
            className="px-6 py-2.5 bg-[#FF6B35] text-white rounded-xl text-sm font-medium hover:bg-[#e85e2a] transition-colors"
          >
            {locale === "tr" ? "Dashboard'a Dön" : "Back to Dashboard"}
          </button>
        </div>
      </div>
    );
  }

  /* ── Başvuru tamamlandı ── */
  if (step === "done") {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="max-w-lg text-center">
          <div className="w-16 h-16 rounded-full bg-[rgba(16,185,129,0.1)] flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={32} className="text-[#10B981]" />
          </div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-3">{t("doneTitle")}</h1>
          <p className="text-sm text-[var(--text-secondary)] mb-8">{t("doneDesc")}</p>
          <button
            onClick={() => router.push(`/${locale}/dashboard`)}
            className="px-6 py-2.5 bg-[#FF6B35] text-white rounded-xl text-sm font-medium hover:bg-[#e85e2a] transition-colors"
          >
            {t("toDashboard")}
          </button>
        </div>
      </div>
    );
  }

  /* ── Başvuru formu ── */
  if (step === "form") {
    return (
      <div className="max-w-xl mx-auto w-full px-4 sm:px-6 py-10">
        <button
          onClick={() => setStep("info")}
          className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] mb-6 flex items-center gap-1"
        >
          ← {locale === "tr" ? "Geri" : "Back"}
        </button>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-1">{t("formTitle")}</h1>
        <p className="text-sm text-[var(--text-tertiary)] mb-8">{t("formSubtitle")}</p>

        <div className="flex flex-col gap-5">
          {/* Yazıcı tipi */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] block mb-2">
              {t("printerType")}
            </label>
            <div className="flex flex-wrap gap-2">
              {PRINTER_TYPES.map((pt) => (
                <button key={pt} onClick={() => togglePrinterType(pt)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                    form.printerTypes.includes(pt)
                      ? "border-[#FF6B35] bg-[rgba(255,107,53,0.08)] text-[#FF6B35]"
                      : "border-[var(--border)] text-[var(--text-secondary)]"
                  }`}>
                  {pt}
                </button>
              ))}
            </div>
          </div>

          {/* Malzemeler */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] block mb-2">
              {t("materials")}
            </label>
            <div className="flex flex-wrap gap-2">
              {MATERIALS_LIST.map((m) => (
                <button key={m} onClick={() => toggleMaterial(m)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                    form.materials.includes(m)
                      ? "border-[#FF6B35] bg-[rgba(255,107,53,0.08)] text-[#FF6B35]"
                      : "border-[var(--border)] text-[var(--text-secondary)]"
                  }`}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Grid alanlar */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: t("buildVolume"), key: "buildVolume",   placeholder: "220x220x250"   },
              { label: t("dailyCapacity"), key: "dailyCapacity", placeholder: locale === "tr" ? "2-3 baskı/gün" : "2-3 prints/day" },
              { label: t("city"),        key: "city",          placeholder: locale === "tr" ? "İstanbul" : "Istanbul" },
              { label: t("district"),    key: "district",      placeholder: locale === "tr" ? "Kadıköy"  : "District" },
            ].map((f) => (
              <div key={f.key}>
                <label className="text-xs text-[var(--text-tertiary)] block mb-1">{f.label}</label>
                <input
                  type="text"
                  placeholder={f.placeholder}
                  value={(form as any)[f.key]}
                  onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full h-10 px-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none focus:border-[#FF6B35] transition-colors placeholder:text-[var(--text-tertiary)]"
                />
              </div>
            ))}
          </div>

          {/* Notlar */}
          <div>
            <label className="text-xs text-[var(--text-tertiary)] block mb-1">{t("notes")}</label>
            <textarea
              rows={3}
              placeholder={t("notesPlaceholder")}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none focus:border-[#FF6B35] transition-colors placeholder:text-[var(--text-tertiary)] resize-none"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || form.printerTypes.length === 0 || !form.city || form.materials.length === 0}
            className="w-full h-11 bg-[#FF6B35] text-white rounded-xl text-sm font-medium hover:bg-[#e85e2a] disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
          >
            {loading
              ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />{t("submitting")}</>
              : t("submit")
            }
          </button>
        </div>
      </div>
    );
  }

  /* ── Landing sayfası ── */
  const benefits = [
    { icon: Wallet,  title: t("earn"),     desc: t("earnDesc")     },
    { icon: Clock,   title: t("flexible"), desc: t("flexibleDesc") },
    { icon: Shield,  title: t("secure"),   desc: t("secureDesc")   },
    { icon: Printer, title: t("capacity"), desc: t("capacityDesc") },
  ];

  const steps = [t("step1"), t("step2"), t("step3"), t("step4")];

  return (
    <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-12">
      <div className="text-center mb-12">
        <div className="w-14 h-14 rounded-2xl bg-[rgba(16,185,129,0.1)] flex items-center justify-center mx-auto mb-4 text-[#10B981]">
          <Printer size={28} />
        </div>
        <h1 className="text-3xl font-semibold text-[var(--text-primary)] mb-3">{t("pageTitle")}</h1>
        <p className="text-base text-[var(--text-secondary)] max-w-lg mx-auto">{t("pageSubtitle")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        {benefits.map((b) => {
          const Icon = b.icon;
          return (
            <div key={b.title} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-5">
              <div className="w-10 h-10 rounded-xl bg-[rgba(16,185,129,0.1)] flex items-center justify-center mb-3 text-[#10B981]">
                <Icon size={18} />
              </div>
              <div className="font-medium text-sm text-[var(--text-primary)] mb-1">{b.title}</div>
              <div className="text-xs text-[var(--text-secondary)] leading-relaxed">{b.desc}</div>
            </div>
          );
        })}
      </div>

      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-8 text-center">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">{t("howTitle")}</h2>
        <div className="flex flex-col sm:flex-row justify-center gap-0 mb-8">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center">
              <div className="flex flex-col items-center px-4">
                <div className="w-8 h-8 rounded-full bg-[#FF6B35] text-white text-sm font-semibold flex items-center justify-center mb-2">
                  {i + 1}
                </div>
                <div className="text-sm font-medium text-[var(--text-primary)]">{s}</div>
              </div>
              {i < steps.length - 1 && (
                <div className="hidden sm:block text-[var(--text-tertiary)] text-lg pb-4">→</div>
              )}
            </div>
          ))}
        </div>

        {authState === "unauthenticated" ? (
          <button
            onClick={() => router.push(`/${locale}/auth/login?redirect=/become-partner`)}
            className="px-8 py-3 bg-[#FF6B35] text-white rounded-xl text-sm font-medium hover:bg-[#e85e2a] transition-colors"
          >
            {locale === "tr" ? "Giriş Yap & Başvur →" : "Sign In & Apply →"}
          </button>
        ) : (
          <button
            onClick={() => setStep("form")}
            className="px-8 py-3 bg-[#FF6B35] text-white rounded-xl text-sm font-medium hover:bg-[#e85e2a] transition-colors"
          >
            {t("applyBtn")}
          </button>
        )}
      </div>
    </div>
  );
}