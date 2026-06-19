import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.exchangeCodeForSession(code);

    if (user) {
      const isGoogleUser = user.app_metadata?.provider === "google";

      if (isGoogleUser) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("region, onboarding_done")
          .eq("id", user.id)
          .single();

        // onboarding_done flag'i yoksa ilk girişte onboarding'e yönlendir
        if (!profile?.onboarding_done) {
          return NextResponse.redirect(`${origin}/onboarding`);
        }
      }
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}