import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useTranslations } from "next-intl";
import { Heart, Target, Zap, Users } from "lucide-react";

export const metadata = {
  title: "Mission & Vision | ShapeBazaar",
};

export default function MissionVisionPage() {
  const t = useTranslations("mission");

  const values = [
    {
      icon: Heart,
      title: t("value1"),
      desc: t("value1Desc"),
    },
    {
      icon: Users,
      title: t("value2"),
      desc: t("value2Desc"),
    },
    {
      icon: Target,
      title: t("value3"),
      desc: t("value3Desc"),
    },
    {
      icon: Zap,
      title: t("value4"),
      desc: t("value4Desc"),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-slate-900 dark:to-slate-800">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl font-bold mb-6 text-slate-900 dark:text-white">
              {t("title")}
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-300">
              Birliktebüyüyüyoruz. Adil kazanç. Sürdürülebilir gelecek.
            </p>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6 text-slate-900 dark:text-white">
                {t("missionTitle")}
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                {t("missionDesc")}
              </p>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-12 text-white flex items-center justify-center h-64">
              <p className="text-2xl font-bold text-center">
                Her ideaya fiziksel biçim vermek
              </p>
            </div>
          </div>
        </section>

        {/* Vision Section */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-12 text-white flex items-center justify-center h-64">
              <p className="text-2xl font-bold text-center">
                Merkezi olmayan, açık bir ağ
              </p>
            </div>
            <div className="order-1 md:order-2">
              <h2 className="text-3xl font-bold mb-6 text-slate-900 dark:text-white">
                {t("visionTitle")}
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                {t("visionDesc")}
              </p>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-800">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4 text-slate-900 dark:text-white">
                {t("valuesTitle")}
              </h2>
              <p className="text-slate-600 dark:text-slate-300 text-lg">
                ShapeBazaar'ı rehber eden ilkeler
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {values.map((value, index) => {
                const Icon = value.icon;
                return (
                  <div
                    key={index}
                    className="bg-white dark:bg-slate-700 rounded-lg p-8 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="mb-4 inline-block p-3 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-lg">
                      <Icon className="w-6 h-6 text-gradient-to-r from-blue-600 to-purple-600 dark:text-purple-400" />
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">
                      {value.title}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      {value.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4 text-slate-900 dark:text-white">
            Bu misyonun parçası olmak ister misin?
          </h2>
          <p className="text-slate-600 dark:text-slate-300 mb-8 text-lg">
            Tasarımcı, üretici veya müşteri olarak bize katıl
          </p>
          <a
            href="/become-partner"
            className="inline-block px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
          >
            Partnerimiz ol
          </a>
        </section>
      </main>
      <Footer />
    </div>
  );
}
