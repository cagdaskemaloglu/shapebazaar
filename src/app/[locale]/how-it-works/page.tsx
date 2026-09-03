import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { FeaturedViewer } from "@/components/home/FeaturedViewer";
import { ModelGrid } from "@/components/home/ModelGrid";
import { HowItWorks } from "@/components/home/HowItWorks";
import { RolesSection } from "@/components/home/RolesSection";
import { ValuesSection } from "@/components/home/ValuesSection";
import { ManifestoSection } from "@/components/home/ManifestoSection";
import { createClient } from "@/lib/supabase/server";
import { getTranslations, getLocale } from "next-intl/server";
import { Upload, Settings, CreditCard, Package } from "lucide-react";

export const metadata = {
  title: "How It Works | ShapeBazaar",
};

export default async function HowItWorksPage() {
  // Server-side'da kullanıcının region'ını çek (HeroSection için)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userRegion = "TR";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("region")
      .eq("id", user.id)
      .single();
    userRegion = profile?.region ?? "TR";
  }

  const t = await getTranslations("howItWorks");
  const locale = await getLocale();

  const steps = [
    { icon: Upload,   title: t("step1Title"), desc: t("step1Desc"), number: "01" },
    { icon: Settings, title: t("step2Title"), desc: t("step2Desc"), number: "02" },
    { icon: CreditCard, title: t("step3Title"), desc: t("step3Desc"), number: "03" },
    { icon: Package,  title: t("step4Title"), desc: t("step4Desc"), number: "04" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Eskiden anasayfada olan bölümler */}
        <HeroSection userRegion={userRegion} />
        <FeaturedViewer />
        <ModelGrid />
        <HowItWorks />
        <RolesSection />
        <ValuesSection />
        <ManifestoSection />

        {/* How It Works sayfasının kendi içeriği */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl font-bold mb-6 text-slate-900 dark:text-white">
              {t("pageTitle")}
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-300">
              {t("pageSubtitle")}
            </p>
          </div>
        </section>

        <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className="relative">
                  <div className="absolute -left-4 -top-4 text-6xl font-bold text-slate-200 dark:text-slate-700 opacity-50">
                    {step.number}
                  </div>
                  <div className="relative bg-white dark:bg-slate-800 rounded-lg p-8 shadow-sm hover:shadow-md transition-shadow">
                    <div className="mb-4 inline-block p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3 text-slate-900 dark:text-white">
                      {step.title}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-blue-600 dark:bg-blue-900">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              {t("ctaTitle")}
            </h2>
            <p className="text-blue-100 mb-8">
              {t("ctaSubtitle")}
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <a
                href={`/${locale}/upload`}
                className="px-8 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition"
              >
                {t("uploadCta")}
              </a>
              <a
                href={`/${locale}/models`}
                className="px-8 py-3 bg-blue-700 text-white font-semibold rounded-lg hover:bg-blue-800 transition"
              >
                {t("exploreCta")}
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}