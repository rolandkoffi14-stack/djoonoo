import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import InteractiveDemo from "@/components/InteractiveDemo";
import Features from "@/components/Features";
import Pricing from "@/components/Pricing";
import SecuritySection from "@/components/SecuritySection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAF6F1]">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <InteractiveDemo />
        <Features />
        <Pricing />
        <SecuritySection />
      </main>
      <Footer />
    </div>
  );
}
