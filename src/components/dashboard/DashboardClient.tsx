"use client";
import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  LayoutDashboard, Package, Upload, Printer,
  Wallet, Settings, LogOut, ChevronRight,
  CheckCircle, Clock, ExternalLink, Trash2,
  Camera, Store
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { uploadAvatar } from "@/lib/storage";
import { formatPrice } from "@/lib/utils";
import type { User } from "@supabase/supabase-js";

interface Profile {
  full_name?: string;
  username?: string;
  avatar_url?: string;
  bio?: string;
  role: string;
  wallet_balance: number;
  is_partner_approved: boolean;
  city?: string;
  shop_name?: string;
  shop_description?: string;
  shop_city?: string;
}

interface Order {
  id: string;
  created_at: string;
  status: string;
  total_amount: number;
  models: { title: string }[] | null;
}

interface Model {
  id: string;
  title: string;
  is_published: boolean;
  base_price: number;
  is_free: boolean;
  print_count: number;
  avg_rating: number;
  created_at: string;
  file_format: string;
}

const VALID_TABS = ["overview", "orders", "uploads", "printjobs", "wallet", "settings"];

export function DashboardClient({ user, profile: initialProfile }: { user: User; profile: Profile | null }) {
  const t        = useTranslations("dashboard");
  const tStatus  = useTranslations("status");
  const searchParams = useSearchParams();
  const router       = useRouter();
  const pathname     = usePathname();

  const locale = pathname.split("/")[1] || "tr";

  const tabFromUrl = searchParams.get("tab") ?? "overview";
  const initialTab = VALID_TABS.includes(tabFromUrl) ? tabFromUrl : "overview";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [profile, setProfile]     = useState<Profile | null>(initialProfile);

  useEffect(() => {
    const tab = searchParams.get("tab") ?? "overview";
    if (VALID_TABS.includes(tab)) setActiveTab(tab);
  }, [searchParams]);

  const [orders,        setOrders]        = useState<Order[]>([]);
  const [models,        setModels]        = useState<Model[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingModels, setLoadingModels] = useState(true);

  const displayName   = profile?.full_name || user.email?.split("@")[0] || "Kullanıcı";
  const initials      = displayName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
  const walletBalance = profile?.wallet_balance ?? 0;

  const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    pending:   { label: tStatus("pending"),   color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"     },
    paid:      { label: tStatus("paid"),      color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"         },
    in_print:  { label: tStatus("in_print"),  color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
    shipped:   { label: tStatus("shipped"),   color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
    delivered: { label: tStatus("delivered"), color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"     },
    cancelled: { label: tStatus("cancelled"), color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"             },
  };

  const NAV_ITEMS = [
    { id: "overview",  label: t("overview"),  icon: LayoutDashboard },
    { id: "orders",    label: t("orders"),    icon: Package         },
    { id: "uploads",   label: t("myModels"),  icon: Upload          },
    { id: "printjobs", label: t("printJobs"), icon: Printer         },
    { id: "wallet",    label: t("wallet"),    icon: Wallet          },
    { id: "settings",  label: t("settings"),  icon: Settings        },
  ];

  useEffect(() => { fetchOrders(); fetchModels(); }, []);

  async function fetchOrders() {
    setLoadingOrders(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("orders")
      .select("id, created_at, status, total_amount, models(title)")
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setOrders((data ?? []) as Order[]);
    setLoadingOrders(false);
  }

  async function fetchModels() {
    setLoadingModels(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("models")
      .select("id, title, is_published, base_price, is_free, print_count, avg_rating, created_at, file_format")
      .eq("designer_id", user.id)
      .order("created_at", { ascending: false });
    setModels((data ?? []) as Model[]);
    setLoadingModels(false);
  }

  async function deleteModel(modelId: string) {
    if (!confirm(t("confirmDelete"))) return;
    const supabase = createClient();
    await supabase.from("models").delete().eq("id", modelId);
    setModels((prev) => prev.filter((m) => m.id !== modelId));
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  function handleTabChange(tabId: string) {
    setActiveTab(tabId);
    const params = new URLSearchParams(searchParams.toString());
    if (tabId === "overview") { params.delete("tab"); } else { params.set("tab", tabId); }
    const query = params.toString();
    router.push(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={{ email: user.email!, full_name: profile?.full_name }} />
      <div className="flex-1 flex max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 gap-6">

        {/* Sidebar */}
        <aside className="w-56 shrink-0 hidden md:flex flex-col gap-1">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-3">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} className="w-10 h-10 rounded-full object-cover" alt="" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[rgba(255,107,53,0.15)] flex items-center justify-center text-[#FF6B35] text-sm font-semibold">
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-sm font-medium text-[var(--text-primary)] truncate">{displayName}</div>
                <div className="text-xs text-[var(--text-tertiary)] truncate">{user.email}</div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between">
              <span className="text-xs text-[var(--text-tertiary)]">{t("walletLabel")}</span>
              <span className="text-sm font-semibold text-[#10B981]">{formatPrice(walletBalance)}</span>
            </div>
          </div>

          {NAV_ITEMS.map((item) => {
            const Icon   = item.icon;
            const active = activeTab === item.id;
            if (item.id === "printjobs" && profile?.role !== "printer_partner") return null;
            return (
              <button key={item.id} onClick={() => handleTabChange(item.id)}
                className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm transition-all text-left ${
                  active
                    ? "bg-[rgba(255,107,53,0.1)] text-[#FF6B35] font-medium"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
                }`}>
                <Icon size={16} />{item.label}
              </button>
            );
          })}

          <div className="mt-auto pt-4 border-t border-[var(--border)]">
            <button onClick={handleSignOut}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all">
              <LogOut size={16} />{t("signOut")}
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0">
          {activeTab === "overview"  && <OverviewTab orders={orders} models={models} walletBalance={walletBalance} loading={loadingOrders} statusLabels={STATUS_LABELS} t={t} locale={locale} />}
          {activeTab === "orders"    && <OrdersTab   orders={orders} loading={loadingOrders} statusLabels={STATUS_LABELS} t={t} locale={locale} />}
          {activeTab === "uploads"   && <UploadsTab  models={models} loading={loadingModels} onDelete={deleteModel} t={t} locale={locale} />}
          {activeTab === "wallet"    && <WalletTab   balance={walletBalance} t={t} />}
          {activeTab === "settings"  && (
            <SettingsTab
              user={user}
              profile={profile}
              t={t}
              locale={locale}
              onProfileUpdate={(updated) => setProfile((p) => p ? { ...p, ...updated } : p)}
            />
          )}
        </main>
      </div>
      <Footer />
    </div>
  );
}

/* ── OVERVIEW ── */
function OverviewTab({ orders, models, walletBalance, loading, statusLabels, t, locale }: {
  orders: Order[]; models: Model[]; walletBalance: number; loading: boolean;
  statusLabels: Record<string, { label: string; color: string }>;
  t: ReturnType<typeof useTranslations>; locale: string;
}) {
  const delivered = orders.filter((o) => o.status === "delivered").length;
  const inPrint   = orders.filter((o) => o.status === "in_print" || o.status === "paid").length;
  const stats = [
    { label: t("totalOrders"), value: String(orders.length),     icon: Package,     color: "orange" },
    { label: t("delivered"),   value: String(delivered),          icon: CheckCircle, color: "green"  },
    { label: t("inPrint"),     value: String(inPrint),            icon: Clock,       color: "orange" },
    { label: t("walletLabel"), value: formatPrice(walletBalance), icon: Wallet,      color: "green"  },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">{t("overviewTitle")}</h1>
        <p className="text-sm text-[var(--text-tertiary)] mt-0.5">{t("overviewSub")}</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-4">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${s.color === "orange" ? "bg-[rgba(255,107,53,0.1)] text-[#FF6B35]" : "bg-[rgba(16,185,129,0.1)] text-[#10B981]"}`}>
                <Icon size={16} />
              </div>
              <div className="text-xl font-semibold text-[var(--text-primary)]">{s.value}</div>
              <div className="text-xs text-[var(--text-tertiary)] mt-0.5">{s.label}</div>
            </div>
          );
        })}
      </div>

      <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">{t("recentOrders")}</h2>
        {loading ? (
          <div className="text-center py-6 text-sm text-[var(--text-tertiary)]">{t("loading")}</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-6 text-sm text-[var(--text-tertiary)]">{t("noOrders")}</div>
        ) : (
          orders.slice(0, 5).map((o) => {
            const st = statusLabels[o.status] ?? { label: o.status, color: "" };
            return (
              <div key={o.id} className="flex items-center gap-3 py-2.5 border-b border-[var(--border)] last:border-0">
                <div className="w-8 h-8 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center shrink-0">
                  <Package size={14} className="text-[var(--text-tertiary)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--text-primary)] truncate">{o.models?.[0]?.title ?? t("model")}</div>
                  <div className="text-xs text-[var(--text-tertiary)]">{new Date(o.created_at).toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US")}</div>
                </div>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                <span className="text-sm font-medium text-[var(--text-primary)] shrink-0">{formatPrice(o.total_amount)}</span>
              </div>
            );
          })
        )}
      </div>

      {models.length > 0 && (
        <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">{t("myModelsCount", { count: models.length })}</h2>
          {models.slice(0, 3).map((m) => (
            <div key={m.id} className="flex items-center gap-3 py-2.5 border-b border-[var(--border)] last:border-0">
              <div className="w-8 h-8 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center shrink-0 text-xs font-mono text-[var(--text-tertiary)]">
                {m.file_format.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[var(--text-primary)] truncate">{m.title}</div>
                <div className="text-xs text-[var(--text-tertiary)]">{m.print_count} baskı</div>
              </div>
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${m.is_published ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}>
                {m.is_published ? t("published") : t("inReview")}
              </span>
              <span className="text-sm font-medium text-[#FF6B35]">{m.is_free ? formatPrice(0) : formatPrice(m.base_price)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── ORDERS ── */
function OrdersTab({ orders, loading, statusLabels, t, locale }: {
  orders: Order[]; loading: boolean;
  statusLabels: Record<string, { label: string; color: string }>;
  t: ReturnType<typeof useTranslations>; locale: string;
}) {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold text-[var(--text-primary)]">{t("ordersTitle")}</h1>
      <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="text-center py-10 text-sm text-[var(--text-tertiary)]">{t("loading")}</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-10">
            <Package size={32} className="mx-auto mb-3 text-[var(--text-tertiary)] opacity-30" />
            <p className="text-sm text-[var(--text-tertiary)]">{t("noOrdersYet")}</p>
            <a href={`/${locale}/models`} className="text-sm text-[#FF6B35] hover:underline mt-2 inline-block">{t("browseModels")}</a>
          </div>
        ) : (
          orders.map((o, i) => {
            const st = statusLabels[o.status] ?? { label: o.status, color: "" };
            return (
              <div key={o.id} className={`flex items-center gap-4 p-4 ${i !== orders.length - 1 ? "border-b border-[var(--border)]" : ""}`}>
                <div className="w-10 h-10 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center shrink-0">
                  <Package size={18} className="text-[var(--text-tertiary)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-[var(--text-primary)]">{o.models?.[0]?.title ?? t("model")}</div>
                  <div className="text-xs text-[var(--text-tertiary)]">{o.id.slice(0, 8).toUpperCase()} · {new Date(o.created_at).toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US")}</div>
                </div>
                <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${st.color}`}>{st.label}</span>
                <span className="font-semibold text-[var(--text-primary)]">{formatPrice(o.total_amount)}</span>
                <ChevronRight size={14} className="text-[var(--text-tertiary)]" />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ── UPLOADS ── */
function UploadsTab({ models, loading, onDelete, t, locale }: {
  models: Model[]; loading: boolean; onDelete: (id: string) => void;
  t: ReturnType<typeof useTranslations>; locale: string;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">{t("myModels")}</h1>
        <a href={`/${locale}/upload`} className="flex items-center gap-1.5 text-sm bg-[#FF6B35] text-white px-4 py-2 rounded-xl hover:bg-[#e85e2a] transition-colors">
          <Upload size={14} /> {t("uploadModel")}
        </a>
      </div>
      {loading ? (
        <div className="text-center py-16 text-sm text-[var(--text-tertiary)]">{t("loading")}</div>
      ) : models.length === 0 ? (
        <div className="bg-[var(--bg-primary)] border border-[var(--border)] border-dashed rounded-2xl p-12 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-[rgba(255,107,53,0.08)] flex items-center justify-center mb-4">
            <Upload size={24} className="text-[#FF6B35]" />
          </div>
          <h3 className="font-medium text-[var(--text-primary)] mb-2">{t("noModels")}</h3>
          <p className="text-sm text-[var(--text-tertiary)] max-w-xs mb-5">{t("noModelsDesc")}</p>
          <a href={`/${locale}/upload`} className="text-sm text-[#FF6B35] hover:underline">{t("firstUpload")}</a>
        </div>
      ) : (
        <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl overflow-hidden">
          {models.map((m, i) => (
            <div key={m.id} className={`flex items-center gap-4 p-4 ${i !== models.length - 1 ? "border-b border-[var(--border)]" : ""}`}>
              <div className="w-10 h-10 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center shrink-0 text-xs font-mono font-semibold text-[var(--text-secondary)]">
                {m.file_format.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-[var(--text-primary)] truncate">{m.title}</div>
                <div className="text-xs text-[var(--text-tertiary)]">{new Date(m.created_at).toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US")} · {m.print_count} baskı</div>
              </div>
              <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full shrink-0 ${m.is_published ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}>
                {m.is_published ? t("published") : t("inReview")}
              </span>
              <span className="text-sm font-semibold text-[#FF6B35] shrink-0">{m.is_free ? formatPrice(0) : formatPrice(m.base_price)}</span>
              <div className="flex gap-1">
                <a href={`/${locale}/models/${m.id}`} className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--bg-secondary)] transition-colors" title={t("view")}>
                  <ExternalLink size={14} />
                </a>
                <button onClick={() => onDelete(m.id)} className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-tertiary)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors" title={t("delete")}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── WALLET ── */
function WalletTab({ balance, t }: { balance: number; t: ReturnType<typeof useTranslations> }) {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold text-[var(--text-primary)]">{t("walletTitle")}</h1>
      <div className="rounded-2xl p-6 text-white" style={{ background: "linear-gradient(135deg, #FF6B35, #e85e2a)" }}>
        <div className="text-sm opacity-80 mb-1">{t("walletBalance")}</div>
        <div className="text-4xl font-semibold">{formatPrice(balance)}</div>
        <div className="text-sm opacity-70 mt-2">{t("walletDesc")}</div>
      </div>
      <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">{t("transactions")}</h2>
        <div className="text-center py-8 text-[var(--text-tertiary)] text-sm">{t("noTransactions")}</div>
      </div>
    </div>
  );
}

/* ── SETTINGS ── */
function SettingsTab({ user, profile, t, locale, onProfileUpdate }: {
  user: User;
  profile: Profile | null;
  t: ReturnType<typeof useTranslations>;
  locale: string;
  onProfileUpdate: (updated: Partial<Profile>) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarPreview,   setAvatarPreview]   = useState<string | null>(profile?.avatar_url ?? null);

  const [fullName,       setFullName]       = useState(profile?.full_name ?? "");
  const [username,       setUsername]       = useState(profile?.username ?? "");
  const [city,           setCity]           = useState(profile?.city ?? "");
  const [bio,            setBio]            = useState(profile?.bio ?? "");
  const [shopName,       setShopName]       = useState(profile?.shop_name ?? "");
  const [shopDesc,       setShopDesc]       = useState(profile?.shop_description ?? "");
  const [shopCity,       setShopCity]       = useState(profile?.shop_city ?? "");

  const isPartner = profile?.is_partner_approved === true;

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Önizleme
    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);

    setAvatarUploading(true);
    try {
      const publicUrl = await uploadAvatar(file, user.id);
      const supabase  = createClient();
      await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
      onProfileUpdate({ avatar_url: publicUrl });
    } catch (err) {
      console.error("Avatar upload failed:", err);
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();
    const updates: Record<string, string> = {
      full_name: fullName,
      username,
      city,
      bio,
    };
    if (isPartner) {
      updates.shop_name        = shopName;
      updates.shop_description = shopDesc;
      updates.shop_city        = shopCity;
    }
    await supabase.from("profiles").update(updates).eq("id", user.id);
    onProfileUpdate(updates as Partial<Profile>);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const initials = (profile?.full_name || user.email || "?")
    .split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold text-[var(--text-primary)]">{t("settingsTitle")}</h1>

      {/* Avatar */}
      <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-5 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t("profilePhoto")}</h2>
        <div className="flex items-center gap-5">
          {/* Avatar preview */}
          <div className="relative shrink-0">
            {avatarPreview ? (
              <img src={avatarPreview} alt="" className="w-20 h-20 rounded-full object-cover border-2 border-[var(--border)]" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-[rgba(255,107,53,0.15)] flex items-center justify-center text-[#FF6B35] text-xl font-semibold border-2 border-[var(--border)]">
                {initials}
              </div>
            )}
            {avatarUploading && (
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl border border-[var(--border)] hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-50"
            >
              <Camera size={14} />
              {t("changePhoto")}
            </button>
            <p className="text-xs text-[var(--text-tertiary)]">JPG, PNG veya WebP · Maks. 2 MB</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>
      </div>

      {/* Profil bilgileri */}
      <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-5 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t("profileInfo")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: t("fullName"), value: fullName, setter: setFullName, placeholder: "Adınız Soyadınız", type: "text"  },
            { label: t("username"), value: username, setter: setUsername, placeholder: "@kullaniciadi",    type: "text"  },
            { label: t("cityLabel"),value: city,     setter: setCity,     placeholder: "İstanbul",         type: "text"  },
          ].map((f) => (
            <div key={f.label}>
              <label className="text-xs text-[var(--text-tertiary)] block mb-1">{f.label}</label>
              <input
                type={f.type}
                value={f.value}
                onChange={(e) => f.setter(e.target.value)}
                placeholder={f.placeholder}
                className="w-full h-10 px-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none focus:border-[#FF6B35] transition-colors"
              />
            </div>
          ))}
          <div>
            <label className="text-xs text-[var(--text-tertiary)] block mb-1">{t("email")}</label>
            <input value={user.email ?? ""} disabled
              className="w-full h-10 px-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] outline-none cursor-not-allowed" />
          </div>
        </div>

        {/* Bio */}
        <div>
          <label className="text-xs text-[var(--text-tertiary)] block mb-1">{t("bio")}</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder={t("bioPlaceholder")}
            rows={3}
            maxLength={300}
            className="w-full px-3 py-2.5 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none focus:border-[#FF6B35] transition-colors resize-none placeholder:text-[var(--text-tertiary)]"
          />
          <div className="text-right text-[10px] text-[var(--text-tertiary)] mt-1">{bio.length}/300</div>
        </div>

        <button onClick={handleSave} disabled={saving}
          className="self-start text-sm bg-[#FF6B35] text-white px-4 py-2 rounded-xl hover:bg-[#e85e2a] transition-colors disabled:opacity-50">
          {saved ? t("saved") : saving ? t("saving") : t("save")}
        </button>
      </div>

      {/* Yazıcı ortağı dükkan bilgileri */}
      {isPartner && (
        <div className="bg-[var(--bg-primary)] border border-[#10B981]/30 rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Store size={16} className="text-[#10B981]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t("shopInfo")}</h2>
            <span className="text-[10px] bg-[rgba(16,185,129,0.1)] text-[#10B981] px-2 py-0.5 rounded-full ml-auto">
              {t("partnerBadge")}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--text-tertiary)] block mb-1">{t("shopName")}</label>
              <input
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder={t("shopNamePlaceholder")}
                className="w-full h-10 px-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none focus:border-[#10B981] transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-tertiary)] block mb-1">{t("shopCity")}</label>
              <input
                value={shopCity}
                onChange={(e) => setShopCity(e.target.value)}
                placeholder="İstanbul"
                className="w-full h-10 px-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none focus:border-[#10B981] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-[var(--text-tertiary)] block mb-1">{t("shopDescription")}</label>
            <textarea
              value={shopDesc}
              onChange={(e) => setShopDesc(e.target.value)}
              placeholder={t("shopDescPlaceholder")}
              rows={3}
              maxLength={500}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none focus:border-[#10B981] transition-colors resize-none placeholder:text-[var(--text-tertiary)]"
            />
            <div className="text-right text-[10px] text-[var(--text-tertiary)] mt-1">{shopDesc.length}/500</div>
          </div>

          <button onClick={handleSave} disabled={saving}
            className="self-start text-sm bg-[#10B981] text-white px-4 py-2 rounded-xl hover:bg-[#0ea572] transition-colors disabled:opacity-50">
            {saved ? t("saved") : saving ? t("saving") : t("save")}
          </button>
        </div>
      )}

      {/* Yazıcı ortağı başvurusu — onaylı değilse göster */}
      {!isPartner && (
        <div className="bg-[var(--bg-primary)] border border-[#10B981]/30 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-1">{t("becomePartner")}</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-4">{t("becomePartnerDesc")}</p>
          <a href={`/${locale}/become-partner`}
            className="inline-block text-sm bg-[rgba(16,185,129,0.1)] text-[#10B981] border border-[#10B981]/30 px-4 py-2 rounded-xl hover:bg-[rgba(16,185,129,0.2)] transition-colors">
            {t("apply")}
          </a>
        </div>
      )}
    </div>
  );
}