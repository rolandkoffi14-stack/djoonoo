import Link from "next/link";
import { ArrowRight, Banknote, Smartphone, Zap, Shield } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-10 pb-16 sm:pt-16 sm:pb-24 bg-[#FAF6F1]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge au-dessus du titre */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(43,33,25,0.12)] bg-[#F2EAE0] px-4 py-1.5 text-xs sm:text-sm font-medium text-[#2B2119] mb-8">
            <span className="h-2 w-2 rounded-full bg-[#C1652D]" />
            <span>SaaS de gestion de boutique · essai gratuit, sans carte bancaire</span>
          </div>

          {/* H1 : Slogan exact */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#2B2119] leading-[1.18]">
            Ta boutique, à portée de main,{" "}
            <span className="text-[#C1652D]">où que tu sois.</span>
          </h1>

          {/* Sous-titre : simple et concret */}
          <p className="mt-6 text-lg sm:text-xl leading-relaxed text-[#6B5C52] max-w-2xl mx-auto">
            <strong className="font-semibold text-[#2B2119]">djoonoo</strong> voit ta boutique pour
            toi. Enregistre tes ventes, surveille ton stock en temps réel et suis tes impayés
            sans calcul à la main, où que tu sois.
          </p>

          {/* Deux CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/inscription"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-lg bg-[#C1652D] px-7 py-3.5 text-base font-semibold text-[#FAF6F1] shadow-[0_2px_8px_rgba(193,101,45,0.25)] hover:bg-[#A85422] active:scale-[0.98] transition-all min-h-[48px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1652D]"
            >
              <span>Commencer mon essai gratuit</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="#demo"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg border border-[rgba(43,33,25,0.22)] bg-transparent px-6 py-3.5 text-base font-semibold text-[#2B2119] hover:bg-[rgba(43,33,25,0.04)] transition-colors min-h-[48px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1652D]"
            >
              <span>Voir la démo</span>
            </Link>
          </div>

          {/* 4 arguments de réassurance - Sans chevauchement */}
          <div className="mt-14 pt-8 border-t border-[rgba(43,33,25,0.1)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F5EDE3]/60 border border-[rgba(43,33,25,0.06)]">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FAF6F1] text-[#C1652D]">
                <Banknote className="h-5 w-5" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-[#2B2119] leading-snug">
                Paiement en Francs CFA, sans centimes à gérer
              </span>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F5EDE3]/60 border border-[rgba(43,33,25,0.06)]">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FAF6F1] text-[#C1652D]">
                <Smartphone className="h-5 w-5" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-[#2B2119] leading-snug">
                MTN Mobile Money, Moov Money et espèces acceptés
              </span>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F5EDE3]/60 border border-[rgba(43,33,25,0.06)]">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FAF6F1] text-[#C1652D]">
                <Zap className="h-5 w-5" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-[#2B2119] leading-snug">
                Enregistre une vente en moins de 30 secondes
              </span>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F5EDE3]/60 border border-[rgba(43,33,25,0.06)]">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FAF6F1] text-[#C1652D]">
                <Shield className="h-5 w-5" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-[#2B2119] leading-snug">
                Connexion sécurisée à double vérification
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
