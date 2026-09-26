import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface Forfait {
  id: string;
  nom: string;
  prix: number;
  badge?: string;
  description: string;
  boutiques: string;
  employes: string;
  avantages: string[];
}

const FORFAITS: Forfait[] = [
  {
    id: "solo",
    nom: "Solo",
    prix: 5000,
    description: "Idéal pour le commerçant indépendant gérant une boutique unique.",
    boutiques: "1 boutique",
    employes: "1 employé inclus",
    avantages: [
      "1 boutique unique",
      "1 compte employé (gérant ou vendeur)",
      "Gestion complète du stock et alertes",
      "Émission de factures numérotées",
      "Suivi des impayés et créances clients",
      "Rapports de ventes quotidiens",
    ],
  },
  {
    id: "reseau",
    nom: "Réseau",
    prix: 15000,
    badge: "Recommandé",
    description: "Pour les commerces en développement avec plusieurs points de vente.",
    boutiques: "Jusqu'à 3 boutiques",
    employes: "Jusqu'à 5 employés par boutique",
    avantages: [
      "Jusqu'à 3 boutiques distinctes",
      "Jusqu'à 5 employés par boutique",
      "Base de clients unifiée entre boutiques",
      "Transferts d'employés avec historique intact",
      "Rapports consolidés ou boutique par boutique",
      "Sécurité à double vérification incluse",
    ],
  },
  {
    id: "empire",
    nom: "Empire",
    prix: 35000,
    description: "Pour les grossistes, demi-grossistes et grands réseaux commerciaux.",
    boutiques: "Boutiques illimitées",
    employes: "Employés illimités",
    avantages: [
      "Nombre de boutiques illimité",
      "Nombre d'employés illimité",
      "Volume de ventes et produits sans restriction",
      "Historique et traçabilité de toutes les actions",
      "Rapprochement immédiat des clients par téléphone",
      "Assistance prioritaire 2KR DIGITAL",
    ],
  },
];

export default function Pricing() {
  return (
    <section id="tarifs" className="py-20 sm:py-28 bg-[#FAF6F1] border-t border-[rgba(43,33,25,0.08)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(193,101,45,0.2)] bg-[#F5EDE3] px-3.5 py-1 text-xs font-semibold text-[#C1652D] mb-3">
            <span>Tarifs en Francs CFA</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#2B2119]">
            Choisis la formule adaptée à ton commerce
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#6B5C52]">
            Commence par <strong>14 jours d'essai gratuit</strong>, sans engagement.
          </p>
        </div>

        {/* 3 cartes de tarifs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {FORFAITS.map((forfait) => {
            const isFeatured = Boolean(forfait.badge);

            return (
              <div
                key={forfait.id}
                className={`relative flex flex-col justify-between rounded-2xl p-7 sm:p-8 transition-all ${
                  isFeatured
                    ? "border-2 border-[#C1652D] bg-[#F5EDE3]/70 shadow-[0_4px_20px_rgba(193,101,45,0.12)]"
                    : "border border-[rgba(43,33,25,0.12)] bg-[#FAF6F1] hover:border-[rgba(43,33,25,0.22)]"
                }`}
              >
                <div>
                  {forfait.badge && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="rounded-full bg-[#C1652D] px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#FAF6F1] shadow-sm">
                        {forfait.badge}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-4 mb-3">
                    <h3 className="text-xl font-bold text-[#2B2119]">{forfait.nom}</h3>
                    <div className="text-right">
                      <span className="text-2xl sm:text-3xl font-bold text-[#2B2119]">
                        {forfait.prix.toLocaleString("fr-FR")}
                      </span>
                      <span className="text-xs font-semibold text-[#6B5C52] ml-1">FCFA/mois</span>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-[#6B5C52] leading-relaxed mb-6">
                    {forfait.description}
                  </p>

                  <div className="rounded-xl border border-[rgba(43,33,25,0.08)] bg-[#FAF6F1] p-3 text-xs mb-6 space-y-1">
                    <div className="flex justify-between font-semibold text-[#2B2119]">
                      <span className="text-[#6B5C52]">Boutiques :</span>
                      <span>{forfait.boutiques}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-[#2B2119]">
                      <span className="text-[#6B5C52]">Équipe :</span>
                      <span>{forfait.employes}</span>
                    </div>
                  </div>

                  <ul className="space-y-3 text-xs sm:text-sm text-[#2B2119] mb-8">
                    {forfait.avantages.map((avantage, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#C1652D] shrink-0" />
                        <span className="leading-snug">{avantage}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Link
                  href="/inscription"
                  className={`w-full inline-flex items-center justify-center gap-2 rounded-xl py-3.5 px-6 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1652D] ${
                    isFeatured
                      ? "bg-[#C1652D] text-[#FAF6F1] shadow-[0_2px_8px_rgba(193,101,45,0.25)] hover:bg-[#A85422] active:scale-[0.98]"
                      : "border border-[rgba(43,33,25,0.22)] bg-transparent text-[#2B2119] hover:bg-[rgba(43,33,25,0.05)]"
                  }`}
                >
                  <span>Essai gratuit 14 jours</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
