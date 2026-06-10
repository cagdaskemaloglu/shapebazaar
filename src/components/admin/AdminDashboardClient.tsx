"use client";
import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { createClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/utils";
import { Package, Users, Upload, CheckCircle, XCircle, Eye } from "lucide-react";

interface PendingModel {
  id: string;
  title: string;
  created_at: string;
  file_format: string;
  base_price: number;
  is_free: boolean;
  designer: { full_name: string | null; email?: string } | null;
}

interface PendingPartner {
  id: string;
  full_name: string | null;
  city: string | null;
  bio: string | null;
  partner_requested_at: string | null;
}

interface OrderRow {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  city: string | null;
  models: { title: string }[] | null;
  profiles: { full_name: string | null } | null;
}

export function AdminDashboardClient() {
  const [tab,            setTab]            = useState<"models" | "partners" | "orders">("models");
  const [pendingModels,  setPendingModels]  = useState<PendingModel[]>([]);
  const [pendingPartners,setPendingPartners]= useState<PendingPartner[]>([]);
  const [orders,         setOrders]         = useState<OrderRow[]>([]);
  const [stats,          setStats]          = useState({ totalUsers: 0, totalModels: 0, totalOrders: 0, revenue: 0 });
  const [loading,        setLoading]        = useState(true);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const supabase = createClient();

    const [modelsRes, partnersRes, ordersRes, statsRes] = await Promise.all([
      supabase.from("models").select("id,title,created_at,file_format,base_price,is_free,designer:profiles(full_name)").eq("is_published", false).order("created_at", { ascending: false }),
      supabase.from("profiles").select("id,full_name,city,bio,partner_requested_at").not("partner_requested_at", "is", null).eq("is_partner_approved", false),
      supabase.from("orders").select("id,status,total_amount,created_at,city,models(title),profiles(full_name)").order("created_at", { ascending: false }).limit(50),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
    ]);

    setPendingModels((modelsRes.data ?? []) as unknown as PendingModel[]);
    setPendingPartners((partnersRes.data ?? []) as unknown as PendingPartner[]);
    setOrders((ordersRes.data ?? []) as unknown as OrderRow[]);

    const totalRevenue = (ordersRes.data ?? []).reduce((s: number, o: any) => s + (o.total_amount ?? 0), 0);
    setStats({
      totalUsers:  statsRes.count ?? 0,
      totalModels: modelsRes.data?.length ?? 0,
      totalOrders: ordersRes.data?.length ?? 0,
      revenue:     totalRevenue,
    });
    setLoading(false);
  }

  async function approveModel(modelId: string) {
    const supabase = createClient();
    await supabase.from("models").update({ is_published: true }).eq("id", modelId);
    // Trigger email notification via API
    const model = pendingModels.find((m) => m.id === modelId);
    if (model) {
      await fetch("/api/email/model-approved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId, modelTitle: model.title }),
      }).catch(() => {});
    }
    setPendingModels((prev) => prev.filter((m) => m.id !== modelId));
  }

  async function rejectModel(modelId: string) {
    const supabase = createClient();
    await supabase.from("models").delete().eq("id", modelId);
    setPendingModels((prev) => prev.filter((m) => m.id !== modelId));
  }

  async function approvePartner(userId: string) {
    const supabase = createClient();
    await supabase.from("profiles").update({ role: "printer_partner", is_partner_approved: true }).eq("id", userId);
    await fetch("/api/email/partner-approved", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    }).catch(() => {});
    setPendingPartners((prev) => prev.filter((p) => p.id !== userId));
  }

  async function rejectPartner(userId: string) {
    const supabase = createClient();
    await supabase.from("profiles").update({ partner_requested_at: null }).eq("id", userId);
    setPendingPartners((prev) => prev.filter((p) => p.id !== userId));
  }

  async function updateOrderStatus(orderId: string, status: string) {
    const supabase = createClient();
    const update: any = { status };

    if (status === "shipped") {
      const trackingNumber = prompt("Kargo takip numarası:") ?? "";
      const cargoCompany   = prompt("Kargo firması (opsiyonel):") ?? "";
      update.tracking_number = trackingNumber;
      update.cargo_company   = cargoCompany;
      // Send shipping email
      await fetch("/api/email/order-shipped", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, trackingNumber, cargoCompany }),
      }).catch(() => {});
    }

    await supabase.from("orders").update(update).eq("id", orderId);
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status } : o));
  }

  const STATUS_COLORS: Record<string, string> = {
    pending:   "bg-amber-100 text-amber-700",
    paid:      "bg-blue-100 text-blue-700",
    in_print:  "bg-purple-100 text-purple-700",
    printed:   "bg-indigo-100 text-indigo-700",
    shipped:   "bg-orange-100 text-orange-700",
    delivered: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-600",
  };

  const STATUS_LABELS: Record<string, string> = {
    pending: "Bekliyor", paid: "Ödendi", in_print: "Baskıda",
    printed: "Basıldı", shipped: "Kargoda", delivered: "Teslim", cancelled: "İptal",
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 flex-1">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-6">Admin Paneli</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Kullanıcı",      value: stats.totalUsers,            icon: Users,   color: "orange" },
            { label: "Bekleyen model", value: pendingModels.length,        icon: Upload,  color: "orange" },
            { label: "Toplam sipariş", value: stats.totalOrders,           icon: Package, color: "green"  },
            { label: "Toplam gelir",   value: formatPrice(stats.revenue),  icon: Package, color: "green"  },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${s.color === "orange" ? "bg-[rgba(255,107,53,0.1)] text-[#FF6B35]" : "bg-[rgba(16,185,129,0.1)] text-[#10B981]"}`}>
                  <Icon size={16} />
                </div>
                <div className="text-lg font-semibold text-[var(--text-primary)]">{s.value}</div>
                <div className="text-xs text-[var(--text-tertiary)]">{s.label}</div>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border border-[var(--border)] rounded-xl p-1 mb-6 w-fit">
          {[
            { id: "models",   label: `Model Onayı (${pendingModels.length})`     },
            { id: "partners", label: `Ortak Başvuruları (${pendingPartners.length})` },
            { id: "orders",   label: `Siparişler (${orders.length})`              },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={`px-4 py-2 rounded-lg text-sm transition-all ${tab === t.id ? "bg-[rgba(255,107,53,0.1)] text-[#FF6B35] font-medium" : "text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-16 text-sm text-[var(--text-tertiary)]">Yükleniyor…</div>
        ) : (
          <>
            {/* MODEL ONAY */}
            {tab === "models" && (
              <div className="flex flex-col gap-3">
                {pendingModels.length === 0 ? (
                  <div className="text-center py-16 text-sm text-[var(--text-tertiary)]">Bekleyen model yok.</div>
                ) : pendingModels.map((m) => (
                  <div key={m.id} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center text-xs font-mono font-semibold text-[var(--text-secondary)] shrink-0">
                      {m.file_format.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-[var(--text-primary)] truncate">{m.title}</div>
                      <div className="text-xs text-[var(--text-tertiary)]">
                        {m.designer?.full_name ?? "—"} · {new Date(m.created_at).toLocaleDateString("tr-TR")}
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-[#FF6B35] shrink-0">{m.is_free ? "Ücretsiz" : formatPrice(m.base_price)}</div>
                    <div className="flex gap-2 shrink-0">
                      <a href={`/tr/models/${m.id}`} target="_blank" className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-tertiary)] hover:bg-[var(--bg-secondary)]">
                        <Eye size={14} />
                      </a>
                      <button onClick={() => approveModel(m.id)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-[rgba(16,185,129,0.1)] text-[#10B981] hover:bg-[rgba(16,185,129,0.2)] transition-colors">
                        <CheckCircle size={14} />
                      </button>
                      <button onClick={() => rejectModel(m.id)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-950/20 transition-colors">
                        <XCircle size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ORTAK BAŞVURULARI */}
            {tab === "partners" && (
              <div className="flex flex-col gap-3">
                {pendingPartners.length === 0 ? (
                  <div className="text-center py-16 text-sm text-[var(--text-tertiary)]">Bekleyen başvuru yok.</div>
                ) : pendingPartners.map((p) => (
                  <div key={p.id} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[rgba(255,107,53,0.1)] flex items-center justify-center text-[#FF6B35] font-semibold shrink-0">
                      {(p.full_name ?? "?")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-[var(--text-primary)]">{p.full_name ?? "—"}</div>
                      <div className="text-xs text-[var(--text-tertiary)]">{p.city ?? "—"} · {p.partner_requested_at ? new Date(p.partner_requested_at).toLocaleDateString("tr-TR") : "—"}</div>
                      {p.bio && <div className="text-xs text-[var(--text-secondary)] mt-1 truncate">{p.bio}</div>}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => approvePartner(p.id)} className="px-3 py-1.5 text-xs rounded-lg bg-[rgba(16,185,129,0.1)] text-[#10B981] hover:bg-[rgba(16,185,129,0.2)] transition-colors">Onayla</button>
                      <button onClick={() => rejectPartner(p.id)} className="px-3 py-1.5 text-xs rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-950/20 transition-colors">Reddet</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* SİPARİŞLER */}
            {tab === "orders" && (
              <div className="flex flex-col gap-3">
                {orders.map((o) => (
                  <div key={o.id} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-[var(--text-primary)] truncate">
                        {(o.models as any)?.[0]?.title ?? "Model"}
                      </div>
                      <div className="text-xs text-[var(--text-tertiary)]">
                        {(o.profiles as any)?.full_name ?? "—"} · {new Date(o.created_at).toLocaleDateString("tr-TR")}
                        {o.city && ` · ${o.city}`}
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-[#FF6B35] shrink-0">{formatPrice(o.total_amount)}</div>
                    <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full shrink-0 ${STATUS_COLORS[o.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {STATUS_LABELS[o.status] ?? o.status}
                    </span>
                    {["paid", "printed"].includes(o.status) && (
                      <select
                        onChange={(e) => e.target.value && updateOrderStatus(o.id, e.target.value)}
                        defaultValue=""
                        className="text-xs h-8 px-2 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none cursor-pointer shrink-0"
                      >
                        <option value="">Güncelle</option>
                        <option value="shipped">Kargoya Ver</option>
                        <option value="delivered">Teslim Edildi</option>
                        <option value="cancelled">İptal Et</option>
                      </select>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}
