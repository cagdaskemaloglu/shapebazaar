import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Bu endpoint Vercel Cron tarafından her saat çağrılır
// vercel.json'a ekleyin:
// { "crons": [{ "path": "/api/cron/reset-print-jobs", "schedule": "0 * * * *" }] }

export async function GET(req: NextRequest) {
  // Yetkisiz erişimi engelle
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = await createClient();

    // Süresi dolmuş claimed job'ları sıfırla
    const { data, error } = await supabase
      .from("print_jobs")
      .update({
        status:     "available",
        printer_id: null,
        claimed_at: null,
        deadline:   null,
      })
      .eq("status", "claimed")
      .lt("deadline", new Date().toISOString())
      .select("id");

    if (error) throw error;

    const resetCount = data?.length ?? 0;
    console.log(`[CRON] ${resetCount} expired print job(s) reset to available.`);

    return NextResponse.json({
      success: true,
      reset:   resetCount,
      at:      new Date().toISOString(),
    });
  } catch (err) {
    console.error("[CRON] reset-print-jobs error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}