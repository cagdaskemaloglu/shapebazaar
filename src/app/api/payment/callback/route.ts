import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendOrderConfirmation } from "@/lib/email/resend";
import { retrieveCheckoutForm, SITE_URL } from "@/lib/iyzico";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const token    = formData.get("token") as string;

    console.log("[callback] token:", token);

    if (!token) {
      console.log("[callback] no token, redirecting to failed");
      return NextResponse.redirect(`${SITE_URL}/tr/payment/failed`);
    }

    const iyzData = await retrieveCheckoutForm({ locale: "tr", token });
    console.log("[callback] iyzData:", JSON.stringify(iyzData));

    const supabase = await createClient();

    if (iyzData.status === "success" && iyzData.paymentStatus === "SUCCESS") {
      console.log("[callback] payment SUCCESS, conversationId:", iyzData.conversationId);

      // conversationId ile order bul
      const { data: order, error: orderFindErr } = await supabase
        .from("orders")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("payment_id", iyzData.conversationId)
        .select()
        .single();

      console.log("[callback] order:", order?.id, "orderFindErr:", orderFindErr);

      if (order) {
        const { data: items } = await supabase
          .from("order_items")
          .select("model_id, model_title, model_price, print_cost, item_total")
          .eq("order_id", order.id);

        // Buyer region
        const { data: buyerProfile } = await supabase
          .from("profiles")
          .select("region")
          .eq("id", order.buyer_id)
          .single();

        const buyerRegion = buyerProfile?.region ?? "TR";
        const buyerLocale = buyerRegion === "TR" ? "tr" : "en";

        await supabase.from("orders")
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
              .select("designer_id")
              .eq("id", item.model_id)
              .single();

            if (model?.designer_id && item.model_price > 0) {
              const earning = item.model_price * 0.9;
              await supabase.from("wallet_transactions").insert({
                user_id:      model.designer_id,
                type:         "earn",
                amount:       earning,
                description:  `Satış kazancı — ${item.model_title} (#${order.id.slice(0, 8)})`,
                ref_order_id: order.id,
              });
              await supabase.rpc("increment_wallet", { uid: model.designer_id, amount: earning });
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

        console.log("[callback] redirecting to success");
        return NextResponse.redirect(`${SITE_URL}/tr/payment/success?orderId=${order.id}`);
      }

      // Order bulunamadı — conversationId ile tekrar dene
      console.log("[callback] order not found for conversationId:", iyzData.conversationId);
      return NextResponse.redirect(`${SITE_URL}/tr/payment/success`);
    }

    console.log("[callback] payment not SUCCESS:", iyzData.status, iyzData.paymentStatus, iyzData.errorMessage);

    await supabase
      .from("orders")
      .update({ status: "cancelled" })
      .eq("payment_id", iyzData.conversationId)
      .match(() => {});

    return NextResponse.redirect(`${SITE_URL}/tr/payment/failed`);

  } catch (err) {
    console.error("[callback] error:", err);
    return NextResponse.redirect(`${SITE_URL}/tr/payment/failed`);
  }
}