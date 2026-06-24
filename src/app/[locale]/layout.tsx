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
  description: "ShapeBazaar is where digital designs become real products. Designers, manufacturers and users meet on one platform.",
  keywords: ["3D print", "3D model", "print farm", "ShapeBazaar", "3D baskı", "3D model", "tasarım"],
  authors: [{ name: "ShapeBazaar", url: "https://www.shapebazaar.com" }],
  creator: "ShapeBazaar",
  metadataBase: new URL("https://www.shapebazaar.com"),
  openGraph: {
    type: "website",
    siteName: "ShapeBazaar",
    title: "ShapeBazaar — Print Farm Network",
    description: "ShapeBazaar is where digital designs become real products.",
    images: [{ url: "/logo.png", width: 800, height: 600, alt: "ShapeBazaar" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@shapebazaar",
    creator: "@shapebazaar",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
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