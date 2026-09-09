import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { UploadPageClient } from "@/components/upload/UploadPageClient";

export default function UploadPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <UploadPageClient />
      </main>
      <Footer />
    </div>
  );
}
