"use client";
import { useState, useEffect } from "react";
import {
  Star, Printer, Heart, Share2,
  ChevronRight, Shield, Truck, Award,
  AlertCircle, User
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { ModelViewer } from "@/components/viewer/ModelViewer";
import { createClient } from "@/lib/supabase/client";
import { RatingSection } from "@/components/models/RatingSection";
import { getModelPublicUrl } from "@/lib/storage";

const MATERIALS = ["PLA", "PETG", "ABS", "TPU", "Resin"];
const COLORS = [
  { name: "Lacivert", hex: "#1E293B" },
  { name: "Turuncu",  hex: "#FF6B35" },
  { name: "Yeşil",    hex: "#10B981" },
  { name: "Beyaz",    hex: "#F8FAFC", border: true },
  { name: "Kırmızı",  hex: "#E24B4A" },
  { name: "Sarı",     hex: "#FBBF24" },
];
const SCALES  = ["50%", "75%", "100%", "150%", "Özel"];
const INFILLS = ["15% (Hafif)", "25% (Standart)", "40% (Sağlam)", "80% (Masif)"];

// Malzeme başına baskı maliyeti (tüm baskı maliyeti dahil)
const MATERIAL_PRINT_COST: Record<string, number> = {
  PLA:   80,
  PETG:  110,
  ABS:   100,
  TPU:   145,
  Resin: 180,
};
const SCALE_FACTOR: Record<string, number> = { "50%": 0.5, "75%": 0.75, "100%": 1, "150%": 1.5, "Özel": 1 };
const SHIPPING_COST = 50;
const PLATFORM_FEE_RATE = 0.10;

interface DBModel {
  id: string;
  title: string;
  description: string | null;
  base_price: number;
  is_free: boolean;
  file_url: string;
  file_format: string;
  avg_rating: number;
  rating_count: number;
  print_count: number;
  view_count: number;
  license: string;
  created_at: string;
  weight_grams: number | null;
  dimension_x: number | null;
  dimension_y: number | null;
  dimension_z: number | null;
  designer: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
    bio: string | null;
  } | null;
  category: { name_tr: string; name_en: string } | null;
}

