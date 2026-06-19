import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  console.log("[callback] origin:", origin, "code:", !!code);

  if (code) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.exchangeCodeForSession(code);

    console.log("[callback] user:", user?.id, "provider:", user?.app_metadata?.provider, "authError:", authError);

    if (user) {
      const isGoogleUser = user.app_metadata?.provider === "google";
      console.log("[callback] isGoogleUser:", isGoogleUser);

      if (isGoogleUser) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("region, onboarding_done")
          .eq("id", user.id)
          .single();

        console.log("[callback] profile:", profile, "profileError:", profileError);

        if (!profile?.onboarding_done) {
          console.log("[callback] → redirecting to /onboarding");
          return NextResponse.redirect(`${origin}/onboarding`);
        }
      }
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}