import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Admin dashboard'un fetchAll'u artık burada, service-role ile çalışıyor.
 * NEDEN: orders/order_items/models(is_published=false) tablolarında
 * "sadece kendi kaydı" tipi RLS policy'leri var — admin ne buyer ne
 * designer olduğu için tarayıcı client'ıyla bu sorgular sessizce boş
 * dönüyordu (sipariş listesi ve bekleyen model onayları eksik geliyordu).
 */
export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const admin = createAdminClient();

  const [modelsRes, partnersRes, ordersRes, usersRes, modelsForTest] = await Promise.all([
    admin.from("models")
      .select("id,title,title_en,created_at,file_format,base_price,is_free,designer:profiles(full_name)")
      .eq("is_published", false)
      .order("created_at", { ascending: false }),

    admin.from("profiles")
      .select("id,full_name,city,bio,partner_requested_at")
      .not("partner_requested_at", "is", null)
      .eq("is_partner_approved", false),

    admin.from("orders")
      .select("id,status,total_amount,created_at,city,recipient_name,buyer:profiles(full_name)")
      .order("created_at", { ascending: false })
      .limit(50),

    admin.from("profiles").select("id", { count: "exact", head: true }),

    admin.from("models")
      .select("id,title,base_price,is_free,weight_grams")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const orderIds = (ordersRes.data ?? []).map((o: any) => o.id);

  let itemsMap: Record<string, any[]> = {};
  if (orderIds.length > 0) {
    const { data: items } = await admin
      .from("order_items")
      .select("id,order_id,model_title,material,color_name,scale_percent,item_total")
      .in("order_id", orderIds);
    for (const item of items ?? []) {
      if (!itemsMap[item.order_id]) itemsMap[item.order_id] = [];
      itemsMap[item.order_id].push(item);
    }
  }

  let jobMap: Record<string, string> = {};
  if (orderIds.length > 0) {
    const { data: jobs } = await admin
      .from("print_jobs")
      .select("order_id,status")
      .in("order_id", orderIds);
    for (const job of jobs ?? []) {
      jobMap[job.order_id] = job.status;
    }
  }

  const enrichedOrders = (ordersRes.data ?? []).map((o: any) => ({
    ...o,
    items:            itemsMap[o.id] ?? [],
    print_job_status: jobMap[o.id] ?? null,
  }));

  const totalRevenue = enrichedOrders.reduce((s, o) => s + (o.total_amount ?? 0), 0);

  const { data: wdData } = await admin
    .from("withdrawal_requests")
    .select("id, amount, iban, full_name, status, created_at, admin_note, user:profiles(full_name)")
    .order("created_at", { ascending: false });

  return NextResponse.json({
    pendingModels:   modelsRes.data ?? [],
    pendingPartners: partnersRes.data ?? [],
    orders:          enrichedOrders,
    withdrawals:     wdData ?? [],
    testModels:      modelsForTest.data ?? [],
    stats: {
      totalUsers:  usersRes.count ?? 0,
      totalOrders: ordersRes.data?.length ?? 0,
      revenue:     totalRevenue,
    },
  });
}