export function ModelDetailClient({ modelId }: { modelId: string }) {
  const [model,     setModel]     = useState<DBModel | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [notFound,  setNotFound]  = useState(false);
  const [modelUrl,  setModelUrl]  = useState<string | undefined>();
  const [material,  setMaterial]  = useState("PLA");
  const [colorIdx,  setColorIdx]  = useState(0);
  const [scale,     setScale]     = useState("100%");
  const [infill,    setInfill]    = useState("25% (Standart)");
  const [liked,      setLiked]      = useState(false);
  const [step,       setStep]       = useState<"config" | "address" | "payment">("config");
  const [paying,     setPaying]     = useState(false);
  const [payError,   setPayError]   = useState("");
  const [address,    setAddress]    = useState({
    name: "", phone: "", city: "", district: "", line1: "",
  });

  useEffect(() => {
    async function load() {
      setLoading(true);
      const supabase = createClient();

      const { data, error } = await supabase
        .from("models")
        .select(`
          id, title, description, base_price, is_free,
          file_url, file_format, avg_rating, rating_count,
          print_count, view_count, license, created_at,
          weight_grams, dimension_x, dimension_y, dimension_z,
          designer:profiles(id, full_name, username, avatar_url, bio),
          category:categories(name_tr, name_en)
        `)
        .eq("id", modelId)
        .single();

      if (error || !data) { setNotFound(true); setLoading(false); return; }
      setModel(data as unknown as DBModel);

      // Increment view count
      await supabase.rpc("increment_model_views", { model_id: modelId });

      // Get public URL for 3D viewer
      const url = getModelPublicUrl(data.file_url);
      setModelUrl(url);

      setLoading(false);
    }
    load();
  }, [modelId]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-pulse">
          <div className="h-[380px] bg-[var(--bg-secondary)] rounded-2xl" />
          <div className="flex flex-col gap-4">
            <div className="h-8 bg-[var(--bg-secondary)] rounded-xl w-3/4" />
            <div className="h-4 bg-[var(--bg-secondary)] rounded w-1/2" />
            <div className="h-32 bg-[var(--bg-secondary)] rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 text-center">
        <AlertCircle size={40} className="mx-auto mb-4 text-[var(--text-tertiary)] opacity-40" />
        <h2 className="text-lg font-medium text-[var(--text-primary)] mb-2">Model bulunamadı</h2>
        <p className="text-sm text-[var(--text-tertiary)] mb-4">Bu model mevcut değil veya yayından kaldırılmış.</p>
        <a href="/models" className="text-sm text-[#FF6B35] hover:underline">← Modellere dön</a>
      </div>
    );
  }

  if (!model) return null;

  // Fiyat hesaplama motoru
    const INFILL_FACTOR: Record<string, number> = {
    "15% (Hafif)":    0.75,
    "25% (Standart)": 1.00,
    "40% (Sağlam)":   1.30,
    "80% (Masif)":    1.75,
  };
  const designPrice = model.is_free ? 0 : model.base_price;  // Tasarımcının belirlediği tasarım ücreti
  const scaleFactor = SCALE_FACTOR[scale] ?? 1;
  const infillFactor = INFILL_FACTOR[infill] ?? 1;
  const printCost = (MATERIAL_PRINT_COST[material] ?? 80) * scaleFactor * infillFactor;
  const platformFee = (designPrice + printCost) * PLATFORM_FEE_RATE;       // %10 komisyon
  const totalPrice  = designPrice + printCost + platformFee + SHIPPING_COST; // Model ücretsiz olsa bile baskı + kargo ödenir

  const designer = model.designer;
  const designerName = designer?.username
    ? `@${designer.username}`
    : designer?.full_name ?? "Tasarımcı";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] mb-6">
        <a href="/" className="hover:text-[#FF6B35]">Ana Sayfa</a>
        <ChevronRight size={12} />
        <a href="/models" className="hover:text-[#FF6B35]">Modeller</a>
        <ChevronRight size={12} />
        <span className="text-[var(--text-primary)] truncate max-w-[200px]">{model.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT — 3D Viewer */}
        <div>
          <div className="h-[380px] bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl overflow-hidden">
            <ModelViewer url={modelUrl} color={COLORS[colorIdx].hex} format={model.file_format as "stl" | "obj" | "3mf"} toolbar />
          </div>

          {/* Designer strip */}
          <div className="mt-4 flex items-center gap-3">
            {designer?.avatar_url ? (
              <img src={designer.avatar_url} className="w-10 h-10 rounded-full object-cover" alt="" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[rgba(255,107,53,0.1)] flex items-center justify-center text-[#FF6B35] text-sm font-semibold">
                <User size={18} />
              </div>
            )}
            <div>
              <div className="text-sm font-medium text-[var(--text-primary)]">{designerName}</div>
              {designer?.bio && (
                <div className="text-xs text-[var(--text-tertiary)] truncate max-w-[200px]">{designer.bio}</div>
              )}
            </div>
            <div className="ml-auto flex gap-2">
              <button
                onClick={() => setLiked(!liked)}
                className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${
                  liked
                    ? "border-red-300 text-red-400 bg-red-50 dark:bg-red-950/20"
                    : "border-[var(--border)] text-[var(--text-tertiary)] hover:bg-[var(--bg-secondary)]"
                }`}
              >
                <Heart size={15} fill={liked ? "currentColor" : "none"} />
              </button>
              <button
                onClick={() => navigator.share?.({ title: model.title, url: window.location.href })}
                className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--bg-secondary)] transition-all"
              >
                <Share2 size={15} />
              </button>
            </div>
          </div>

          {/* Specs */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { label: "Format",  value: model.file_format.toUpperCase() },
              { label: "Baskı",   value: `${model.print_count}+` },
              { label: "Lisans",  value: model.license === "standard" ? "Standart" : model.license === "open" ? "Açık" : "Çoklu" },
              ...(model.weight_grams ? [{ label: "Ağırlık", value: `~${model.weight_grams}g` }] : []),
              ...(model.dimension_x && model.dimension_y && model.dimension_z
                ? [{ label: "Boyut", value: `${model.dimension_x}×${model.dimension_y}×${model.dimension_z}mm` }]
                : []),
            ].map((s) => (
              <div key={s.label} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-3 text-center">
                <div className="text-sm font-semibold text-[var(--text-primary)]">{s.value}</div>
                <div className="text-xs text-[var(--text-tertiary)] mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Description */}
          {model.description && (
            <div className="mt-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">Açıklama</div>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{model.description}</p>
            </div>
          )}
        </div>

        {/* RIGHT — Config */}
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-2">{model.title}</h1>
          <div className="flex items-center gap-3 mb-5">
            {model.rating_count > 0 ? (
              <>
                <div className="flex items-center gap-0.5">
                  {[1,2,3,4,5].map((s) => (
                    <Star key={s} size={13}
                      fill={s <= Math.round(model.avg_rating) ? "#FBBF24" : "none"}
                      className="text-amber-400"
                    />
                  ))}
                </div>
                <span className="text-sm text-[var(--text-secondary)]">
                  {Number(model.avg_rating).toFixed(1)} · {model.rating_count} değerlendirme
                </span>
              </>
            ) : (
              <span className="text-sm text-[var(--text-tertiary)]">Henüz değerlendirme yok</span>
            )}
            {model.category && (
              <span className="text-xs text-[var(--text-tertiary)] border border-[var(--border)] px-2 py-0.5 rounded-full ml-auto">
                {model.category.name_tr}
              </span>
            )}
          </div>

          {/* Step tabs */}
          <div className="flex items-center gap-2 mb-5 text-xs">
            {(["config", "address", "payment"] as const).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold transition-all ${
                  step === s ? "bg-[#FF6B35] text-white" : "bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]"
                }`}>{i + 1}</div>
                <span className={step === s ? "text-[var(--text-primary)] font-medium" : "text-[var(--text-tertiary)]"}>
                  {["Yapılandır", "Adres", "Ödeme"][i]}
                </span>
                {i < 2 && <ChevronRight size={12} className="text-[var(--text-tertiary)]" />}
              </div>
            ))}
          </div>

          {/* STEP: CONFIG */}
          {step === "config" && (
            <div className="flex flex-col gap-4">
              <ConfigRow label="Malzeme">
                {MATERIALS.map((m) => (
                  <OptionBtn key={m} active={material === m} onClick={() => setMaterial(m)}>{m}</OptionBtn>
                ))}
              </ConfigRow>

              <ConfigRow label={`Renk — ${COLORS[colorIdx].name}`}>
                <div className="flex gap-2.5">
                  {COLORS.map((c, i) => (
                    <button
                      key={c.hex}
                      onClick={() => setColorIdx(i)}
                      title={c.name}
                      className={`w-7 h-7 rounded-full transition-all ${
                        colorIdx === i ? "ring-2 ring-[#FF6B35] ring-offset-2 ring-offset-[var(--bg-primary)]" : ""
                      } ${c.border ? "border border-[var(--border)]" : ""}`}
                      style={{ background: c.hex }}
                    />
                  ))}
                </div>
              </ConfigRow>

              <ConfigRow label="Boyut">
                {SCALES.map((s) => (
                  <OptionBtn key={s} active={scale === s} onClick={() => setScale(s)}>{s}</OptionBtn>
                ))}
              </ConfigRow>

              <ConfigRow label="Dolgu Yoğunluğu">
                {INFILLS.map((inf) => (
                  <OptionBtn key={inf} active={infill === inf} onClick={() => setInfill(inf)}>{inf}</OptionBtn>
                ))}
              </ConfigRow>

              {/* Price breakdown */}
              <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-4 text-sm flex flex-col gap-1.5">
                <div className="flex justify-between text-[var(--text-secondary)]">
                  <span>Tasarım ücreti</span>
                  {model.is_free
                    ? <span className="text-[#10B981]">Ücretsiz</span>
                    : <span>{formatPrice(designPrice)}</span>
                  }
                </div>
                <div className="flex justify-between text-[var(--text-secondary)]">
                  <span>Baskı ({material} · {scale} · {infill.split(" ")[0]})</span>
                  <span>{formatPrice(printCost)}</span>
                </div>
                <div className="flex justify-between text-[var(--text-secondary)]">
                  <span>Kargo</span>
                  <span>{formatPrice(SHIPPING_COST)}</span>
                </div>
                <div className="flex justify-between text-[var(--text-secondary)]">
                  <span>Platform komisyonu (%10)</span>
                  <span>{formatPrice(platformFee)}</span>
                </div>
                <div className="border-t border-[var(--border)] pt-1.5 flex justify-between font-semibold text-[var(--text-primary)]">
                  <span>Toplam</span>
                  <span className="text-[#FF6B35]">{formatPrice(totalPrice)}</span>
                </div>
              </div>

              <div className="flex gap-4">
                {[
                  { icon: Shield, text: "Güvenli Ödeme" },
                  { icon: Truck,  text: "3–5 İş Günü"   },
                  { icon: Award,  text: "Kalite Garantisi" },
                ].map((b) => (
                  <div key={b.text} className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
                    <b.icon size={13} className="text-[#10B981]" /> {b.text}
                  </div>
                ))}
              </div>

              <button
                onClick={() => setStep("address")}
                className="w-full h-11 flex items-center justify-center gap-2 bg-[#FF6B35] text-white rounded-xl font-medium text-sm hover:bg-[#e85e2a] transition-colors active:scale-95"
              >
                <Printer size={16} />
                {`${formatPrice(totalPrice)} — Yazdır →`}
              </button>
            </div>
          )}

          {/* STEP: ADDRESS */}
          {step === "address" && (
            <div className="flex flex-col gap-3">
              <h2 className="font-medium text-[var(--text-primary)]">Teslimat Adresi</h2>
              {[
                { label: "Ad Soyad",  key: "name",     placeholder: "Ahmet Yılmaz",            type: "text" },
                { label: "Telefon",   key: "phone",    placeholder: "+90 5XX XXX XX XX",        type: "tel"  },
                { label: "İl",        key: "city",     placeholder: "İstanbul",                 type: "text" },
                { label: "İlçe",      key: "district", placeholder: "Kadıköy",                  type: "text" },
                { label: "Adres",     key: "line1",    placeholder: "Mahalle, sokak, bina no…", type: "text" },
              ].map((f) => (
                <div key={f.key}>
                  <label className="text-xs text-[var(--text-tertiary)] block mb-1">{f.label}</label>
                  <input
                    type={f.type}
                    placeholder={f.placeholder}
                    value={(address as any)[f.key]}
                    onChange={(e) => setAddress((a) => ({ ...a, [f.key]: e.target.value }))}
                    className="w-full h-10 px-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none focus:border-[#FF6B35] transition-colors placeholder:text-[var(--text-tertiary)]"
                  />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep("config")} className="flex-1 h-10 rounded-xl border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors">← Geri</button>
                <button
                  onClick={async () => {
                    if (!address.name || !address.city || !address.line1) {
                      alert("Lütfen zorunlu alanları doldurun (Ad, İl, Adres).");
                      return;
                    }
                    setStep("payment");
                  }}
                  className="flex-1 h-10 rounded-xl bg-[#FF6B35] text-white text-sm font-medium hover:bg-[#e85e2a] transition-colors"
                >
                  Ödemeye Geç →
                </button>
              </div>
            </div>
          )}

          {/* STEP: PAYMENT */}
          {step === "payment" && (
            <div className="flex flex-col gap-4">
              <h2 className="font-medium text-[var(--text-primary)]">Ödeme</h2>
              <div className="bg-[var(--bg-secondary)] rounded-xl p-4 flex flex-col gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Tasarım ücreti</span>
                  <span>{model.is_free ? "Ücretsiz" : formatPrice(designPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Baskı ({material} · {scale})</span>
                  <span>{formatPrice(printCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Kargo</span>
                  <span>{formatPrice(SHIPPING_COST)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Platform komisyonu</span>
                  <span>{formatPrice(platformFee)}</span>
                </div>
                <div className="border-t border-[var(--border)] pt-2 flex justify-between font-semibold">
                  <span>Toplam</span>
                  <span className="text-[#FF6B35]">{formatPrice(totalPrice)}</span>
                </div>
              </div>
              <div className="bg-[var(--bg-secondary)] rounded-xl p-4 text-center text-sm text-[var(--text-tertiary)]">
                <Shield size={20} className="mx-auto mb-2 text-[#10B981]" />
                İyzico güvenli ödeme sayfasına yönlendirileceksiniz
              </div>
              {payError && (
                <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl px-4 py-3">
                  {payError}
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setStep("address")} className="flex-1 h-10 rounded-xl border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors">← Geri</button>
                <button
                  onClick={async () => {
                    if (!model) return;
                    setPaying(true);
                    setPayError("");
                    try {
                      const res = await fetch("/api/payment/init", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          modelId: model.id,
                          material,
                          colorHex: COLORS[colorIdx].hex,
                          colorName: COLORS[colorIdx].name,
                          scalePercent: SCALE_FACTOR[scale] ? SCALE_FACTOR[scale] * 100 : 100,
                          totalAmount: totalPrice,
                          address,
                        }),
                      });
                      const data = await res.json();
                      if (data.error) { setPayError(data.error); setPaying(false); return; }
                      // Inject iyzico form and submit
                      const div = document.createElement("div");
                      div.innerHTML = data.checkoutFormContent;
                      document.body.appendChild(div);
                      const form = div.querySelector("form");
                      if (form) form.submit();
                    } catch {
                      setPayError("Bağlantı hatası. Lütfen tekrar deneyin.");
                      setPaying(false);
                    }
                  }}
                  disabled={paying}
                  className="flex-1 h-10 rounded-xl bg-[#FF6B35] text-white text-sm font-medium hover:bg-[#e85e2a] disabled:opacity-50 transition-colors"
                >
                  {paying ? "Yönlendiriliyor…" : "İyzico ile Öde →"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <RatingSection modelId={modelId} />
    </div>
  );
}

function ConfigRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">{label}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function OptionBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
        active
          ? "border-[#FF6B35] bg-[rgba(255,107,53,0.08)] text-[#FF6B35]"
          : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
      }`}
    >
      {children}
    </button>
  );
}

