import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useTranslations } from "next-intl";
import { ArrowRight, BookOpen } from "lucide-react";

export const metadata = {
  title: "Blog | ShapeBazaar",
};

export default function BlogPage() {
  const t = useTranslations("blog");

  // Şu anda boş, ileride yazılar eklenecek
  const posts: any[] = [];

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
              {t("subtitle")}
            </p>
          </div>
        </section>

        {/* Empty State */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto flex-1 flex items-center justify-center">
          {posts.length === 0 ? (
            <div className="text-center">
              <div className="mb-6 inline-block p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <BookOpen className="w-12 h-12 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">
                Soon
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-300 mb-8">
                {t("noContent")}
              </p>
              <a
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
              >
                Back to Home <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-8 w-full">
              {posts.map((post, index) => (
                <article
                  key={index}
                  className="bg-white dark:bg-slate-800 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="bg-gradient-to-br from-blue-500 to-purple-600 h-48" />
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                        {post.category}
                      </span>
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {post.date}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">
                      {post.title}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-300 mb-4">
                      {post.excerpt}
                    </p>
                    <a
                      href={`/blog/${post.slug}`}
                      className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold hover:gap-3 transition-all"
                    >
                      {t("readMore")} <ArrowRight className="w-4 h-4" />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
