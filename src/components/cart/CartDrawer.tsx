"use client";
import { useState } from "react";
import { X, Trash2, ShoppingCart, ChevronRight, Shield, Truck } from "lucide-react";
import { useCartStore } from "@/lib/cart";
import { useCartDrawer } from "@/components/cart/CartDrawerContext";
import { formatPrice } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { SHIPPING_COST_TL } from "@/lib/printPricing";

type DrawerStep = "cart" | "address" | "payment";

export function CartDrawer() {
  const { isOpen, close } = useCartDrawer();
  const {
    items, removeItem, clearCart,
    subtotal, shipping, grandTotal,
    address, setAddress,
  } = useCartStore();

  const pathname = usePathname();
  const locale   = pathname.split("/")[1] || "tr";

  const [step,     setStep]     = useState<DrawerStep>("cart");
  const [paying,   setPaying]   = useState(false);
  const [payError, setPayError] = useState("");

  if (!isOpen) return null;

  async function handlePayment() {
    if (!address.name || !address.city || !address.line1) {
      setPayError("Lütfen zorunlu alanları doldurun (Ad, İl, Adres).");
      return;
    }
    setPaying(true);
    setPayError("");
    try {
      const res = await fetch("/api/payment/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            modelId:     i.modelId,
            modelTitle:  i.modelTitle,
            material:    i.material,
            colorName:   i.colorName,
            colorHex:    i.colorHex,
            scale:       i.scale,
            infill:      i.infill,
            designPrice: i.designPrice,
            printCost:   i.printCost,
            itemTotal:   i.itemTotal,
          })),
          subtotal:   subtotal(),
          shipping:   shipping(),
          grandTotal: grandTotal(),
          address,
        }),
      });
      const data = await res.json();
      if (data.error) { setPayError(data.error); setPaying(false); return; }
      const div = document.createElement("div");
      div.innerHTML = data.checkoutFormContent;
      document.body.appendChild(div);
      const form = div.querySelector("form");
      if (form) form.submit();
    } catch {
      setPayError("Bağlantı hatası. Lütfen tekrar deneyin.");
      setPaying(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={close} />

      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-[var(--bg-primary)] border-l border-[var(--border)] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-[#FF6B35]" />
            <span className="font-semibold text-[var(--text-primary)]">Sepetim</span>
            {items.length > 0 && (
              <span className="text-xs text-[var(--text-tertiary)] bg-[var(--bg-secondary)] px-2 py-0.5 rounded-full">
                {items.length} ürün
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {items.length > 0 && step === "cart" && (
              <button onClick={clearCart} className="text-xs text-[var(--text-tertiary)] hover:text-red-400 transition-colors">
                Temizle
              </button>
            )}
            <button onClick={close} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-tertiary)] transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Step indicator */}
        {items.length > 0 && (
          <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--border)] text-xs">
            {(["cart", "address", "payment"] as const).map((s, i) => {
              const currentIdx = ["cart","address","payment"].indexOf(step);
              return (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold transition-all ${
                    step === s ? "bg-[#FF6B35] text-white"
                      : i < currentIdx ? "bg-[rgba(16,185,129,0.15)] text-[#10B981]"
                      : "bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]"
                  }`}>{i + 1}</div>
                  <span className={step === s ? "text-[var(--text-primary)] font-medium" : "text-[var(--text-tertiary)]"}>
                    {["Sepet", "Adres", "Ödeme"][i]}
                  </span>
                  {i < 2 && <ChevronRight size={11} className="text-[var(--text-tertiary)]" />}
                </div>
              );
            })}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* Empty */}
          {items.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-[var(--text-tertiary)] px-6 text-center">
              <ShoppingCart size={40} className="opacity-20 mb-4" />
              <p className="text-sm font-medium mb-1">Sepetiniz boş</p>
              <p className="text-xs opacity-70">Model sayfasından ürün ekleyebilirsiniz.</p>
              <button onClick={close} className="mt-6 text-sm text-[#FF6B35] hover:underline">
                Modellere göz at →
              </button>
            </div>
          )}

          {/* STEP: CART */}
          {step === "cart" && items.length > 0 && (
            <div className="flex flex-col divide-y divide-[var(--border)]">
              {items.map((item) => (
                <div key={item.cartItemId} className="flex gap-3 px-5 py-4">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-[var(--bg-secondary)] shrink-0 flex items-center justify-center">
                    {item.thumbnailUrl ? (
                      <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded-full" style={{ background: item.colorHex }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[var(--text-primary)] truncate">{item.modelTitle}</div>
                    <div className="text-xs text-[var(--text-tertiary)] mt-0.5">
                      {item.material} · {item.scale} · {item.infill.split(" ")[0]}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="w-3 h-3 rounded-full border border-[var(--border)]" style={{ background: item.colorHex }} />
                      <span className="text-xs text-[var(--text-tertiary)]">{item.colorName}</span>
                    </div>
                    <div className="text-sm font-semibold text-[#FF6B35] mt-1">
                      {formatPrice(item.itemTotal, locale)}
                    </div>
                  </div>
                  <button
                    onClick={() => removeItem(item.cartItemId)}
                    className="text-[var(--text-tertiary)] hover:text-red-400 transition-colors shrink-0 mt-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* STEP: ADDRESS */}
          {step === "address" && (
            <div className="flex flex-col gap-3 px-5 py-5">
              <h3 className="font-medium text-[var(--text-primary)]">Teslimat Adresi</h3>
              {[
                { label: "Ad Soyad *", key: "name",     placeholder: "Ahmet Yılmaz",            type: "text" },
                { label: "Telefon",    key: "phone",    placeholder: "+90 5XX XXX XX XX",        type: "tel"  },
                { label: "İl *",       key: "city",     placeholder: "İstanbul",                 type: "text" },
                { label: "İlçe",       key: "district", placeholder: "Kadıköy",                  type: "text" },
                { label: "Adres *",    key: "line1",    placeholder: "Mahalle, sokak, bina no…", type: "text" },
              ].map((f) => (
                <div key={f.key}>
                  <label className="text-xs text-[var(--text-tertiary)] block mb-1">{f.label}</label>
                  <input
                    type={f.type}
                    placeholder={f.placeholder}
                    value={(address as any)[f.key]}
                    onChange={(e) => setAddress({ ...address, [f.key]: e.target.value })}
                    className="w-full h-10 px-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none focus:border-[#FF6B35] transition-colors placeholder:text-[var(--text-tertiary)]"
                  />
                </div>
              ))}
              {payError && (
                <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl px-4 py-3">
                  {payError}
                </div>
              )}
            </div>
          )}

          {/* STEP: PAYMENT */}
          {step === "payment" && (
            <div className="flex flex-col gap-4 px-5 py-5">
              <h3 className="font-medium text-[var(--text-primary)]">Sipariş Özeti</h3>
              <div className="bg-[var(--bg-secondary)] rounded-xl p-4 flex flex-col gap-2 text-sm">
                {items.map((item) => (
                  <div key={item.cartItemId} className="flex justify-between text-[var(--text-secondary)]">
                    <span className="truncate max-w-[200px]">{item.modelTitle} ({item.material})</span>
                    <span className="shrink-0 ml-2">{formatPrice(item.itemTotal, locale)}</span>
                  </div>
                ))}
                <div className="border-t border-[var(--border)] pt-2 mt-1 flex flex-col gap-1.5">
                  <div className="flex justify-between text-[var(--text-secondary)]">
                    <span>Kargo</span>
                    <span>{formatPrice(shipping(), locale)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-[var(--text-primary)] pt-1 border-t border-[var(--border)]">
                    <span>Toplam</span>
                    <span className="text-[#FF6B35]">{formatPrice(grandTotal(), locale)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-[var(--bg-secondary)] rounded-xl p-3 flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                <Shield size={14} className="text-[#10B981] shrink-0" />
                İyzico güvenli ödeme sayfasına yönlendirileceksiniz
              </div>

              {payError && (
                <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl px-4 py-3">
                  {payError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-[var(--border)] px-5 py-4 flex flex-col gap-3">

            {/* Fiyat özeti */}
            <div className="flex flex-col gap-1.5 text-sm">
              {items.map((item) => (
                <div key={item.cartItemId} className="flex justify-between text-[var(--text-secondary)]">
                  <span className="truncate max-w-[220px]">{item.modelTitle}</span>
                  <span className="shrink-0 ml-2">{formatPrice(item.itemTotal, locale)}</span>
                </div>
              ))}
              <div className="flex justify-between text-[var(--text-secondary)] pt-1 border-t border-[var(--border)]">
                <span>Kargo</span>
                <span>{formatPrice(SHIPPING_COST_TL, locale)}</span>
              </div>
              <div className="flex justify-between font-semibold text-[var(--text-primary)] pt-1 border-t border-[var(--border)]">
                <span>Toplam</span>
                <span className="text-[#FF6B35]">{formatPrice(grandTotal(), locale)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              {[
                { icon: Shield, text: "Güvenli Ödeme" },
                { icon: Truck,  text: "Tek Kargo"     },
              ].map((b) => (
                <div key={b.text} className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
                  <b.icon size={11} className="text-[#10B981]" /> {b.text}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              {step !== "cart" && (
                <button
                  onClick={() => { setPayError(""); setStep(step === "payment" ? "address" : "cart"); }}
                  className="flex-1 h-10 rounded-xl border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
                >
                  ← Geri
                </button>
              )}
              {step === "cart" && (
                <button
                  onClick={() => setStep("address")}
                  className="flex-1 h-10 rounded-xl bg-[#FF6B35] text-white text-sm font-medium hover:bg-[#e85e2a] transition-colors"
                >
                  Sipariş Ver →
                </button>
              )}
              {step === "address" && (
                <button
                  onClick={() => {
                    if (!address.name || !address.city || !address.line1) {
                      setPayError("Lütfen zorunlu alanları doldurun.");
                      return;
                    }
                    setPayError("");
                    setStep("payment");
                  }}
                  className="flex-1 h-10 rounded-xl bg-[#FF6B35] text-white text-sm font-medium hover:bg-[#e85e2a] transition-colors"
                >
                  Ödemeye Geç →
                </button>
              )}
              {step === "payment" && (
                <button
                  onClick={handlePayment}
                  disabled={paying}
                  className="flex-1 h-10 rounded-xl bg-[#FF6B35] text-white text-sm font-medium hover:bg-[#e85e2a] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {paying ? (
                    <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Yönlendiriliyor…</>
                  ) : "İyzico ile Öde →"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}