import { NextRequest, NextResponse } from "next/server";
import { createRequestClient } from "@/lib/supabase/requestClient";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidTurkishIban, normalizeIban } from "@/lib/iban";

const MIN_WITHDRAWAL_TL = 50;
const MAX_WITHDRAWAL_TL = 100000;

/**
 * Cüzdandan çekim talebi. Eskiden tarayıcı `withdrawal_requests`'e doğrudan insert ediyordu:
 * miktar/durum sunucuda doğrulanmıyor, bakiye düşmüyordu (aynı bakiyeyle sınırsız talep).
 * Şimdi tek veritabanı işleminde (`request_withdrawal`): bakiye kilitlenir, kontrol edilir, DÜŞÜLÜR,
 * talep ve cüzdan hareketi yazılır. Reddedilirse bakiye iade edilir (`resolve_withdrawal`).
 */
export async function POST(req: NextRequest) {
  const { user } = await createRequestClient(req);
  if (!user) return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const amount = Math.round(Number(body?.amount) * 100) / 100;
  const iban = typeof body?.iban === "string" ? normalizeIban(body.iban) : "";
  const fullName = typeof body?.fullName === "string" ? body.fullName.trim() : "";

  if (!Number.isFinite(amount) || amount < MIN_WITHDRAWAL_TL) {
    return NextResponse.json({ error: `En az ₺${MIN_WITHDRAWAL_TL} çekebilirsiniz`, code: "WITHDRAWAL_BELOW_MIN" }, { status: 400 });
  }
  if (amount > MAX_WITHDRAWAL_TL) {
    return NextResponse.json({ error: "Tutar çok yüksek", code: "WITHDRAWAL_TOO_HIGH" }, { status: 400 });
  }
  if (!isValidTurkishIban(iban)) {
    return NextResponse.json({ error: "Geçersiz IBAN", code: "INVALID_IBAN" }, { status: 400 });
  }
  if (fullName.length < 3 || fullName.length > 100) {
    return NextResponse.json({ error: "Hesap sahibi adı geçersiz", code: "INVALID_NAME" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("request_withdrawal", {
    uid: user.id,
    p_amount: amount,
    p_iban: iban,
    p_full_name: fullName,
    p_min: MIN_WITHDRAWAL_TL,
  });

  if (error) {
    if (error.message?.includes("INSUFFICIENT_BALANCE")) {
      return NextResponse.json({ error: "Yetersiz bakiye", code: "INSUFFICIENT_BALANCE" }, { status: 400 });
    }
    console.error("[wallet/withdraw] rpc error:", error);
    return NextResponse.json({ error: "Talep oluşturulamadı" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data });
}
