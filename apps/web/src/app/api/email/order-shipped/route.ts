import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
import { sendShippingNotification } from "@/lib/email/resend";

export async function POST(req: NextRequest) {
  try {
    const { orderId, trackingNumber, cargoCompany } = await req.json();
    const supabase = await createClient();

    const { data: order } = await supabase
      .from("orders")
      .select("buyer_id, recipient_name")
      .eq("id", orderId)
      .single();

    if (!order?.buyer_id) return NextResponse.json({ ok: false });

    // Buyer'ın locale'ini çek
    const { data: buyerProfile } = await supabase
      .from("profiles")
      .select("region")
      .eq("id", order.buyer_id)
      .single();
    const buyerLocale = buyerProfile?.region === "TR" ? "tr" : "en";

    // Sipariş ürün başlığını order_items'dan çek
    const { data: items } = await supabase
      .from("order_items")
      .select("model_title")
      .eq("order_id", orderId)
      .limit(1);
    const modelTitle = items?.[0]?.model_title ?? "Model";

    const { data: authUser } = await supabase.auth.admin.getUserById(order.buyer_id);

    if (authUser?.user?.email) {
      await sendShippingNotification({
        to:            authUser.user.email,
        buyerName:     order.recipient_name ?? (buyerLocale === "tr" ? "Müşteri" : "Customer"),
        modelTitle,
        orderId,
        trackingNumber,
        cargoCompany,
        locale:        buyerLocale,
      });
    }

    await supabase.from("orders").update({
      status:          "shipped",
      tracking_number: trackingNumber,
      cargo_company:   cargoCompany,
    }).eq("id", orderId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false });
  }
}