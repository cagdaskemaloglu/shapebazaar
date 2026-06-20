import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json({ error: "jobId required" }, { status: 400 });
  }

  // Kullanıcı auth — cookie'den session al
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Partner onaylı mı?
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_partner_approved")
    .eq("id", user.id)
    .single();

  if (!profile?.is_partner_approved) {
    return NextResponse.json({ error: "Partner onayı gerekli" }, { status: 403 });
  }

  // Bu job bu partner'a ait ve aktif durumda mı?
  const { data: job } = await supabase
    .from("print_jobs")
    .select("id, status, printer_id, order:orders(model_id)")
    .eq("id", jobId)
    .single();

  if (!job) {
    return NextResponse.json({ error: "Sipariş bulunamadı" }, { status: 404 });
  }
  if (job.printer_id !== user.id) {
    return NextResponse.json({ error: "Bu sipariş size ait değil" }, { status: 403 });
  }
  if (!["claimed", "printing", "done"].includes(job.status)) {
    return NextResponse.json({ error: "Dosya sadece üstlenilen siparişler için indirilebilir" }, { status: 403 });
  }

  const modelId = (job.order as any)?.model_id;
  if (!modelId) {
    return NextResponse.json({ error: "Model bulunamadı" }, { status: 404 });
  }

  // Model dosya bilgisini çek
  const { data: model } = await supabase
    .from("models")
    .select("file_url, title, file_format")
    .eq("id", modelId)
    .single();

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

  // Service role key ile admin client — RLS bypass ederek signed URL oluştur
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: signedData, error: signError } = await adminClient
    .storage
    .from("model-files")
    .createSignedUrl(storagePath, 3600); // 1 saat geçerli

  if (signError || !signedData?.signedUrl) {
    console.error("Signed URL error:", signError, "| path:", storagePath);
    return NextResponse.json({ error: "İndirme linki oluşturulamadı: " + signError?.message }, { status: 500 });
  }

  return NextResponse.json({
    url:      signedData.signedUrl,
    filename: `${model.title}.${model.file_format}`,
    expiresIn: 3600,
  });
}