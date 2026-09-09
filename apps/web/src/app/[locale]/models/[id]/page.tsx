import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ModelDetailClient } from "@/components/models/ModelDetailClient";
import { createClient } from "@/lib/supabase/server";

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const supabase = await createClient();

  const { data: model } = await supabase
    .from("models")
    .select("title, description, thumbnail_url, base_price, is_free, file_format, designer:profiles(full_name, username)")
    .eq("id", id)
    .single();

  if (!model) {
    return { title: locale === "tr" ? "Model Bulunamadı" : "Model Not Found" };
  }

  const designerName = (model.designer as any)?.username
    ? `@${(model.designer as any).username}`
    : (model.designer as any)?.full_name ?? "ShapeBazaar";

  const title = model.title;
  const description = model.description
    ? model.description.slice(0, 155)
    : locale === "tr"
      ? `${model.title} — ShapeBazaar'da ${model.is_free ? "ücretsiz" : `₺${model.base_price}`} fiyatıyla ${model.file_format.toUpperCase()} formatında 3D baskı modeli. Tasarımcı: ${designerName}`
      : `${model.title} — ${model.is_free ? "Free" : `$${(model.base_price / 32).toFixed(2)}`} 3D print model in ${model.file_format.toUpperCase()} format on ShapeBazaar. Designer: ${designerName}`;

  const url = `https://www.shapebazaar.com/${locale}/models/${id}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: "website",
      siteName: "ShapeBazaar",
      images: model.thumbnail_url
        ? [{ url: model.thumbnail_url, width: 800, height: 600, alt: title }]
        : [{ url: "https://www.shapebazaar.com/logo.png", width: 800, height: 600, alt: "ShapeBazaar" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: model.thumbnail_url ? [model.thumbnail_url] : [],
    },
    alternates: {
      canonical: url,
      languages: {
        "tr": `https://www.shapebazaar.com/tr/models/${id}`,
        "en": `https://www.shapebazaar.com/en/models/${id}`,
      },
    },
  };
}

export default async function ModelDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <ModelDetailClient modelId={id} />
      </main>
      <Footer />
    </div>
  );
}