"use client";

import { useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { uploadModelFile, uploadThumbnail, uploadModelImage } from "@/lib/storage";
import { createModel } from "@/lib/models";
import { useDropzone } from "react-dropzone";
import {
  Upload, CheckCircle, AlertCircle, FileBox,
  Tag, ChevronRight, X, Info,
  Layers, Globe, Lock, RotateCcw, ImagePlus, Trash2,
} from "lucide-react";
import { ModelViewer } from "@/components/viewer/ModelViewer";
import { cn } from "@/lib/utils";

/* ── Types ── */
type Step = "file" | "details" | "pricing" | "review";
interface ModelMeta {
  title: string; description: string; category: string; tags: string;
  license: "standard" | "multi_print" | "open";
  basePrice: string; isFree: boolean;
  weightGrams: string; dimensionX: string; dimensionY: string; dimensionZ: string;
}
interface Rotation { x: number; y: number; z: number }

const HALF_PI = Math.PI / 2;
const MAX_PHOTOS = 3;

const CATEGORIES = [
  "Ev & Ofis", "Aksesuar", "Teknoloji", "Sanat & Dekor",
  "Bahçe", "Oyuncak & Oyun", "Araç & Gereç", "Takı",
];
const LICENSES = [
  { value: "standard",    label: "Standart",    desc: "Alıcı yalnızca 1 baskı alabilir.",    icon: Lock   },
  { value: "multi_print", label: "Çoklu Baskı", desc: "Alıcı birden fazla baskı alabilir.",  icon: Layers },
  { value: "open",        label: "Açık",         desc: "Herkes ücretsiz olarak indirebilir.", icon: Globe  },
] as const;
const ACCEPTED_FORMATS = {
  "model/stl": [".stl"], "text/plain": [".stl", ".obj"],
  "application/octet-stream": [".stl", ".obj", ".3mf"],
  "model/obj": [".obj"],
  "application/vnd.ms-package.3dmanufacturing": [".3mf"],
};
const MAX_SIZE_MB = 50;
const STEPS: { id: Step; label: string }[] = [
  { id: "file",    label: "Dosya"    },
  { id: "details", label: "Detaylar" },
  { id: "pricing", label: "Fiyat"    },
  { id: "review",  label: "İncele"   },
];

export function UploadPageClient() {
  const [step, setStep]             = useState<Step>("file");
  const [file, setFile]             = useState<File | null>(null);
  const [fileError, setFileError]   = useState("");
  const [uploading, setUploading]   = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const [rotation, setRotation]     = useState<Rotation>({ x: 0, y: 0, z: 0 });

  // Fotoğraflar: File + önizleme URL
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);

  const thumbnailDataUrlRef = useRef<string | null>(null);

  const [meta, setMeta] = useState<ModelMeta>({
    title: "", description: "", category: "", tags: "",
    license: "standard", basePrice: "", isFree: false,
    weightGrams: "", dimensionX: "", dimensionY: "", dimensionZ: "",
  });

  /* ── 3D file dropzone ── */
  const onDrop = useCallback((
    accepted: File[],
    rejected: { file: File; errors: readonly { code: string; message: string }[] }[]
  ) => {
    setFileError("");
    thumbnailDataUrlRef.current = null;
    setRotation({ x: 0, y: 0, z: 0 });
    if (rejected.length > 0) {
      const err = rejected[0].errors[0];
      setFileError(err.code === "file-too-large"
        ? `Dosya çok büyük. Maksimum ${MAX_SIZE_MB} MB.`
        : "Geçersiz format. STL, OBJ veya 3MF yükleyin.");
      return;
    }
    if (accepted[0]) {
      setFile(accepted[0]);
      const name = accepted[0].name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
      setMeta((m) => ({ ...m, title: m.title || name }));
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: ACCEPTED_FORMATS,
    maxSize: MAX_SIZE_MB * 1024 * 1024, multiple: false,
  });

  /* ── Photo picker ── */
  function handlePhotoAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const remaining = MAX_PHOTOS - photos.length;
    const toAdd = files.slice(0, remaining).map((f) => ({
      file: f,
      preview: URL.createObjectURL(f),
    }));
    setPhotos((p) => [...p, ...toAdd]);
    // input'u sıfırla, aynı dosyayı tekrar seçilebilsin
    e.target.value = "";
  }

  function removePhoto(index: number) {
    setPhotos((p) => {
      URL.revokeObjectURL(p[index].preview);
      return p.filter((_, i) => i !== index);
    });
  }

  /* ── Helpers ── */
  function updateMeta(key: keyof ModelMeta, value: string | boolean) {
    setMeta((m) => ({ ...m, [key]: value }));
  }
  function canAdvance() {
    if (step === "file")    return !!file;
    if (step === "details") return meta.title.trim().length > 2 && !!meta.category && meta.weightGrams.trim().length > 0;
    if (step === "pricing") return meta.isFree || parseFloat(meta.basePrice) > 0;
    return true;
  }
  function nextStep() {
    const order: Step[] = ["file", "details", "pricing", "review"];
    const idx = order.indexOf(step);
    if (idx < order.length - 1) setStep(order[idx + 1]);
  }
  function prevStep() {
    const order: Step[] = ["file", "details", "pricing", "review"];
    const idx = order.indexOf(step);
    if (idx > 0) setStep(order[idx - 1]);
  }
  function rotateAxis(axis: "x" | "y" | "z", delta: number) {
    setRotation((r) => ({ ...r, [axis]: r[axis] + delta }));
    thumbnailDataUrlRef.current = null;
  }
  function resetRotation() {
    setRotation({ x: 0, y: 0, z: 0 });
    thumbnailDataUrlRef.current = null;
  }
  function formatRad(rad: number) {
    return `${Math.round((rad * 180) / Math.PI) % 360}°`;
  }
  const handleThumbnail = useCallback((dataUrl: string) => {
    thumbnailDataUrlRef.current = dataUrl;
  }, []);

  /* ── Publish ── */
  async function handlePublish() {
    if (!file) return;
    setUploading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/tr/auth/login?redirect=/tr/upload"; return; }

      const modelId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const { path, format } = await uploadModelFile(file, user.id, modelId);
      const fileSizeMb = parseFloat((file.size / 1024 / 1024).toFixed(2));

      // Thumbnail
      let thumbnailUrl: string | undefined;
      if (thumbnailDataUrlRef.current) {
        try {
          const res = await fetch(thumbnailDataUrlRef.current);
          const blob = await res.blob();
          thumbnailUrl = await uploadThumbnail(blob, user.id, modelId);
        } catch (e) { console.warn("Thumbnail upload failed:", e); }
      }

      // Model kaydı oluştur
      const tags = meta.tags ? meta.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
      const model = await createModel({
        designer_id:  user.id,
        title:        meta.title,
        description:  meta.description,
        tags,
        file_url:     path,
        file_format:  format,
        file_size_mb: fileSizeMb,
        license:      meta.license,
        base_price:   meta.isFree ? 0 : parseFloat(meta.basePrice) || 0,
        is_free:      meta.isFree,
        weight_grams: meta.weightGrams ? parseInt(meta.weightGrams)  : null,
        dimension_x:  meta.dimensionX  ? parseFloat(meta.dimensionX) : null,
        dimension_y:  meta.dimensionY  ? parseFloat(meta.dimensionY) : null,
        dimension_z:  meta.dimensionZ  ? parseFloat(meta.dimensionZ) : null,
        rotation_x:   rotation.x,
        rotation_y:   rotation.y,
        rotation_z:   rotation.z,
        ...(thumbnailUrl ? { thumbnail_url: thumbnailUrl } : {}),
      });

      // Fotoğrafları yükle ve model_images tablosuna kaydet
      if (photos.length > 0 && model?.id) {
        await Promise.allSettled(
          photos.map(async ({ file: photoFile }, i) => {
            try {
              const url = await uploadModelImage(photoFile, user.id, model.id, i);
              await supabase.from("model_images").insert({
                model_id:    model.id,
                url,
                order_index: i,
              });
            } catch (e) { console.warn(`Photo ${i} upload failed:`, e); }
          })
        );
      }

      setUploadDone(true);
    } catch (err) {
      console.error(err);
      alert("Yükleme sırasında hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setUploading(false);
    }
  }

  const stepIdx    = STEPS.findIndex((s) => s.id === step);
  const fileSizeMB = file ? (file.size / 1024 / 1024).toFixed(1) : null;

  /* ── Success ── */
  if (uploadDone) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-[rgba(16,185,129,0.1)] flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={32} className="text-[#10B981]" />
          </div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Model yüklendi!</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            <strong>{meta.title}</strong> başarıyla yüklendi ve inceleme kuyruğuna alındı.
          </p>
          <div className="flex gap-3 justify-center">
            <a href="/dashboard" className="px-5 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors">
              Dashboard'a git
            </a>
            <button
              onClick={() => {
                setUploadDone(false); setFile(null); setStep("file");
                setRotation({ x:0,y:0,z:0 }); setPhotos([]);
                thumbnailDataUrlRef.current = null;
                setMeta({ title:"",description:"",category:"",tags:"",license:"standard",basePrice:"",isFree:false,weightGrams:"",dimensionX:"",dimensionY:"",dimensionZ:"" });
              }}
              className="px-5 py-2.5 rounded-xl bg-[#FF6B35] text-white text-sm font-medium hover:bg-[#e85e2a] transition-colors"
            >
              Yeni model yükle
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Model Yükle</h1>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">STL, OBJ veya 3MF dosyanızı yükleyin, yapılandırın ve yayınlayın.</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <button
              onClick={() => i < stepIdx && setStep(s.id)}
              className={cn("flex items-center gap-2 text-sm transition-all",
                s.id === step ? "text-[var(--text-primary)] font-medium"
                  : i < stepIdx ? "text-[#FF6B35] cursor-pointer hover:underline"
                  : "text-[var(--text-tertiary)] cursor-default"
              )}
            >
              <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 transition-all",
                s.id === step ? "bg-[#FF6B35] text-white"
                  : i < stepIdx ? "bg-[rgba(16,185,129,0.15)] text-[#10B981]"
                  : "bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]"
              )}>
                {i < stepIdx ? "✓" : i + 1}
              </div>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {i < STEPS.length - 1 && <ChevronRight size={14} className="text-[var(--text-tertiary)] shrink-0" />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT: viewer + rotation + photos */}
        <div className="flex flex-col gap-4">
          <div className="h-80 lg:h-[420px] bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl overflow-hidden">
            <ModelViewer file={file ?? undefined} toolbar rotation={rotation} onThumbnail={handleThumbnail} />
          </div>

          {/* Rotation controls */}
          {file && (
            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Görüntü Açısı</div>
                <button onClick={resetRotation} className="flex items-center gap-1 text-xs text-[var(--text-tertiary)] hover:text-[#FF6B35] transition-colors">
                  <RotateCcw size={11} /> Sıfırla
                </button>
              </div>
              <div className="flex flex-col gap-2.5">
                {(["x", "y", "z"] as const).map((axis) => (
                  <div key={axis} className="flex items-center gap-3">
                    <span className="text-xs font-medium text-[var(--text-tertiary)] w-4 uppercase">{axis}</span>
                    <div className="flex gap-1.5 flex-1">
                      {[-1, 1].map((dir) => (
                        <button key={dir} onClick={() => rotateAxis(axis, dir * HALF_PI)}
                          className="flex-1 h-8 rounded-lg border border-[var(--border)] text-xs text-[var(--text-secondary)] hover:border-[#FF6B35] hover:text-[#FF6B35] hover:bg-[rgba(255,107,53,0.05)] transition-all">
                          {dir === -1 ? "−90°" : "+90°"}
                        </button>
                      ))}
                    </div>
                    <span className="text-xs text-[var(--text-tertiary)] w-8 text-right tabular-nums">{formatRad(rotation[axis])}</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-[var(--text-tertiary)] mt-3 leading-relaxed">
                Modeli doğru görünen açıya getirin. Bu görüntü thumbnail olarak kaydedilecek.
              </p>
            </div>
          )}

          {/* Photo upload */}
          {file && (
            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  Model Fotoğrafları
                </div>
                <span className="text-xs text-[var(--text-tertiary)]">{photos.length}/{MAX_PHOTOS}</span>
              </div>

              <div className="flex gap-2 flex-wrap">
                {/* Mevcut fotoğraflar */}
                {photos.map((p, i) => (
                  <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-[var(--border)] group">
                    <img src={p.preview} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removePhoto(i)}
                      className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={16} className="text-white" />
                    </button>
                  </div>
                ))}

                {/* Ekle butonu */}
                {photos.length < MAX_PHOTOS && (
                  <label className="w-24 h-24 rounded-xl border-2 border-dashed border-[var(--border)] flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-[#FF6B35] hover:bg-[rgba(255,107,53,0.04)] transition-all">
                    <ImagePlus size={20} className="text-[var(--text-tertiary)]" />
                    <span className="text-[10px] text-[var(--text-tertiary)]">Ekle</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      className="hidden"
                      onChange={handlePhotoAdd}
                    />
                  </label>
                )}
              </div>

              <p className="text-[11px] text-[var(--text-tertiary)] mt-3">
                Baskı sonucu veya tasarım görselleri ekleyebilirsiniz. JPEG, PNG, WebP · Maks. 3 fotoğraf.
              </p>
            </div>
          )}

          {/* File info */}
          {file && (
            <div className="flex items-center gap-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl px-4 py-3">
              <FileBox size={18} className="text-[#FF6B35] shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[var(--text-primary)] truncate">{file.name}</div>
                <div className="text-xs text-[var(--text-tertiary)]">{fileSizeMB} MB · {file.name.split(".").pop()?.toUpperCase()}</div>
              </div>
              <button
                onClick={() => { setFile(null); thumbnailDataUrlRef.current = null; setRotation({ x:0,y:0,z:0 }); }}
                className="text-[var(--text-tertiary)] hover:text-red-400 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>

        {/* RIGHT: steps */}
        <div className="flex flex-col gap-6">

          {/* STEP: FILE */}
          {step === "file" && (
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="font-medium text-[var(--text-primary)] mb-1">Dosya Seç</h2>
                <p className="text-sm text-[var(--text-tertiary)]">STL, OBJ veya 3MF · Maks. {MAX_SIZE_MB} MB</p>
              </div>
              <div
                {...getRootProps()}
                className={cn("border-2 border-dashed rounded-2xl p-10 flex flex-col items-center text-center cursor-pointer transition-all",
                  isDragActive ? "border-[#FF6B35] bg-[rgba(255,107,53,0.05)]"
                    : file ? "border-[#10B981] bg-[rgba(16,185,129,0.04)]"
                    : "border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-secondary)]"
                )}
              >
                <input {...getInputProps()} />
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-4",
                  file ? "bg-[rgba(16,185,129,0.1)] text-[#10B981]" : "bg-[rgba(255,107,53,0.08)] text-[#FF6B35]"
                )}>
                  {file ? <CheckCircle size={28} /> : <Upload size={28} />}
                </div>
                {file ? (
                  <><p className="font-medium text-sm text-[var(--text-primary)] mb-1">{file.name}</p>
                  <p className="text-xs text-[var(--text-tertiary)]">{fileSizeMB} MB — Değiştirmek için tıkla</p></>
                ) : isDragActive ? (
                  <p className="font-medium text-sm text-[#FF6B35]">Bırak!</p>
                ) : (
                  <><p className="font-medium text-sm text-[var(--text-primary)] mb-1">Dosyayı sürükle veya tıkla</p>
                  <p className="text-xs text-[var(--text-tertiary)]">.stl · .obj · .3mf — Maks. {MAX_SIZE_MB} MB</p></>
                )}
              </div>
              {fileError && (
                <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl px-4 py-3">
                  <AlertCircle size={15} /> {fileError}
                </div>
              )}
              <div className="bg-[rgba(255,107,53,0.04)] border border-[rgba(255,107,53,0.15)] rounded-xl px-4 py-3 flex gap-2 text-xs text-[var(--text-secondary)]">
                <Info size={14} className="text-[#FF6B35] shrink-0 mt-0.5" />
                <span>Model yüklendikten sonra solda 3D önizleme, açı ayarları ve fotoğraf yükleme alanı görünecektir.</span>
              </div>
            </div>
          )}

          {/* STEP: DETAILS */}
          {step === "details" && (
            <div className="flex flex-col gap-4">
              <h2 className="font-medium text-[var(--text-primary)]">Model Detayları</h2>
              <div>
                <label className="text-xs text-[var(--text-tertiary)] block mb-1.5">Model Adı *</label>
                <input type="text" placeholder="örn: Araç Organizeri Pro" value={meta.title}
                  onChange={(e) => updateMeta("title", e.target.value)} maxLength={80}
                  className="w-full h-10 px-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none focus:border-[#FF6B35] transition-colors placeholder:text-[var(--text-tertiary)]" />
                <div className="text-right text-[10px] text-[var(--text-tertiary)] mt-1">{meta.title.length}/80</div>
              </div>
              <div>
                <label className="text-xs text-[var(--text-tertiary)] block mb-1.5">Açıklama</label>
                <textarea placeholder="Modelinizi tanımlayın…" value={meta.description}
                  onChange={(e) => updateMeta("description", e.target.value)} rows={4} maxLength={1000}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none focus:border-[#FF6B35] transition-colors placeholder:text-[var(--text-tertiary)] resize-none" />
                <div className="text-right text-[10px] text-[var(--text-tertiary)] mt-1">{meta.description.length}/1000</div>
              </div>
              <div>
                <label className="text-xs text-[var(--text-tertiary)] block mb-1.5">Kategori *</label>
                <select value={meta.category} onChange={(e) => updateMeta("category", e.target.value)}
                  className="w-full h-10 px-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none focus:border-[#FF6B35] transition-colors cursor-pointer">
                  <option value="">Kategori seç...</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-[var(--text-tertiary)] block mb-1.5 flex items-center gap-1">
                  <Tag size={11} /> Etiketler
                </label>
                <input type="text" placeholder="raf, organizasyon, mutfak (virgülle ayır)" value={meta.tags}
                  onChange={(e) => updateMeta("tags", e.target.value)}
                  className="w-full h-10 px-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none focus:border-[#FF6B35] transition-colors placeholder:text-[var(--text-tertiary)]" />
              </div>
              <div>
                <label className="text-xs text-[var(--text-tertiary)] block mb-1.5">
                  Tahmini Ağırlık (gram) <span className="text-red-400">*</span>
                </label>
                <input type="number" placeholder="örn: 45" min="1" value={meta.weightGrams}
                  onChange={(e) => updateMeta("weightGrams", e.target.value)}
                  className="w-full h-10 px-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none focus:border-[#FF6B35] transition-colors placeholder:text-[var(--text-tertiary)]" />
                <p className="text-xs text-[var(--text-tertiary)] mt-1">%100 boyutta tahmini baskı ağırlığı</p>
              </div>
              <div>
                <label className="text-xs text-[var(--text-tertiary)] block mb-1.5">
                  Boyutlar (mm) — <span className="font-normal">opsiyonel</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: "dimensionX", placeholder: "X (en)" },
                    { key: "dimensionY", placeholder: "Y (boy)" },
                    { key: "dimensionZ", placeholder: "Z (yükseklik)" },
                  ].map((d) => (
                    <input key={d.key} type="number" placeholder={d.placeholder} min="0"
                      value={(meta as any)[d.key]} onChange={(e) => updateMeta(d.key as any, e.target.value)}
                      className="w-full h-10 px-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none focus:border-[#FF6B35] transition-colors placeholder:text-[var(--text-tertiary)]" />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP: PRICING */}
          {step === "pricing" && (
            <div className="flex flex-col gap-5">
              <h2 className="font-medium text-[var(--text-primary)]">Lisans & Fiyatlandırma</h2>
              <div>
                <label className="text-xs text-[var(--text-tertiary)] block mb-2">Lisans Türü</label>
                <div className="flex flex-col gap-2">
                  {LICENSES.map((lic) => {
                    const Icon = lic.icon;
                    return (
                      <button key={lic.value} onClick={() => updateMeta("license", lic.value)}
                        className={cn("flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all",
                          meta.license === lic.value ? "border-[#FF6B35] bg-[rgba(255,107,53,0.06)]" : "border-[var(--border)] hover:border-[var(--border-strong)]"
                        )}>
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                          meta.license === lic.value ? "bg-[rgba(255,107,53,0.12)] text-[#FF6B35]" : "bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]"
                        )}>
                          <Icon size={15} />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-[var(--text-primary)]">{lic.label}</div>
                          <div className="text-xs text-[var(--text-tertiary)]">{lic.desc}</div>
                        </div>
                        {meta.license === lic.value && <CheckCircle size={16} className="text-[#FF6B35] ml-auto" />}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="text-xs text-[var(--text-tertiary)] block mb-2">Fiyat</label>
                <label className="flex items-center gap-2.5 mb-3 cursor-pointer">
                  <input type="checkbox" checked={meta.isFree}
                    onChange={(e) => updateMeta("isFree", e.target.checked)} className="w-4 h-4 accent-[#FF6B35]" />
                  <span className="text-sm text-[var(--text-primary)]">Ücretsiz yayınla</span>
                </label>
                {!meta.isFree && (
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-tertiary)] font-medium">₺</span>
                    <input type="number" placeholder="0" min="0" step="1" value={meta.basePrice}
                      onChange={(e) => updateMeta("basePrice", e.target.value)}
                      className="w-full h-10 pl-7 pr-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none focus:border-[#FF6B35] transition-colors" />
                  </div>
                )}
              </div>
              {!meta.isFree && parseFloat(meta.basePrice) > 0 && (
                <div className="bg-[rgba(16,185,129,0.06)] border border-[rgba(16,185,129,0.2)] rounded-xl p-4">
                  <div className="text-xs font-semibold text-[#10B981] mb-2">Kazanç tahmini (her satış)</div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[var(--text-secondary)]">Model fiyatı</span>
                    <span>₺ {parseFloat(meta.basePrice).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[var(--text-secondary)]">Platform komisyonu (%10)</span>
                    <span className="text-red-400">- ₺ {(parseFloat(meta.basePrice) * 0.1).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold border-t border-[rgba(16,185,129,0.2)] pt-2 mt-2">
                    <span>Kazancınız</span>
                    <span className="text-[#10B981]">₺ {(parseFloat(meta.basePrice) * 0.9).toFixed(0)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP: REVIEW */}
          {step === "review" && (
            <div className="flex flex-col gap-4">
              <h2 className="font-medium text-[var(--text-primary)]">İnceleyip Yayınla</h2>
              <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl overflow-hidden">
                {[
                  { label: "Dosya",     value: file?.name ?? "—" },
                  { label: "Model Adı", value: meta.title },
                  { label: "Kategori",  value: meta.category },
                  { label: "Lisans",    value: LICENSES.find(l => l.value === meta.license)?.label ?? "—" },
                  { label: "Fiyat",     value: meta.isFree ? "Ücretsiz" : `₺ ${meta.basePrice}` },
                  { label: "Ağırlık",   value: meta.weightGrams ? `${meta.weightGrams} gram` : "—" },
                  { label: "Rotasyon",  value: `X:${formatRad(rotation.x)} Y:${formatRad(rotation.y)} Z:${formatRad(rotation.z)}` },
                  { label: "Fotoğraf",  value: photos.length > 0 ? `${photos.length} fotoğraf` : "Yok" },
                  { label: "Thumbnail", value: thumbnailDataUrlRef.current ? "✓ Hazır" : "Henüz yüklenmedi" },
                ].map((row, i) => (
                  <div key={row.label} className={cn("flex items-center gap-3 px-4 py-3", i !== 0 && "border-t border-[var(--border)]")}>
                    <span className="text-xs text-[var(--text-tertiary)] w-24 shrink-0">{row.label}</span>
                    <span className={cn("text-sm truncate",
                      row.label === "Thumbnail" && thumbnailDataUrlRef.current ? "text-[#10B981]" : "text-[var(--text-primary)]"
                    )}>{row.value}</span>
                  </div>
                ))}
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl px-4 py-3 flex gap-2 text-xs text-amber-700 dark:text-amber-400">
                <Info size={14} className="shrink-0 mt-0.5" />
                <span>Modeliniz yayınlanmadan önce ekibimiz tarafından incelenecektir. Bu işlem genellikle 24 saat sürer.</span>
              </div>
              <button onClick={handlePublish} disabled={uploading}
                className="w-full h-11 rounded-xl bg-[#FF6B35] text-white text-sm font-medium hover:bg-[#e85e2a] disabled:opacity-60 transition-all flex items-center justify-center gap-2">
                {uploading ? (
                  <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Yükleniyor…</>
                ) : (
                  <><Upload size={16} /> Yayınla</>
                )}
              </button>
            </div>
          )}

          {/* Nav */}
          {step !== "review" && (
            <div className="flex gap-3 mt-auto pt-4 border-t border-[var(--border)]">
              {step !== "file" && (
                <button onClick={prevStep}
                  className="flex-1 h-10 rounded-xl border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors">
                  ← Geri
                </button>
              )}
              <button onClick={nextStep} disabled={!canAdvance()}
                className="flex-1 h-10 rounded-xl bg-[#FF6B35] text-white text-sm font-medium hover:bg-[#e85e2a] disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                {step === "pricing" ? "İncele →" : "Devam →"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}