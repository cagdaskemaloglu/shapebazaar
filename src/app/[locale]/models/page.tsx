import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ModelsPageClient } from "@/components/models/ModelsPageClient";

export default function ModelsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <ModelsPageClient />
      </main>
      <Footer />
    </div>
  );
}
