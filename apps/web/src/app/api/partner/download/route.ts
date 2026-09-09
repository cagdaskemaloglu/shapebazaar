import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function extractStoragePath(fileUrl: string): string {
  let storagePath = fileUrl;
  const storageMatch = fileUrl.match(/\/storage\/v1\/object\/(?:sign\/|public\/)?model-files\/(.+?)(?:\?|$)/);
  if (storageMatch) {
    storagePath = decodeURIComponent(storageMatch[1]);
  } else if (fileUrl.startsWith("http")) {
    const url = new URL(fileUrl);
    const parts = url.pathname.split("/model-files/");
    if (parts[1]) storagePath = decodeURIComponent(parts[1].split("?")[0]);
  }
  return storagePath;
}

/**
 * Bir sipariş birden fazla model içerebilir (sepet/order_items). Bu route
 * artık İLK modelle sınırlı kalmıyor — siparişteki her BENZERSİZ model için
 * ayrı imzalı indirme linki döndürüyor.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json({ error: "jobId required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("is_partner_approved")
    .eq("id", user.id)
    .single();

  if (!profile?.is_partner_approved) {
    return NextResponse.json({ error: "Partner onayı gerekli" }, { status: 403 });
  }

  const { data: job, error: jobError } = await admin
    .from("print_jobs")
    .select("id, status, printer_id, order_id")
    .eq("id", jobId)
    .single();

  if (!job) {
    return NextResponse.json({ error: "Sipariş bulunamadı (job yok)" }, { status: 404 });
  }
  if (job.printer_id !== user.id) {
    return NextResponse.json({ error: "Bu sipariş size ait değil" }, { status: 403 });
  }
  if (!["claimed", "printing", "done"].includes(job.status)) {
    return NextResponse.json({ error: "Dosya sadece üstlenilen siparişler için indirilebilir" }, { status: 403 });
  }

  // Siparişteki TÜM item'ları çek (aynı model birden fazla kez sipariş edilmiş
  // olabilir — model_id'ye göre benzersizleştiriyoruz, aynı dosya iki kez
  // listelenmesin diye)
  const { data: orderItems, error: itemsError } = await admin
    .from("order_items")
    .select("model_id, model_title")
    .eq("order_id", job.order_id);

  if (itemsError || !orderItems || orderItems.length === 0) {
    return NextResponse.json({ error: "Sipariş modelleri bulunamadı" }, { status: 404 });
  }

  const uniqueModelIds = [...new Set(orderItems.map((i) => i.model_id).filter(Boolean))] as string[];
  if (uniqueModelIds.length === 0) {
    return NextResponse.json({ error: "Sipariş modelleri bulunamadı" }, { status: 404 });
  }

  const { data: models, error: modelsError } = await admin
    .from("models")
    .select("id, file_url, title, file_format")
    .in("id", uniqueModelIds);

  if (modelsError || !models) {
    return NextResponse.json({ error: "Model dosyaları bulunamadı" }, { status: 404 });
  }

  const files: { modelId: string; title: string; filename: string; url: string }[] = [];

  for (const model of models) {
    if (!model.file_url) continue;
    const storagePath = extractStoragePath(model.file_url);

    const { data: signedData, error: signError } = await admin
      .storage
      .from("model-files")
      .createSignedUrl(storagePath, 3600);

    if (signError || !signedData?.signedUrl) {
      console.error("[download] signedUrl error for model", model.id, signError);
      continue;
    }

    files.push({
      modelId:  model.id,
      title:    model.title,
      filename: `${model.title}.${model.file_format}`,
      url:      signedData.signedUrl,
    });
  }

  if (files.length === 0) {
    return NextResponse.json({ error: "İndirme linki oluşturulamadı" }, { status: 500 });
  }

  return NextResponse.json({ files, expiresIn: 3600 });
}
