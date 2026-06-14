import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { CartDrawerProvider } from "@/components/cart/CartDrawerContext";
import { CartDrawer } from "@/components/cart/CartDrawer";
import "../globals.css";

export const metadata: Metadata = {
  title: {
    default: "ShapeBazaar — Print Farm Network",
    template: "%s | ShapeBazaar",
  },
  description: "ShapeBazaar is where digital designs become real products.",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="antialiased">
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>
            <CartDrawerProvider>
              {children}
              <CartDrawer />
            </CartDrawerProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}