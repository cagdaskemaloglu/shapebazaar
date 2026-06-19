import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { FeaturedViewer } from "@/components/home/FeaturedViewer";
import { ModelGrid } from "@/components/home/ModelGrid";
import { HowItWorks } from "@/components/home/HowItWorks";
import { RolesSection } from "@/components/home/RolesSection";
import { ValuesSection } from "@/components/home/ValuesSection";
import { ManifestoSection } from "@/components/home/ManifestoSection";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  // Server-side'da kullanıcının region'ını çek
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userRegion = "TR";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("region")
      .eq("id", user.id)
      .single();
    userRegion = profile?.region ?? "TR";
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <HeroSection userRegion={userRegion} />
        <FeaturedViewer />
        <ModelGrid />
        <HowItWorks />
        <RolesSection />
        <ValuesSection />
        <ManifestoSection />
      </main>
      <Footer />
    </div>
  );
}