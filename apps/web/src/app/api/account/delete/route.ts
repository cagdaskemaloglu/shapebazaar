import { NextRequest, NextResponse } from "next/server";
import { createRequestClient } from "@/lib/supabase/requestClient";
import { createAdminClient } from "@/lib/supabase/admin";

/** Hesap silindikten kaç gün sonra eski siparişlerdeki kişisel veriler anonimleştirilir */
const ORDER_PII_RETENTION_DAYS = 30;

/**
 * Hesabı kalıcı olarak siler (Apple Guideline 5.1.1(v) — uygulama içi hesap silme zorunluluğu).
 * Web (cookie) ve mobil (Authorization: Bearer) aynı uçu kullanır.
 *
 *   { dryRun: true }                          → engelleri ve etkiyi döndürür, hiçbir şeyi değiştirmez
 *   { confirm: true, acknowledgeCancelOrders? } → siler
 *
 * Silme engellenir (409 BLOCKED): cüzdan bakiyesi / bekleyen çekim, devam eden siparişler, üstlenilmiş
 * baskı işleri, teslim onayı bekleyen kazançlar, modeli kargodaki siparişte olan tasarımcı, admin hesabı.
 * Tasarımcı hesabının silinmesi, modellerini içeren kargolanmamış siparişleri iptal eder
 * (409 CONFIRM_REQUIRED: istemci bunu kullanıcıya göstermeden devam edemez).
 * İş mantığı veritabanında (`account_deletion_report` / `account_deletion_prepare`, tek işlem).
 */
export async function POST(req: NextRequest) {
  const { user } = await createRequestClient(req);
  if (!user) return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const admin = createAdminClient();

  const { data: report, error: reportErr } = await admin.rpc("account_deletion_report", { uid: user.id });
  if (reportErr || !report) {
    console.error("[account/delete] report error:", reportErr);
    return NextResponse.json({ error: "Hesap durumu okunamadı" }, { status: 500 });
  }
  const blockers = (report.blockers ?? []) as { code: string }[];
  const willCancelOrders = Number(report.willCancelOrders ?? 0);
  const willUnpublishModels = Number(report.willUnpublishModels ?? 0);

  if (body?.dryRun === true) {
    return NextResponse.json({ blockers, willCancelOrders, willUnpublishModels });
  }
  if (body?.confirm !== true) {
    return NextResponse.json({ error: "Onay gerekli", code: "CONFIRM_REQUIRED" }, { status: 400 });
  }
  if (blockers.length > 0) {
    return NextResponse.json({ error: "Hesap şu an silinemiyor", code: "BLOCKED", blockers }, { status: 409 });
  }
  if (willCancelOrders > 0 && body?.acknowledgeCancelOrders !== true) {
    return NextResponse.json(
      { error: "Modellerinizi içeren siparişler iptal edilecek", code: "CONFIRM_REQUIRED", willCancelOrders },
      { status: 409 }
    );
  }

  // Tek işlemde: siparişleri iptal et/işaretle, modelleri yayından kaldır, kişisel veri silme tarihini yaz
  const { data: summary, error: prepErr } = await admin.rpc("account_deletion_prepare", {
    uid: user.id,
    retention_days: ORDER_PII_RETENTION_DAYS,
  });
  if (prepErr) {
    if (prepErr.message?.includes("ACCOUNT_DELETION_BLOCKED")) {
      // rapor ile silme arasında durum değişti (ör. yeni sipariş geldi)
      return NextResponse.json({ error: "Hesap şu an silinemiyor", code: "BLOCKED" }, { status: 409 });
    }
    console.error("[account/delete] prepare error:", prepErr);
    return NextResponse.json({ error: "Hesap silinemedi", code: "DELETE_FAILED" }, { status: 500 });
  }

  // Avatar dosyası (en iyi çaba: hata silmeyi durdurmaz)
  try {
    const { data: files } = await admin.storage.from("avatars").list(user.id);
    if (files?.length) await admin.storage.from("avatars").remove(files.map((f) => `${user.id}/${f.name}`));
  } catch (e) {
    console.warn("[account/delete] avatar cleanup failed:", e);
  }

  // Auth kullanıcısını sil → profil, puanlar, adresler, cüzdan/çekim geçmişi ilişkiler üzerinden silinir;
  // siparişlerde buyer_id NULL olur. Burada başarısız olursa hazırlık tamamdır, istek güvenle tekrarlanabilir.
  const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
  if (delErr) {
    console.error("[account/delete] deleteUser error:", delErr);
    return NextResponse.json({ error: "Hesap silinemedi", code: "DELETE_FAILED" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, summary });
}
