import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json({ error: "jobId required" }, { status: 400 });
  }

  // Kullanıcı auth
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
  }

  // Admin client — tüm sorgular için RLS bypass
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Partner onaylı mı?
  const { data: profile } = await admin
    .from("profiles")
    .select("is_partner_approved")
    .eq("id", user.id)
    .single();

  if (!profile?.is_partner_approved) {
    return NextResponse.json({ error: "Partner onayı gerekli" }, { status: 403 });
  }

  // print_job'u çek
  const { data: job, error: jobError } = await admin
    .from("print_jobs")
    .select("id, status, printer_id, order_id")
    .eq("id", jobId)
    .single();

  console.log("[download] job:", job, "jobError:", jobError);

  if (!job) {
    return NextResponse.json({ error: "Sipariş bulunamadı (job yok)" }, { status: 404 });
  }
  if (job.printer_id !== user.id) {
    return NextResponse.json({ error: "Bu sipariş size ait değil" }, { status: 403 });
  }
  if (!["claimed", "printing", "done"].includes(job.status)) {
    return NextResponse.json({ error: "Dosya sadece üstlenilen siparişler için indirilebilir" }, { status: 403 });
  }

  // order_items tablosundan model_id çek
  const { data: orderItem, error: itemError } = await admin
    .from("order_items")
    .select("model_id")
    .eq("order_id", job.order_id)
    .limit(1)
    .single();

  console.log("[download] orderItem:", orderItem, "itemError:", itemError);

  if (!orderItem?.model_id) {
    return NextResponse.json({ error: "Sipariş modeli bulunamadı" }, { status: 404 });
  }

  // Model dosya bilgisini çek
  const { data: model, error: modelError } = await admin
    .from("models")
    .select("file_url, title, file_format")
    .eq("id", orderItem.model_id)
    .single();

  console.log("[download] model:", model, "modelError:", modelError);

  if (!model?.file_url) {
    return NextResponse.json({ error: "Model dosyası bulunamadı" }, { status: 404 });
  }

  // file_url'den storage path'i çıkar
  let storagePath = model.file_url;
  const storageMatch = model.file_url.match(/\/storage\/v1\/object\/(?:sign\/|public\/)?model-files\/(.+?)(?:\?|$)/);
  if (storageMatch) {
    storagePath = decodeURIComponent(storageMatch[1]);
  } else if (model.file_url.startsWith("http")) {
    const url = new URL(model.file_url);
    const parts = url.pathname.split("/model-files/");
    if (parts[1]) storagePath = decodeURIComponent(parts[1].split("?")[0]);
  }

  console.log("[download] storagePath:", storagePath);

  // Signed URL oluştur (1 saat geçerli)
  const { data: signedData, error: signError } = await admin
    .storage
    .from("model-files")
    .createSignedUrl(storagePath, 3600);

  console.log("[download] signedUrl:", !!signedData?.signedUrl, "signError:", signError);

  if (signError || !signedData?.signedUrl) {
    return NextResponse.json({ error: "İndirme linki oluşturulamadı: " + signError?.message }, { status: 500 });
  }

  return NextResponse.json({
    url:      signedData.signedUrl,
    filename: `${model.title}.${model.file_format}`,
    expiresIn: 3600,
  });
}