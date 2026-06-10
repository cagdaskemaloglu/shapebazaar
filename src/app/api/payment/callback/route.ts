import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendOrderConfirmation } from "@/lib/email/resend";

const IYZICO_BASE_URL = process.env.IYZICO_BASE_URL ?? "https://sandbox-api.iyzipay.com";
const IYZICO_API_KEY  = process.env.IYZICO_API_KEY  ?? "";
const IYZICO_SECRET   = process.env.IYZICO_SECRET_KEY ?? "";

function generateAuthHeader(body: string): string {
  const randomKey  = Math.random().toString(36).substring(2);
  const dataToSign = IYZICO_API_KEY + randomKey + IYZICO_SECRET + body;
  const crypto     = require("crypto");
  const signature  = crypto.createHash("sha1").update(dataToSign).digest("base64");
  return `IYZWS apiKey:${IYZICO_API_KEY}&randomKey:${randomKey}&signature:${signature}`;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const token    = formData.get("token") as string;
    if (!token) return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/payment/failed`);

    // Verify payment with İyzico
    const bodyStr = JSON.stringify({ locale: "tr", token });
    const iyzRes  = await fetch(`${IYZICO_BASE_URL}/payment/iyzipos/checkoutform/auth/ecom/detail`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", Authorization: generateAuthHeader(bodyStr) },
      body:    bodyStr,
    });
    const iyzData = await iyzRes.json();

    const supabase = await createClient();

    if (iyzData.paymentStatus === "SUCCESS") {
      // Update order status
      const { data: order } = await supabase
        .from("orders")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("payment_id", iyzData.conversationId)
        .select()
        .single();

      if (order) {
        // Create print job
        await supabase.from("print_jobs").insert({
          order_id: order.id,
          status:   "available",
        });

        // Send confirmation email
        const { data: buyer } = await supabase.auth.admin.getUserById(order.buyer_id);
        const { data: modelForEmail } = await supabase.from("models").select("title").eq("id", order.model_id).single();
        if (buyer?.user?.email) {
          await sendOrderConfirmation({
            to:          buyer.user.email,
            buyerName:   order.recipient_name ?? "Müşteri",
            modelTitle:  modelForEmail?.title ?? "Model",
            orderId:     order.id,
            totalAmount: order.total_amount,
          }).catch(() => {});
        }

        // Add wallet points to designer (90% of model price)
        const { data: model } = await supabase
          .from("models")
          .select("designer_id, base_price")
          .eq("id", order.model_id)
          .single();

        if (model?.designer_id) {
          const designerEarning = model.base_price * 0.9;
          await supabase.from("wallet_transactions").insert({
            user_id:     model.designer_id,
            type:        "earn",
            amount:      designerEarning,
            description: `Satış kazancı — Sipariş #${order.id.slice(0, 8)}`,
            ref_order_id: order.id,
          });
          await supabase
            .from("profiles")
            .update({ wallet_balance: supabase.rpc("increment_wallet", { uid: model.designer_id, amount: designerEarning }) })
            .eq("id", model.designer_id);
        }
      }

      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/payment/success?orderId=${order?.id}`);
    } else {
      await supabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("payment_id", iyzData.conversationId);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/payment/failed`);
    }
  } catch (err) {
    console.error("Payment callback error:", err);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/payment/failed`);
  }
}
