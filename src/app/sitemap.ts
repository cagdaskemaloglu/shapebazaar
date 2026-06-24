import { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://www.shapebazaar.com";
  const locales = ["tr", "en"];

  const staticRoutes = [
    "", "/models", "/how-it-works", "/become-partner",
    "/designers", "/about", "/contact",
  ];

  const staticUrls: MetadataRoute.Sitemap = [];
  for (const locale of locales) {
    for (const route of staticRoutes) {
      staticUrls.push({
        url: `${base}/${locale}${route}`,
        lastModified: new Date(),
        changeFrequency: route === "" ? "daily" : "weekly",
        priority: route === "" ? 1 : 0.8,
        alternates: {
          languages: {
            tr: `${base}/tr${route}`,
            en: `${base}/en${route}`,
          },
        },
      });
    }
  }

  try {
    const supabase = await createClient();

    // Model URL'leri
    const { data: models } = await supabase
      .from("models")
      .select("id, updated_at")
      .eq("is_published", true)
      .limit(1000);

    const modelUrls: MetadataRoute.Sitemap = (models ?? []).flatMap((m) =>
      locales.map((locale) => ({
        url: `${base}/${locale}/models/${m.id}`,
        lastModified: new Date(m.updated_at ?? Date.now()),
        changeFrequency: "weekly" as const,
        priority: 0.7,
        alternates: {
          languages: {
            tr: `${base}/tr/models/${m.id}`,
            en: `${base}/en/models/${m.id}`,
          },
        },
      }))
    );

    // Tasarımcı profil URL'leri
    const { data: designers } = await supabase
      .from("profiles")
      .select("id, updated_at")
      .not("username", "is", null)
      .limit(500);

    const designerUrls: MetadataRoute.Sitemap = (designers ?? []).flatMap((d) =>
      locales.map((locale) => ({
        url: `${base}/${locale}/designers/${d.id}`,
        lastModified: new Date(d.updated_at ?? Date.now()),
        changeFrequency: "weekly" as const,
        priority: 0.6,
        alternates: {
          languages: {
            tr: `${base}/tr/designers/${d.id}`,
            en: `${base}/en/designers/${d.id}`,
          },
        },
      }))
    );

    return [...staticUrls, ...modelUrls, ...designerUrls];
  } catch {
    return staticUrls;
  }
}