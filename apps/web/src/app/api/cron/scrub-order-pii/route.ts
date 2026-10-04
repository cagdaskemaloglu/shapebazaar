import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Vercel Cron günde bir kez çağırır (vercel.json). Hesabı silinmiş kullanıcıların siparişlerindeki
// kişisel verileri (ad, adres, telefon), silme tarihinden 30 gün sonra anonimleştirir.
// Sipariş ve tutar kayıtları saklanır.
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data, error } = await admin
    .from("orders")
    .update({
      recipient_name: "Silinmiş kullanıcı",
      address_line1:  "-",
      city:           "-",
      district:       "-",
      phone:          "",
      pii_scrub_at:    null,
      pii_scrubbed_at: now,
    })
    .lte("pii_scrub_at", now)
    .is("pii_scrubbed_at", null)
    .select("id");

  if (error) {
    console.error("[CRON scrub-order-pii] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  console.log(`[CRON scrub-order-pii] anonimleştirilen sipariş: ${data?.length ?? 0}`);
  return NextResponse.json({ success: true, scrubbed: data?.length ?? 0 });
}
