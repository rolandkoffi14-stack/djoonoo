import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-montserrat",
  display: "swap",
});

import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: `${siteConfig.app.nom} · ${siteConfig.app.slogan.toLowerCase()}`,
  description: siteConfig.app.description,
  icons: {
    icon: siteConfig.app.logos.favicon,
    apple: siteConfig.app.logos.appleTouchIcon,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${montserrat.variable} h-full antialiased`} suppressHydrationWarning>
      <body
        className="min-h-full flex flex-col font-sans selection:bg-[#C1652D] selection:text-[#FAF6F1]"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
