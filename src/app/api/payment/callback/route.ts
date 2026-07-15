import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOrderConfirmation } from "@/lib/email/resend";
import { retrieveCheckoutForm, SITE_URL } from "@/lib/iyzico";

/**
 * iyzico'nun kendi sunucusundan/checkout sayfasından gelen callback POST'u.
 * Bu istek alıcının tarayıcı oturum cookie'lerini taşımayabilir (cross-site
 * POST), bu yüzden RLS'e güvenen anon-key client yerine bilerek
 * service-role (admin) client kullanıyoruz. Güvenlik, RLS yerine
 * retrieveCheckoutForm() içindeki iyzico token doğrulamasından geliyor —
 * yani bu route'a rastgele biri sahte bir "başarılı ödeme" bildiremiyor.
 */
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

    const supabase = createAdminClient();

    // iyzico'nun checkout form "detail" yanıtı conversationId döndürmüyor
    // (sadece init isteğinde geri geliyor) — bu yüzden basketId kullanıyoruz,
    // init'te basketId'yi bilerek conversationId ile birebir aynı gönderdik.
    const paymentRef = iyzData.basketId ?? iyzData.conversationId;

    if (iyzData.status === "success" && iyzData.paymentStatus === "SUCCESS") {
      console.log("[callback] payment SUCCESS, paymentRef:", paymentRef);

      if (!paymentRef) {
        console.error("[callback] ne basketId ne conversationId var, order eşleştirilemiyor:", iyzData);
        return NextResponse.redirect(`${SITE_URL}/tr/payment/failed`);
      }

      // basketId (=conversationId) ile order bul ve "paid" yap
      const { data: order, error: orderFindErr } = await supabase
        .from("orders")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("payment_id", paymentRef)
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

        const { error: printJobErr } = await supabase.from("print_jobs").insert({
          order_id: order.id,
          status:   "available",
          region:   buyerRegion,
        });
        if (printJobErr) console.error("[callback] print_job insert error:", printJobErr);

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
              const { error: walletErr } = await supabase.from("wallet_transactions").insert({
                user_id:      model.designer_id,
                type:         "earn",
                amount:       earning,
                description:  `Satış kazancı — ${item.model_title} (#${order.id.slice(0, 8)})`,
                ref_order_id: order.id,
              });
              if (walletErr) console.error("[callback] wallet_transactions insert error:", walletErr);

              const { error: rpcErr } = await supabase.rpc("increment_wallet", { uid: model.designer_id, amount: earning });
              if (rpcErr) console.error("[callback] increment_wallet rpc error:", rpcErr);
            }
          }
        }

        // Onay emaili (auth.admin.* için service role zorunlu)
        const { data: authUser, error: authUserErr } = await supabase.auth.admin.getUserById(order.buyer_id);
        if (authUserErr) console.error("[callback] getUserById error:", authUserErr);
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

      // Order bulunamadı
      console.log("[callback] order not found for paymentRef:", paymentRef);
      return NextResponse.redirect(`${SITE_URL}/tr/payment/success`);
    }

    console.log("[callback] payment not SUCCESS:", iyzData.status, iyzData.paymentStatus, iyzData.errorMessage);

    if (paymentRef) {
      await supabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("payment_id", paymentRef);
    }

    return NextResponse.redirect(`${SITE_URL}/tr/payment/failed`);

  } catch (err) {
    console.error("[callback] error:", err);
    return NextResponse.redirect(`${SITE_URL}/tr/payment/failed`);
  }
}
