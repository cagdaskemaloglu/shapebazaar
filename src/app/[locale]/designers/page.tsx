import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { DesignersPageClient } from "@/components/designers/DesignersPageClient";

export default function DesignersPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <DesignersPageClient />
      </main>
      <Footer />
    </div>
  );
}
