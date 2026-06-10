"use client";
import { useState } from "react";
import { Star } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { ModelViewer } from "@/components/viewer/ModelViewer";

const MATERIALS = ["PLA", "PETG", "ABS", "TPU"];
const COLORS = [
  { name: "Lacivert", hex: "#1E293B" },
  { name: "Turuncu",  hex: "#FF6B35" },
  { name: "Yeşil",    hex: "#10B981" },
  { name: "Beyaz",    hex: "#F8FAFC", border: true },
  { name: "Kırmızı",  hex: "#E24B4A" },
];
const SCALES = ["50%", "75%", "100%", "150%", "Özel"];

const MATERIAL_PRICE: Record<string, number> = { PLA: 0, PETG: 35, ABS: 25, TPU: 55 };
const SCALE_PRICE:    Record<string, number> = { "50%": -60, "75%": -30, "100%": 0, "150%": 70, "Özel": 40 };

export function FeaturedViewer() {
  const [material, setMaterial] = useState("PLA");
  const [color, setColor]       = useState(0);
  const [scale, setScale]       = useState("100%");

  const price = 189 + (MATERIAL_PRICE[material] ?? 0) + (SCALE_PRICE[scale] ?? 0);

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
              color={COLORS[color].hex}
              toolbar={false}
            />
          </div>

          {/* Config */}
          <div className="flex-1 p-5">
            <div className="font-medium text-[var(--text-primary)] mb-1">Modüler Raf Sistemi v2</div>
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] mb-4">
              <span>@designerAhmet</span>
              <span>·</span>
              <span className="flex items-center gap-0.5 text-[#10B981]">
                <Star size={10} fill="#10B981" /> 4.9
              </span>
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
                Renk — {COLORS[color].name}
              </div>
              <div className="flex gap-2">
                {COLORS.map((c, i) => (
                  <button
                    key={c.hex}
                    onClick={() => setColor(i)}
                    className={`w-6 h-6 rounded-full transition-all ${
                      color === i ? "ring-2 ring-[#FF6B35] ring-offset-2 ring-offset-[var(--bg-primary)]" : ""
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
                <div className="text-xl font-semibold text-[var(--text-primary)]">{formatPrice(price)}</div>
                <div className="text-xs text-[var(--text-tertiary)] mt-0.5">3–5 iş günü · Kargo dahil</div>
              </div>
              <a
                href="/models/model-1"
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
