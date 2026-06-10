import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
import { sendPartnerApproval } from "@/lib/email/resend";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    const supabase   = await createClient();

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .single();

    const { data: authUser } = await supabase.auth.admin.getUserById(userId);

    if (authUser?.user?.email) {
      await sendPartnerApproval({
        to:   authUser.user.email,
        name: profile?.full_name ?? "Ortak",
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false });
  }
}
