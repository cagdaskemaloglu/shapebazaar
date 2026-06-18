"use client";
import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/utils";
import {
  Package, CheckCircle, Printer, ChevronDown, ChevronUp,
  Clock, Truck, AlertTriangle, User, MapPin, Box
} from "lucide-react";

interface OrderItem {
  id: string;
  order_id: string;
  model_title: string;
  material: string;
  color_name: string | null;
  color_hex: string | null;
  scale_percent: number | null;
  infill: string | null;
  item_total: number;
}

interface PrintJob {
  id: string;
  status: string;
  claimed_at: string | null;
  printed_at: string | null;
  deadline: string | null;
  created_at: string;
  printer_id: string | null;
  printer_notes: string | null;
  printer_full_name: string | null;
  printer_username: string | null;
  order: {
    id: string;
    total_amount: number;
    shipping_cost: number;
    city: string | null;
    district: string | null;
    recipient_name: string | null;
    address_line1: string | null;
    phone: string | null;
  } | null;
  items: OrderItem[];
}

const PRINTER_EARNING_RATE = 0.15;

function getTimeLeft(deadline: string | null, t: ReturnType<typeof useTranslations>): { text: string; urgent: boolean } | null {
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return { text: t("expired"), urgent: true };
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return { text: t("hoursLeft", { hours }), urgent: hours < 6 };
  const days = Math.floor(hours / 24);
  return { text: t("daysLeft", { days, hours: hours % 24 }), urgent: days < 1 };
}

