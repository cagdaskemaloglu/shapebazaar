import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const PRINTER_EARNING_RATE = 0.15;
const DESIGNER_EARNING_RATE = 0.90; // model fiyatının %90'ı tasarımcıya

/**
 * Müşteri "Teslim Aldım" dediğinde çağrılır.
 * - Siparişin GERÇEKTEN o kullanıcıya ait ve "shipped" durumunda olduğunu doğrular
 * - status='shipped' -> 'delivered' geçişini ATOMİK yapar (WHERE status='shipped'
 *   şartıyla) — bu sayede çift tıklama / route'un iki kez çağrılması çift ödemeye
 *   yol açmaz: sadece geçişi gerçekten yapan istek kazançları dağıtır.
 * - Yazıcı ortağına ve tasarımcı(lar)a kazançlarını cüzdanlarına yansıtır.
 */
export async function POST(req: NextRequest) {
  const { orderId } = await req.json();
  if (typeof orderId !== "string" || !orderId) {
    return NextResponse.json({ error: "orderId gerekli" }, { status: 400 });
  }

  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Atomik geçiş: sadece hâlâ "shipped" olan VE bu kullanıcıya ait sipariş güncellenir.
  const { data: order, error: updateErr } = await admin
    .from("orders")
    .update({ status: "delivered" })
    .eq("id", orderId)
    .eq("buyer_id", user.id)
    .eq("status", "shipped")
    .select("id, total_amount, buyer_id")
    .single();

  if (updateErr || !order) {
    // Ya sipariş bu kullanıcıya ait değil, ya zaten "delivered" ya da başka bir
    // durumda (henüz kargoya verilmemiş) — her durumda kazanç TEKRAR dağıtılmamalı.
    return NextResponse.json(
      { error: "Sipariş bulunamadı veya zaten onaylanmış / henüz kargoda değil" },
      { status: 409 }
    );
  }

  // ── Yazıcı ortağı kazancı ──
  const { data: printJob } = await admin
    .from("print_jobs")
    .select("printer_id")
    .eq("order_id", orderId)
    .single();

  if (printJob?.printer_id) {
    const printerEarning = order.total_amount * PRINTER_EARNING_RATE;
    const { error: pwErr } = await admin.from("wallet_transactions").insert({
      user_id:      printJob.printer_id,
      type:         "earn",
      amount:       printerEarning,
      description:  `Baskı kazancı — #${order.id.slice(0, 8)}`,
      ref_order_id: order.id,
    });
    if (pwErr) console.error("[confirm-delivery] printer wallet insert error:", pwErr);

    const { error: prpcErr } = await admin.rpc("increment_wallet", { uid: printJob.printer_id, amount: printerEarning });
    if (prpcErr) console.error("[confirm-delivery] printer increment_wallet error:", prpcErr);
  } else {
    console.error("[confirm-delivery] print_job / printer_id bulunamadı, order:", orderId);
  }

  // ── Tasarımcı kazançları (sipariş birden fazla model içerebilir) ──
  const { data: items } = await admin
    .from("order_items")
    .select("model_id, model_title, model_price")
    .eq("order_id", orderId);

  if (items) {
    for (const item of items) {
      if (!item.model_id || !item.model_price || item.model_price <= 0) continue;

      const { data: model } = await admin
        .from("models")
        .select("designer_id")
        .eq("id", item.model_id)
        .single();

      if (!model?.designer_id) continue;

      const designerEarning = item.model_price * DESIGNER_EARNING_RATE;
      const { error: dwErr } = await admin.from("wallet_transactions").insert({
        user_id:      model.designer_id,
        type:         "earn",
        amount:       designerEarning,
        description:  `Satış kazancı — ${item.model_title} (#${order.id.slice(0, 8)})`,
        ref_order_id: order.id,
      });
      if (dwErr) console.error("[confirm-delivery] designer wallet insert error:", dwErr);

      const { error: drpcErr } = await admin.rpc("increment_wallet", { uid: model.designer_id, amount: designerEarning });
      if (drpcErr) console.error("[confirm-delivery] designer increment_wallet error:", drpcErr);
    }
  }

  return NextResponse.json({ ok: true });
}
