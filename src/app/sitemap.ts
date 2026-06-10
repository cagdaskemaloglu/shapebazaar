import { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://shapebazaar.com";
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
    const { data: models } = await supabase
      .from("models")
      .select("id, updated_at")
      .eq("is_published", true)
      .limit(500);

    const modelUrls: MetadataRoute.Sitemap = (models ?? []).flatMap((m) =>
      locales.map((locale) => ({
        url: `${base}/${locale}/models/${m.id}`,
        lastModified: new Date(m.updated_at ?? Date.now()),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }))
    );

    return [...staticUrls, ...modelUrls];
  } catch {
    return staticUrls;
  }
}
