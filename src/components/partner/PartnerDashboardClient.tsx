"use client";
import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { createClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/utils";
import { Package, CheckCircle, Clock, Printer, Wallet } from "lucide-react";

interface PrintJob {
  id: string;
  status: string;
  claimed_at: string | null;
  created_at: string;
  order: {
    id: string;
    material: string;
    color_name: string | null;
    scale_percent: number;
    total_amount: number;
    city: string | null;
    model: { title: string; file_url: string; file_format: string } | null;
  } | null;
}

const JOB_STATUS: Record<string, { label: string; color: string }> = {
  available: { label: "Müsait",    color: "bg-[rgba(16,185,129,0.1)] text-[#10B981]"          },
  claimed:   { label: "Üstlenildi", color: "bg-[rgba(255,107,53,0.1)] text-[#FF6B35]"           },
  printing:  { label: "Baskıda",   color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  done:      { label: "Tamamlandı", color: "bg-green-100 text-green-700"                        },
  failed:    { label: "Başarısız",  color: "bg-red-100 text-red-600"                            },
};

export function PartnerDashboardClient({ userId }: { userId: string }) {
  const [tab, setTab]           = useState<"pool" | "mine" | "history">("pool");
  const [jobs, setJobs]         = useState<PrintJob[]>([]);
  const [myJobs, setMyJobs]     = useState<PrintJob[]>([]);
  const [loading, setLoading]   = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [earnings, setEarnings] = useState(0);

  useEffect(() => { fetchJobs(); }, []);

  async function fetchJobs() {
    setLoading(true);
    const supabase = createClient();

    const { data: pool } = await supabase
      .from("print_jobs")
      .select(`id, status, claimed_at, created_at,
        order:orders(id, material, color_name, scale_percent, total_amount, city,
          model:models(title, file_url, file_format))`)
      .eq("status", "available")
      .order("created_at", { ascending: false })
      .limit(20);

    const { data: mine } = await supabase
      .from("print_jobs")
      .select(`id, status, claimed_at, created_at,
        order:orders(id, material, color_name, scale_percent, total_amount, city,
          model:models(title, file_url, file_format))`)
      .eq("printer_id", userId)
      .order("created_at", { ascending: false });

    const { data: wallet } = await supabase
      .from("profiles")
      .select("wallet_balance")
      .eq("id", userId)
      .single();

    setJobs((pool ?? []) as unknown as PrintJob[]);
    setMyJobs((mine ?? []) as unknown as PrintJob[]);
    setEarnings(wallet?.wallet_balance ?? 0);
    setLoading(false);
  }

  async function claimJob(jobId: string) {
    setClaiming(jobId);
    const supabase = createClient();
    await supabase
      .from("print_jobs")
      .update({ status: "claimed", printer_id: userId, claimed_at: new Date().toISOString() })
      .eq("id", jobId)
      .eq("status", "available");
    await fetchJobs();
    setClaiming(null);
    setTab("mine");
  }

  async function updateJobStatus(jobId: string, status: "printing" | "done") {
    const supabase = createClient();
    const update: any = { status };
    if (status === "done") {
      update.printed_at = new Date().toISOString();
      // Update order status
      const job = myJobs.find((j) => j.id === jobId);
      if (job?.order?.id) {
        await supabase.from("orders").update({ status: "printed" }).eq("id", job.order.id);
        // Printer earnings: 15% of total
        const earning = (job.order.total_amount ?? 0) * 0.15;
        await supabase.from("wallet_transactions").insert({
          user_id: userId, type: "earn", amount: earning,
          description: `Baskı kazancı — Sipariş #${job.order.id.slice(0, 8)}`,
          ref_order_id: job.order.id,
        });
        await supabase.rpc("increment_wallet", { uid: userId, amount: earning });
      }
    }
    await supabase.from("print_jobs").update(update).eq("id", jobId);
    await fetchJobs();
  }

  const displayJobs = tab === "pool" ? jobs : tab === "mine" ? myJobs.filter(j => ["claimed","printing"].includes(j.status)) : myJobs.filter(j => j.status === "done");

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 flex-1">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Yazıcı Ortağı Paneli</h1>
            <p className="text-sm text-[var(--text-tertiary)] mt-0.5">Sipariş havuzunu yönetin</p>
          </div>
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl px-5 py-3 text-center">
            <div className="text-xs text-[var(--text-tertiary)] mb-0.5">Toplam Kazanç</div>
            <div className="text-lg font-semibold text-[#10B981]">{formatPrice(earnings)}</div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Müsait sipariş", value: jobs.length,                                           icon: Package,      color: "orange" },
            { label: "Aktif baskı",    value: myJobs.filter(j => j.status === "printing").length,    icon: Printer,     color: "green"  },
            { label: "Tamamlanan",     value: myJobs.filter(j => j.status === "done").length,        icon: CheckCircle, color: "green"  },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${s.color === "orange" ? "bg-[rgba(255,107,53,0.1)] text-[#FF6B35]" : "bg-[rgba(16,185,129,0.1)] text-[#10B981]"}`}>
                  <Icon size={16} />
                </div>
                <div className="text-xl font-semibold text-[var(--text-primary)]">{s.value}</div>
                <div className="text-xs text-[var(--text-tertiary)]">{s.label}</div>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border border-[var(--border)] rounded-xl p-1 mb-6 w-fit">
          {[
            { id: "pool",    label: `Sipariş Havuzu (${jobs.length})` },
            { id: "mine",    label: "Aktif Baskılarım" },
            { id: "history", label: "Geçmiş" },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={`px-4 py-2 rounded-lg text-sm transition-all ${tab === t.id ? "bg-[rgba(255,107,53,0.1)] text-[#FF6B35] font-medium" : "text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Job list */}
        {loading ? (
          <div className="text-center py-16 text-sm text-[var(--text-tertiary)]">Yükleniyor…</div>
        ) : displayJobs.length === 0 ? (
          <div className="text-center py-16 text-sm text-[var(--text-tertiary)]">
            {tab === "pool" ? "Şu an müsait sipariş bulunmuyor." : "Kayıt bulunamadı."}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {displayJobs.map((job) => {
              const st = JOB_STATUS[job.status] ?? { label: job.status, color: "" };
              const order = job.order;
              return (
                <div key={job.id} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center shrink-0 text-xs font-mono font-semibold text-[var(--text-secondary)]">
                    {order?.model?.file_format?.toUpperCase() ?? "3D"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-[var(--text-primary)] truncate">{order?.model?.title ?? "Model"}</div>
                    <div className="text-xs text-[var(--text-tertiary)] mt-0.5">
                      {order?.material} · {order?.color_name ?? "—"} · %{order?.scale_percent} boyut
                      {order?.city && ` · ${order.city}`}
                    </div>
                    <div className="text-xs text-[var(--text-tertiary)] mt-0.5">
                      {new Date(job.created_at).toLocaleDateString("tr-TR")}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${st.color}`}>{st.label}</span>
                    <div className="text-sm font-semibold text-[#FF6B35]">
                      {formatPrice((order?.total_amount ?? 0) * 0.15)} kazanç
                    </div>
                    {tab === "pool" && (
                      <button
                        onClick={() => claimJob(job.id)}
                        disabled={claiming === job.id}
                        className="text-xs px-3 py-1.5 bg-[#10B981] text-white rounded-lg hover:bg-[#0da572] disabled:opacity-50 transition-colors"
                      >
                        {claiming === job.id ? "…" : "Üstlen"}
                      </button>
                    )}
                    {tab === "mine" && job.status === "claimed" && (
                      <button
                        onClick={() => updateJobStatus(job.id, "printing")}
                        className="text-xs px-3 py-1.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                      >
                        Baskıya Al
                      </button>
                    )}
                    {tab === "mine" && job.status === "printing" && (
                      <button
                        onClick={() => updateJobStatus(job.id, "done")}
                        className="text-xs px-3 py-1.5 bg-[#10B981] text-white rounded-lg hover:bg-[#0da572] transition-colors"
                      >
                        Tamamlandı ✓
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
