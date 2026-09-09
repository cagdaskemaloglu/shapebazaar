import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Bu endpoint Vercel Cron tarafından her saat çağrılır ----
// vercel.json: { "crons": [{ "path": "/api/cron/reset-print-jobs", "schedule": "0 * * * *" }] }

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = await createClient();
    const now = new Date().toISOString();

    // 1. Süresi dolmuş "claimed" job'ları sıfırla
    const { data: resetClaimed, error: err1 } = await supabase
      .from("print_jobs")
      .update({
        status:     "available",
        printer_id: null,
        claimed_at: null,
        deadline:   null,
      })
      .eq("status", "claimed")
      .lt("deadline", now)
      .select("id");

    if (err1) throw err1;

    // 2. "printing" statüsünde olup deadline'ı geçmiş job'ları sıfırla
    //    (partner "Baskıya Al" basıp kargo girmeden bırakmış)
    const { data: resetPrinting, error: err2 } = await supabase
      .from("print_jobs")
      .update({
        status:     "available",
        printer_id: null,
        claimed_at: null,
        deadline:   null,
      })
      .eq("status", "printing")
      .lt("deadline", now)
      .select("id");

    if (err2) throw err2;

    // 3. "done" işaretlenmiş ama 48 saat içinde kargo no girilmemiş job'ları sıfırla
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const { data: staleDone, error: err3 } = await supabase
      .from("print_jobs")
      .select("id, order_id, printed_at")
      .eq("status", "done")
      .lt("printed_at", fortyEightHoursAgo);

    if (err3) throw err3;

    let resetDone = 0;
    for (const job of staleDone ?? []) {
      // Siparişin kargo no'su var mı kontrol et
      const { data: order } = await supabase
        .from("orders")
        .select("tracking_number")
        .eq("id", job.order_id)
        .single();

      if (!order?.tracking_number) {
        // Kargo girilmemiş — havuza geri döndür
        await supabase
          .from("print_jobs")
          .update({
            status:     "available",
            printer_id: null,
            claimed_at: null,
            deadline:   null,
            printed_at: null,
          })
          .eq("id", job.id);
        resetDone++;
      }
    }

    const totalReset = (resetClaimed?.length ?? 0) + (resetPrinting?.length ?? 0) + resetDone;
    console.log(`[CRON] Reset: ${resetClaimed?.length ?? 0} claimed, ${resetPrinting?.length ?? 0} printing, ${resetDone} done-without-cargo`);

    return NextResponse.json({
      success:        true,
      resetClaimed:   resetClaimed?.length ?? 0,
      resetPrinting:  resetPrinting?.length ?? 0,
      resetDone,
      totalReset,
      at:             now,
    });
  } catch (err) {
    console.error("[CRON] reset-print-jobs error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}