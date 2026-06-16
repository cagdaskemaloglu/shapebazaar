"use client";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Printer, CheckCircle, Shield, Wallet, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PartnerDashboardClient } from "@/components/partner/PartnerDashboardClient";

const PRINTER_TYPES  = ["FDM (PLA/PETG/ABS)", "FDM (Multi-renk)", "Resin (SLA/DLP)", "SLS", "Diğer"];
const MATERIALS_LIST = ["PLA", "PETG", "ABS", "TPU", "Resin", "Nylon", "ASA"];

type AuthState = "loading" | "unauthenticated" | "pending" | "approved" | "not_applied";

export function BecomePartnerClient() {
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

  /* ── Onaylı partner: Navbar + PartnerDashboard ── */
  if (authState === "approved" && userId) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
          <PartnerDashboardClient userId={userId} />
        </div>
        <Footer />
      </div>
    );
  }

  /* ── Yükleniyor ── */
  if (authState === "loading") {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  /* ── Başvurusu bekliyor ── */
  if (authState === "pending") {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="max-w-lg text-center">
            <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-5">
              <Clock size={32} className="text-amber-500" />
            </div>
            <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-3">Başvurunuz İnceleniyor</h1>
            <p className="text-sm text-[var(--text-secondary)] mb-8">
              Ekibimiz başvurunuzu inceliyor. Onaylandığınızda bu sayfa otomatik olarak
              sipariş paneline dönüşecek. Genellikle 2-3 iş günü sürer.
            </p>
            <button onClick={() => router.push(`/${locale}/dashboard`)}
              className="px-6 py-2.5 bg-[#FF6B35] text-white rounded-xl text-sm font-medium hover:bg-[#e85e2a] transition-colors">
              Dashboard'a Dön
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  /* ── Başvuru tamamlandı ── */
  if (step === "done") {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="max-w-lg text-center">
            <div className="w-16 h-16 rounded-full bg-[rgba(16,185,129,0.1)] flex items-center justify-center mx-auto mb-5">
              <CheckCircle size={32} className="text-[#10B981]" />
            </div>
            <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-3">Başvurunuz Alındı!</h1>
            <p className="text-sm text-[var(--text-secondary)] mb-8">
              Ekibimiz başvurunuzu inceleyecek ve 2-3 iş günü içinde e-posta ile dönüş yapacak.
              Onaylandığınızda bu sayfa sipariş paneline dönüşecek.
            </p>
            <button onClick={() => router.push(`/${locale}/dashboard`)}
              className="px-6 py-2.5 bg-[#FF6B35] text-white rounded-xl text-sm font-medium hover:bg-[#e85e2a] transition-colors">
              Dashboard'a Git
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  /* ── Başvuru formu ── */
  if (step === "form") {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 max-w-xl mx-auto w-full px-4 sm:px-6 py-10">
          <button onClick={() => setStep("info")}
            className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] mb-6 flex items-center gap-1">
            ← Geri
          </button>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-1">Yazıcı Ortağı Başvurusu</h1>
          <p className="text-sm text-[var(--text-tertiary)] mb-8">Bilgilerinizi eksiksiz doldurun, 2-3 iş günü içinde dönüş yapılacak.</p>

          <div className="flex flex-col gap-5">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] block mb-2">
                Yazıcı Tipi * <span className="normal-case font-normal">(çoklu seçilebilir)</span>
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

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] block mb-2">
                Desteklediğiniz Malzemeler *
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

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Baskı Hacmi (mm)", key: "buildVolume",   placeholder: "220x220x250"   },
                { label: "Günlük Kapasite",  key: "dailyCapacity", placeholder: "2-3 baskı/gün" },
                { label: "Şehir *",          key: "city",          placeholder: "İstanbul"        },
                { label: "İlçe",             key: "district",      placeholder: "Kadıköy"         },
              ].map((f) => (
                <div key={f.key}>
                  <label className="text-xs text-[var(--text-tertiary)] block mb-1">{f.label}</label>
                  <input type="text" placeholder={f.placeholder} value={(form as any)[f.key]}
                    onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    className="w-full h-10 px-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none focus:border-[#FF6B35] transition-colors placeholder:text-[var(--text-tertiary)]" />
                </div>
              ))}
            </div>

            <div>
              <label className="text-xs text-[var(--text-tertiary)] block mb-1">Deneyim & Notlar</label>
              <textarea rows={3} placeholder="3D baskı deneyiminiz, özel yetenekleriniz..."
                value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none focus:border-[#FF6B35] transition-colors placeholder:text-[var(--text-tertiary)] resize-none" />
            </div>

            <button onClick={handleSubmit}
              disabled={loading || form.printerTypes.length === 0 || !form.city || form.materials.length === 0}
              className="w-full h-11 bg-[#FF6B35] text-white rounded-xl text-sm font-medium hover:bg-[#e85e2a] disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
              {loading
                ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Gönderiliyor…</>
                : "Başvuruyu Gönder →"}
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  /* ── Landing sayfası ── */
  const benefits = [
    { icon: Wallet,  title: "Her baskıdan kazan",     desc: "Tamamladığın her sipariş için cüzdanına puan eklenir." },
    { icon: Clock,   title: "Esnek çalışma",          desc: "İstediğin siparişi al, istediğin zaman çalış."         },
    { icon: Shield,  title: "Güvenli ödeme",          desc: "Ödemeler platform üzerinden güvence altında."           },
    { icon: Printer, title: "Kapasiteni değerlendir", desc: "Boş yazıcını gelir kaynağına dönüştür."                 },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-12">
        <div className="text-center mb-12">
          <div className="w-14 h-14 rounded-2xl bg-[rgba(16,185,129,0.1)] flex items-center justify-center mx-auto mb-4 text-[#10B981]">
            <Printer size={28} />
          </div>
          <h1 className="text-3xl font-semibold text-[var(--text-primary)] mb-3">Yazıcı Ortağı Ol</h1>
          <p className="text-base text-[var(--text-secondary)] max-w-lg mx-auto">
            3D yazıcınızı ShapeBazaar ekosistemine katın. Sipariş havuzundan iş alın, her baskıdan kazanın.
          </p>
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
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">Nasıl çalışır?</h2>
          <div className="flex flex-col sm:flex-row justify-center gap-0 mb-8">
            {["Başvur", "Onay al", "Siparişleri gör", "Kazan"].map((s, i) => (
              <div key={s} className="flex items-center">
                <div className="flex flex-col items-center px-4">
                  <div className="w-8 h-8 rounded-full bg-[#FF6B35] text-white text-sm font-semibold flex items-center justify-center mb-2">{i + 1}</div>
                  <div className="text-sm font-medium text-[var(--text-primary)]">{s}</div>
                </div>
                {i < 3 && <div className="hidden sm:block text-[var(--text-tertiary)] text-lg pb-4">→</div>}
              </div>
            ))}
          </div>
          {authState === "unauthenticated" ? (
            <button onClick={() => router.push(`/${locale}/auth/login?redirect=/become-partner`)}
              className="px-8 py-3 bg-[#FF6B35] text-white rounded-xl text-sm font-medium hover:bg-[#e85e2a] transition-colors">
              Giriş Yap & Başvur →
            </button>
          ) : (
            <button onClick={() => setStep("form")}
              className="px-8 py-3 bg-[#FF6B35] text-white rounded-xl text-sm font-medium hover:bg-[#e85e2a] transition-colors">
              Başvur →
            </button>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}