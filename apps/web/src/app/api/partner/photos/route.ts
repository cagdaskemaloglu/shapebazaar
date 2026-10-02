import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PRINT_PHOTO_MAX } from "@shapebazaar/shared";
import { PRINT_PHOTO_BUCKET, isJpeg, printPhotoUrl } from "@/lib/printPhotosServer";

const MAX_PHOTO_BYTES = 2.5 * 1024 * 1024;
const MAX_THUMB_BYTES = 400 * 1024;

async function readBlob(v: FormDataEntryValue | null): Promise<Uint8Array | null> {
  if (!v || typeof v === "string") return null;
  return new Uint8Array(await v.arrayBuffer());
}

/**
 * Yazıcı ortağı, kendi işindeki bir ürün (order_item) için baskı fotoğrafı yükler.
 * Tarayıcı fotoğrafı yüklemeden önce iki boyuta küçültüp JPEG'e çevirir (EXIF/konum bilgisi
 * bu sırada atılır): `photo` (≤1600px) ve `thumb` (≤640px). Fotoğraf `pending` olarak kaydedilir,
 * admin onaylayınca herkese görünür.
 */
export async function POST(req: NextRequest) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const jobId       = form?.get("jobId");
  const orderItemId = form?.get("orderItemId");
  if (!form || typeof jobId !== "string" || typeof orderItemId !== "string") {
    return NextResponse.json({ error: "jobId ve orderItemId gerekli" }, { status: 400 });
  }

  const photo = await readBlob(form.get("photo"));
  const thumb = await readBlob(form.get("thumb"));
  if (!photo || !thumb) return NextResponse.json({ error: "Fotoğraf dosyası eksik" }, { status: 400 });
  if (!isJpeg(photo) || !isJpeg(thumb)) return NextResponse.json({ error: "Sadece JPEG kabul edilir" }, { status: 400 });
  if (photo.length > MAX_PHOTO_BYTES || thumb.length > MAX_THUMB_BYTES) {
    return NextResponse.json({ error: "Fotoğraf çok büyük" }, { status: 413 });
  }

  const admin = createAdminClient();

  const { data: profile } = await admin.from("profiles").select("is_partner_approved").eq("id", user.id).single();
  if (!profile?.is_partner_approved) return NextResponse.json({ error: "Yazıcı ortağı yetkisi gerekiyor" }, { status: 403 });

  const { data: job } = await admin.from("print_jobs").select("id, order_id, printer_id, status").eq("id", jobId).single();
  if (!job || job.printer_id !== user.id) return NextResponse.json({ error: "Bu iş size ait değil" }, { status: 403 });
  if (!["claimed", "printing"].includes(job.status)) {
    return NextResponse.json({ error: "Bu iş için artık fotoğraf yüklenemez" }, { status: 409 });
  }

  const { data: item } = await admin
    .from("order_items")
    .select("id, order_id, model_id, material, color_name, scale_percent")
    .eq("id", orderItemId)
    .single();
  if (!item || item.order_id !== job.order_id) {
    return NextResponse.json({ error: "Bu ürün bu işe ait değil" }, { status: 403 });
  }

  const { count } = await admin
    .from("print_photos")
    .select("id", { count: "exact", head: true })
    .eq("order_item_id", item.id)
    .eq("printer_id", user.id);
  if ((count ?? 0) >= PRINT_PHOTO_MAX) {
    return NextResponse.json({ error: `En fazla ${PRINT_PHOTO_MAX} fotoğraf yüklenebilir` }, { status: 409 });
  }

  const id        = crypto.randomUUID();
  const photoPath = `${user.id}/${item.id}/${id}.jpg`;
  const thumbPath = `${user.id}/${item.id}/${id}_t.jpg`;
  const opts = { contentType: "image/jpeg", cacheControl: "31536000", upsert: false };

  const [up1, up2] = await Promise.all([
    admin.storage.from(PRINT_PHOTO_BUCKET).upload(photoPath, photo, opts),
    admin.storage.from(PRINT_PHOTO_BUCKET).upload(thumbPath, thumb, opts),
  ]);
  if (up1.error || up2.error) {
    console.error("[partner/photos] upload error:", up1.error ?? up2.error);
    await admin.storage.from(PRINT_PHOTO_BUCKET).remove([photoPath, thumbPath]);
    return NextResponse.json({ error: "Fotoğraf yüklenemedi" }, { status: 500 });
  }

  const { data: row, error: insErr } = await admin
    .from("print_photos")
    .insert({
      id,
      order_item_id: item.id,
      print_job_id:  job.id,
      model_id:      item.model_id,
      printer_id:    user.id,
      photo_path:    photoPath,
      thumb_path:    thumbPath,
      material:      item.material,
      color_name:    item.color_name,
      scale_percent: item.scale_percent,
    })
    .select("id, status, photo_path, thumb_path")
    .single();

  if (insErr || !row) {
    console.error("[partner/photos] insert error:", insErr);
    await admin.storage.from(PRINT_PHOTO_BUCKET).remove([photoPath, thumbPath]);
    return NextResponse.json({ error: "Fotoğraf kaydedilemedi" }, { status: 500 });
  }

  return NextResponse.json({
    photo: { id: row.id, status: row.status, photo_url: printPhotoUrl(row.photo_path), thumb_url: printPhotoUrl(row.thumb_path) },
  });
}

/** Yazıcı, işi kargolamadan önce kendi yüklediği (henüz onaylanmamış) fotoğrafı silebilir. */
export async function DELETE(req: NextRequest) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });

  const { photoId } = await req.json().catch(() => ({}));
  if (typeof photoId !== "string") return NextResponse.json({ error: "photoId gerekli" }, { status: 400 });

  const admin = createAdminClient();
  const { data: photo } = await admin
    .from("print_photos")
    .select("id, printer_id, status, photo_path, thumb_path, print_job_id")
    .eq("id", photoId)
    .single();
  if (!photo || photo.printer_id !== user.id) return NextResponse.json({ error: "Bu fotoğraf size ait değil" }, { status: 403 });
  if (photo.status === "approved") return NextResponse.json({ error: "Onaylanmış fotoğraf silinemez" }, { status: 409 });

  if (photo.print_job_id) {
    const { data: job } = await admin.from("print_jobs").select("status").eq("id", photo.print_job_id).single();
    if (job?.status === "done") return NextResponse.json({ error: "Kargolanmış işin fotoğrafı silinemez" }, { status: 409 });
  }

  await admin.storage.from(PRINT_PHOTO_BUCKET).remove([photo.photo_path, photo.thumb_path]);
  const { error } = await admin.from("print_photos").delete().eq("id", photoId);
  if (error) return NextResponse.json({ error: "Silinemedi" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
