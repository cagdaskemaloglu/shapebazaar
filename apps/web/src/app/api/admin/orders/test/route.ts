import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const body = await req.json();
  const {
    modelId, recipientName, address, city, district, phone,
    material, colorName, colorHex, scale, infill,
  } = body ?? {};

  if (!modelId) {
    return NextResponse.json({ error: "modelId gerekli" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: model, error: modelErr } = await supabase
    .from("models")
    .select("id, title, base_price, is_free, weight_grams")
    .eq("id", modelId)
    .single();

  if (modelErr || !model) {
    return NextResponse.json({ error: "Model bulunamadı" }, { status: 404 });
  }

  const designPrice  = model.is_free ? 0 : model.base_price;
  const printCost    = ((model.weight_grams ?? 50) * 1.0) + 50;
  const platformFee  = (designPrice + printCost) * 0.10;
  const shippingCost = 150;
  const totalAmount  = designPrice + printCost + platformFee + shippingCost;
  const conversationId = `TEST-${Date.now()}`;

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      buyer_id:       guard.user.id,
      status:         "paid",
      shipping_cost:  shippingCost,
      platform_fee:   platformFee,
      total_amount:   totalAmount,
      recipient_name: recipientName,
      address_line1:  address,
      city,
      district,
      phone,
      payment_id:     conversationId,
      paid_at:        new Date().toISOString(),
    })
    .select("id")
    .single();

  if (orderErr || !order) {
    console.error("[admin/orders/test] order insert error:", orderErr);
    return NextResponse.json({ error: "Sipariş oluşturulamadı" }, { status: 500 });
  }

  const { error: itemErr } = await supabase.from("order_items").insert({
    order_id:      order.id,
    model_id:      model.id,
    model_title:   model.title,
    material,
    color_name:    colorName,
    color_hex:     colorHex,
    scale_percent: parseFloat(scale) || 100,
    infill,
    model_price:   designPrice,
    print_cost:    printCost,
    item_total:    designPrice + printCost + platformFee,
  });
  if (itemErr) console.error("[admin/orders/test] order_items insert error:", itemErr);

  const { error: jobErr } = await supabase.from("print_jobs").insert({
    order_id: order.id,
    status:   "available",
  });
  if (jobErr) console.error("[admin/orders/test] print_jobs insert error:", jobErr);

  return NextResponse.json({ ok: true, orderId: order.id });
}
