import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useTranslations } from "next-intl";
import { Upload, Settings, CreditCard, Package } from "lucide-react";

export const metadata = {
  title: "How It Works | ShapeBazaar",
};

export default function HowItWorksPage() {
  const t = useTranslations("howItWorks");

  const steps = [
    {
      icon: Upload,
      title: t("step1Title"),
      desc: t("step1Desc"),
      number: "01",
    },
    {
      icon: Settings,
      title: t("step2Title"),
      desc: t("step2Desc"),
      number: "02",
    },
    {
      icon: CreditCard,
      title: t("step3Title"),
      desc: t("step3Desc"),
      number: "03",
    },
    {
      icon: Package,
      title: t("step4Title"),
      desc: t("step4Desc"),
      number: "04",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero Section */}
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

        {/* Steps Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className="relative">
                  {/* Step number background */}
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

        {/* CTA Section */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-blue-600 dark:bg-blue-900">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to get started?
            </h2>
            <p className="text-blue-100 mb-8">
              Upload your design or explore models from our community
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <a
                href="/upload"
                className="px-8 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition"
              >
                Upload Design
              </a>
              <a
                href="/models"
                className="px-8 py-3 bg-blue-700 text-white font-semibold rounded-lg hover:bg-blue-800 transition"
              >
                Explore Models
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
