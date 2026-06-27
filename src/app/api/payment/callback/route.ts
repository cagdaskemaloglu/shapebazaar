import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendOrderConfirmation } from "@/lib/email/resend";
import { IYZICO_BASE_URL, generateAuthHeader, SITE_URL } from "@/lib/iyzico";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const token    = formData.get("token") as string;
    if (!token) return NextResponse.redirect(`${SITE_URL}/payment/failed`);

    const bodyStr = JSON.stringify({ locale: "tr", token });
    const iyzRes  = await fetch(`${IYZICO_BASE_URL}/payment/iyzipos/checkoutform/auth/ecom/detail`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", Authorization: generateAuthHeader(bodyStr) },
      body:    bodyStr,
    });
    const iyzData = await iyzRes.json();

    const supabase = await createClient();

    if (iyzData.paymentStatus === "SUCCESS") {
      const { data: order } = await supabase
        .from("orders")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("payment_id", iyzData.conversationId)
        .select()
        .single();

      if (order) {
        const { data: items } = await supabase
          .from("order_items")
          .select("model_id, model_title, model_price, print_cost, item_total")
          .eq("order_id", order.id);

        // Buyer region — tek seferlik
        const { data: buyerProfile } = await supabase
          .from("profiles")
          .select("region")
          .eq("id", order.buyer_id)
          .single();

        const buyerRegion = buyerProfile?.region ?? "TR";
        const buyerLocale = buyerRegion === "TR" ? "tr" : "en";

        await supabase
          .from("orders")
          .update({ buyer_region: buyerRegion })
          .eq("id", order.id);

        await supabase.from("print_jobs").insert({
          order_id: order.id,
          status:   "available",
          region:   buyerRegion,
        });

        // Tasarımcı kazanç
        if (items && items.length > 0) {
          for (const item of items) {
            if (!item.model_id) continue;
            const { data: model } = await supabase
              .from("models")
              .select("designer_id, base_price")
              .eq("id", item.model_id)
              .single();

            if (model?.designer_id && item.model_price > 0) {
              const designerEarning = item.model_price * 0.9;
              await supabase.from("wallet_transactions").insert({
                user_id:      model.designer_id,
                type:         "earn",
                amount:       designerEarning,
                description:  `Satış kazancı — ${item.model_title} (Sipariş #${order.id.slice(0, 8)})`,
                ref_order_id: order.id,
              });
              await supabase.rpc("increment_wallet", { uid: model.designer_id, amount: designerEarning });
            }
          }
        }

        // Onay emaili
        const { data: authUser } = await supabase.auth.admin.getUserById(order.buyer_id);
        const modelTitles = items?.map((i) => i.model_title).join(", ") ?? "Model";

        if (authUser?.user?.email) {
          await sendOrderConfirmation({
            to:          authUser.user.email,
            buyerName:   order.recipient_name ?? (buyerLocale === "tr" ? "Müşteri" : "Customer"),
            modelTitle:  modelTitles,
            orderId:     order.id,
            totalAmount: order.total_amount,
            locale:      buyerLocale,
          }).catch(console.error);
        }

        return NextResponse.redirect(`${SITE_URL}/payment/success?orderId=${order.id}`);
      }
    }

    await supabase
      .from("orders")
      .update({ status: "cancelled" })
      .eq("payment_id", iyzData.conversationId);
    return NextResponse.redirect(`${SITE_URL}/payment/failed`);

  } catch (err) {
    console.error("Payment callback error:", err);
    return NextResponse.redirect(`${SITE_URL}/payment/failed`);
  }
}