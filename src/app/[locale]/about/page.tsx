import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useTranslations } from "next-intl";

export const metadata = {
  title: "About Us | ShapeBazaar",
};

export default function AboutPage() {
  const t = useTranslations("about");

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl font-bold mb-6 text-slate-900 dark:text-white">
              {t("title")}
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-300">
              {t("hero")}
            </p>
          </div>
        </section>

        {/* Intro Section */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
          <div className="prose dark:prose-invert max-w-none">
            <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed mb-8">
              {t("intro")}
            </p>
          </div>
        </section>

        {/* Values Grid */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-slate-900 dark:text-white">
            {t("vision_title")}
          </h2>
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-8 mb-12">
            <p className="text-lg text-slate-700 dark:text-slate-300">
              {t("vision_desc")}
            </p>
          </div>
        </section>

        {/* Team Section */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-6 text-slate-900 dark:text-white">
            {t("team_title")}
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-300">
            {t("team_desc")}
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
