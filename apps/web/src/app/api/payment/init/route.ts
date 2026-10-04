import { NextRequest, NextResponse } from "next/server";
import { createRequestClient } from "@/lib/supabase/requestClient";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCheckoutForm, SITE_URL } from "@/lib/iyzico";
import { collectModelIds, priceCart, PRICE_TOLERANCE_TL, type ModelPricingRow } from "@shapebazaar/shared";

export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await createRequestClient(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const address = body?.address;

    // Teslimat adresi: ad, şehir ve adres zorunlu (web CartDrawer ve mobil sepetle aynı)
    const str = (v: unknown, max: number) => typeof v === "string" && v.trim().length > 0 && v.length <= max;
    if (!address || !str(address.name, 120) || !str(address.city, 80) || !str(address.line1, 300) ||
        (address.phone != null && (typeof address.phone !== "string" || address.phone.length > 32)) ||
        (address.district != null && (typeof address.district !== "string" || address.district.length > 80))) {
      return NextResponse.json({ error: "Teslimat adresi eksik veya geçersiz", code: "INVALID_ADDRESS" }, { status: 400 });
    }

    // ── FİYAT: istemcinin gönderdiği tutarlara GÜVENME ─────────────────────────────────────
    // Tasarım ücreti ve ağırlık veritabanından okunur, tutar sunucuda yeniden hesaplanır. Aksi halde
    // giriş yapmış herkes sepet tutarını ve `designPrice`'ı (tasarımcı kazancının dayanağı) kendisi yazabilirdi.
    const modelIds = collectModelIds(body?.items);
    if (!modelIds) return NextResponse.json({ error: "Sepet geçersiz", code: "INVALID_ITEM" }, { status: 400 });

    const adminForPricing = createAdminClient();
    const { data: modelRows, error: modelErr } = await adminForPricing
      .from("models")
      .select("id, title, base_price, is_free, weight_grams, is_published")
      .in("id", modelIds);
    if (modelErr) {
      console.error("Price lookup error:", modelErr);
      return NextResponse.json({ error: "Fiyat hesaplanamadı" }, { status: 500 });
    }

    const priced = priceCart(body.items, new Map((modelRows ?? []).map((m) => [m.id, m as ModelPricingRow])));
    if (!priced.ok) return NextResponse.json({ error: priced.message, code: priced.code }, { status: 400 });

    // İstemcinin gördüğü toplam sunucununkinden farklıysa (tasarımcı fiyatı değiştirdi, eski sepet) kullanıcı
    // bilmeden farklı tutar ödemesin: işlemi durdur, güncel tutarı döndür.
    const clientTotal = Number(body.grandTotal);
    if (!Number.isFinite(clientTotal) || Math.abs(clientTotal - priced.grandTotal) > PRICE_TOLERANCE_TL) {
      return NextResponse.json(
        { error: "Sepetteki fiyatlar güncellendi. Lütfen sepetinizi kontrol edip tekrar deneyin.", code: "PRICE_CHANGED", serverTotal: priced.grandTotal },
        { status: 409 }
      );
    }

    const items = priced.items;
    const { subtotal, shipping, grandTotal, platformFee } = priced;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", user.id)
      .single();

    const nameParts = (profile?.full_name ?? "Ad Soyad").split(" ");
    const firstName = nameParts[0] || "Ad";
    const lastName  = nameParts.slice(1).join(" ") || "Soyad";
    const phone     = profile?.phone ?? address.phone ?? "+905000000000";

    const conversationId = `SB-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const now = new Date().toISOString().replace("T", " ").slice(0, 19);

    const iyzData = await createCheckoutForm({
      locale:         "tr",
      conversationId,
      price:          subtotal.toFixed(2),
      paidPrice:      grandTotal.toFixed(2),
      currency:       "TRY",
      basketId:       conversationId,
      paymentGroup:   "PRODUCT",
      callbackUrl:    `${SITE_URL}/api/payment/callback`,
      enabledInstallments: [1],
      buyer: {
        id:                  user.id.slice(0, 36),
        name:                firstName,
        surname:             lastName,
        gsmNumber:           phone.startsWith("+") ? phone : `+90${phone}`,
        email:               user.email ?? "user@shapebazaar.com",
        identityNumber:      "11111111111",
        lastLoginDate:       now,
        registrationDate:    now,
        registrationAddress: address.line1 ?? "Adres",
        ip:                  req.headers.get("x-forwarded-for")?.split(",")[0] ?? "127.0.0.1",
        city:                address.city  ?? "Istanbul",
        country:             "Turkey",
        zipCode:             "34000",
      },
      shippingAddress: {
        contactName: address.name  ?? `${firstName} ${lastName}`,
        city:        address.city  ?? "Istanbul",
        country:     "Turkey",
        address:     address.line1 ?? "Adres",
        zipCode:     "34000",
      },
      billingAddress: {
        contactName: address.name  ?? `${firstName} ${lastName}`,
        city:        address.city  ?? "Istanbul",
        country:     "Turkey",
        address:     address.line1 ?? "Adres",
        zipCode:     "34000",
      },
      basketItems: items.map((item) => ({
        id:        item.modelId,
        name:      item.modelTitle.slice(0, 64),
        category1: "3D Baskı",
        itemType:  "PHYSICAL" as const,
        price:     item.itemTotal.toFixed(2),
      })),
    });

    if (iyzData.status !== "success") {
      console.error("İyzico init error:", iyzData);
      return NextResponse.json({ error: iyzData.errorMessage ?? "İyzico hatası" }, { status: 400 });
    }

    // Siparişi kaydet. Kullanıcı yukarıda doğrulandı (cookie/Bearer); yazmalar admin client ile
    // yapılır — `order_items` için hiç INSERT policy yok (006) ve `orders` için de kullanıcıya
    // INSERT/UPDATE hakkı vermek alıcının status/total_amount'u kendi eliyle yazmasına izin verir.
    const admin = adminForPricing;
    const { data: order, error: orderErr } = await admin
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

    // Order items
    const { error: itemsErr } = await admin.from("order_items").insert(
      items.map((item) => ({
        order_id:      order.id,
        model_id:      item.modelId,
        model_title:   item.modelTitle,
        material:      item.material,
        color_name:    item.colorName,
        color_hex:     item.colorHex,
        scale_percent: parseFloat(item.scale) || 100, // "Özel" → NaN → 100
        infill:        item.infill,
        model_price:   item.designPrice,
        print_cost:    item.printCost,
        item_total:    item.itemTotal,
      }))
    );

    if (itemsErr) {
      // Kalemsiz sipariş kalmasın (tasarımcı kazancı/puan şartı order_items'a bağlı)
      console.error("Order items insert error:", itemsErr);
      await admin.from("orders").delete().eq("id", order.id);
      return NextResponse.json({ error: "Sipariş oluşturulamadı" }, { status: 500 });
    }

    return NextResponse.json({
      checkoutFormContent: iyzData.checkoutFormContent,
      token:               iyzData.token,
    });

  } catch (err) {
    console.error("Payment init error:", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}