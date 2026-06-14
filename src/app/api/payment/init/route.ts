import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      items,       // CartItem[]
      subtotal,
      platformFee,
      shipping,
      grandTotal,
      address,
    } = body;

    if (!items?.length) {
      return NextResponse.json({ error: "Sepet boş" }, { status: 400 });
    }

    // Buyer profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", user.id)
      .single();

    const nameParts = (profile?.full_name ?? "Kullanıcı Ad").split(" ");
    const firstName = nameParts[0];
    const lastName  = nameParts.slice(1).join(" ") || "Soyad";

    const conversationId = `SB-${Date.now()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;

    // iyzico basket: her item ayrı satır
    const basketItems = items.map((item: any) => ({
      id:        item.modelId,
      name:      item.modelTitle,
      category1: "3D Baskı",
      itemType:  "PHYSICAL",
      price:     item.itemTotal.toFixed(2),
    }));

    const iyzPayload = {
      locale:         "tr",
      conversationId,
      price:          subtotal.toFixed(2),          // komisyon hariç ürün toplamı
      paidPrice:      grandTotal.toFixed(2),         // alıcının ödediği gerçek tutar
      currency:       "TRY",
      installment:    1,
      paymentChannel: "WEB",
      paymentGroup:   "PRODUCT",
      callbackUrl:    `${process.env.NEXT_PUBLIC_SITE_URL}/api/payment/callback`,
      buyer: {
        id:                  user.id,
        name:                firstName,
        surname:             lastName,
        email:               user.email,
        identityNumber:      "11111111111",
        registrationAddress: address.line1,
        city:                address.city,
        country:             "Turkey",
        ip:                  req.headers.get("x-forwarded-for") ?? "127.0.0.1",
      },
      shippingAddress: {
        contactName: address.name,
        city:        address.city,
        country:     "Turkey",
        address:     address.line1,
      },
      billingAddress: {
        contactName: address.name,
        city:        address.city,
        country:     "Turkey",
        address:     address.line1,
      },
      basketItems,
    };

    const bodyStr    = JSON.stringify(iyzPayload);
    const authHeader = generateAuthHeader(bodyStr);

    const iyzRes = await fetch(
      `${IYZICO_BASE_URL}/payment/iyzipos/checkoutform/initialize/auth/ecom`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authHeader },
        body: bodyStr,
      }
    );

    const iyzData = await iyzRes.json();

    if (iyzData.status !== "success") {
      return NextResponse.json(
        { error: iyzData.errorMessage ?? "İyzico hatası" },
        { status: 400 }
      );
    }

    // Ana sipariş kaydı
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        buyer_id:       user.id,
        status:         "pending",
        shipping_cost:  shipping,
        platform_fee:   platformFee,
        total_amount:   grandTotal,
        recipient_name: address.name,
        address_line1:  address.line1,
        city:           address.city,
        district:       address.district ?? "",
        phone:          address.phone    ?? "",
        payment_id:     conversationId,
      })
      .select("id")
      .single();

    if (orderErr || !order) {
      console.error("Order insert error:", orderErr);
      return NextResponse.json({ error: "Sipariş oluşturulamadı" }, { status: 500 });
    }

    // Her item için order_items kaydı
    const orderItems = items.map((item: any) => ({
      order_id:     order.id,
      model_id:     item.modelId,
      model_title:  item.modelTitle,
      material:     item.material,
      color_name:   item.colorName,
      color_hex:    item.colorHex,
      scale_percent: parseFloat(item.scale) || 100,
      infill:       item.infill,
      model_price:  item.designPrice,
      print_cost:   item.printCost,
      item_total:   item.itemTotal,
    }));

    await supabase.from("order_items").insert(orderItems);

    return NextResponse.json({
      checkoutFormContent: iyzData.checkoutFormContent,
      token: iyzData.token,
    });

  } catch (err) {
    console.error("Payment init error:", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}