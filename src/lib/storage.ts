import { createClient } from "@/lib/supabase/client";

export type ModelFormat = "stl" | "obj" | "3mf";

function detectFormat(filename: string): ModelFormat | null {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "stl") return "stl";
  if (ext === "obj") return "obj";
  if (ext === "3mf") return "3mf";
  return null;
}

/**
 * Upload a 3D model file to Supabase Storage.
 * Path: model-files/{userId}/{modelId}.{ext}
 */
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
    .upload(path, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (error) throw error;
  onProgress?.(100);
  return { path, format };
}

/**
 * Get a short-lived signed URL to serve a private model file.
 */
export function getModelPublicUrl(path: string): string {
  const supabase = createClient();
  const { data } = supabase.storage
    .from("model-files")
    .getPublicUrl(path);
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
 * Upload a thumbnail image.
 * Path: model-thumbnails/{userId}/{modelId}.webp
 */
export async function uploadThumbnail(
  file: File,
  userId: string,
  modelId: string
): Promise<string> {
  const supabase = createClient();
  const ext  = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${userId}/${modelId}.${ext}`;

  const { error } = await supabase.storage
    .from("model-thumbnails")
    .upload(path, file, { cacheControl: "86400", upsert: true });

  if (error) throw error;

  const { data } = supabase.storage
    .from("model-thumbnails")
    .getPublicUrl(path);

  return data.publicUrl;
}

/**
 * Upload a user avatar.
 */
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

  const { data } = supabase.storage
    .from("avatars")
    .getPublicUrl(path);

  return data.publicUrl;
}

/**
 * Delete a model file and its thumbnail.
 */
export async function deleteModelFiles(
  userId: string,
  modelId: string,
  format: ModelFormat
): Promise<void> {
  const supabase = createClient();
  await Promise.allSettled([
    supabase.storage.from("model-files").remove([`${userId}/${modelId}.${format}`]),
    supabase.storage.from("model-thumbnails").remove([`${userId}/${modelId}.jpg`, `${userId}/${modelId}.webp`]),
  ]);
}
