import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "djoonoo — ta boutique, à portée de main",
  description:
    "djoonoo voit ta boutique pour toi. Ventes, stock, impayés — en un coup d'œil, où que tu sois.",
  icons: {
    icon: "/brand/03_web_pwa/favicon.ico",
    apple: "/brand/03_web_pwa/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${montserrat.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans selection:bg-[#C1652D] selection:text-[#FAF6F1]">
        {children}
      </body>
    </html>
  );
}
