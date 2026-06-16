import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useTranslations } from "next-intl";

export const metadata = {
  title: "Privacy Policy | ShapeBazaar",
};

export default function PrivacyPage() {
  const t = useTranslations("privacy");

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4 text-slate-900 dark:text-white">
              {t("title")}
            </h1>
            <p className="text-slate-600 dark:text-slate-300">
              {t("lastUpdated")}
            </p>
          </div>
        </section>

        {/* Content Section */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
          <div className="prose dark:prose-invert max-w-none">
            <p className="text-lg text-slate-600 dark:text-slate-300 mb-8">
              {t("intro")}
            </p>

            {/* Section 1 */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">
                {t("section1")}
              </h2>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                {t("section1Content")}
              </p>
            </div>

            {/* Section 2 */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">
                {t("section2")}
              </h2>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                {t("section2Content")}
              </p>
            </div>

            {/* Section 3 */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">
                {t("section3")}
              </h2>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                {t("section3Content")}
              </p>
            </div>

            {/* Section 4 */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">
                {t("section4")}
              </h2>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                {t("section4Content")}
              </p>
            </div>

            {/* Section 5 */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">
                {t("section5")}
              </h2>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                {t("section5Content")}
              </p>
            </div>

            {/* Contact */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 mt-12">
              <h3 className="font-bold mb-2">Sorularınız mı var?</h3>
              <p className="text-slate-600 dark:text-slate-300">
                Gizlilik politikamız hakkında sorunuz varsa,{" "}
                <a
                  href="/contact"
                  className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                >
                  bize yazın
                </a>
                .
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
