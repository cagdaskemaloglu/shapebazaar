"use client";
import { useRef, useState } from "react";
import { Camera, X, Loader2, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { PRINT_PHOTO_MAX, PRINT_PHOTO_MIN } from "@shapebazaar/shared";
import { preparePhoto } from "@/lib/imageResize";

export interface PartnerPhoto {
  id: string;
  status: "pending" | "approved";
  photo_url: string;
  thumb_url: string;
}

interface Props {
  jobId: string;
  orderItemId: string;
  photos: PartnerPhoto[];
  /** false → salt okunur (kargolanmış iş): sadece fotoğraflar ve durumları görünür */
  editable: boolean;
  /** true → kargolamadan önce PRINT_PHOTO_MIN fotoğraf şart; false → isteğe bağlı (özellikten önce oluşmuş işler) */
  required?: boolean;
  /** Ürün adı (birden çok ürünlü siparişte hangisinin fotoğrafı olduğu görünsün) */
  title?: string;
  onChange: (photos: PartnerPhoto[]) => void;
}

export function PrintPhotoUploader({ jobId, orderItemId, photos, editable, required = true, title, onChange }: Props) {
  const t = useTranslations("printPhotos");
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enough = photos.length >= PRINT_PHOTO_MIN;

  async function handleFiles(files: FileList | null) {
    const list = Array.from(files ?? []);
    if (inputRef.current) inputRef.current.value = "";
    if (list.length === 0) return;

    setError(null);
    const room = PRINT_PHOTO_MAX - photos.length;
    if (list.length > room) setError(t("tooMany", { max: PRINT_PHOTO_MAX }));

    setBusy(true);
    let current = photos;
    for (const file of list.slice(0, Math.max(room, 0))) {
      if (!file.type.startsWith("image/")) { setError(t("notImage")); continue; }
      try {
        const { photo, thumb } = await preparePhoto(file);
        const fd = new FormData();
        fd.append("jobId", jobId);
        fd.append("orderItemId", orderItemId);
        fd.append("photo", photo, "photo.jpg");
        fd.append("thumb", thumb, "thumb.jpg");
        const res  = await fetch("/api/partner/photos", { method: "POST", body: fd });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.photo) throw new Error(json.error ?? "upload_failed");
        current = [...current, json.photo as PartnerPhoto];
        onChange(current);
      } catch (e) {
        console.error("[PrintPhotoUploader]", e);
        setError(t("uploadFailed"));
      }
    }
    setBusy(false);
  }

  async function remove(photo: PartnerPhoto) {
    setError(null);
    const res = await fetch("/api/partner/photos", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photoId: photo.id }),
    });
    if (!res.ok) { setError(t("uploadFailed")); return; }
    onChange(photos.filter((p) => p.id !== photo.id));
  }

  return (
    <div className="mt-2 pt-2 border-t border-[var(--border)]">
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">{t("uploaderTitle")}</div>
          {title && <div className="text-xs text-[var(--text-primary)] truncate">{title}</div>}
        </div>
        {editable && (required ? (
          <span className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${
            enough ? "bg-[rgba(16,185,129,0.12)] text-[#10B981]" : "bg-[rgba(245,158,11,0.15)] text-amber-600"
          }`}>
            {enough && <Check size={10} />}
            {t("progress", { count: photos.length, min: PRINT_PHOTO_MIN })}
          </span>
        ) : (
          <span className="shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]">
            {t("optional")}
          </span>
        ))}
      </div>

      {editable && (
        <p className="text-[11px] text-[var(--text-tertiary)] mb-2 leading-relaxed">
          {required
            ? t("uploaderHint", { min: PRINT_PHOTO_MIN, max: PRINT_PHOTO_MAX })
            : t("uploaderHintOptional", { max: PRINT_PHOTO_MAX })}{" "}
          {t("privacyTip")}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {photos.map((p) => (
          <div key={p.id} className="relative w-16 h-16 rounded-lg overflow-hidden border border-[var(--border)] bg-[var(--bg-tertiary)]">
            <a href={p.photo_url} target="_blank" rel="noreferrer">
              <img src={p.thumb_url} alt="" className="w-full h-full object-cover" />
            </a>
            <span
              className={`absolute bottom-0 inset-x-0 text-[9px] text-center text-white py-px ${
                p.status === "approved" ? "bg-[#10B981]/90" : "bg-black/55"
              }`}
            >
              {p.status === "approved" ? t("statusApproved") : t("statusPending")}
            </span>
            {editable && p.status === "pending" && (
              <button
                type="button"
                onClick={() => remove(p)}
                aria-label={t("delete")}
                className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
              >
                <X size={11} />
              </button>
            )}
          </div>
        ))}

        {editable && photos.length < PRINT_PHOTO_MAX && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="w-16 h-16 rounded-lg border border-dashed border-[var(--border-strong)] text-[var(--text-tertiary)] flex flex-col items-center justify-center gap-0.5 hover:bg-[var(--bg-tertiary)] disabled:opacity-60 transition-colors"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
            <span className="text-[9px]">{busy ? t("uploading") : t("add")}</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  );
}
