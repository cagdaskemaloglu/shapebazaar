import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY ?? "re_placeholder");
const FROM   = "ShapeBazaar <noreply@shapebazaar.com>";

export async function sendOrderConfirmation({
  to, buyerName, modelTitle, orderId, totalAmount, locale = "tr",
}: {
  to: string; buyerName: string; modelTitle: string;
  orderId: string; totalAmount: number; locale?: string;
}) {
  const isTR = locale === "tr";
  const trackingUrl = `https://shapebazaar.com/${locale}/orders/${orderId}`;
  return resend.emails.send({
    from: FROM, to,
    subject: isTR ? `Siparişiniz alındı — ${modelTitle}` : `Order confirmed — ${modelTitle}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
        <h1 style="font-size:22px;font-weight:500;color:#0F172A;margin-bottom:8px">${isTR ? "Siparişiniz alındı! ✓" : "Order confirmed! ✓"}</h1>
        <p style="color:#475569;font-size:14px;line-height:1.6">${isTR ? `Merhaba ${buyerName},` : `Hello ${buyerName},`}</p>
        <p style="color:#475569;font-size:14px;line-height:1.6">
          <strong>${modelTitle}</strong> ${isTR ? "siparişiniz başarıyla alındı ve baskı kuyruğuna eklendi." : "has been received and added to the print queue."}
        </p>
        <div style="background:#F8FAFC;border-radius:12px;padding:16px;margin:24px 0">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px">
            <span style="color:#64748B;font-size:13px">${isTR ? "Sipariş No" : "Order No"}</span>
            <span style="font-size:13px;font-family:monospace">#${orderId.slice(0,8).toUpperCase()}</span>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="color:#64748B;font-size:13px">${isTR ? "Toplam" : "Total"}</span>
            <span style="font-size:13px;font-weight:500;color:#FF6B35">${isTR ? `₺${totalAmount.toFixed(0)}` : `$${(totalAmount / 32).toFixed(2)}`}</span>
          </div>
        </div>
        <a href="${trackingUrl}" style="display:inline-block;margin-top:16px;background:#FF6B35;color:#fff;padding:10px 20px;border-radius:10px;text-decoration:none;font-size:13px;font-weight:500">
          ${isTR ? "Siparişimi Takip Et →" : "Track My Order →"}
        </a>
        <p style="color:#94A3B8;font-size:12px;margin-top:32px">ShapeBazaar · Print Farm Network</p>
      </div>
    `,
  });
}

export async function sendShippingNotification({
  to, buyerName, modelTitle, orderId, trackingNumber, cargoCompany, locale = "tr",
}: {
  to: string; buyerName: string; modelTitle: string; orderId: string;
  trackingNumber: string; cargoCompany?: string; locale?: string;
}) {
  const isTR = locale === "tr";
  const trackingUrl = `https://shapebazaar.com/${locale}/orders/${orderId}`;
  return resend.emails.send({
    from: FROM, to,
    subject: isTR ? `Siparişiniz kargoya verildi — ${modelTitle}` : `Your order has been shipped — ${modelTitle}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
        <h1 style="font-size:22px;font-weight:500;color:#0F172A;margin-bottom:8px">${isTR ? "Siparişiniz yola çıktı! 🚚" : "Your order is on the way! 🚚"}</h1>
        <p style="color:#475569;font-size:14px">${isTR ? `Merhaba ${buyerName},` : `Hello ${buyerName},`}</p>
        <p style="color:#475569;font-size:14px;line-height:1.6">
          <strong>${modelTitle}</strong> ${isTR ? "siparişiniz kargoya verildi." : "has been shipped."}
        </p>
        <div style="background:#F8FAFC;border-radius:12px;padding:16px;margin:24px 0">
          ${cargoCompany ? `<div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="color:#64748B;font-size:13px">${isTR ? "Kargo Firması" : "Carrier"}</span><span style="font-size:13px">${cargoCompany}</span></div>` : ""}
          <div style="display:flex;justify-content:space-between">
            <span style="color:#64748B;font-size:13px">${isTR ? "Takip Numarası" : "Tracking Number"}</span>
            <span style="font-size:13px;font-family:monospace;font-weight:500">${trackingNumber}</span>
          </div>
        </div>
        <p style="color:#475569;font-size:14px">${isTR ? "Tahmini teslimat süresi 3–5 iş günüdür." : "Estimated delivery: 3–5 business days."}</p>
        <a href="${trackingUrl}" style="display:inline-block;margin-top:16px;background:#FF6B35;color:#fff;padding:10px 20px;border-radius:10px;text-decoration:none;font-size:13px;font-weight:500">
          ${isTR ? "Siparişimi Takip Et →" : "Track My Order →"}
        </a>
        <p style="color:#94A3B8;font-size:12px;margin-top:32px">ShapeBazaar · Print Farm Network</p>
      </div>
    `,
  });
}

