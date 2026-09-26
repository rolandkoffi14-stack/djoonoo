import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function CtaFinal() {
  return (
    <section className="relative bg-[#C1652D] text-[#FAF6F1] py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#FAF6F1] max-w-3xl mx-auto leading-tight">
          Prêt à arrêter le cahier et les calculs à la main ?
        </h2>

        <p className="mt-4 text-base sm:text-lg text-[#FAF6F1]/90 max-w-xl mx-auto">
          Rejoins dès aujourd'hui les commerçants qui gagnent du temps et évitent les erreurs
          au quotidien avec djoonoo.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/inscription"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-xl bg-[#FAF6F1] px-8 py-4 text-base font-bold text-[#C1652D] shadow-[0_4px_16px_rgba(43,33,25,0.25)] hover:bg-[#F2EAE0] active:scale-[0.98] transition-all min-h-[48px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAF6F1]"
          >
            <span>Commencer mon essai gratuit</span>
            <ArrowRight className="h-5 w-5 text-[#C1652D]" />
          </Link>
        </div>

        <p className="mt-4 text-xs sm:text-sm text-[#FAF6F1]/80">
          14 jours d'essai gratuit · Sans carte bancaire · Sans engagement
        </p>
      </div>
    </section>
  );
}
