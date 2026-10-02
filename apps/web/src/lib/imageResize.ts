/**
 * Tarayıcıda fotoğrafı iki boyuta küçültüp JPEG'e çevirir. Canvas'tan geçirmek EXIF/konum
 * bilgisini de atar. Telefon fotoğrafları (5–10 MB) yüklenmeden önce ~300–600 KB'a iner.
 */
export interface PreparedPhoto {
  photo: Blob; // en uzun kenar ≤ 1600px
  thumb: Blob; // en uzun kenar ≤ 640px (kart/mini/galeri)
}

const FULL_MAX  = 1600;
const THUMB_MAX = 640;

interface Decoded { src: CanvasImageSource; width: number; height: number; close?: () => void }

async function decode(file: File): Promise<Decoded> {
  if (typeof createImageBitmap === "function") {
    try {
      // "from-image": EXIF yönünü uygular (telefonla dik çekilen fotoğraf yan dönmesin)
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { src: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
    } catch { /* eski tarayıcı: <img> yoluna düş */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("decode_failed"));
      el.src = url;
    });
    return { src: img, width: img.naturalWidth, height: img.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toJpeg(d: Decoded, maxSide: number, quality: number): Promise<Blob> {
  const scale = Math.min(1, maxSide / Math.max(d.width, d.height));
  const w = Math.max(1, Math.round(d.width * scale));
  const h = Math.max(1, Math.round(d.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("no_canvas"));
  ctx.fillStyle = "#fff"; // şeffaf PNG'ler JPEG'te siyah olmasın
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(d.src, 0, 0, w, h);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode_failed"))), "image/jpeg", quality)
  );
}

export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  const d = await decode(file);
  try {
    const [photo, thumb] = await Promise.all([toJpeg(d, FULL_MAX, 0.85), toJpeg(d, THUMB_MAX, 0.8)]);
    return { photo, thumb };
  } finally {
    d.close?.();
  }
}
