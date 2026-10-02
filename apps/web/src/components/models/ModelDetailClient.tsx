"use client";
import { useState, useEffect } from "react";
import {
  Star, Heart, Share2,
  ChevronRight, Shield, Truck, Award,
  AlertCircle, User, Box, Image as ImageIcon,
  ShoppingCart, CheckCircle2
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { ModelViewer } from "@/components/viewer/ModelViewer";
import { createClient } from "@/lib/supabase/client";
import { RatingSection } from "@/components/models/RatingSection";
import { PrintPhotoGallery } from "@/components/models/PrintPhotoGallery";
import { getModelPublicUrl } from "@/lib/storage";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  calcPrintCost,
  calcTotalPrice,
  SCALE_FACTOR,
  INFILL_FACTOR,
} from "@shapebazaar/shared";
import { useCartStore, buildCartItem } from "@/lib/cart";
import { useCartDrawer } from "@/components/cart/CartDrawerContext";

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
// INFILLS değerleri hesaplama/cart için sabit kalır — sadece görünen etiket çevrilir
const INFILL_LABEL_KEY: Record<string, string> = {
  "15% (Hafif)":    "light",
  "25% (Standart)": "standard",
  "40% (Sağlam)":   "solid",
  "80% (Masif)":    "dense",
};

type ViewerTab = "3d" | "photos";

interface ModelImage {
  id: string;
  url: string;
  order_index: number;
}

interface DBModel {
  id: string;
  title: string;
  title_en: string | null;
  description: string | null;
  description_en: string | null;
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
  rotation_x: number | null;
  rotation_y: number | null;
  rotation_z: number | null;
  thumbnail_url: string | null;
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
  const pathname = usePathname();
  const locale   = pathname.split("/")[1] || "tr";
  const t        = useTranslations("modelDetail");
  const tFree    = useTranslations("modelsPage");

  const [model,    setModel]    = useState<DBModel | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [modelUrl, setModelUrl] = useState<string | undefined>();
  const [images,   setImages]   = useState<ModelImage[]>([]);

  const [material,    setMaterial]    = useState("PLA");
  const [colorIdx,    setColorIdx]    = useState(1);
  const [scale,       setScale]       = useState("100%");
  const [infill,      setInfill]      = useState("25% (Standart)");
  const [liked,       setLiked]       = useState(false);
  const [viewerTab,   setViewerTab]   = useState<ViewerTab>("3d");
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [addedToCart, setAddedToCart] = useState(false);

  const addItem        = useCartStore((s) => s.addItem);
  const { open: openCart } = useCartDrawer();

