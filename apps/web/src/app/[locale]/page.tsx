import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ModelsPageClient } from "@/components/models/ModelsPageClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isTR = locale === "tr";
  return {
    title: isTR ? "ShapeBazaar — 3D Modeller" : "ShapeBazaar — 3D Models",
    description: isTR
      ? "ShapeBazaar'da yüzlerce 3D baskı modeli keşfedin. Kategoriye, fiyata ve puana göre filtreleyin."
      : "Browse hundreds of 3D print models on ShapeBazaar. Filter by category, price and rating.",
    openGraph: {
      title: isTR ? "ShapeBazaar — 3D Modeller" : "ShapeBazaar — 3D Models",
      description: isTR
        ? "ShapeBazaar'da yüzlerce 3D baskı modeli keşfedin."
        : "Browse hundreds of 3D print models on ShapeBazaar.",
      url: `https://www.shapebazaar.com/${locale}`,
      siteName: "ShapeBazaar",
      images: [{ url: "https://www.shapebazaar.com/logo.png", width: 800, height: 600 }],
    },
    alternates: {
      canonical: `https://www.shapebazaar.com/${locale}`,
      languages: {
        "tr": "https://www.shapebazaar.com/tr",
        "en": "https://www.shapebazaar.com/en",
      },
    },
  };
}

export default function HomePage() {
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
