import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Yazıcı ortağı paneli için havuz + kendi işleri + kazanç verisini döner.
 *
 * NEDEN service-role: print_jobs herkese açık okunabilir (printjobs_read
 * USING (TRUE)) ama içine gömülü `orders` ve ayrı sorgulanan `order_items`
 * için sadece "kendi siparişi" (buyer) okuma policy'si var. Partner ne
 * buyer ne admin olduğu için browser client'la bu join'ler boş dönüyordu
 * (iş havuzda görünüyor ama sipariş/ürün bilgisi eksik geliyordu).
 */
export async function GET() {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: myProfile } = await admin
    .from("profiles")
    .select("role, is_partner_approved, region, wallet_balance")
    .eq("id", user.id)
    .single();

  if (myProfile?.role !== "printer_partner" || !myProfile.is_partner_approved) {
    return NextResponse.json({ error: "Yazıcı ortağı yetkisi gerekiyor" }, { status: 403 });
  }

  const region = myProfile.region ?? "TR";

  // Süresi dolmuş job'ları sıfırla
  await admin
    .from("print_jobs")
    .update({ status: "available", printer_id: null, claimed_at: null, deadline: null })
    .eq("status", "claimed")
    .lt("deadline", new Date().toISOString());

  const ORDER_SELECT = `
    id, status, claimed_at, printed_at, deadline, created_at, printer_id, printer_notes,
    order:orders(id, total_amount, shipping_cost, city, district, recipient_name, address_line1, phone)
  `;

  const { data: pool, error: poolErr } = await admin
    .from("print_jobs")
    .select(ORDER_SELECT)
    .in("status", ["available", "claimed"])
    .eq("region", region)
    .order("created_at", { ascending: false })
    .limit(50);
  if (poolErr) console.error("[partner/jobs/list] pool fetch error:", poolErr);

  const { data: mine, error: mineErr } = await admin
    .from("print_jobs")
    .select(ORDER_SELECT)
    .eq("printer_id", user.id)
    .order("created_at", { ascending: false });
  if (mineErr) console.error("[partner/jobs/list] mine fetch error:", mineErr);

  const allJobs    = [...(pool ?? []), ...(mine ?? [])];
  const printerIds = [...new Set(allJobs.map((j: any) => j.printer_id).filter(Boolean))];

  let printerMap: Record<string, { full_name: string | null; username: string | null }> = {};
  if (printerIds.length > 0) {
    const { data: printers } = await admin
      .from("profiles")
      .select("id, full_name, username")
      .in("id", printerIds);
    for (const p of printers ?? []) {
      printerMap[p.id] = { full_name: p.full_name, username: p.username };
    }
  }

  const orderIds = [...new Set(allJobs.map((j: any) => j.order?.id).filter(Boolean))];
  let itemsMap: Record<string, any[]> = {};
  if (orderIds.length > 0) {
    const { data: items } = await admin
      .from("order_items")
      .select("id, order_id, model_title, material, color_name, color_hex, scale_percent, infill, item_total")
      .in("order_id", orderIds);
    for (const item of items ?? []) {
      if (!itemsMap[item.order_id]) itemsMap[item.order_id] = [];
      itemsMap[item.order_id].push(item);
    }
  }

  function enrich(jobs: any[]) {
    return jobs.map((j) => ({
      ...j,
      printer_full_name: j.printer_id ? printerMap[j.printer_id]?.full_name ?? null : null,
      printer_username:  j.printer_id ? printerMap[j.printer_id]?.username  ?? null : null,
      items: itemsMap[j.order?.id ?? ""] ?? [],
    }));
  }

  return NextResponse.json({
    partnerRegion: region,
    poolJobs:      enrich(pool ?? []),
    myJobs:        enrich(mine ?? []),
    earnings:      myProfile.wallet_balance ?? 0,
  });
}
