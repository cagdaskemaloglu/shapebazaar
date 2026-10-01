import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * `models.file_url` veritabanında TAM URL değil, sadece storage path olarak
 * tutuluyor (örn. "userId/modelId.3mf") — bu yüzden model dosyasını fetch
 * etmeden önce mutlaka bu fonksiyondan geçirilmeli. Aksi halde mobile'da
 * (ve web'de) "file not found" / 404 hatası alınır — bu tam olarak Faz 3
 * testinde karşılaşılan hatanın sebebiydi.
 */
export function getModelPublicUrl(supabase: SupabaseClient, path: string): string {
  const { data } = supabase.storage.from("model-files").getPublicUrl(path);
  return data.publicUrl;
}

/** Bazı modellerde dosya herkese açık olmayabilir (private bucket senaryosu) —
 *  o durumda süreli imzalı bir URL gerekir. Şu an model-files bucket'ı public,
 *  ama ileride private'a geçilirse bu fonksiyon hazır olsun diye eklendi. */
export async function getModelSignedUrl(
  supabase: SupabaseClient,
  path: string,
  expiresIn = 3600
): Promise<string> {
  const { data, error } = await supabase.storage
    .from("model-files")
    .createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}