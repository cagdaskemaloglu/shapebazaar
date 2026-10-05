/** Boşlukları siler, büyük harfe çevirir. */
export function normalizeIban(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}

/**
 * Türk IBAN doğrulaması: "TR" + 24 rakam (toplam 26 karakter) ve ISO 13616 mod-97 sağlaması.
 * Elle yazılan IBAN'daki hatalı rakam, para yanlış hesaba gitmeden önce yakalansın diye.
 */
export function isValidTurkishIban(raw: string): boolean {
  const iban = normalizeIban(raw);
  if (!/^TR\d{24}$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  // Harfler: A=10 … Z=35
  const digits = rearranged.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  // Büyük sayıyı parça parça mod 97 al (JS tamsayı sınırını aşmasın)
  let remainder = 0;
  for (let i = 0; i < digits.length; i += 7) {
    remainder = Number(String(remainder) + digits.slice(i, i + 7)) % 97;
  }
  return remainder === 1;
}
