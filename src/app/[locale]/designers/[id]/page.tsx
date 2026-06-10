import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { DesignerProfileClient } from "@/components/designers/DesignerProfileClient";

export default async function DesignerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <DesignerProfileClient designerId={id} />
      </main>
      <Footer />
    </div>
  );
}
