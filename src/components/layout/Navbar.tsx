"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Sun, Moon, Globe, Menu, X, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface NavbarProps {
  user?: { email: string; full_name?: string } | null;
}

export function Navbar({ user: initialUser }: NavbarProps) {
  const t        = useTranslations("nav");
  const pathname = usePathname();
  const router   = useRouter();

  const locale      = pathname.split("/")[1] || "tr";
  const otherLocale = locale === "tr" ? "en" : "tr";

  const [isDark,     setIsDark]     = useState(false);
  const [scrolled,   setScrolled]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user,       setUser]       = useState<SupabaseUser | null>(null);
  const [authReady,  setAuthReady]  = useState(false);

  useEffect(() => {
    // Tema
    setIsDark(document.documentElement.classList.contains("dark"));

    // Scroll
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);

    // Auth state - Supabase session'ı dinle
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
    });

    return () => {
      window.removeEventListener("scroll", onScroll);
      subscription.unsubscribe();
    };
  }, []);

  function toggleTheme() {
    const dark = document.documentElement.classList.toggle("dark");
    setIsDark(dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }

  function switchLocale() {
    const segments = pathname.split("/");
    segments[1]    = otherLocale;
    router.push(segments.join("/"));
  }

  const links = [
    { href: `/${locale}/models`,         label: t("models")        },
    { href: `/${locale}/how-it-works`,   label: t("howItWorks")    },
    { href: `/${locale}/become-partner`, label: t("becomePartner") },
    { href: `/${locale}/designers`,      label: t("designers")     },
  ];

  const isLoggedIn = authReady && !!user;

  return (
    <>
      <header className={`sticky top-0 z-50 w-full transition-all duration-200 ${
        scrolled
          ? "bg-[var(--bg-primary)]/90 backdrop-blur-md border-b border-[var(--border)]"
          : "bg-[var(--bg-primary)] border-b border-[var(--border)]"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

          {/* Logo */}
          <Link href={`/${locale}`} className="flex items-center gap-1 shrink-0">
            <span className="text-lg font-semibold tracking-tight">
              <span className="text-[#FF6B35]">Shape</span>
              <span className="text-[var(--text-primary)]">Bazaar</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {links.map((link) => (
              <Link key={link.href} href={link.href}
                className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-3 py-1.5 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors">
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Lang toggle */}
            <button onClick={switchLocale}
              className="hidden sm:flex items-center gap-1 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] border border-[var(--border)] rounded-full px-2.5 py-1 transition-colors">
              <Globe size={12} />
              {otherLocale.toUpperCase()}
            </button>

            {/* Theme toggle */}
            <button onClick={toggleTheme}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
              aria-label="Toggle theme">
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Auth state */}
            {!authReady ? (
              <div className="w-8 h-8 rounded-full bg-[var(--bg-tertiary)] animate-pulse" />
            ) : isLoggedIn ? (
              <Link href={`/${locale}/dashboard`}>
                <button className="w-8 h-8 flex items-center justify-center rounded-full bg-[rgba(255,107,53,0.12)] text-[#FF6B35] transition-colors hover:bg-[rgba(255,107,53,0.2)]">
                  <User size={14} />
                </button>
              </Link>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link href={`/${locale}/auth/login`}
                  className="text-xs px-3 py-1.5 h-8 rounded-lg border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors">
                  {t("signIn")}
                </Link>
                <Link href={`/${locale}/auth/register`}
                  className="text-xs px-3 py-1.5 h-8 rounded-lg bg-[#FF6B35] text-white hover:bg-[#e85e2a] transition-colors font-medium">
                  {t("signUp")}
                </Link>
              </div>
            )}

            {/* Mobile toggle */}
            <button
              className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
              onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden pt-14">
          <div className="absolute inset-0 bg-black/20" onClick={() => setMobileOpen(false)} />
          <div className="absolute top-14 left-0 right-0 bg-[var(--bg-primary)] border-b border-[var(--border)] p-4 flex flex-col gap-2">
            {links.map((link) => (
              <Link key={link.href} href={link.href}
                className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-3 py-2 rounded-xl hover:bg-[var(--bg-secondary)] transition-colors"
                onClick={() => setMobileOpen(false)}>
                {link.label}
              </Link>
            ))}
            <div className="border-t border-[var(--border)] pt-3 mt-1 flex gap-2">
              {isLoggedIn ? (
                <Link href={`/${locale}/dashboard`}
                  className="flex-1 text-center text-sm px-4 py-2 h-9 rounded-xl bg-[#FF6B35] text-white hover:bg-[#e85e2a] transition-colors font-medium">
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link href={`/${locale}/auth/login`}
                    className="flex-1 text-center text-sm px-4 py-2 h-9 rounded-xl border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors">
                    {t("signIn")}
                  </Link>
                  <Link href={`/${locale}/auth/register`}
                    className="flex-1 text-center text-sm px-4 py-2 h-9 rounded-xl bg-[#FF6B35] text-white hover:bg-[#e85e2a] transition-colors font-medium">
                    {t("signUp")}
                  </Link>
                </>
              )}
            </div>
            <button onClick={switchLocale}
              className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] border border-[var(--border)] rounded-full px-3 py-1.5 w-fit">
              <Globe size={12} />
              {otherLocale === "en" ? "English" : "Türkçe"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