function ShippingModal({ onSubmit, onClose, loading, t }: {
  onSubmit: (trackingNumber: string, cargoCompany: string) => void;
  onClose: () => void;
  loading: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [cargoCompany,   setCargoCompany]   = useState("");
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-sm flex flex-col gap-4">
        <div>
          <h2 className="font-semibold text-[var(--text-primary)] mb-1">{t("cargoTitle")}</h2>
          <p className="text-xs text-[var(--text-tertiary)]">{t("cargoSub")}</p>
        </div>
        <div>
          <label className="text-xs text-[var(--text-tertiary)] block mb-1">{t("cargoCompany")}</label>
          <input type="text" placeholder={t("cargoCompanyPlaceholder")} value={cargoCompany}
            onChange={(e) => setCargoCompany(e.target.value)}
            className="w-full h-10 px-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none focus:border-[#FF6B35] transition-colors placeholder:text-[var(--text-tertiary)]" />
        </div>
        <div>
          <label className="text-xs text-[var(--text-tertiary)] block mb-1">{t("trackingNumber")} *</label>
          <input type="text" placeholder="1234567890" value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            className="w-full h-10 px-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none focus:border-[#FF6B35] transition-colors placeholder:text-[var(--text-tertiary)]" />
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={onClose}
            className="flex-1 h-10 rounded-xl border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors">
            {t("cancel")}
          </button>
          <button onClick={() => onSubmit(trackingNumber, cargoCompany)}
            disabled={!trackingNumber || loading}
            className="flex-1 h-10 rounded-xl bg-[#FF6B35] text-white text-sm font-medium hover:bg-[#e85e2a] disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
            {loading
              ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />{t("saving")}</>
              : <><Truck size={14} />{t("shipped")}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export function PartnerDashboardClient({ userId }: { userId: string }) {
  const t        = useTranslations("partner");
  const pathname = usePathname();
  const locale   = pathname.split("/")[1] || "tr";

  const JOB_STATUS: Record<string, { label: string; color: string }> = {
    available: { label: t("available"),  color: "bg-[rgba(16,185,129,0.1)] text-[#10B981]"                              },
    claimed:   { label: t("claimed"),    color: "bg-[rgba(255,107,53,0.1)] text-[#FF6B35]"                              },
    printing:  { label: t("startPrint"), color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
    done:      { label: t("completed"),  color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"   },
    failed:    { label: "—",             color: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"           },
  };

  const [tab,             setTab]             = useState<"pool" | "mine" | "history">("pool");
  const [poolJobs,        setPoolJobs]        = useState<PrintJob[]>([]);
  const [myJobs,          setMyJobs]          = useState<PrintJob[]>([]);
  const [earnings,        setEarnings]        = useState(0);
  const [loading,         setLoading]         = useState(true);
  const [claiming,        setClaiming]        = useState<string | null>(null);
  const [expanded,        setExpanded]        = useState<Set<string>>(new Set());
  const [shippingJobId,   setShippingJobId]   = useState<string | null>(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [partnerRegion,   setPartnerRegion]   = useState<string>("TR");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    // Partner'ın region'ını çek
    const { data: partnerProfile } = await supabase
      .from("profiles")
      .select("region")
      .eq("id", userId)
      .single();
    const region = partnerProfile?.region ?? "TR";
    setPartnerRegion(region);

    // Süresi dolmuş job'ları sıfırla
    await supabase
      .from("print_jobs")
      .update({ status: "available", printer_id: null, claimed_at: null, deadline: null })
      .eq("status", "claimed")
      .lt("deadline", new Date().toISOString());

    const { data: pool, error: poolErr } = await supabase
      .from("print_jobs")
      .select(`
        id, status, claimed_at, printed_at, deadline, created_at, printer_id, printer_notes,
        order:orders(id, total_amount, shipping_cost, city, district, recipient_name, address_line1, phone)
      `)
      .in("status", ["available", "claimed"])
      .eq("region", region)
      .order("created_at", { ascending: false })
      .limit(50);

    if (poolErr) console.error("Pool fetch error:", poolErr);

    const { data: mine, error: mineErr } = await supabase
      .from("print_jobs")
      .select(`
        id, status, claimed_at, printed_at, deadline, created_at, printer_id, printer_notes,
        order:orders(id, total_amount, shipping_cost, city, district, recipient_name, address_line1, phone)
      `)
      .eq("printer_id", userId)
      .order("created_at", { ascending: false });

    if (mineErr) console.error("Mine fetch error:", mineErr);

    const { data: wallet } = await supabase
      .from("profiles")
      .select("wallet_balance")
      .eq("id", userId)
      .single();

    // Printer bilgilerini ayrı çek
    const allJobs    = [...(pool ?? []), ...(mine ?? [])];
    const printerIds = [...new Set(allJobs.map((j: any) => j.printer_id).filter(Boolean))];
    let printerMap: Record<string, { full_name: string | null; username: string | null }> = {};
    if (printerIds.length > 0) {
      const { data: printers } = await supabase
        .from("profiles")
        .select("id, full_name, username")
        .in("id", printerIds);
      for (const p of printers ?? []) {
        printerMap[p.id] = { full_name: p.full_name, username: p.username };
      }
    }

    // Order items
    const orderIds = [...new Set(allJobs.map((j: any) => j.order?.id).filter(Boolean))];
    let itemsMap: Record<string, OrderItem[]> = {};
    if (orderIds.length > 0) {
      const { data: items } = await supabase
        .from("order_items")
        .select("id, order_id, model_title, material, color_name, color_hex, scale_percent, infill, item_total")
        .in("order_id", orderIds);
      for (const item of items ?? []) {
        const oi = item as any;
        if (!itemsMap[oi.order_id]) itemsMap[oi.order_id] = [];
        itemsMap[oi.order_id].push(oi);
      }
    }

    function enrich(jobs: any[]): PrintJob[] {
      return jobs.map((j) => ({
        ...j,
        printer_full_name: j.printer_id ? printerMap[j.printer_id]?.full_name ?? null : null,
        printer_username:  j.printer_id ? printerMap[j.printer_id]?.username  ?? null : null,
        items: itemsMap[j.order?.id ?? ""] ?? [],
      }));
    }

    setPoolJobs(enrich(pool ?? []));
    setMyJobs(enrich(mine ?? []));
    setEarnings(wallet?.wallet_balance ?? 0);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function claimJob(jobId: string) {
    setClaiming(jobId);
    const supabase = createClient();
    const deadline = new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString();
    await supabase
      .from("print_jobs")
      .update({ status: "claimed", printer_id: userId, claimed_at: new Date().toISOString(), deadline })
      .eq("id", jobId).eq("status", "available");
    await fetchAll();
    setClaiming(null);
    setTab("mine");
  }

  async function startPrinting(jobId: string) {
    const supabase = createClient();
    await supabase.from("print_jobs").update({ status: "printing" }).eq("id", jobId);
    await fetchAll();
  }

  async function completeJob(jobId: string, trackingNumber: string, cargoCompany: string) {
    setShippingLoading(true);
    const supabase = createClient();
    const job = myJobs.find((j) => j.id === jobId);
    await supabase.from("print_jobs").update({ status: "done", printed_at: new Date().toISOString() }).eq("id", jobId);
    if (job?.order?.id) {
      await supabase.from("orders").update({
        status: "shipped", tracking_number: trackingNumber, cargo_company: cargoCompany,
      }).eq("id", job.order.id);
      const earning = (job.order.total_amount ?? 0) * PRINTER_EARNING_RATE;
      await supabase.from("wallet_transactions").insert({
        user_id: userId, type: "earn", amount: earning,
        description: `${t("earning")} — #${job.order.id.slice(0, 8)}`,
        ref_order_id: job.order.id,
      });
      await supabase.rpc("increment_wallet", { uid: userId, amount: earning });
      await fetch("/api/email/order-shipped", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: job.order.id, trackingNumber, cargoCompany }),
      }).catch(() => {});
    }
    setShippingLoading(false);
    setShippingJobId(null);
    await fetchAll();
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const activeJobs    = myJobs.filter((j) => ["claimed", "printing"].includes(j.status));
  const completedJobs = myJobs.filter((j) => j.status === "done");
  const displayJobs   =
    tab === "pool"    ? poolJobs :
    tab === "mine"    ? activeJobs :
                        completedJobs;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">{t("orderPanel")}</h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-0.5">{t("orderPanelSub")}</p>
        </div>
        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl px-5 py-3 text-center">
          <div className="text-xs text-[var(--text-tertiary)] mb-0.5">{t("totalEarning")}</div>
          <div className="text-lg font-semibold text-[#10B981]">{formatPrice(earnings)}</div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t("availableOrders"), value: poolJobs.filter(j => j.status === "available").length, icon: Package,     color: "orange" },
          { label: t("activePrints"),    value: activeJobs.length,                                      icon: Printer,     color: "purple" },
          { label: t("completed"),       value: completedJobs.length,                                    icon: CheckCircle, color: "green"  },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-4">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${
                s.color === "orange" ? "bg-[rgba(255,107,53,0.1)] text-[#FF6B35]" :
                s.color === "purple" ? "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" :
                "bg-[rgba(16,185,129,0.1)] text-[#10B981]"
              }`}>
                <Icon size={16} />
              </div>
              <div className="text-xl font-semibold text-[var(--text-primary)]">{s.value}</div>
              <div className="text-xs text-[var(--text-tertiary)]">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border border-[var(--border)] rounded-xl p-1 w-fit">
        {[
          { id: "pool",    label: `${t("orderPool")} (${poolJobs.length})`     },
          { id: "mine",    label: `${t("activeJobs")} (${activeJobs.length})`  },
          { id: "history", label: `${t("history")} (${completedJobs.length})`  },
        ].map((tb) => (
          <button key={tb.id} onClick={() => setTab(tb.id as any)}
            className={`px-4 py-2 rounded-lg text-sm transition-all ${
              tab === tb.id
                ? "bg-[rgba(255,107,53,0.1)] text-[#FF6B35] font-medium"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
            }`}>
            {tb.label}
          </button>
        ))}
      </div>

      {/* Liste */}
      {loading ? (
        <div className="text-center py-16 text-sm text-[var(--text-tertiary)]">{t("loading")}</div>
      ) : displayJobs.length === 0 ? (
        <div className="text-center py-16">
          <Package size={36} className="mx-auto mb-3 text-[var(--text-tertiary)] opacity-20" />
          <p className="text-sm text-[var(--text-tertiary)]">
            {tab === "pool" ? t("noJobs") : t("noRecords")}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {displayJobs.map((job) => {
            const st             = JOB_STATUS[job.status] ?? { label: job.status, color: "" };
            const order          = job.order;
            const items          = job.items;
            const isExpanded     = expanded.has(job.id);
            const earning        = (order?.total_amount ?? 0) * PRINTER_EARNING_RATE;
            const isMine         = job.printer_id === userId;
            const isClaimed      = job.status === "claimed";
            const claimedByOther = isClaimed && !isMine;
            const timeLeft       = getTimeLeft(job.deadline, t);

            return (
              <div key={job.id} className={`bg-[var(--bg-primary)] border rounded-2xl overflow-hidden transition-all ${
                claimedByOther      ? "border-[var(--border)] opacity-60" :
                isClaimed && isMine ? "border-[#FF6B35]/40"               :
                "border-[var(--border)]"
              }`}>
                <div className="flex items-center gap-4 p-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-[var(--text-primary)] truncate">
                      {items.length > 0
                        ? items.map((i) => i.model_title).join(", ")
                        : `#${order?.id?.slice(0, 8) ?? "—"}`}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {order?.city && (
                        <span className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
                          <MapPin size={10} /> {order.city}{order.district ? `, ${order.district}` : ""}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
                        <Box size={10} /> {items.length} {t("products2")}
                      </span>
                      <span className="text-xs text-[var(--text-tertiary)]">
                        {new Date(job.created_at).toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US")}
                      </span>
                    </div>
                    {isClaimed && (
                      <div className="mt-1.5 flex items-center gap-3 flex-wrap">
                        {claimedByOther && (
                          <span className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
                            <User size={10} />
                            {t("onPartner", {
                              name: job.printer_username
                                ? `@${job.printer_username}`
                                : job.printer_full_name ?? "—"
                            })}
                          </span>
                        )}
                        {isMine && <span className="text-xs text-[#FF6B35] font-medium">{t("onMe")}</span>}
                        {timeLeft && (
                          <span className={`flex items-center gap-1 text-xs font-medium ${timeLeft.urgent ? "text-red-500" : "text-amber-500"}`}>
                            {timeLeft.urgent && <AlertTriangle size={10} />}
                            <Clock size={10} /> {timeLeft.text}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-semibold text-[#10B981]">+{formatPrice(earning)}</div>
                      <div className="text-[10px] text-[var(--text-tertiary)]">{t("earning")}</div>
                    </div>
                    <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${st.color}`}>{st.label}</span>

                    {job.status === "available" && (
                      <button onClick={() => claimJob(job.id)} disabled={claiming === job.id}
                        className="text-xs px-3 py-1.5 bg-[#10B981] text-white rounded-lg hover:bg-[#0da572] disabled:opacity-50 transition-colors">
                        {claiming === job.id ? "…" : t("claim")}
                      </button>
                    )}
                    {isMine && job.status === "claimed" && (
                      <button onClick={() => startPrinting(job.id)}
                        className="text-xs px-3 py-1.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors">
                        {t("startPrint")}
                      </button>
                    )}
                    {isMine && job.status === "printing" && (
                      <button onClick={() => setShippingJobId(job.id)}
                        className="text-xs px-3 py-1.5 bg-[#FF6B35] text-white rounded-lg hover:bg-[#e85e2a] transition-colors flex items-center gap-1">
                        <Truck size={12} /> {t("completeBtn")}
                      </button>
                    )}
                    <button onClick={() => toggleExpand(job.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--bg-secondary)] transition-colors">
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-[var(--border)] px-4 pb-4 pt-3 flex flex-col gap-3">
                    {items.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">{t("products")}</div>
                        <div className="flex flex-col gap-2">
                          {items.map((item) => (
                            <div key={item.id} className="flex items-center gap-3 bg-[var(--bg-secondary)] rounded-xl px-3 py-2.5">
                              <div className="w-4 h-4 rounded-full shrink-0 border border-[var(--border)]" style={{ background: item.color_hex ?? "#ccc" }} />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-[var(--text-primary)] truncate">{item.model_title}</div>
                                <div className="text-xs text-[var(--text-tertiary)]">
                                  {item.material}
                                  {item.scale_percent ? ` · %${item.scale_percent}` : ""}
                                  {item.infill ? ` · ${item.infill}` : ""}
                                  {item.color_name ? ` · ${item.color_name}` : ""}
                                </div>
                              </div>
                              <div className="text-sm font-medium text-[var(--text-primary)] shrink-0">{formatPrice(item.item_total)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {isMine && order && (
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">{t("deliveryAddress")}</div>
                        <div className="bg-[var(--bg-secondary)] rounded-xl px-3 py-2.5">
                          <div className="text-sm font-medium text-[var(--text-primary)]">{order.recipient_name ?? "—"}</div>
                          <div className="text-xs text-[var(--text-tertiary)] mt-0.5">
                            {[order.address_line1, order.district, order.city].filter(Boolean).join(", ")}
                          </div>
                          {order.phone && <div className="text-xs text-[var(--text-tertiary)] mt-0.5">{order.phone}</div>}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-1 pt-1 border-t border-[var(--border)]">
                      <div className="flex justify-between text-sm">
                        <span className="text-[var(--text-tertiary)]">{t("orderTotal")}</span>
                        <span className="font-medium text-[var(--text-primary)]">{formatPrice(order?.total_amount ?? 0)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-[var(--text-tertiary)]">{t("myEarning", { rate: PRINTER_EARNING_RATE * 100 })}</span>
                        <span className="font-semibold text-[#10B981]">+{formatPrice(earning)}</span>
                      </div>
                    </div>

                    {isMine && isClaimed && timeLeft?.urgent && (
                      <div className="flex items-center gap-2 text-xs text-red-500 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl px-3 py-2.5">
                        <AlertTriangle size={13} className="shrink-0" />
                        {t("deadlineWarning")}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {shippingJobId && (
        <ShippingModal
          loading={shippingLoading}
          onClose={() => setShippingJobId(null)}
          onSubmit={(trackingNumber, cargoCompany) => completeJob(shippingJobId, trackingNumber, cargoCompany)}
          t={t}
        />
      )}
    </div>
  );
}