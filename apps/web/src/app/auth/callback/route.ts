import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin, pathname } = new URL(request.url);
  const code   = searchParams.get("code");
  const next   = searchParams.get("next") ?? "/";
  // /en/auth/callback → "en", /tr/auth/callback → "tr"
  const locale = pathname.split("/")[1] === "en" ? "en" : "tr";

  if (code) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.exchangeCodeForSession(code);

    if (user) {
      const isGoogleUser = user.app_metadata?.provider === "google";

      if (isGoogleUser) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_done")
          .eq("id", user.id)
          .single();

        if (!profile?.onboarding_done) {
          return NextResponse.redirect(`${origin}/${locale}/onboarding`);
        }
      }
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}