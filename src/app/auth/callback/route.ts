import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.exchangeCodeForSession(code);

    // Google OAuth ile gelen kullanıcının region'ı var mı kontrol et
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("region")
        .eq("id", user.id)
        .single();

      // Region yoksa veya default TR değilse onboarding'e yönlendir
      // (Google ile ilk kez giriş yapanlar için)
      const isNewUser = !profile?.region || profile.region === "TR";
      const isGoogleUser = user.app_metadata?.provider === "google";

      if (isGoogleUser && isNewUser && next !== "/onboarding") {
        return NextResponse.redirect(`${origin}/onboarding`);
      }
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}