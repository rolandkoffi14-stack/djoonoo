import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import InteractiveDemo from "@/components/InteractiveDemo";
import Features from "@/components/Features";
import Pricing from "@/components/Pricing";
import SecuritySection from "@/components/SecuritySection";
import CtaFinal from "@/components/CtaFinal";
import Footer from "@/components/Footer";
import { getForfaitsCatalogue, getPlateformeParametres } from "@/lib/plateforme-config";

export const revalidate = 60; // Revalidation ISR toutes les 60 secondes pour refléter immédiatement les modifs BDD

export default async function Home() {
  const [forfaits, { dureeEssaiJours }] = await Promise.all([
    getForfaitsCatalogue(),
    getPlateformeParametres(),
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF6F1]">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <InteractiveDemo />
        <Features />
        <Pricing forfaits={forfaits} dureeEssaiJours={dureeEssaiJours} />
        <SecuritySection />
        <CtaFinal dureeEssaiJours={dureeEssaiJours} />
      </main>
      <Footer />
    </div>
  );
}
