"use client";
import { useEffect, useState, useCallback } from "react";
import { Star, Trash2, Check, EyeOff } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { PRINT_PHOTO_MIN } from "@shapebazaar/shared";

interface Photo {
  id: string;
  status: string;
  photo_url: string;
  thumb_url: string;
  printer?: string;
  material?: string | null;
  colorName?: string | null;
  scalePercent?: number | null;
}
interface Submission {
  orderItemId: string;
  modelId: string | null;
  modelTitle: string;
  hasShowcase: boolean;
  printer: string;
  material: string | null;
  colorName: string | null;
  scalePercent: number | null;
  photos: Photo[];
}
interface ApprovedGroup {
  modelId: string;
  title: string;
  showcasePhotoId: string | null;
  photos: Photo[];
}

const meta = (m?: string | null, c?: string | null, s?: number | null) =>
  [m, c, s ? `%${s}` : null].filter(Boolean).join(" · ");

export function PrintPhotosAdmin({ onPendingCount }: { onPendingCount?: (n: number) => void }) {
  const t      = useTranslations("printPhotos");
  const locale = useLocale();

  const [pending, setPending]   = useState<Submission[]>([]);
  const [approved, setApproved] = useState<ApprovedGroup[]>([]);
  const [loading, setLoading]   = useState(true);
  const [busy, setBusy]         = useState<string | null>(null);
  // Bekleyen gönderimlerde fotoğraf başına karar (varsayılan: onayla) ve gönderim başına vitrin seçimi
  const [decisions, setDecisions] = useState<Record<string, "approve" | "remove">>({});
  const [showcasePick, setShowcasePick] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/photos");
    if (res.ok) {
      const data = await res.json();
      setPending(data.pending ?? []);
      setApproved(data.approved ?? []);
      onPendingCount?.((data.pending ?? []).reduce((n: number, s: Submission) => n + s.photos.length, 0));
    }
    setLoading(false);
  }, [onPendingCount]);

  useEffect(() => { load(); }, [load]);

  async function review(key: string, body: Record<string, unknown>) {
    setBusy(key);
    const res = await fetch("/api/admin/photos/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j.error ?? t("adminFailed"));
    }
    setBusy(null);
    await load();
  }

  function applySubmission(sub: Submission) {
    const approveIds: string[] = [];
    const removeIds: string[]  = [];
    for (const p of sub.photos) (decisions[p.id] === "remove" ? removeIds : approveIds).push(p.id);
    const pick = showcasePick[sub.orderItemId];
    review(sub.orderItemId, { approveIds, removeIds, showcaseId: pick && approveIds.includes(pick) ? pick : undefined });
  }

  if (loading) return <div className="text-center py-16 text-sm text-[var(--text-tertiary)]">…</div>;

  return (
    <div className="flex flex-col gap-8">
      {/* ── Onay bekleyenler ── */}
      <section>
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-1">{t("adminPendingTitle")}</h2>
        <p className="text-xs text-[var(--text-tertiary)] mb-1">{t("adminPendingHint", { min: PRINT_PHOTO_MIN })}</p>
        <p className="text-xs text-[var(--text-tertiary)] mb-3">{t("adminShowcaseHint")}</p>
        {pending.length === 0 ? (
          <p className="text-sm text-[var(--text-tertiary)] py-6">{t("adminNoPending")}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {pending.map((sub) => (
              <div key={sub.orderItemId} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                  <div>
                    {sub.modelId ? (
                      <a href={`/${locale}/models/${sub.modelId}`} target="_blank" rel="noreferrer" className="text-sm font-medium text-[var(--text-primary)] hover:underline">{sub.modelTitle}</a>
                    ) : (
                      <span className="text-sm font-medium text-[var(--text-primary)]">{sub.modelTitle}</span>
                    )}
                    <div className="text-xs text-[var(--text-tertiary)]">
                      {t("adminPrinter")}: {sub.printer}{meta(sub.material, sub.colorName, sub.scalePercent) ? ` · ${meta(sub.material, sub.colorName, sub.scalePercent)}` : ""}
                    </div>
                  </div>
                  {sub.hasShowcase && <span className="text-[11px] text-[var(--text-tertiary)]">{t("adminHasShowcase")}</span>}
                </div>

                <div className="flex flex-wrap gap-3">
                  {sub.photos.map((p) => {
                    const remove = decisions[p.id] === "remove";
                    const isPick = showcasePick[sub.orderItemId] === p.id;
                    return (
                      <div key={p.id} className="w-36">
                        <a href={p.photo_url} target="_blank" rel="noreferrer" className="block relative">
                          <img src={p.thumb_url} alt="" className={`w-36 h-36 object-cover rounded-xl border border-[var(--border)] ${remove ? "opacity-40" : ""}`} />
                          {isPick && !remove && (
                            <span className="absolute top-1.5 left-1.5 bg-[#FF6B35] text-white text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1"><Star size={10} fill="currentColor" />{t("adminShowcase")}</span>
                          )}
                        </a>
                        <div className="flex gap-1 mt-1.5">
                          <button type="button" onClick={() => setDecisions((d) => ({ ...d, [p.id]: "approve" }))}
                            className={`flex-1 text-[11px] py-1 rounded-md flex items-center justify-center gap-1 ${!remove ? "bg-[#10B981] text-white" : "bg-[var(--bg-secondary)] text-[var(--text-secondary)]"}`}>
                            <Check size={11} />{t("adminApprove")}
                          </button>
                          <button type="button" onClick={() => setDecisions((d) => ({ ...d, [p.id]: "remove" }))}
                            className={`flex-1 text-[11px] py-1 rounded-md flex items-center justify-center gap-1 ${remove ? "bg-red-500 text-white" : "bg-[var(--bg-secondary)] text-[var(--text-secondary)]"}`}>
                            <Trash2 size={11} />{t("adminRemove")}
                          </button>
                        </div>
                        {!remove && (
                          <button type="button"
                            onClick={() => setShowcasePick((s) => {
                              const n = { ...s };
                              if (n[sub.orderItemId] === p.id) delete n[sub.orderItemId]; else n[sub.orderItemId] = p.id;
                              return n;
                            })}
                            className={`w-full mt-1 text-[11px] py-1 rounded-md flex items-center justify-center gap-1 border ${isPick ? "border-[#FF6B35] text-[#FF6B35]" : "border-[var(--border)] text-[var(--text-tertiary)]"}`}>
                            <Star size={11} fill={isPick ? "currentColor" : "none"} />{t("adminMakeShowcase")}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 flex justify-end">
                  <button type="button" onClick={() => applySubmission(sub)} disabled={busy === sub.orderItemId}
                    className="text-sm px-4 py-2 bg-[#FF6B35] text-white rounded-lg hover:bg-[#e85e2a] disabled:opacity-60 transition-colors">
                    {busy === sub.orderItemId ? t("adminSaving") : t("adminApply")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Yayındakiler (sonradan düzenleme) ── */}
      <section>
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">{t("adminApprovedTitle")}</h2>
        {approved.length === 0 ? (
          <p className="text-sm text-[var(--text-tertiary)] py-6">{t("adminNoApproved")}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {approved.map((g) => (
              <div key={g.modelId} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-4">
                <a href={`/${locale}/models/${g.modelId}`} target="_blank" rel="noreferrer" className="text-sm font-medium text-[var(--text-primary)] hover:underline">{g.title}</a>
                <div className="flex flex-wrap gap-3 mt-3">
                  {g.photos.map((p) => {
                    const isShowcase = g.showcasePhotoId === p.id;
                    const key = `${g.modelId}:${p.id}`;
                    return (
                      <div key={p.id} className="w-36">
                        <a href={p.photo_url} target="_blank" rel="noreferrer" className="block relative">
                          <img src={p.thumb_url} alt="" className="w-36 h-36 object-cover rounded-xl border border-[var(--border)]" />
                          {isShowcase && (
                            <span className="absolute top-1.5 left-1.5 bg-[#FF6B35] text-white text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1"><Star size={10} fill="currentColor" />{t("adminShowcase")}</span>
                          )}
                        </a>
                        <div className="text-[10px] text-[var(--text-tertiary)] mt-1 truncate">{p.printer} {meta(p.material, p.colorName, p.scalePercent) && `· ${meta(p.material, p.colorName, p.scalePercent)}`}</div>
                        <div className="flex flex-col gap-1 mt-1">
                          <button type="button" disabled={busy === key}
                            onClick={() => isShowcase ? review(key, { clearShowcaseModelId: g.modelId }) : review(key, { showcaseId: p.id })}
                            className={`w-full text-[11px] py-1 rounded-md flex items-center justify-center gap-1 border ${isShowcase ? "border-[#FF6B35] text-[#FF6B35]" : "border-[var(--border)] text-[var(--text-secondary)]"}`}>
                            <Star size={11} fill={isShowcase ? "currentColor" : "none"} />{isShowcase ? t("adminClearShowcase") : t("adminMakeShowcase")}
                          </button>
                          <div className="flex gap-1">
                            <button type="button" disabled={busy === key} onClick={() => review(key, { pendingIds: [p.id] })}
                              className="flex-1 text-[11px] py-1 rounded-md flex items-center justify-center gap-1 bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                              <EyeOff size={11} />{t("adminUnapprove")}
                            </button>
                            <button type="button" disabled={busy === key}
                              onClick={() => { if (confirm(t("adminConfirmRemove"))) review(key, { removeIds: [p.id] }); }}
                              aria-label={t("adminRemove")}
                              className="px-2 text-[11px] py-1 rounded-md bg-red-50 text-red-500 dark:bg-red-950/30">
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
