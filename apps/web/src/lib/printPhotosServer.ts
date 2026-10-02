import { buildPrintPhotoUrl, PRINT_PHOTO_BUCKET } from "@shapebazaar/shared";

/** Sunucu tarafında herkese açık fotoğraf URL'si üretir (client'ın env'e ihtiyacı kalmaz). */
export function printPhotoUrl(path: string): string {
  return buildPrintPhotoUrl(process.env.NEXT_PUBLIC_SUPABASE_URL!, path);
}

export { PRINT_PHOTO_BUCKET };

export function isJpeg(buf: Uint8Array): boolean {
  return buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
}

/** Storage URL'sinden (public/sign) bucket içi yolu çıkarır; zaten bir yolsa olduğu gibi döner. */
export function storagePathFromUrl(urlOrPath: string | null | undefined, bucket: string): string | null {
  if (!urlOrPath) return null;
  if (!/^https?:\/\//i.test(urlOrPath)) return urlOrPath;
  const m = urlOrPath.match(new RegExp(`/storage/v1/object/(?:sign/|public/)?${bucket}/(.+?)(?:\\?|$)`));
  return m ? decodeURIComponent(m[1]) : null;
}
