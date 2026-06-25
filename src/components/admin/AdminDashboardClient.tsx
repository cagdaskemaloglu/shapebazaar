"use client";
import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { createClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/utils";
import {
  Package, Users, Upload, CheckCircle, XCircle,
  Eye, FlaskConical, ChevronDown, ChevronUp, Plus
} from "lucide-react";

interface OrderItem {
  id: string;
  model_title: string;
  material: string;
  color_name: string | null;
  scale_percent: number | null;
  item_total: number;
}

interface PendingModel {
  id: string;
  title: string;
  created_at: string;
  file_format: string;
  base_price: number;
  is_free: boolean;
  designer: { full_name: string | null } | null;
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
  recipient_name: string | null;
  buyer: { full_name: string | null } | null;
  items: OrderItem[];
  print_job_status?: string | null;
}

interface ModelOption {
  id: string;
  title: string;
  base_price: number;
  is_free: boolean;
  weight_grams: number | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending:   "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  paid:      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  in_print:  "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  printed:   "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  shipped:   "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  delivered: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Bekliyor", paid: "Ödendi", in_print: "Baskıda",
  printed: "Basıldı", shipped: "Kargoda", delivered: "Teslim", cancelled: "İptal",
};

const MATERIALS = ["PLA", "PETG", "ABS", "TPU", "Resin"];
const COLORS = [
  { name: "Turuncu", hex: "#FF6B35" },
  { name: "Lacivert", hex: "#1E293B" },
  { name: "Yeşil",   hex: "#10B981" },
  { name: "Beyaz",   hex: "#F8FAFC" },
  { name: "Kırmızı", hex: "#E24B4A" },
];

export function AdminDashboardClient() {
  const [tab,             setTab]             = useState<"models" | "partners" | "orders" | "reports" | "test">("models");
  const [pendingModels,   setPendingModels]   = useState<PendingModel[]>([]);
  const [pendingPartners, setPendingPartners] = useState<PendingPartner[]>([]);
  const [orders,          setOrders]          = useState<OrderRow[]>([]);
  const [stats,           setStats]           = useState({ totalUsers: 0, totalOrders: 0, revenue: 0 });
  const [loading,         setLoading]         = useState(true);
  const [expanded,        setExpanded]        = useState<Set<string>>(new Set());

  // Filtreleme & arama
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("all");
  const [orderSearch,       setOrderSearch]       = useState("");
  const [modelSearch,       setModelSearch]       = useState("");

  // Toplu seçim
  const [selectedModels,   setSelectedModels]   = useState<Set<string>>(new Set());
  const [bulkLoading,      setBulkLoading]      = useState(false);

  // Test sipariş formu
  const [testModels,    setTestModels]    = useState<ModelOption[]>([]);
  const [testLoading,   setTestLoading]   = useState(false);
  const [testSuccess,   setTestSuccess]   = useState(false);
  const [testForm,      setTestForm]      = useState({
    modelId:       "",
    material:      "PLA",
    colorName:     "Turuncu",
    colorHex:      "#FF6B35",
    scale:         "100%",
    infill:        "25% (Standart)",
    recipientName: "Test Kullanıcı",
    city:          "İstanbul",
    district:      "Kadıköy",
    address:       "Test Mah. Test Sok. No:1",
    phone:         "+90 555 000 0000",
  });

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const supabase = createClient();

    const [modelsRes, partnersRes, ordersRes, usersRes, modelsForTest] = await Promise.all([
      supabase.from("models")
        .select("id,title,created_at,file_format,base_price,is_free,designer:profiles(full_name)")
        .eq("is_published", false)
        .order("created_at", { ascending: false }),

      supabase.from("profiles")
        .select("id,full_name,city,bio,partner_requested_at")
        .not("partner_requested_at", "is", null)
        .eq("is_partner_approved", false),

      supabase.from("orders")
        .select("id,status,total_amount,created_at,city,recipient_name,buyer:profiles(full_name)")
        .order("created_at", { ascending: false })
        .limit(50),

      supabase.from("profiles").select("id", { count: "exact", head: true }),

      supabase.from("models")
        .select("id,title,base_price,is_free,weight_grams")
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    // Her sipariş için order_items çek
    const orderIds = (ordersRes.data ?? []).map((o: any) => o.id);
    let itemsMap: Record<string, OrderItem[]> = {};
    if (orderIds.length > 0) {
      const { data: items } = await supabase
        .from("order_items")
        .select("id,order_id,model_title,material,color_name,scale_percent,item_total")
        .in("order_id", orderIds);
      for (const item of items ?? []) {
        if (!itemsMap[item.order_id]) itemsMap[item.order_id] = [];
        itemsMap[item.order_id].push(item as OrderItem);
      }
    }

    // Print job durumlarını çek
    let jobMap: Record<string, string> = {};
    if (orderIds.length > 0) {
      const { data: jobs } = await supabase
        .from("print_jobs")
        .select("order_id,status")
        .in("order_id", orderIds);
      for (const job of jobs ?? []) {
        jobMap[job.order_id] = job.status;
      }
    }

    const enrichedOrders: OrderRow[] = (ordersRes.data ?? []).map((o: any) => ({
      ...o,
      items:            itemsMap[o.id] ?? [],
      print_job_status: jobMap[o.id] ?? null,
    }));

    const totalRevenue = enrichedOrders.reduce((s, o) => s + (o.total_amount ?? 0), 0);

    setPendingModels((modelsRes.data ?? []) as unknown as PendingModel[]);
    setPendingPartners((partnersRes.data ?? []) as unknown as PendingPartner[]);
    setOrders(enrichedOrders);
    setTestModels((modelsForTest.data ?? []) as ModelOption[]);
    setStats({ totalUsers: usersRes.count ?? 0, totalOrders: ordersRes.data?.length ?? 0, revenue: totalRevenue });
    setLoading(false);
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function approveModel(modelId: string) {
    const supabase = createClient();
    await supabase.from("models").update({ is_published: true }).eq("id", modelId);
    await fetch("/api/email/model-approved", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelId, modelTitle: pendingModels.find((m) => m.id === modelId)?.title }),
    }).catch(() => {});
    setPendingModels((prev) => prev.filter((m) => m.id !== modelId));
    setSelectedModels((prev) => { const n = new Set(prev); n.delete(modelId); return n; });
  }

  async function bulkApproveModels() {
    if (selectedModels.size === 0) return;
    setBulkLoading(true);
    const supabase = createClient();
    const ids = Array.from(selectedModels);
    await supabase.from("models").update({ is_published: true }).in("id", ids);
    for (const id of ids) {
      await fetch("/api/email/model-approved", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId: id, modelTitle: pendingModels.find((m) => m.id === id)?.title }),
      }).catch(() => {});
    }
    setPendingModels((prev) => prev.filter((m) => !selectedModels.has(m.id)));
    setSelectedModels(new Set());
    setBulkLoading(false);
  }

  async function bulkRejectModels() {
    if (selectedModels.size === 0) return;
    if (!confirm(`${selectedModels.size} modeli reddet?`)) return;
    setBulkLoading(true);
    const supabase = createClient();
    const ids = Array.from(selectedModels);
    await supabase.from("models").delete().in("id", ids);
    setPendingModels((prev) => prev.filter((m) => !selectedModels.has(m.id)));
    setSelectedModels(new Set());
    setBulkLoading(false);
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
      method: "POST", headers: { "Content-Type": "application/json" },
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
    const update: Record<string, any> = { status };
    if (status === "shipped") {
      const trackingNumber = prompt("Kargo takip numarası:") ?? "";
      const cargoCompany   = prompt("Kargo firması (opsiyonel):") ?? "";
      update.tracking_number = trackingNumber;
      update.cargo_company   = cargoCompany;
      await fetch("/api/email/order-shipped", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, trackingNumber, cargoCompany }),
      }).catch(() => {});
    }
    await supabase.from("orders").update(update).eq("id", orderId);
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status } : o));
  }

  /* ── TEST SİPARİŞ OLUŞTUR ── */
  async function createTestOrder() {
    if (!testForm.modelId) { alert("Lütfen bir model seçin."); return; }
    setTestLoading(true);
    setTestSuccess(false);

    const supabase   = createClient();
    const model      = testModels.find((m) => m.id === testForm.modelId);
    if (!model) { setTestLoading(false); return; }

    // Kullanıcıyı al (admin kendisi)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setTestLoading(false); return; }

    const designPrice  = model.is_free ? 0 : model.base_price;
    const printCost    = ((model.weight_grams ?? 50) * 1.0) + 50; // basit hesap
    const platformFee  = (designPrice + printCost) * 0.10;
    const shippingCost = 150;
    const totalAmount  = designPrice + printCost + platformFee + shippingCost;
    const conversationId = `TEST-${Date.now()}`;

    // Order oluştur
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        buyer_id:       user.id,
        status:         "paid",
        shipping_cost:  shippingCost,
        platform_fee:   platformFee,
        total_amount:   totalAmount,
        recipient_name: testForm.recipientName,
        address_line1:  testForm.address,
        city:           testForm.city,
        district:       testForm.district,
        phone:          testForm.phone,
        payment_id:     conversationId,
        paid_at:        new Date().toISOString(),
      })
      .select("id")
      .single();

    if (orderErr || !order) {
      console.error(orderErr);
      alert("Sipariş oluşturulamadı.");
      setTestLoading(false);
      return;
    }

    // Order item oluştur
    await supabase.from("order_items").insert({
      order_id:     order.id,
      model_id:     model.id,
      model_title:  model.title,
      material:     testForm.material,
      color_name:   testForm.colorName,
      color_hex:    testForm.colorHex,
      scale_percent: parseFloat(testForm.scale) || 100,
      infill:       testForm.infill,
      model_price:  designPrice,
      print_cost:   printCost,
      item_total:   designPrice + printCost + platformFee,
    });

    // Print job oluştur
    await supabase.from("print_jobs").insert({
      order_id: order.id,
      status:   "available",
    });

    setTestSuccess(true);
    setTestLoading(false);
    await fetchAll();
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 flex-1">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-6">Admin Paneli</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Kullanıcı",      value: stats.totalUsers,           icon: Users,   color: "orange" },
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
        <div className="flex gap-1 border border-[var(--border)] rounded-xl p-1 mb-6 w-fit flex-wrap">
          {[
            { id: "models",   label: `Model Onayı (${pendingModels.length})`        },
            { id: "partners", label: `Ortak Başvuruları (${pendingPartners.length})` },
            { id: "orders",   label: `Siparişler (${orders.length})`                },
            { id: "reports",  label: "📊 Raporlar"                                  },
            { id: "test",     label: "🧪 Test Siparişi", highlight: true            },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={`px-4 py-2 rounded-lg text-sm transition-all ${
                tab === t.id
                  ? t.highlight
                    ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 font-medium"
                    : "bg-[rgba(255,107,53,0.1)] text-[#FF6B35] font-medium"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-16 text-sm text-[var(--text-tertiary)]">Yükleniyor…</div>
        ) : (
          <>
            {/* MODEL ONAYI */}
            {tab === "models" && (
              <div className="flex flex-col gap-3">
                {/* Toolbar */}
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    value={modelSearch}
                    onChange={(e) => setModelSearch(e.target.value)}
                    placeholder="Model veya tasarımcı ara…"
                    className="h-9 px-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none focus:border-[#FF6B35] flex-1 min-w-[200px]"
                  />
                  <button
                    onClick={() => setSelectedModels(new Set(pendingModels.filter(m =>
                      !modelSearch || m.title.toLowerCase().includes(modelSearch.toLowerCase()) ||
                      (m.designer?.full_name ?? "").toLowerCase().includes(modelSearch.toLowerCase())
                    ).map(m => m.id)))}
                    className="h-9 px-3 text-xs rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors whitespace-nowrap"
                  >
                    Tümünü Seç
                  </button>
                  {selectedModels.size > 0 && (
                    <>
                      <span className="text-xs text-[var(--text-tertiary)] whitespace-nowrap">{selectedModels.size} seçili</span>
                      <button onClick={bulkApproveModels} disabled={bulkLoading}
                        className="h-9 px-3 text-xs rounded-xl bg-[rgba(16,185,129,0.1)] text-[#10B981] hover:bg-[rgba(16,185,129,0.2)] disabled:opacity-50 transition-colors font-medium whitespace-nowrap">
                        {bulkLoading ? "İşleniyor…" : "✓ Hepsini Onayla"}
                      </button>
                      <button onClick={bulkRejectModels} disabled={bulkLoading}
                        className="h-9 px-3 text-xs rounded-xl bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 hover:opacity-80 disabled:opacity-50 transition-colors font-medium whitespace-nowrap">
                        ✕ Hepsini Reddet
                      </button>
                    </>
                  )}
                </div>

                {pendingModels.length === 0 ? (
                  <div className="text-center py-16 text-sm text-[var(--text-tertiary)]">Bekleyen model yok.</div>
                ) : pendingModels
                    .filter((m) => !modelSearch ||
                      m.title.toLowerCase().includes(modelSearch.toLowerCase()) ||
                      (m.designer?.full_name ?? "").toLowerCase().includes(modelSearch.toLowerCase())
                    )
                    .map((m) => (
                  <div key={m.id} className={`bg-[var(--bg-primary)] border rounded-2xl p-4 flex items-center gap-3 transition-colors ${
                    selectedModels.has(m.id) ? "border-[#FF6B35] bg-[rgba(255,107,53,0.02)]" : "border-[var(--border)]"
                  }`}>
                    <input type="checkbox"
                      checked={selectedModels.has(m.id)}
                      onChange={(e) => {
                        setSelectedModels((prev) => {
                          const n = new Set(prev);
                          e.target.checked ? n.add(m.id) : n.delete(m.id);
                          return n;
                        });
                      }}
                      className="w-4 h-4 rounded accent-[#FF6B35] cursor-pointer shrink-0"
                    />
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
                      <a href={`/tr/models/${m.id}`} target="_blank"
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-tertiary)] hover:bg-[var(--bg-secondary)] transition-colors">
                        <Eye size={14} />
                      </a>
                      <button onClick={() => approveModel(m.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-[rgba(16,185,129,0.1)] text-[#10B981] hover:bg-[rgba(16,185,129,0.2)] transition-colors">
                        <CheckCircle size={14} />
                      </button>
                      <button onClick={() => rejectModel(m.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-950/20 transition-colors">
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
                      <div className="text-xs text-[var(--text-tertiary)]">
                        {p.city ?? "—"} · {p.partner_requested_at ? new Date(p.partner_requested_at).toLocaleDateString("tr-TR") : "—"}
                      </div>
                      {p.bio && <div className="text-xs text-[var(--text-secondary)] mt-1 truncate">{p.bio}</div>}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => approvePartner(p.id)}
                        className="px-3 py-1.5 text-xs rounded-lg bg-[rgba(16,185,129,0.1)] text-[#10B981] hover:bg-[rgba(16,185,129,0.2)] transition-colors">
                        Onayla
                      </button>
                      <button onClick={() => rejectPartner(p.id)}
                        className="px-3 py-1.5 text-xs rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-950/20 transition-colors">
                        Reddet
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* SİPARİŞLER */}
            {tab === "orders" && (
              <div className="flex flex-col gap-3">
                {/* Toolbar */}
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="Alıcı adı veya sipariş no ara…"
                    className="h-9 px-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none focus:border-[#FF6B35] flex-1 min-w-[200px]"
                  />
                  <select
                    value={orderStatusFilter}
                    onChange={(e) => setOrderStatusFilter(e.target.value)}
                    className="h-9 px-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none focus:border-[#FF6B35] cursor-pointer"
                  >
                    {["all","pending","paid","in_print","shipped","delivered","cancelled"].map((s) => (
                      <option key={s} value={s}>
                        {s === "all" ? "Tüm Durumlar" :
                         s === "pending" ? "Bekliyor" :
                         s === "paid" ? "Ödendi" :
                         s === "in_print" ? "Baskıda" :
                         s === "shipped" ? "Kargoda" :
                         s === "delivered" ? "Teslim Edildi" : "İptal"}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-[var(--text-tertiary)]">
                    {orders.filter(o =>
                      (orderStatusFilter === "all" || o.status === orderStatusFilter) &&
                      (!orderSearch || o.recipient_name?.toLowerCase().includes(orderSearch.toLowerCase()) ||
                       o.id.slice(0,8).toLowerCase().includes(orderSearch.toLowerCase()))
                    ).length} sonuç
                  </span>
                </div>

                {orders.filter(o =>
                  (orderStatusFilter === "all" || o.status === orderStatusFilter) &&
                  (!orderSearch || o.recipient_name?.toLowerCase().includes(orderSearch.toLowerCase()) ||
                   o.id.slice(0,8).toLowerCase().includes(orderSearch.toLowerCase()))
                ).length === 0 ? (
                  <div className="text-center py-16 text-sm text-[var(--text-tertiary)]">Sipariş bulunamadı.</div>
                ) : orders
                    .filter(o =>
                      (orderStatusFilter === "all" || o.status === orderStatusFilter) &&
                      (!orderSearch || o.recipient_name?.toLowerCase().includes(orderSearch.toLowerCase()) ||
                       o.id.slice(0,8).toLowerCase().includes(orderSearch.toLowerCase()))
                    )
                    .map((o) => {
                  const isExp = expanded.has(o.id);
                  return (
                    <div key={o.id} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl overflow-hidden">
                      <div className="flex items-center gap-4 p-4">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-[var(--text-primary)] truncate">
                            {o.items.length > 0
                              ? o.items.map((i) => i.model_title).join(", ")
                              : `Sipariş #${o.id.slice(0, 8)}`
                            }
                          </div>
                          <div className="text-xs text-[var(--text-tertiary)]">
                            {o.buyer?.full_name ?? "—"} · {new Date(o.created_at).toLocaleDateString("tr-TR")}
                            {o.city ? ` · ${o.city}` : ""}
                            {o.items.length > 0 ? ` · ${o.items.length} ürün` : ""}
                          </div>
                        </div>

                        <div className="text-sm font-semibold text-[#FF6B35] shrink-0">{formatPrice(o.total_amount)}</div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[o.status] ?? "bg-gray-100 text-gray-600"}`}>
                            {STATUS_LABELS[o.status] ?? o.status}
                          </span>

                          {/* Print job durumu */}
                          {o.print_job_status && (
                            <span className="text-[11px] text-[var(--text-tertiary)] border border-[var(--border)] px-2 py-0.5 rounded-full">
                              🖨 {o.print_job_status}
                            </span>
                          )}

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

                          <button onClick={() => toggleExpand(o.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--bg-secondary)] transition-colors">
                            {isExp ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </div>
                      </div>

                      {/* Genişletilmiş detay */}
                      {isExp && o.items.length > 0 && (
                        <div className="border-t border-[var(--border)] px-4 pb-4 pt-3 flex flex-col gap-2">
                          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">Sipariş Kalemleri</div>
                          {o.items.map((item) => (
                            <div key={item.id} className="flex items-center gap-3 bg-[var(--bg-secondary)] rounded-xl px-3 py-2.5">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-[var(--text-primary)] truncate">{item.model_title}</div>
                                <div className="text-xs text-[var(--text-tertiary)]">
                                  {item.material}
                                  {item.color_name ? ` · ${item.color_name}` : ""}
                                  {item.scale_percent ? ` · %${item.scale_percent}` : ""}
                                </div>
                              </div>
                              <div className="text-sm font-medium text-[var(--text-primary)] shrink-0">{formatPrice(item.item_total)}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* RAPORLAR */}
            {tab === "reports" && (
              <div className="flex flex-col gap-6">
                <h2 className="text-base font-semibold text-[var(--text-primary)]">📊 Platform Raporları</h2>

                {/* Gelir özeti */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Toplam Gelir",    value: formatPrice(stats.revenue),           color: "orange" },
                    { label: "Toplam Sipariş",  value: stats.totalOrders,                    color: "green"  },
                    { label: "Toplam Kullanıcı",value: stats.totalUsers,                     color: "blue"   },
                    { label: "Ort. Sipariş",    value: stats.totalOrders > 0 ? formatPrice(stats.revenue / stats.totalOrders) : "—", color: "purple" },
                  ].map((s) => (
                    <div key={s.label} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-4">
                      <div className={`text-xl font-semibold mb-1 ${
                        s.color === "orange" ? "text-[#FF6B35]" :
                        s.color === "green"  ? "text-[#10B981]" :
                        s.color === "blue"   ? "text-blue-500"  : "text-purple-500"
                      }`}>{s.value}</div>
                      <div className="text-xs text-[var(--text-tertiary)]">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Sipariş durumu dağılımı */}
                <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-5">
                  <h3 className="text-sm font-medium text-[var(--text-primary)] mb-4">Sipariş Durumu Dağılımı</h3>
                  <div className="flex flex-col gap-2">
                    {[
                      { status: "pending",   label: "Bekliyor",      color: "bg-gray-400"    },
                      { status: "paid",      label: "Ödendi",        color: "bg-blue-400"    },
                      { status: "in_print",  label: "Baskıda",       color: "bg-purple-400"  },
                      { status: "shipped",   label: "Kargoda",       color: "bg-yellow-400"  },
                      { status: "delivered", label: "Teslim Edildi", color: "bg-[#10B981]"   },
                      { status: "cancelled", label: "İptal",         color: "bg-red-400"     },
                    ].map(({ status, label, color }) => {
                      const count = orders.filter(o => o.status === status).length;
                      const pct   = orders.length > 0 ? Math.round((count / orders.length) * 100) : 0;
                      return (
                        <div key={status} className="flex items-center gap-3">
                          <div className="w-24 text-xs text-[var(--text-tertiary)] shrink-0">{label}</div>
                          <div className="flex-1 h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                            <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                          </div>
                          <div className="w-12 text-xs text-[var(--text-tertiary)] text-right shrink-0">{count} (%{pct})</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Son siparişler özeti */}
                <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-5">
                  <h3 className="text-sm font-medium text-[var(--text-primary)] mb-4">Son 5 Sipariş</h3>
                  <div className="flex flex-col divide-y divide-[var(--border)]">
                    {orders.slice(0, 5).map((o) => (
                      <div key={o.id} className="flex items-center justify-between py-2.5">
                        <div>
                          <div className="text-sm text-[var(--text-primary)]">#{o.id.slice(0,8).toUpperCase()}</div>
                          <div className="text-xs text-[var(--text-tertiary)]">{o.recipient_name} · {new Date(o.created_at).toLocaleDateString("tr-TR")}</div>
                        </div>
                        <div className="text-sm font-semibold text-[#FF6B35]">{formatPrice(o.total_amount)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TEST SİPARİŞİ */}
            {tab === "test" && (
              <div className="max-w-xl">
                <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-2xl p-4 mb-5 flex gap-3">
                  <FlaskConical size={16} className="text-purple-500 shrink-0 mt-0.5" />
                  <div className="text-sm text-purple-700 dark:text-purple-400">
                    Bu araç gerçek bir ödeme olmaksızın test siparişi oluşturur. Sipariş direkt "Ödendi" statüsünde açılır ve yazıcı ortağı havuzuna düşer.
                  </div>
                </div>

                <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-5 flex flex-col gap-4">
                  <h2 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                    <Plus size={16} className="text-[#FF6B35]" /> Test Siparişi Oluştur
                  </h2>

                  {/* Model seç */}
                  <div>
                    <label className="text-xs text-[var(--text-tertiary)] block mb-1">Model *</label>
                    <select
                      value={testForm.modelId}
                      onChange={(e) => setTestForm((f) => ({ ...f, modelId: e.target.value }))}
                      className="w-full h-10 px-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none focus:border-[#FF6B35] transition-colors"
                    >
                      <option value="">Model seç...</option>
                      {testModels.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.title} {m.is_free ? "(Ücretsiz)" : `(${formatPrice(m.base_price)})`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Malzeme + Renk */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-[var(--text-tertiary)] block mb-1">Malzeme</label>
                      <select
                        value={testForm.material}
                        onChange={(e) => setTestForm((f) => ({ ...f, material: e.target.value }))}
                        className="w-full h-10 px-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none focus:border-[#FF6B35] transition-colors"
                      >
                        {MATERIALS.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-[var(--text-tertiary)] block mb-1">Renk</label>
                      <select
                        value={testForm.colorName}
                        onChange={(e) => {
                          const c = COLORS.find((c) => c.name === e.target.value);
                          setTestForm((f) => ({ ...f, colorName: e.target.value, colorHex: c?.hex ?? "#FF6B35" }));
                        }}
                        className="w-full h-10 px-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none focus:border-[#FF6B35] transition-colors"
                      >
                        {COLORS.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Alıcı bilgileri */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Ad Soyad",  key: "recipientName", placeholder: "Test Kullanıcı" },
                      { label: "Telefon",   key: "phone",         placeholder: "+90 555 000 0000" },
                      { label: "İl",        key: "city",          placeholder: "İstanbul"         },
                      { label: "İlçe",      key: "district",      placeholder: "Kadıköy"          },
                    ].map((f) => (
                      <div key={f.key}>
                        <label className="text-xs text-[var(--text-tertiary)] block mb-1">{f.label}</label>
                        <input
                          type="text"
                          placeholder={f.placeholder}
                          value={(testForm as any)[f.key]}
                          onChange={(e) => setTestForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                          className="w-full h-10 px-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none focus:border-[#FF6B35] transition-colors placeholder:text-[var(--text-tertiary)]"
                        />
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="text-xs text-[var(--text-tertiary)] block mb-1">Adres</label>
                    <input
                      type="text"
                      value={testForm.address}
                      onChange={(e) => setTestForm((f) => ({ ...f, address: e.target.value }))}
                      className="w-full h-10 px-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none focus:border-[#FF6B35] transition-colors"
                    />
                  </div>

                  {testSuccess && (
                    <div className="flex items-center gap-2 text-sm text-[#10B981] bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.2)] rounded-xl px-4 py-3">
                      <CheckCircle size={15} /> Test siparişi oluşturuldu! Yazıcı ortağı panelinde görünür.
                    </div>
                  )}

                  <button
                    onClick={createTestOrder}
                    disabled={testLoading || !testForm.modelId}
                    className="w-full h-11 bg-[#FF6B35] text-white rounded-xl text-sm font-medium hover:bg-[#e85e2a] disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
                  >
                    {testLoading ? (
                      <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Oluşturuluyor…</>
                    ) : (
                      <><Plus size={16} /> Test Siparişi Oluştur</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}