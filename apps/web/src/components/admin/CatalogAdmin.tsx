"use client";
import { useEffect, useState } from "react";
import { Search, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

interface CatalogModel {
  id: string;
  title: string;
  base_price: number;
  is_free: boolean;
  is_published: boolean;
  designer: { full_name: string | null; username: string | null } | null;
}

/** Admin katalog: tüm modelleri (yayında + bekleyen) ara ve kalıcı olarak sil. */
export function CatalogAdmin() {
  const t      = useTranslations("printPhotos");
  const locale = useLocale();

  const [q, setQ]           = useState("");
  const [models, setModels] = useState<CatalogModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/admin/models/list?q=${encodeURIComponent(q)}`);
      if (cancelled) return;
      if (res.ok) setModels((await res.json()).models ?? []);
      setLoading(false);
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [q, reloadKey]);

  async function remove(m: CatalogModel) {
    if (!confirm(t("catalogConfirm", { title: m.title }))) return;
    setDeleting(m.id);
    const res = await fetch("/api/admin/models/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelId: m.id }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j.error ?? t("catalogDeleteFailed")); // örn. devam eden siparişi olan model
    }
    setDeleting(null);
    setReloadKey((k) => k + 1);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("catalogSearch")}
          className="w-full pl-9 pr-3 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl outline-none focus:border-[#FF6B35]"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-sm text-[var(--text-tertiary)]">…</div>
      ) : models.length === 0 ? (
        <p className="text-sm text-[var(--text-tertiary)] py-6">{t("catalogEmpty")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {models.map((m) => (
            <div key={m.id} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <a href={`/${locale}/models/${m.id}`} target="_blank" rel="noreferrer" className="text-sm font-medium text-[var(--text-primary)] hover:underline truncate block">{m.title}</a>
                <div className="text-xs text-[var(--text-tertiary)]">
                  {m.designer?.username ? `@${m.designer.username}` : m.designer?.full_name ?? "—"}
                  {" · "}{m.is_free ? "Free" : `₺${m.base_price}`}
                  {!m.is_published && <span className="ml-2 text-amber-600">{t("catalogNotPublished")}</span>}
                </div>
              </div>
              <button type="button" onClick={() => remove(m)} disabled={deleting === m.id}
                className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400 disabled:opacity-50 flex items-center gap-1.5 transition-colors">
                <Trash2 size={12} />{t("catalogDelete")}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
