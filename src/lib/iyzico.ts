import crypto from "crypto";

export const IYZICO_BASE_URL = process.env.IYZICO_BASE_URL    ?? "https://sandbox-api.iyzipay.com";
export const IYZICO_API_KEY  = process.env.IYZICO_API_KEY     ?? "";
export const IYZICO_SECRET   = process.env.IYZICO_SECRET_KEY  ?? "";
export const SITE_URL        = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.shapebazaar.com";

export function generateAuthHeader(body: string): string {
  const randomKey  = Math.random().toString(36).substring(2);
  const dataToSign = IYZICO_API_KEY + randomKey + IYZICO_SECRET + body;
  const signature  = crypto.createHash("sha1").update(dataToSign).digest("base64");
  return `IYZWS apiKey:${IYZICO_API_KEY}&randomKey:${randomKey}&signature:${signature}`;
}