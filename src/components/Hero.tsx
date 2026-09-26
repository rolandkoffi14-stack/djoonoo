import Link from "next/link";
import { ArrowRight, Smartphone, CheckCircle2, ShieldCheck, Zap } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
      {/* Fond subtil sans orbes flous ni gradients criards */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge officiel de provenance */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(193,101,45,0.25)] bg-[#F5EAE3] px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-[#C1652D] mb-8">
            <span className="flex h-2 w-2 rounded-full bg-[#C1652D]" />
            <span>SaaS béninois • 14 jours d'essai sans carte bancaire</span>
          </div>

          {/* Slogan officiel (Section 0) */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#2B2119] leading-[1.15]">
            Ta boutique, à portée de main{" "}
            <span className="text-[#C1652D] block sm:inline">— où que tu sois.</span>
          </h1>

          {/* Proposition de valeur officielle (Section 0) */}
          <p className="mt-6 text-lg sm:text-xl leading-relaxed text-[#6B5C52] max-w-2xl mx-auto">
            <strong className="font-semibold text-[#2B2119]">djoonoo</strong> voit ta boutique pour
            toi. Ventes, stock, impayés — en un coup d'œil sur ton smartphone ou ton ordinateur.
          </p>

          {/* Boutons d'appel à l'action */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/inscription"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 rounded-lg bg-[#C1652D] px-7 py-3.5 text-base font-semibold text-[#FAF6F1] shadow-[0_2px_8px_rgba(193,101,45,0.25)] hover:bg-[#A85422] active:scale-[0.98] transition-all min-h-[48px] focus-visible:ring-2 focus-visible:ring-[#C1652D]"
            >
              <span>Commencer mon essai gratuit</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="#demonstration"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-[rgba(43,33,25,0.2)] bg-[#FAF6F1] px-6 py-3.5 text-base font-semibold text-[#2B2119] hover:bg-[#F3ECE2] transition-colors min-h-[48px] focus-visible:ring-2 focus-visible:ring-[#C1652D]"
            >
              <span>Tester la démo en direct</span>
            </Link>
          </div>

          {/* Bénéfices tangibles et réalités locales */}
          <div className="mt-12 pt-8 border-t border-[rgba(43,33,25,0.08)] grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-[#1E7E34] shrink-0" />
              <span className="text-xs sm:text-sm font-medium text-[#2B2119]">
                100% Francs CFA (sans centimes)
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <Smartphone className="h-5 w-5 text-[#C1652D] shrink-0" />
              <span className="text-xs sm:text-sm font-medium text-[#2B2119]">
                MTN MoMo, Moov & Espèces
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <Zap className="h-5 w-5 text-[#C1652D] shrink-0" />
              <span className="text-xs sm:text-sm font-medium text-[#2B2119]">
                Saisie vente en moins de 30s
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="h-5 w-5 text-[#1E7E34] shrink-0" />
              <span className="text-xs sm:text-sm font-medium text-[#2B2119]">
                2FA & données isolées
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
