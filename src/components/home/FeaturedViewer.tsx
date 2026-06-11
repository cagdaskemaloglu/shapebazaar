"use client";
import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { ModelViewer } from "@/components/viewer/ModelViewer";
import { createClient } from "@/lib/supabase/client";
import { getModelPublicUrl } from "@/lib/storage";
import { usePathname } from "next/navigation";
import {
  calcPrintCost,
  calcTotalPrice,
  SCALE_FACTOR,
} from "@/lib/printPricing";

const MATERIALS = ["PLA", "PETG", "ABS", "TPU"];
const COLORS = [
  { name: "Lacivert", hex: "#1E293B" },
  { name: "Turuncu",  hex: "#FF6B35" },
  { name: "Yeşil",    hex: "#10B981" },
  { name: "Beyaz",    hex: "#F8FAFC", border: true },
  { name: "Kırmızı",  hex: "#E24B4A" },
];
const SCALES = ["50%", "75%", "100%", "150%", "Özel"];

interface FeaturedModel {
  id: string;
  title: string;
  base_price: number;
  is_free: boolean;
  avg_rating: number;
  rating_count: number;
  file_url: string;
  file_format: string;
  weight_grams: number | null;
  designer: {
    username: string | null;
    full_name: string | null;
  } | null;
  rotation_x: number | null;
  rotation_y: number | null;
  rotation_z: number | null;
}

export function FeaturedViewer() {
  const pathname = usePathname();
  const locale   = pathname.split("/")[1] || "tr";

  const [model,    setModel]    = useState<FeaturedModel | null>(null);
  const [modelUrl, setModelUrl] = useState<string | undefined>();
  const [loading,  setLoading]  = useState(true);

  const [material, setMaterial] = useState("PLA");
  const [colorIdx, setColorIdx] = useState(1);
  const [scale,    setScale]    = useState("100%");

  useEffect(() => {
    async function fetchRandom() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("models")
        .select(`
          id, title, base_price, is_free,
          avg_rating, rating_count,
          file_url, file_format, weight_grams,
          rotation_x, rotation_y, rotation_z,
          designer:profiles(username, full_name)
        `)
        .order("print_count", { ascending: false })
        .limit(20);

      if (error || !data || data.length === 0) { setLoading(false); return; }

      const picked = data[Math.floor(Math.random() * data.length)] as unknown as FeaturedModel;
      setModel(picked);
      setModelUrl(getModelPublicUrl(picked.file_url));
      setLoading(false);
    }
    fetchRandom();
  }, []);

  if (loading) {
    return (
      <section className="bg-[var(--bg-secondary)] border-b border-[var(--border)] py-10">
        <p className="text-center text-sm text-[var(--text-tertiary)] mb-6">
          Bir model seç — yapılandır — sipariş ver
        </p>
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl overflow-hidden flex flex-col md:flex-row animate-pulse">
            <div className="md:w-[280px] h-[220px] bg-[var(--bg-tertiary)]" />
            <div className="flex-1 p-5 flex flex-col gap-3">
              <div className="h-4 bg-[var(--bg-tertiary)] rounded w-2/3" />
              <div className="h-3 bg-[var(--bg-tertiary)] rounded w-1/3" />
              <div className="h-8 bg-[var(--bg-tertiary)] rounded w-full mt-2" />
              <div className="h-8 bg-[var(--bg-tertiary)] rounded w-full" />
              <div className="h-8 bg-[var(--bg-tertiary)] rounded w-full" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!model) return null;

  const designerTag = model.designer?.username
    ? `@${model.designer.username}`
    : model.designer?.full_name ?? "Tasarımcı";

  const designPrice             = model.is_free ? 0 : model.base_price;
  const weightGrams             = model.weight_grams ?? 50;
  const printCost               = calcPrintCost(material, weightGrams, SCALE_FACTOR[scale] ?? 1);
  const { platformFee, total: totalPrice } = calcTotalPrice(designPrice, printCost);

  return (
    <section className="bg-[var(--bg-secondary)] border-b border-[var(--border)] py-10">
      <p className="text-center text-sm text-[var(--text-tertiary)] mb-6">
        Bir model seç — yapılandır — sipariş ver
      </p>

      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl overflow-hidden flex flex-col md:flex-row">

          {/* 3D Viewer */}
          <div className="md:w-[280px] h-[220px] md:h-auto shrink-0 relative">
            <ModelViewer
              url={modelUrl}
              format={model.file_format as "stl" | "obj" | "3mf"}
              color={COLORS[colorIdx].hex}
              toolbar={false}
              rotation={
                model.rotation_x || model.rotation_y || model.rotation_z
                  ? { x: model.rotation_x ?? 0, y: model.rotation_y ?? 0, z: model.rotation_z ?? 0 }
                  : undefined
              }
            />
          </div>

          {/* Config */}
          <div className="flex-1 p-5">
            <div className="font-medium text-[var(--text-primary)] mb-1 truncate">{model.title}</div>
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] mb-4">
              <span>{designerTag}</span>
              {model.rating_count > 0 && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-0.5 text-[#10B981]">
                    <Star size={10} fill="#10B981" /> {Number(model.avg_rating).toFixed(1)}
                  </span>
                </>
              )}
            </div>

            {/* Material */}
            <div className="mb-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">Malzeme</div>
              <div className="flex gap-1.5 flex-wrap">
                {MATERIALS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setMaterial(m)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                      material === m
                        ? "border-[#FF6B35] bg-[rgba(255,107,53,0.08)] text-[#FF6B35]"
                        : "border-[var(--border)] text-[var(--text-secondary)]"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div className="mb-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">
                Renk — {COLORS[colorIdx].name}
              </div>
              <div className="flex gap-2">
                {COLORS.map((c, i) => (
                  <button
                    key={c.hex}
                    onClick={() => setColorIdx(i)}
                    className={`w-6 h-6 rounded-full transition-all ${
                      colorIdx === i ? "ring-2 ring-[#FF6B35] ring-offset-2 ring-offset-[var(--bg-primary)]" : ""
                    } ${c.border ? "border border-[var(--border)]" : ""}`}
                    style={{ background: c.hex }}
                  />
                ))}
              </div>
            </div>

            {/* Scale */}
            <div className="mb-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">Boyut</div>
              <div className="flex gap-1.5 flex-wrap">
                {SCALES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setScale(s)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                      scale === s
                        ? "border-[#FF6B35] bg-[rgba(255,107,53,0.08)] text-[#FF6B35]"
                        : "border-[var(--border)] text-[var(--text-secondary)]"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Price + CTA */}
            <div className="flex items-end justify-between pt-3 border-t border-[var(--border)]">
              <div>
                <div className="text-xl font-semibold text-[var(--text-primary)]">
                  {formatPrice(totalPrice, locale)}
                </div>
                <div className="text-xs text-[var(--text-tertiary)] mt-0.5">3–5 iş günü · Kargo dahil</div>
              </div>
              <a
                href={`/${locale}/models/${model.id}`}
                className="flex items-center gap-1.5 bg-[#FF6B35] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#e85e2a] transition-colors"
              >
                Yazdır →
              </a>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}