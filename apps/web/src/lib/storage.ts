import { createClient } from "@/lib/supabase/client";

export type ModelFormat = "stl" | "obj" | "3mf";

function detectFormat(filename: string): ModelFormat | null {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "stl") return "stl";
  if (ext === "obj") return "obj";
  if (ext === "3mf") return "3mf";
  return null;
}

export async function uploadModelFile(
  file: File,
  userId: string,
  modelId: string,
  onProgress?: (pct: number) => void
): Promise<{ path: string; format: ModelFormat }> {
  const format = detectFormat(file.name);
  if (!format) throw new Error("Unsupported format");

  const supabase = createClient();
  const path = `${userId}/${modelId}.${format}`;

  const { error } = await supabase.storage
    .from("model-files")
    .upload(path, file, { cacheControl: "3600", upsert: true });

  if (error) throw error;
  onProgress?.(100);
  return { path, format };
}

export function getModelPublicUrl(path: string): string {
  const supabase = createClient();
  const { data } = supabase.storage.from("model-files").getPublicUrl(path);
  return data.publicUrl;
}

export async function getModelSignedUrl(
  path: string,
  expiresIn = 3600
): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from("model-files")
    .createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

/**
 * Upload a thumbnail image (File or canvas Blob).
 * Path: model-thumbnails/{userId}/{modelId}.png
 */
export async function uploadThumbnail(
  source: File | Blob,
  userId: string,
  modelId: string
): Promise<string> {
  const supabase = createClient();
  const ext  = source instanceof File
    ? (source.name.split(".").pop()?.toLowerCase() ?? "png")
    : "png";
  const path = `${userId}/${modelId}.${ext}`;

  const { error } = await supabase.storage
    .from("model-thumbnails")
    .upload(path, source, {
      contentType: source instanceof File ? source.type : "image/png",
      cacheControl: "86400",
      upsert: true,
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from("model-thumbnails")
    .getPublicUrl(path);

  return data.publicUrl;
}

/**
 * Upload a model photo (max 3).
 * Path: model-images/{userId}/{modelId}/{index}.{ext}
 */
export async function uploadModelImage(
  file: File,
  userId: string,
  modelId: string,
  index: number
): Promise<string> {
  const supabase = createClient();
  const ext  = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${userId}/${modelId}/${index}.${ext}`;

  const { error } = await supabase.storage
    .from("model-images")
    .upload(path, file, {
      contentType: file.type,
      cacheControl: "86400",
      upsert: true,
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from("model-images")
    .getPublicUrl(path);

  return data.publicUrl;
}

export async function uploadAvatar(
  file: File,
  userId: string
): Promise<string> {
  const supabase = createClient();
  const ext  = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${userId}/avatar.${ext}`;

  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, file, { cacheControl: "86400", upsert: true });

  if (error) throw error;

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteModelFiles(
  userId: string,
  modelId: string,
  format: ModelFormat
): Promise<void> {
  const supabase = createClient();
  await Promise.allSettled([
    supabase.storage.from("model-files").remove([`${userId}/${modelId}.${format}`]),
    supabase.storage.from("model-thumbnails").remove([
      `${userId}/${modelId}.png`,
      `${userId}/${modelId}.jpg`,
      `${userId}/${modelId}.webp`,
    ]),
    supabase.storage.from("model-images").remove([
      `${userId}/${modelId}/0.jpg`, `${userId}/${modelId}/0.png`,
      `${userId}/${modelId}/1.jpg`, `${userId}/${modelId}/1.png`,
      `${userId}/${modelId}/2.jpg`, `${userId}/${modelId}/2.png`,
    ]),
  ]);
}