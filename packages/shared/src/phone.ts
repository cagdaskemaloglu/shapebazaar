/**
 * Türkiye telefon numarasını E.164'e (+90XXXXXXXXXX) çevirir; geçersizse `null`.
 * Kullanıcılar `0531 716 85 48`, `531 716 85 48`, `+90 531 716 85 48`, `905317168548` gibi yazar.
 * Eskiden sunucu `+90` ekliyordu: `05317168548` → `+9005317168548` (geçersiz) olup ödeme sağlayıcısına gidiyordu.
 */
export function normalizeTrPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/[^\d]/g, "");          // boşluk, tire, parantez, + atılır
  if (digits.startsWith("00")) digits = digits.slice(2);   // 0090...
  if (digits.startsWith("90") && digits.length === 12) digits = digits.slice(2);
  else if (digits.startsWith("0") && digits.length === 11) digits = digits.slice(1);
  return /^[1-9]\d{9}$/.test(digits) ? `+90${digits}` : null;
}
