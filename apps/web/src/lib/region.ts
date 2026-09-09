/**
 * Region koduna göre locale döner.
 * TR → "tr", diğer tüm regionlar → "en"
 */
export function getLocaleFromRegion(region: string): "tr" | "en" {
  return region === "TR" ? "tr" : "en";
}
