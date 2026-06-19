import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code   = searchParams.get("code");
  const next   = searchParams.get("next") ?? "/";
  // URL'deki locale'i al (örn: /en/auth/callback → "en")
  const locale = request.url.match(/\/(tr|en)\//)?.[1] ?? "tr";

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