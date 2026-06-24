import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { DesignerProfileClient } from "@/components/designers/DesignerProfileClient";
import { createClient } from "@/lib/supabase/server";

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, username, bio, avatar_url, city")
    .eq("id", id)
    .single();

  if (!profile) {
    return { title: locale === "tr" ? "Tasarımcı Bulunamadı" : "Designer Not Found" };
  }

  const name = profile.username ? `@${profile.username}` : profile.full_name ?? "Designer";
  const title = locale === "tr" ? `${name} — Tasarımcı` : `${name} — Designer`;
  const description = profile.bio
    ? profile.bio.slice(0, 155)
    : locale === "tr"
      ? `${name}, ShapeBazaar'da 3D model tasarımcısı.${profile.city ? ` ${profile.city} merkezli.` : ""}`
      : `${name} is a 3D model designer on ShapeBazaar.${profile.city ? ` Based in ${profile.city}.` : ""}`;

  const url = `https://www.shapebazaar.com/${locale}/designers/${id}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: "profile",
      siteName: "ShapeBazaar",
      images: profile.avatar_url
        ? [{ url: profile.avatar_url, width: 400, height: 400, alt: name }]
        : [{ url: "https://www.shapebazaar.com/logo.png", width: 800, height: 600, alt: "ShapeBazaar" }],
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: profile.avatar_url ? [profile.avatar_url] : [],
    },
    alternates: {
      canonical: url,
      languages: {
        "tr": `https://www.shapebazaar.com/tr/designers/${id}`,
        "en": `https://www.shapebazaar.com/en/designers/${id}`,
      },
    },
  };
}

export default async function DesignerProfilePage({ params }: Props) {
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