"use client";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Globe, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const REGIONS = [
  { code: "TR",    label: "Türkiye",        flag: "🇹🇷" },
  { code: "US",    label: "United States",  flag: "🇺🇸" },
  { code: "GB",    label: "United Kingdom", flag: "🇬🇧" },
  { code: "DE",    label: "Germany",        flag: "🇩🇪" },
  { code: "FR",    label: "France",         flag: "🇫🇷" },
  { code: "NL",    label: "Netherlands",    flag: "🇳🇱" },
  { code: "AE",    label: "UAE",            flag: "🇦🇪" },
  { code: "SA",    label: "Saudi Arabia",   flag: "🇸🇦" },
  { code: "OTHER", label: "Other",          flag: "🌍" },
];

export default function OnboardingPage() {
  const router   = useRouter();
  const pathname = usePathname();
  const locale   = pathname.split("/")[1] || "tr";

  const [selected, setSelected] = useState("TR");
  const [saving,   setSaving]   = useState(false);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push(`/${locale}`); return; }
      setUserName(user.user_metadata?.full_name?.split(" ")[0] ?? "");
    });
  }, [router, locale]);

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("profiles")
      .update({ region: selected, onboarding_done: true })
      .eq("id", user.id);

    router.push(`/${locale}/dashboard`);
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-[#FF6B35] flex items-center justify-center">
              <Globe size={16} className="text-white" />
            </div>
            <span className="font-semibold text-[var(--text-primary)]">ShapeBazaar</span>
          </div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
            {userName ? `Hoş geldin, ${userName}! 👋` : "Hoş geldin! 👋"}
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Siparişlerin doğru bölgedeki yazıcı ortaklarına ulaşması için bölgeni seç.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-6">
          {REGIONS.map((r) => (
            <button
              key={r.code}
              onClick={() => setSelected(r.code)}
              className={`relative flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-center transition-all ${
                selected === r.code
                  ? "border-[#FF6B35] bg-[rgba(255,107,53,0.08)]"
                  : "border-[var(--border)] hover:border-[var(--border-strong)] bg-[var(--bg-secondary)]"
              }`}
            >
              {selected === r.code && (
                <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#FF6B35] flex items-center justify-center">
                  <Check size={10} className="text-white" />
                </div>
              )}
              <span className="text-2xl">{r.flag}</span>
              <span className="text-xs font-medium text-[var(--text-primary)] leading-tight">{r.label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-11 rounded-xl bg-[#FF6B35] text-white font-medium text-sm hover:bg-[#e85e2a] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {saving
            ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Kaydediliyor…</>
            : "Devam Et →"
          }
        </button>

        <p className="text-center text-xs text-[var(--text-tertiary)] mt-4">
          Daha sonra Dashboard → Ayarlar'dan değiştirebilirsin.
        </p>
      </div>
    </div>
  );
}
