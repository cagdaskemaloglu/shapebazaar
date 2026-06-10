import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY ?? "re_placeholder");
const FROM   = "ShapeBazaar <noreply@shapebazaar.com>";

export async function sendOrderConfirmation({
  to, buyerName, modelTitle, orderId, totalAmount,
}: {
  to: string; buyerName: string; modelTitle: string;
  orderId: string; totalAmount: number;
}) {
  return resend.emails.send({
    from: FROM, to,
    subject: `Siparişiniz alındı — ${modelTitle}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
        <h1 style="font-size:22px;font-weight:500;color:#0F172A;margin-bottom:8px">Siparişiniz alındı! ✓</h1>
        <p style="color:#475569;font-size:14px;line-height:1.6">Merhaba ${buyerName},</p>
        <p style="color:#475569;font-size:14px;line-height:1.6">
          <strong>${modelTitle}</strong> siparişiniz başarıyla alındı ve baskı kuyruğuna eklendi.
        </p>
        <div style="background:#F8FAFC;border-radius:12px;padding:16px;margin:24px 0">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px">
            <span style="color:#64748B;font-size:13px">Sipariş No</span>
            <span style="font-size:13px;font-family:monospace">#${orderId.slice(0,8).toUpperCase()}</span>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="color:#64748B;font-size:13px">Toplam</span>
            <span style="font-size:13px;font-weight:500;color:#FF6B35">₺${totalAmount.toFixed(0)}</span>
          </div>
        </div>
        <p style="color:#475569;font-size:14px;line-height:1.6">
          En yakın yazıcı ortağı siparişinizi alacak. Durum güncellemelerini e-posta ve dashboard'unuzdan takip edebilirsiniz.
        </p>
        <a href="https://shapebazaar.com/tr/dashboard" style="display:inline-block;margin-top:16px;background:#FF6B35;color:#fff;padding:10px 20px;border-radius:10px;text-decoration:none;font-size:13px;font-weight:500">
          Siparişimi Takip Et →
        </a>
        <p style="color:#94A3B8;font-size:12px;margin-top:32px">ShapeBazaar · Print Farm Network</p>
      </div>
    `,
  });
}

export async function sendShippingNotification({
  to, buyerName, modelTitle, trackingNumber, cargoCompany,
}: {
  to: string; buyerName: string; modelTitle: string;
  trackingNumber: string; cargoCompany?: string;
}) {
  return resend.emails.send({
    from: FROM, to,
    subject: `Siparişiniz kargoya verildi — ${modelTitle}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
        <h1 style="font-size:22px;font-weight:500;color:#0F172A;margin-bottom:8px">Siparişiniz yola çıktı! 🚚</h1>
        <p style="color:#475569;font-size:14px">Merhaba ${buyerName},</p>
        <p style="color:#475569;font-size:14px;line-height:1.6">
          <strong>${modelTitle}</strong> siparişiniz kargoya verildi.
        </p>
        <div style="background:#F8FAFC;border-radius:12px;padding:16px;margin:24px 0">
          ${cargoCompany ? `<div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="color:#64748B;font-size:13px">Kargo Firması</span><span style="font-size:13px">${cargoCompany}</span></div>` : ""}
          <div style="display:flex;justify-content:space-between">
            <span style="color:#64748B;font-size:13px">Takip Numarası</span>
            <span style="font-size:13px;font-family:monospace;font-weight:500">${trackingNumber}</span>
          </div>
        </div>
        <p style="color:#475569;font-size:14px">Tahmini teslimat süresi 3–5 iş günüdür.</p>
        <p style="color:#94A3B8;font-size:12px;margin-top:32px">ShapeBazaar · Print Farm Network</p>
      </div>
    `,
  });
}

export async function sendPartnerApproval({ to, name }: { to: string; name: string }) {
  return resend.emails.send({
    from: FROM, to,
    subject: "Yazıcı Ortağı Başvurunuz Onaylandı!",
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
        <h1 style="font-size:22px;font-weight:500;color:#0F172A;margin-bottom:8px">Tebrikler, ${name}! 🎉</h1>
        <p style="color:#475569;font-size:14px;line-height:1.6">
          ShapeBazaar yazıcı ortağı başvurunuz onaylandı. Artık sipariş havuzundan baskı alabilirsiniz.
        </p>
        <a href="https://shapebazaar.com/tr/partner" style="display:inline-block;margin-top:16px;background:#10B981;color:#fff;padding:10px 20px;border-radius:10px;text-decoration:none;font-size:13px;font-weight:500">
          Sipariş Havuzuna Git →
        </a>
        <p style="color:#94A3B8;font-size:12px;margin-top:32px">ShapeBazaar · Print Farm Network</p>
      </div>
    `,
  });
}

export async function sendModelApproval({
  to, designerName, modelTitle, modelId,
}: {
  to: string; designerName: string; modelTitle: string; modelId: string;
}) {
  return resend.emails.send({
    from: FROM, to,
    subject: `Modeliniz yayınlandı — ${modelTitle}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
        <h1 style="font-size:22px;font-weight:500;color:#0F172A;margin-bottom:8px">Modeliniz yayında! ✓</h1>
        <p style="color:#475569;font-size:14px">Merhaba ${designerName},</p>
        <p style="color:#475569;font-size:14px;line-height:1.6">
          <strong>${modelTitle}</strong> modeliniz incelendi ve ShapeBazaar'da yayınlandı.
        </p>
        <a href="https://shapebazaar.com/tr/models/${modelId}" style="display:inline-block;margin-top:16px;background:#FF6B35;color:#fff;padding:10px 20px;border-radius:10px;text-decoration:none;font-size:13px;font-weight:500">
          Modeli Görüntüle →
        </a>
        <p style="color:#94A3B8;font-size:12px;margin-top:32px">ShapeBazaar · Print Farm Network</p>
      </div>
    `,
  });
}
