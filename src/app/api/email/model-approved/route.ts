import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
import { sendModelApproval } from "@/lib/email/resend";

export async function POST(req: NextRequest) {
  try {
    const { modelId, modelTitle } = await req.json();
    const supabase = await createClient();

    const { data: model } = await supabase
      .from("models")
      .select("designer_id")
      .eq("id", modelId)
      .single();

    if (!model?.designer_id) return NextResponse.json({ ok: false });

    const { data: designer } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", model.designer_id)
      .single();

    const { data: authUser } = await supabase.auth.admin.getUserById(model.designer_id);

    if (authUser?.user?.email) {
      await sendModelApproval({
        to: authUser.user.email,
        designerName: designer?.full_name ?? "Tasarımcı",
        modelTitle,
        modelId,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false });
  }
}
