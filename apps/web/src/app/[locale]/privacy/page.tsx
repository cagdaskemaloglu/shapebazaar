import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useTranslations, useLocale } from "next-intl";

export const metadata = {
  title: "Privacy Policy | ShapeBazaar",
};

interface PolicySection {
  title: string;
  body?: string[];
  list?: string[];
  link?: { href: string; label: string };
}

export default function PrivacyPage() {
  const t      = useTranslations("privacy");
  const locale = useLocale();
  const sections = t.raw("sections") as PolicySection[];

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

            {/* Bölümler: messages/*.json → privacy.sections (başlık, paragraflar, madde listesi, isteğe bağlı bağlantı) */}
            {sections.map((section, i) => (
              <div key={i} className="mb-10">
                <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">{section.title}</h2>
                {section.body?.map((paragraph, j) => (
                  <p key={j} className="text-slate-600 dark:text-slate-300 leading-relaxed mb-3">{paragraph}</p>
                ))}
                {section.list && (
                  <ul className="list-disc pl-6 space-y-2 text-slate-600 dark:text-slate-300 leading-relaxed">
                    {section.list.map((item, j) => <li key={j}>{item}</li>)}
                  </ul>
                )}
                {section.link && (
                  <p className="mt-4">
                    <a
                      href={`/${locale}${section.link.href}`}
                      className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                    >
                      {section.link.label}
                    </a>
                  </p>
                )}
              </div>
            ))}

            {/* Contact */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 mt-12">
              <h3 className="font-bold mb-2">{t("contactTitle")}</h3>
              <p className="text-slate-600 dark:text-slate-300">
                {t("contactText")}{" "}
                <a
                  href={`/${locale}/contact`}
                  className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                >
                  {t("contactLink")}
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
