import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { BecomePartnerClient } from "@/components/partner/BecomePartnerClient";

export default function BecomePartnerPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <BecomePartnerClient />
      </main>
      <Footer />
    </div>
  );
}
