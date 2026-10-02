"use client";
import { useEffect, useState, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Camera } from "lucide-react";
import { useTranslations } from "next-intl";
import { fetchModelPrintPhotos, buildPrintPhotoUrl, type PrintPhoto } from "@shapebazaar/shared";
import { createClient } from "@/lib/supabase/client";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

/** Model sayfasında, yazıcı ortaklarının bastığı gerçek ürün fotoğrafları (yalnızca admin onaylıları). */
export function PrintPhotoGallery({ modelId }: { modelId: string }) {
  const t = useTranslations("printPhotos");
  const [photos, setPhotos] = useState<PrintPhoto[]>([]);
  const [open, setOpen]     = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchModelPrintPhotos(createClient(), modelId)
      .then((rows) => { if (!cancelled) setPhotos(rows); })
      .catch((e) => console.error("[PrintPhotoGallery]", e));
    return () => { cancelled = true; };
  }, [modelId]);

  const close = useCallback(() => setOpen(null), []);
  const step  = useCallback((d: number) => setOpen((i) => (i === null ? i : (i + d + photos.length) % photos.length)), [photos.length]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, step]);

  if (photos.length === 0) return null; // henüz onaylı fotoğraf yoksa bölüm hiç görünmez

  const current = open !== null ? photos[open] : null;
  const caption = (p: PrintPhoto) => {
    const meta = [p.material, p.color_name, p.scale_percent ? `%${p.scale_percent}` : null].filter(Boolean).join(" · ");
    const who = p.printer?.username ? `@${p.printer.username}` : p.printer?.full_name ?? null;
    return [meta, who ? t("printedBy", { name: who }) : null].filter(Boolean).join(" — ");
  };

  return (
    <div className="mt-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-1">
        <Camera size={14} className="text-[#FF6B35]" />
        <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">{t("galleryTitle")}</div>
      </div>
      <p className="text-xs text-[var(--text-tertiary)] mb-3">{t("galleryDesc")}</p>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {photos.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setOpen(i)}
            className="aspect-square rounded-lg overflow-hidden bg-[var(--bg-tertiary)] border border-[var(--border)] hover:opacity-90 transition-opacity"
          >
            <img src={buildPrintPhotoUrl(SUPABASE_URL, p.thumb_path)} alt="" loading="lazy" className="w-full h-full object-cover" />
          </button>
        ))}
      </div>

      {current && (
        <div className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-4" onClick={close}>
          <button type="button" onClick={close} aria-label={t("close")} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20">
            <X size={20} />
          </button>
          {photos.length > 1 && (
            <>
              <button type="button" onClick={(e) => { e.stopPropagation(); step(-1); }} className="absolute left-3 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"><ChevronLeft size={20} /></button>
              <button type="button" onClick={(e) => { e.stopPropagation(); step(1); }} className="absolute right-3 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"><ChevronRight size={20} /></button>
            </>
          )}
          <figure className="max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <img src={buildPrintPhotoUrl(SUPABASE_URL, current.photo_path)} alt="" className="w-full max-h-[78vh] object-contain rounded-xl" />
            {caption(current) && <figcaption className="text-center text-sm text-white/80 mt-3">{caption(current)}</figcaption>}
          </figure>
        </div>
      )}
    </div>
  );
}