  useEffect(() => {
    async function load() {
      setLoading(true);
      const supabase = createClient();

      const { data, error } = await supabase
        .from("models")
        .select(`
          id, title, title_en, description, description_en, base_price, is_free,
          file_url, file_format, avg_rating, rating_count,
          print_count, view_count, license, created_at,
          weight_grams, dimension_x, dimension_y, dimension_z,
          rotation_x, rotation_y, rotation_z, thumbnail_url,
          designer:profiles(id, full_name, username, avatar_url, bio),
          category:categories(name_tr, name_en)
        `)
        .eq("id", modelId)
        .single();

      if (error || !data) { setNotFound(true); setLoading(false); return; }
      setModel(data as unknown as DBModel);
      await supabase.rpc("increment_model_views", { model_id: modelId });
      setModelUrl(getModelPublicUrl(data.file_url));

      const { data: imgs } = await supabase
        .from("model_images")
        .select("id, url, order_index")
        .eq("model_id", modelId)
        .order("order_index");
      setImages((imgs as ModelImage[]) ?? []);

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
        <h2 className="text-lg font-medium text-[var(--text-primary)] mb-2">{t("notFound")}</h2>
        <p className="text-sm text-[var(--text-tertiary)] mb-4">{t("notFoundDesc")}</p>
        <a href="/models" className="text-sm text-[#FF6B35] hover:underline">{t("backToModels")}</a>
      </div>
    );
  }

  if (!model) return null;

  // ── Fiyat hesaplama ──
  const designPrice = model.is_free ? 0 : model.base_price;
  const weightGrams = model.weight_grams ?? 50;
  const printCost   = calcPrintCost(
    material, weightGrams,
    SCALE_FACTOR[scale]   ?? 1,
    INFILL_FACTOR[infill] ?? 1,
  );
  const { platformFee, total: totalPrice } = calcTotalPrice(designPrice, printCost);

  const designer     = model.designer;
  const designerName = designer?.username
    ? `@${designer.username}`
    : designer?.full_name ?? t("designer");

  const displayTitle       = locale === "en" && model.title_en ? model.title_en : model.title;
  const displayDescription = locale === "en" && model.description_en ? model.description_en : model.description;

  const modelRotation =
    model.rotation_x || model.rotation_y || model.rotation_z
      ? { x: model.rotation_x ?? 0, y: model.rotation_y ?? 0, z: model.rotation_z ?? 0 }
      : undefined;

  function handleAddToCart() {
    if (!model) return;
    addItem(buildCartItem({
      modelId:      model.id,
      modelTitle:   model.title,
      thumbnailUrl: model.thumbnail_url ?? undefined,
      material,
      colorName:    COLORS[colorIdx].name,
      colorHex:     COLORS[colorIdx].hex,
      scale,
      infill,
      weightGrams:  model.weight_grams ?? 50,
      isFree:       model.is_free,
      basePrice:    model.base_price,
    }));
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
    openCart();
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] mb-6">
        <a href="/" className="hover:text-[#FF6B35]">{t("home")}</a>
        <ChevronRight size={12} />
        <a href="/models" className="hover:text-[#FF6B35]">{t("models")}</a>
        <ChevronRight size={12} />
        <span className="text-[var(--text-primary)] truncate max-w-[200px]">{displayTitle}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT */}
        <div>
          {/* Tab bar */}
          <div className="flex gap-1 mb-3">
            <button
              onClick={() => setViewerTab("3d")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewerTab === "3d"
                  ? "bg-[#FF6B35] text-white"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
              }`}
            >
              <Box size={12} /> 3D Model
            </button>
            <button
              onClick={() => setViewerTab("photos")}
              disabled={images.length === 0}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                viewerTab === "photos"
                  ? "bg-[#FF6B35] text-white"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
              }`}
            >
              <ImageIcon size={12} /> {t("photos")}
              {images.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  viewerTab === "photos" ? "bg-white/20" : "bg-[var(--bg-tertiary)]"
                }`}>
                  {images.length}
                </span>
              )}
            </button>
          </div>

          {/* 3D Viewer */}
          {viewerTab === "3d" && (
            <div className="h-[380px] bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl overflow-hidden">
              <ModelViewer
                url={modelUrl}
                color={COLORS[colorIdx].hex}
                format={model.file_format as "stl" | "obj" | "3mf"}
                toolbar
                rotation={modelRotation}
              />
            </div>
          )}

          {/* Photo gallery */}
          {viewerTab === "photos" && (
            <div className="h-[380px] bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl overflow-hidden">
              {images.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-[var(--text-tertiary)]">
                  <ImageIcon size={32} className="opacity-30 mb-2" />
                  <p className="text-sm">{t("noPhotos")}</p>
                </div>
              ) : (
                <div className="h-full flex flex-col">
                  <div
                    className="flex-1 relative cursor-zoom-in overflow-hidden"
                    onClick={() => setLightboxIdx(0)}
                  >
                    <img
                      src={images[0].url}
                      alt={displayTitle}
                      className="w-full h-full object-contain p-2"
                    />
                  </div>
                  {images.length > 1 && (
                    <div className="flex gap-2 p-2 border-t border-[var(--border)] overflow-x-auto">
                      {images.map((img, i) => (
                        <button
                          key={img.id}
                          onClick={() => setLightboxIdx(i)}
                          className="w-14 h-14 shrink-0 rounded-lg overflow-hidden border-2 border-transparent hover:border-[#FF6B35] transition-all"
                        >
                          <img src={img.url} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Designer strip */}
          <div className="mt-4 flex items-center gap-3">
            {designer?.avatar_url ? (
              <img src={designer.avatar_url} className="w-10 h-10 rounded-full object-cover" alt="" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[rgba(255,107,53,0.1)] flex items-center justify-center text-[#FF6B35]">
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
                onClick={() => navigator.share?.({ title: displayTitle, url: window.location.href })}
                className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--bg-secondary)] transition-all"
              >
                <Share2 size={15} />
              </button>
            </div>
          </div>

          {/* Specs */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { label: t("format"),  value: model.file_format.toUpperCase() },
              { label: t("prints"),  value: `${model.print_count}+` },
              { label: t("license"), value: model.license === "standard" ? t("standard") : model.license === "open" ? t("open") : t("multi") },
              ...(model.weight_grams ? [{ label: t("weight"), value: `~${model.weight_grams}g` }] : []),
              ...(model.dimension_x && model.dimension_y && model.dimension_z
                ? [{ label: t("dimensions"), value: `${model.dimension_x}×${model.dimension_y}×${model.dimension_z}mm` }]
                : []),
            ].map((s) => (
              <div key={s.label} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-3 text-center">
                <div className="text-sm font-semibold text-[var(--text-primary)]">{s.value}</div>
                <div className="text-xs text-[var(--text-tertiary)] mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Description */}
          {displayDescription && (
            <div className="mt-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">{t("description")}</div>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{displayDescription}</p>
            </div>
          )}
          <PrintPhotoGallery modelId={modelId} />
        </div>

        {/* RIGHT — Config */}
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-2">{displayTitle}</h1>
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
                  {Number(model.avg_rating).toFixed(1)} · {model.rating_count} {t("reviews")}
                </span>
              </>
            ) : (
              <span className="text-sm text-[var(--text-tertiary)]">{t("noRating")}</span>
            )}
            {model.category && (
              <span className="text-xs text-[var(--text-tertiary)] border border-[var(--border)] px-2 py-0.5 rounded-full ml-auto">
                {locale === "en" && model.category.name_en ? model.category.name_en : model.category.name_tr}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <ConfigRow label={t("material")}>
              {MATERIALS.map((m) => (
                <OptionBtn key={m} active={material === m} onClick={() => setMaterial(m)}>{m}</OptionBtn>
              ))}
            </ConfigRow>

            <ConfigRow label={`${t("color")} — ${t(`colors.${COLORS[colorIdx].name}`)}`}>
              <div className="flex gap-2.5">
                {COLORS.map((c, i) => (
                  <button
                    key={c.hex}
                    onClick={() => setColorIdx(i)}
                    title={t(`colors.${c.name}`)}
                    className={`w-7 h-7 rounded-full transition-all ${
                      colorIdx === i ? "ring-2 ring-[#FF6B35] ring-offset-2 ring-offset-[var(--bg-primary)]" : ""
                    } ${c.border ? "border border-[var(--border)]" : ""}`}
                    style={{ background: c.hex }}
                  />
                ))}
              </div>
            </ConfigRow>

            <ConfigRow label={t("size")}>
              {SCALES.map((s) => (
                <OptionBtn key={s} active={scale === s} onClick={() => setScale(s)}>{s === "Özel" ? t("custom") : s}</OptionBtn>
              ))}
            </ConfigRow>

            <ConfigRow label={t("infill")}>
              {INFILLS.map((inf) => (
                <OptionBtn key={inf} active={infill === inf} onClick={() => setInfill(inf)}>
                  {inf.split(" ")[0]} ({t(`infills.${INFILL_LABEL_KEY[inf]}`)})
                </OptionBtn>
              ))}
            </ConfigRow>

            {/* Price breakdown */}
            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-4 text-sm flex flex-col gap-1.5">
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>{t("designPrice")}</span>
                {model.is_free
                  ? <span className="text-[#10B981]">{tFree("free")}</span>
                  : <span>{formatPrice(designPrice, locale)}</span>
                }
              </div>
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>{t("printCost")} ({material} · {scale} · {infill.split(" ")[0]})</span>
                <span>{formatPrice(printCost, locale)}</span>
              </div>
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>{t("platformFee")}</span>
                <span>{formatPrice(platformFee, locale)}</span>
              </div>
              <div className="flex justify-between text-xs text-[var(--text-tertiary)]">
                <span>{t("shippingNote")}</span>
                <span>+{formatPrice(150, locale)}</span>
              </div>
              <div className="border-t border-[var(--border)] pt-1.5 flex justify-between font-semibold text-[var(--text-primary)]">
                <span>{t("total")}</span>
                <span className="text-[#FF6B35]">{formatPrice(totalPrice, locale)}</span>
              </div>
            </div>

            <div className="flex gap-4">
              {[
                { icon: Shield, text: t("safePayment")   },
                { icon: Truck,  text: t("singleShipping") },
                { icon: Award,  text: t("quality") },
              ].map((b) => (
                <div key={b.text} className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
                  <b.icon size={13} className="text-[#10B981]" /> {b.text}
                </div>
              ))}
            </div>

            <button
              onClick={handleAddToCart}
              className="w-full h-11 flex items-center justify-center gap-2 bg-[#FF6B35] text-white rounded-xl font-medium text-sm hover:bg-[#e85e2a] transition-colors active:scale-95"
            >
              {addedToCart ? (
                <><CheckCircle2 size={16} /> {t("addedToCart")}</>
              ) : (
                <><ShoppingCart size={16} /> {t("addToCart")} — {formatPrice(totalPrice, locale)}</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightboxIdx(null)}
        >
          <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={images[lightboxIdx].url}
              alt=""
              className="w-full max-h-[80vh] object-contain rounded-2xl"
            />
            {images.length > 1 && (
              <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-3 pointer-events-none">
                <button
                  onClick={(e) => { e.stopPropagation(); setLightboxIdx((i) => (i! - 1 + images.length) % images.length); }}
                  className="w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center pointer-events-auto hover:bg-black/70 transition-colors"
                >‹</button>
                <button
                  onClick={(e) => { e.stopPropagation(); setLightboxIdx((i) => (i! + 1) % images.length); }}
                  className="w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center pointer-events-auto hover:bg-black/70 transition-colors"
                >›</button>
              </div>
            )}
            <button
              onClick={() => setLightboxIdx(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
            >✕</button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-white/70 bg-black/40 px-2 py-1 rounded-full">
              {lightboxIdx + 1} / {images.length}
            </div>
          </div>
        </div>
      )}

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