export async function sendPartnerApproval({
  to, name, locale = "tr",
}: {
  to: string; name: string; locale?: string;
}) {
  const isTR = locale === "tr";
  const partnerUrl = `https://shapebazaar.com/${locale}/partner`;
  return resend.emails.send({
    from: FROM, to,
    subject: isTR ? "Yazıcı Ortağı Başvurunuz Onaylandı!" : "Your Print Partner Application is Approved!",
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
        <h1 style="font-size:22px;font-weight:500;color:#0F172A;margin-bottom:8px">${isTR ? `Tebrikler, ${name}! 🎉` : `Congratulations, ${name}! 🎉`}</h1>
        <p style="color:#475569;font-size:14px;line-height:1.6">
          ${isTR
            ? "ShapeBazaar yazıcı ortağı başvurunuz onaylandı. Artık sipariş havuzundan baskı alabilirsiniz."
            : "Your ShapeBazaar print partner application has been approved. You can now claim jobs from the order pool."}
        </p>
        <a href="${partnerUrl}" style="display:inline-block;margin-top:16px;background:#10B981;color:#fff;padding:10px 20px;border-radius:10px;text-decoration:none;font-size:13px;font-weight:500">
          ${isTR ? "Sipariş Havuzuna Git →" : "Go to Order Pool →"}
        </a>
        <p style="color:#94A3B8;font-size:12px;margin-top:32px">ShapeBazaar · Print Farm Network</p>
      </div>
    `,
  });
}

export async function sendModelApproval({
  to, designerName, modelTitle, modelId, locale = "tr",
}: {
  to: string; designerName: string; modelTitle: string; modelId: string; locale?: string;
}) {
  const isTR = locale === "tr";
  const modelUrl = `https://shapebazaar.com/${locale}/models/${modelId}`;
  return resend.emails.send({
    from: FROM, to,
    subject: isTR ? `Modeliniz yayınlandı — ${modelTitle}` : `Your model is live — ${modelTitle}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
        <h1 style="font-size:22px;font-weight:500;color:#0F172A;margin-bottom:8px">${isTR ? "Modeliniz yayında! ✓" : "Your model is live! ✓"}</h1>
        <p style="color:#475569;font-size:14px">${isTR ? `Merhaba ${designerName},` : `Hello ${designerName},`}</p>
        <p style="color:#475569;font-size:14px;line-height:1.6">
          ${isTR
            ? `<strong>${modelTitle}</strong> modeliniz incelendi ve ShapeBazaar'da yayınlandı.`
            : `<strong>${modelTitle}</strong> has been reviewed and published on ShapeBazaar.`}
        </p>
        <a href="${modelUrl}" style="display:inline-block;margin-top:16px;background:#FF6B35;color:#fff;padding:10px 20px;border-radius:10px;text-decoration:none;font-size:13px;font-weight:500">
          ${isTR ? "Modeli Görüntüle →" : "View Model →"}
        </a>
        <p style="color:#94A3B8;font-size:12px;margin-top:32px">ShapeBazaar · Print Farm Network</p>
      </div>
    `,
  });
}



