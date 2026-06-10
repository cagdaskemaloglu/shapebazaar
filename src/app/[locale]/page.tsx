import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { FeaturedViewer } from "@/components/home/FeaturedViewer";
import { ModelGrid } from "@/components/home/ModelGrid";
import { HowItWorks } from "@/components/home/HowItWorks";
import { RolesSection } from "@/components/home/RolesSection";
import { ValuesSection } from "@/components/home/ValuesSection";
import { ManifestoSection } from "@/components/home/ManifestoSection";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <HeroSection />
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
