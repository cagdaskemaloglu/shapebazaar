"use client";
import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  LayoutDashboard, Package, Upload, Printer,
  Wallet, Settings, LogOut, ChevronRight,
  CheckCircle, Clock, ExternalLink, Trash2
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import type { User } from "@supabase/supabase-js";

interface Profile {
  full_name?: string;
  username?: string;
  avatar_url?: string;
  role: string;
  wallet_balance: number;
  is_partner_approved: boolean;
  city?: string;
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

const NAV_ITEMS = [
  { id: "overview",  label: "Genel Bakış",    icon: LayoutDashboard },
  { id: "orders",    label: "Siparişlerim",    icon: Package },
  { id: "uploads",   label: "Modellerim",      icon: Upload },
  { id: "printjobs", label: "Baskı Görevleri", icon: Printer },
  { id: "wallet",    label: "Cüzdan",          icon: Wallet },
  { id: "settings",  label: "Ayarlar",         icon: Settings },
];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:   { label: "Bekliyor",      color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  paid:      { label: "Ödendi",        color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  in_print:  { label: "Baskıda",       color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  shipped:   { label: "Kargoda",       color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  delivered: { label: "Teslim Edildi", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  cancelled: { label: "İptal",         color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

export function DashboardClient({ user, profile }: { user: User; profile: Profile | null }) {
  const router = useRouter();
  const [activeTab,     setActiveTab]     = useState("overview");
  const [orders,        setOrders]        = useState<Order[]>([]);
  const [models,        setModels]        = useState<Model[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingModels, setLoadingModels] = useState(true);

  const displayName   = profile?.full_name || user.email?.split("@")[0] || "Kullanıcı";
  const initials      = displayName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
  const walletBalance = profile?.wallet_balance ?? 0;

  useEffect(() => {
    fetchOrders();
    fetchModels();
  }, []);

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
    // is_published filtresi YOK — tasarımcı kendi tüm modellerini görmeli
    const { data } = await supabase
      .from("models")
      .select("id, title, is_published, base_price, is_free, print_count, avg_rating, created_at, file_format")
      .eq("designer_id", user.id)
      .order("created_at", { ascending: false });
    setModels((data ?? []) as Model[]);
    setLoadingModels(false);
  }

  async function deleteModel(modelId: string) {
    if (!confirm("Bu modeli silmek istediğinize emin misiniz?")) return;
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
              <span className="text-xs text-[var(--text-tertiary)]">Cüzdan</span>
              <span className="text-sm font-semibold text-[#10B981]">{formatPrice(walletBalance)}</span>
            </div>
          </div>

          {NAV_ITEMS.map((item) => {
            const Icon   = item.icon;
            const active = activeTab === item.id;
            if (item.id === "printjobs" && profile?.role !== "printer_partner") return null;
            return (
              <button key={item.id} onClick={() => setActiveTab(item.id)}
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
              <LogOut size={16} />Çıkış Yap
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0">
          {activeTab === "overview" && <OverviewTab  orders={orders} models={models} walletBalance={walletBalance} loading={loadingOrders} />}
          {activeTab === "orders"   && <OrdersTab    orders={orders} loading={loadingOrders} />}
          {activeTab === "uploads"  && <UploadsTab   models={models} loading={loadingModels} onDelete={deleteModel} />}
          {activeTab === "wallet"   && <WalletTab    balance={walletBalance} />}
          {activeTab === "settings" && <SettingsTab  user={user} profile={profile} />}
        </main>
      </div>
      <Footer />
    </div>
  );
}

/* ── OVERVIEW ─────────────────────────────────────── */
function OverviewTab({ orders, models, walletBalance, loading }: { orders: Order[]; models: Model[]; walletBalance: number; loading: boolean }) {
  const delivered = orders.filter((o) => o.status === "delivered").length;
  const inPrint   = orders.filter((o) => o.status === "in_print" || o.status === "paid").length;

  const stats = [
    { label: "Toplam Sipariş", value: String(orders.length), icon: Package,     color: "orange" },
    { label: "Teslim Edildi",  value: String(delivered),     icon: CheckCircle, color: "green"  },
    { label: "Baskıda",        value: String(inPrint),       icon: Clock,       color: "orange" },
    { label: "Cüzdan",         value: formatPrice(walletBalance), icon: Wallet, color: "green"  },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Genel Bakış</h1>
        <p className="text-sm text-[var(--text-tertiary)] mt-0.5">Hesabının özeti</p>
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
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Son Siparişler</h2>
        {loading ? (
          <div className="text-center py-6 text-sm text-[var(--text-tertiary)]">Yükleniyor…</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-6 text-sm text-[var(--text-tertiary)]">Henüz sipariş yok.</div>
        ) : (
          orders.slice(0, 5).map((o) => {
            const st = STATUS_LABELS[o.status] ?? { label: o.status, color: "" };
            return (
              <div key={o.id} className="flex items-center gap-3 py-2.5 border-b border-[var(--border)] last:border-0">
                <div className="w-8 h-8 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center shrink-0">
                  <Package size={14} className="text-[var(--text-tertiary)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--text-primary)] truncate">{o.models?.[0]?.title ?? "Model"}</div>
                  <div className="text-xs text-[var(--text-tertiary)]">{new Date(o.created_at).toLocaleDateString("tr-TR")}</div>
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
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Modellerim ({models.length})</h2>
          {models.slice(0, 3).map((m) => (
            <div key={m.id} className="flex items-center gap-3 py-2.5 border-b border-[var(--border)] last:border-0">
              <div className="w-8 h-8 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center shrink-0 text-xs font-mono text-[var(--text-tertiary)]">
                {m.file_format.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[var(--text-primary)] truncate">{m.title}</div>
                <div className="text-xs text-[var(--text-tertiary)]">{m.print_count} baskı</div>
              </div>
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${m.is_published ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                {m.is_published ? "Yayında" : "İncelemede"}
              </span>
              <span className="text-sm font-medium text-[#FF6B35]">{m.is_free ? "Ücretsiz" : formatPrice(m.base_price)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── ORDERS ───────────────────────────────────────── */
function OrdersTab({ orders, loading }: { orders: Order[]; loading: boolean }) {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold text-[var(--text-primary)]">Siparişlerim</h1>
      <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="text-center py-10 text-sm text-[var(--text-tertiary)]">Yükleniyor…</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-10">
            <Package size={32} className="mx-auto mb-3 text-[var(--text-tertiary)] opacity-30" />
            <p className="text-sm text-[var(--text-tertiary)]">Henüz sipariş vermediniz.</p>
            <a href="/tr/models" className="text-sm text-[#FF6B35] hover:underline mt-2 inline-block">Modellere göz at →</a>
          </div>
        ) : (
          orders.map((o, i) => {
            const st = STATUS_LABELS[o.status] ?? { label: o.status, color: "" };
            return (
              <div key={o.id} className={`flex items-center gap-4 p-4 ${i !== orders.length - 1 ? "border-b border-[var(--border)]" : ""}`}>
                <div className="w-10 h-10 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center shrink-0">
                  <Package size={18} className="text-[var(--text-tertiary)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-[var(--text-primary)]">{o.models?.[0]?.title ?? "Model"}</div>
                  <div className="text-xs text-[var(--text-tertiary)]">{o.id.slice(0, 8).toUpperCase()} · {new Date(o.created_at).toLocaleDateString("tr-TR")}</div>
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

/* ── UPLOADS ──────────────────────────────────────── */
function UploadsTab({ models, loading, onDelete }: { models: Model[]; loading: boolean; onDelete: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Modellerim</h1>
        <a href="/tr/upload" className="flex items-center gap-1.5 text-sm bg-[#FF6B35] text-white px-4 py-2 rounded-xl hover:bg-[#e85e2a] transition-colors">
          <Upload size={14} /> Model Yükle
        </a>
      </div>
      {loading ? (
        <div className="text-center py-16 text-sm text-[var(--text-tertiary)]">Yükleniyor…</div>
      ) : models.length === 0 ? (
        <div className="bg-[var(--bg-primary)] border border-[var(--border)] border-dashed rounded-2xl p-12 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-[rgba(255,107,53,0.08)] flex items-center justify-center mb-4">
            <Upload size={24} className="text-[#FF6B35]" />
          </div>
          <h3 className="font-medium text-[var(--text-primary)] mb-2">Henüz model yüklemediniz</h3>
          <p className="text-sm text-[var(--text-tertiary)] max-w-xs mb-5">STL, OBJ veya 3MF formatında modelinizi yükleyin. Her satıştan puan kazanın.</p>
          <a href="/tr/upload" className="text-sm text-[#FF6B35] hover:underline">İlk modelini yükle →</a>
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
                <div className="text-xs text-[var(--text-tertiary)]">{new Date(m.created_at).toLocaleDateString("tr-TR")} · {m.print_count} baskı</div>
              </div>
              <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full shrink-0 ${m.is_published ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}>
                {m.is_published ? "Yayında" : "İncelemede"}
              </span>
              <span className="text-sm font-semibold text-[#FF6B35] shrink-0">{m.is_free ? "Ücretsiz" : formatPrice(m.base_price)}</span>
              <div className="flex gap-1">
                <a href={`/tr/models/${m.id}`} className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--bg-secondary)] transition-colors" title="Görüntüle">
                  <ExternalLink size={14} />
                </a>
                <button onClick={() => onDelete(m.id)} className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-tertiary)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors" title="Sil">
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

/* ── WALLET ───────────────────────────────────────── */
function WalletTab({ balance }: { balance: number }) {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold text-[var(--text-primary)]">Cüzdan</h1>
      <div className="rounded-2xl p-6 text-white" style={{ background: "linear-gradient(135deg, #FF6B35, #e85e2a)" }}>
        <div className="text-sm opacity-80 mb-1">Mevcut Bakiye</div>
        <div className="text-4xl font-semibold">{formatPrice(balance)}</div>
        <div className="text-sm opacity-70 mt-2">Sipariş ödemelerinde kullanabilirsiniz</div>
      </div>
      <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">İşlem Geçmişi</h2>
        <div className="text-center py-8 text-[var(--text-tertiary)] text-sm">Henüz işlem bulunmuyor.</div>
      </div>
    </div>
  );
}

/* ── SETTINGS ─────────────────────────────────────── */
function SettingsTab({ user, profile }: { user: User; profile: Profile | null }) {
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [city,     setCity]     = useState(profile?.city ?? "");
  const [username, setUsername] = useState(profile?.username ?? "");

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();
    await supabase.from("profiles").update({ full_name: fullName, city, username }).eq("id", user.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold text-[var(--text-primary)]">Ayarlar</h1>
      <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-5 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Profil Bilgileri</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: "Ad Soyad",      value: fullName, setter: setFullName, placeholder: "Adınız Soyadınız" },
            { label: "Kullanıcı Adı", value: username, setter: setUsername, placeholder: "@kullaniciadi"   },
            { label: "Şehir",         value: city,     setter: setCity,     placeholder: "İstanbul"        },
          ].map((f) => (
            <div key={f.label}>
              <label className="text-xs text-[var(--text-tertiary)] block mb-1">{f.label}</label>
              <input value={f.value} onChange={(e) => f.setter(e.target.value)} placeholder={f.placeholder}
                className="w-full h-10 px-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none focus:border-[#FF6B35] transition-colors" />
            </div>
          ))}
          <div>
            <label className="text-xs text-[var(--text-tertiary)] block mb-1">E-posta</label>
            <input value={user.email ?? ""} disabled
              className="w-full h-10 px-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] outline-none cursor-not-allowed" />
          </div>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="self-start text-sm bg-[#FF6B35] text-white px-4 py-2 rounded-xl hover:bg-[#e85e2a] transition-colors disabled:opacity-50">
          {saved ? "Kaydedildi ✓" : saving ? "Kaydediliyor…" : "Kaydet"}
        </button>
      </div>

      {profile?.role !== "printer_partner" && (
        <div className="bg-[var(--bg-primary)] border border-[#10B981]/30 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Yazıcı Ortağı Ol</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-4">3D yazıcınız var mı? Sipariş havuzundan baskı alın, her baskıdan puan kazanın.</p>
          <a href="/tr/become-partner" className="inline-block text-sm bg-[rgba(16,185,129,0.1)] text-[#10B981] border border-[#10B981]/30 px-4 py-2 rounded-xl hover:bg-[rgba(16,185,129,0.2)] transition-colors">
            Başvur →
          </a>
        </div>
      )}
    </div>
  );
}
