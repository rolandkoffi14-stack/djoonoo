import Link from "next/link";
import { Check, ArrowRight, HelpCircle } from "lucide-react";

interface ForfaitPlan {
  id: string;
  nom: string;
  badge?: string;
  prixMensuel: number;
  description: string;
  maxBoutiques: string;
  maxEmployes: string;
  avantages: string[];
}

const FORFAITS: ForfaitPlan[] = [
  {
    id: "solo",
    nom: "Solo",
    prixMensuel: 5000,
    description: "Pour le commerçant indépendant qui pilote une boutique unique.",
    maxBoutiques: "1 boutique",
    maxEmployes: "Jusqu'à 3 employés",
    avantages: [
      "1 boutique incluse",
      "Gestion complète du stock et alertes",
      "Émission de factures numérotées FAC",
      "Suivi des impayés et créances clients",
      "Rapports de ventes quotidiens",
      "Sécurité 2FA pour le Patron",
    ],
  },
  {
    id: "reseau",
    nom: "Réseau",
    badge: "Idéal commerces en expansion",
    prixMensuel: 15000,
    description: "Pour les commerçants disposant de plusieurs points de vente à gérer.",
    maxBoutiques: "Jusqu'à 5 boutiques",
    maxEmployes: "Employés illimités",
    avantages: [
      "Jusqu'à 5 boutiques distinctes",
      "Rapports financiers consolidés ou par boutique",
      "Transferts d'employés tracés sans perte d'historique",
      "Base clients unifiée à l'ensemble du compte",
      "Rôles Patron, Gérants et Vendeurs dédiés",
      "Sécurité 2FA pour Patron et Gérants",
    ],
  },
  {
    id: "empire",
    nom: "Empire",
    prixMensuel: 35000,
    description: "Pour les grossistes, demi-grossistes et réseaux commerciaux d'envergure.",
    maxBoutiques: "Boutiques illimitées",
    maxEmployes: "Employés illimités",
    avantages: [
      "Boutiques illimitées",
      "Volume de ventes et produits sans restriction",
      "Journal d'audit complet de toutes les actions",
      "Rapprochement téléphonique instantané",
      "Accompagnement et support direct 2KR DIGITAL",
      "Accès prioritaire aux nouvelles fonctionnalités",
    ],
  },
];

export default function Pricing() {
  return (
    <section id="forfaits" className="py-20 sm:py-28 bg-[#FAF6F1]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center mb-16">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#C1652D] mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-[#C1652D]" />
            Tarifs clairs & en Francs CFA
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#2B2119]">
            Choisis le forfait adapté à la taille de ton commerce
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#6B5C52]">
            Commence par <strong>14 jours d'essai gratuit</strong>. Aucun engagement préalable.
            Règlement facile par MTN Mobile Money ou Moov Money.
          </p>
        </div>

        {/* Grille des forfaits */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {FORFAITS.map((forfait) => {
            const isFeatured = Boolean(forfait.badge);

            return (
              <div
                key={forfait.id}
                className={`relative flex flex-col justify-between rounded-2xl border p-8 transition-all ${
                  isFeatured
                    ? "border-[#C1652D] bg-[#FFFFFF] shadow-[0_4px_24px_rgba(193,101,45,0.12)]"
                    : "border-[rgba(43,33,25,0.12)] bg-[#FFFFFF] hover:border-[rgba(43,33,25,0.25)]"
                }`}
              >
                <div>
                  {forfait.badge && (
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-[#F5EAE3] px-3 py-1 text-xs font-bold text-[#C1652D] mb-4">
                      {forfait.badge}
                    </div>
                  )}

                  <h3 className="text-2xl font-bold text-[#2B2119]">{forfait.nom}</h3>
                  <p className="mt-2 text-xs text-[#6B5C52] leading-relaxed min-h-[36px]">
                    {forfait.description}
                  </p>

                  {/* Prix */}
                  <div className="mt-6 flex items-baseline gap-1.5 pb-6 border-b border-[rgba(43,33,25,0.08)]">
                    <span className="text-4xl font-bold tracking-tight text-[#2B2119]">
                      {forfait.prixMensuel.toLocaleString("fr-FR")}
                    </span>
                    <span className="text-sm font-semibold text-[#6B5C52]">FCFA / mois</span>
                  </div>

                  {/* Limites clés */}
                  <div className="my-6 space-y-2 text-xs font-semibold text-[#2B2119]">
                    <div className="flex items-center justify-between py-1 border-b border-[rgba(43,33,25,0.05)]">
                      <span className="text-[#6B5C52]">Boutiques :</span>
                      <span>{forfait.maxBoutiques}</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-[rgba(43,33,25,0.05)]">
                      <span className="text-[#6B5C52]">Employés :</span>
                      <span>{forfait.maxEmployes}</span>
                    </div>
                  </div>

                  {/* Avantages */}
                  <ul className="space-y-3 text-xs text-[#2B2119] mb-8">
                    {forfait.avantages.map((av, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <Check className="h-4 w-4 text-[#1E7E34] shrink-0 mt-0.5" />
                        <span>{av}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Link
                  href="/inscription"
                  className={`flex items-center justify-center gap-2 rounded-lg py-3.5 px-4 text-sm font-semibold transition-all min-h-[44px] ${
                    isFeatured
                      ? "bg-[#C1652D] text-[#FAF6F1] shadow-[0_2px_4px_rgba(193,101,45,0.2)] hover:bg-[#A85422]"
                      : "border border-[rgba(43,33,25,0.2)] text-[#2B2119] hover:bg-[#F3ECE2]"
                  }`}
                >
                  <span>Tester 14 jours gratuitement</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            );
          })}
        </div>

        {/* Note sur le délai de grâce et la flexibilité */}
        <div className="mt-12 rounded-xl border border-[rgba(43,33,25,0.08)] bg-[#FFFFFF] p-6 max-w-3xl mx-auto flex flex-col sm:flex-row items-center gap-4 text-xs text-[#6B5C52]">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F5EAE3] text-[#C1652D]">
            <HelpCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-[#2B2119]">
              Délai de grâce de 7 jours après échéance
            </p>
            <p className="mt-0.5 leading-relaxed">
              En cas de retard de paiement, ton compte ne se coupe pas brutalement. Tu disposes de 7
              jours pour effectuer ton versement Mobile Money et laisser le temps de confirmation
              sans bloquer tes ventes du jour.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
