import crypto from "crypto";

const API_KEY    = (process.env.IYZICO_API_KEY     ?? "").trim();
const SECRET_KEY = (process.env.IYZICO_SECRET_KEY  ?? "").trim();
const BASE_URL   = (process.env.IYZICO_BASE_URL    ?? "https://sandbox-api.iyzipay.com").trim();

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.shapebazaar.com").trim();

// IYZWSv2 + HMAC-SHA256 — resmi iyzipay paketinin birebir aynısı
function generateAuthHeader(path: string, body: object, randomString: string): string {
  const signature = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(randomString + path + JSON.stringify(body))
    .digest("hex");

  const authParams = [
    "apiKey:"    + API_KEY,
    "randomKey:" + randomString,
    "signature:" + signature,
  ];
  return "IYZWSv2 " + Buffer.from(authParams.join("&")).toString("base64");
}

function generateRandomString(): string {
  return process.hrtime()[0] + Math.random().toString(36).slice(2);
}

function formatPrice(price: string | number | undefined): string | undefined {
  if (price === undefined || price === null) return undefined;
  const n = parseFloat(String(price));
  if (!isFinite(n)) return String(price);
  const s = n.toString();
  return s.indexOf(".") === -1 ? s + ".0" : s;
}

export async function iyziPost<T>(path: string, body: object): Promise<T> {
  const randomString    = generateRandomString();
  const authorization   = generateAuthHeader(path, body, randomString);

  const res = await fetch(`${BASE_URL}${path}`, {
    method:  "POST",
    headers: {
      "Content-Type":         "application/json",
      "Authorization":        authorization,
      "x-iyzi-rnd":           randomString,
      "x-iyzi-client-version": "iyzipay-node-2.0.69",
    },
    body: JSON.stringify(body),
  });

  return res.json() as Promise<T>;
}

// Alan sıralamaları resmi iyzipay paketinden birebir alındı
function orderBuyer(b: IyzicoBuyer) {
  return {
    id: b.id, name: b.name, surname: b.surname,
    identityNumber: b.identityNumber, email: b.email,
    gsmNumber: b.gsmNumber,
    registrationDate: b.registrationDate, lastLoginDate: b.lastLoginDate,
    registrationAddress: b.registrationAddress,
    city: b.city, country: b.country, zipCode: b.zipCode, ip: b.ip,
  };
}

function orderAddress(a: IyzicoAddress) {
  return {
    address: a.address, zipCode: a.zipCode,
    contactName: a.contactName, city: a.city, country: a.country,
  };
}

function orderBasketItem(i: IyzicoBasketItem) {
  return {
    id: i.id, price: formatPrice(i.price),
    name: i.name, category1: i.category1,
    category2: i.category2, itemType: i.itemType,
  };
}

function buildCheckoutBody(req: CheckoutFormInitializeRequest) {
  return {
    locale:          req.locale,
    conversationId:  req.conversationId,
    price:           formatPrice(req.price),
    basketId:        req.basketId,
    paymentGroup:    req.paymentGroup,
    buyer:           orderBuyer(req.buyer),
    shippingAddress: orderAddress(req.shippingAddress),
    billingAddress:  orderAddress(req.billingAddress),
    basketItems:     req.basketItems.map(orderBasketItem),
    callbackUrl:     req.callbackUrl,
    paymentSource:   undefined,
    currency:        req.currency,
    posOrderId:      undefined,
    paidPrice:       formatPrice(req.paidPrice),
    forceThreeDS:    undefined,
    cardUserKey:     undefined,
    enabledInstallments: req.enabledInstallments,
  };
}

// ── Tipler ────────────────────────────────────────────────

export interface IyzicoBasketItem {
  id: string; name: string; category1: string;
  category2?: string; itemType: "PHYSICAL" | "VIRTUAL"; price: string;
}

export interface IyzicoAddress {
  contactName: string; city: string; country: string;
  address: string; zipCode: string;
}

export interface IyzicoBuyer {
  id: string; name: string; surname: string;
  gsmNumber: string; email: string; identityNumber: string;
  lastLoginDate: string; registrationDate: string;
  registrationAddress: string; ip: string;
  city: string; country: string; zipCode: string;
}

export interface CheckoutFormInitializeRequest {
  locale: "tr" | "en";
  conversationId: string;
  price: string;
  paidPrice: string;
  currency: "TRY" | "USD" | "EUR";
  basketId: string;
  paymentGroup: "PRODUCT";
  callbackUrl: string;
  enabledInstallments?: number[];
  buyer: IyzicoBuyer;
  shippingAddress: IyzicoAddress;
  billingAddress: IyzicoAddress;
  basketItems: IyzicoBasketItem[];
}

export interface CheckoutFormInitializeResult {
  status: "success" | "failure";
  token?: string;
  checkoutFormContent?: string;
  paymentPageUrl?: string;
  errorMessage?: string;
  errorCode?: string;
}

export interface CheckoutFormRetrieveResult {
  status: "success" | "failure";
  paymentStatus?: string;
  conversationId?: string;
  errorMessage?: string;
  errorCode?: string;
}

const CHECKOUT_INIT_PATH     = "/payment/iyzipos/checkoutform/initialize/auth/ecom";
const CHECKOUT_RETRIEVE_PATH = "/payment/iyzipos/checkoutform/auth/ecom/detail";

export function createCheckoutForm(req: CheckoutFormInitializeRequest): Promise<CheckoutFormInitializeResult> {
  return iyziPost<CheckoutFormInitializeResult>(CHECKOUT_INIT_PATH, buildCheckoutBody(req));
}

export function retrieveCheckoutForm(params: {
  locale: "tr" | "en"; conversationId?: string; token: string;
}): Promise<CheckoutFormRetrieveResult> {
  return iyziPost<CheckoutFormRetrieveResult>(CHECKOUT_RETRIEVE_PATH, params);
}