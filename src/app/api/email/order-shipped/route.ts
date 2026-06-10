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
      .select("buyer_id, recipient_name, models(title)")
      .eq("id", orderId)
      .single();

    if (!order?.buyer_id) return NextResponse.json({ ok: false });

    const { data: authUser } = await supabase.auth.admin.getUserById(order.buyer_id);

    if (authUser?.user?.email) {
      await sendShippingNotification({
        to:          authUser.user.email,
        buyerName:   order.recipient_name ?? "Müşteri",
        modelTitle:  (order.models as any)?.[0]?.title ?? "Model",
        trackingNumber,
        cargoCompany,
      });
    }

    // Update order tracking info
    await supabase.from("orders").update({
      status: "shipped",
      tracking_number: trackingNumber,
      cargo_company: cargoCompany,
    }).eq("id", orderId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false });
  }
}
