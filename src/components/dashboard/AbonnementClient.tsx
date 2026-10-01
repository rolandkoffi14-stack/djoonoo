"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  CreditCard,
  ShieldCheck,
  Zap,
  ArrowRight,
  AlertTriangle,
  Lock,
  Smartphone,
  Store,
  Users,
  Calendar,
  Receipt,
  Wallet,
} from "lucide-react";
import { determinerBoutonActionPrincipal } from "@/lib/subscription-quotas";
import ModalChoixForfait, { ForfaitItem } from "./ModalChoixForfait";
import HistoriquePaiementsTab from "./HistoriquePaiementsTab";
import MethodesPaiementTab, { MethodePaiementItem } from "./MethodesPaiementTab";
import { FactureDetailItem } from "./ModalDetailFacture";

interface AbonnementClientProps {
  forfaits: ForfaitItem[];
  compteForfaitId: string;
  compteForfaitNom: string;
  forfaitPrixMensuel: number;
  forfaitDureeJours: number;
  maxBoutiquesForfait: number | null;
  maxEmployesForfait: number | null;
  statutAbonnement: string;
  dateFinPeriode: string | null;
  dateFinEssai: string | null;
  isPatron: boolean;
  nbBoutiquesActives: number;
  nbEmployes: number;
  methodesPaiementInitiales: MethodePaiementItem[];
  factures: FactureDetailItem[];
  statusQuery?: string;
}

export default function AbonnementClient({
  forfaits,
  compteForfaitId,
  compteForfaitNom,
  forfaitPrixMensuel,
  forfaitDureeJours,
  maxBoutiquesForfait,
  maxEmployesForfait,
  statutAbonnement,
  dateFinPeriode,
  dateFinEssai,
  isPatron,
  nbBoutiquesActives,
  nbEmployes,
  methodesPaiementInitiales,
  factures,
  statusQuery,
}: AbonnementClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"forfait" | "historique" | "methodes">("forfait");
  const [isModalChoixOpen, setIsModalChoixOpen] = useState<boolean>(false);

  // Calcul du bouton d'action selon le Dilemme 1
  const actionBoutons = determinerBoutonActionPrincipal({
    statutAbonnement,
    dateFinPeriode,
  });

  const getStatutBadge = () => {
    switch (statutAbonnement) {
      case "actif":
        return {
          label: "Abonnement actif",
          bg: "bg-emerald-100 text-emerald-800 border-emerald-300",
        };
      case "essai":
        return {
          label: "Période d'essai",
          bg: "bg-blue-100 text-blue-800 border-blue-300",
        };
      case "impaye":
        return {
          label: "Échéance dépassée (Délai de grâce)",
          bg: "bg-amber-100 text-amber-800 border-amber-300",
        };
      case "expire":
        return {
          label: "Abonnement expiré (Mode consultation)",
          bg: "bg-[#C1652D]/15 text-[#C1652D] border-[#C1652D]/40",
        };
      case "suspendu":
        return {
          label: "Suspendu",
          bg: "bg-rose-100 text-rose-800 border-rose-300",
        };
      default:
        return {
          label: statutAbonnement,
          bg: "bg-neutral-100 text-neutral-800 border-neutral-300",
        };
    }
  };

  const badge = getStatutBadge();

  // Échéance formatée
  const dateEcheanceAffichage =
    statutAbonnement === "essai" && dateFinEssai
      ? new Date(dateFinEssai).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : dateFinPeriode
      ? new Date(dateFinPeriode).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "Non définie";

  const handleSelectForfaitModal = (forfaitId: string) => {
    setIsModalChoixOpen(false);
    router.push(`/dashboard/abonnement/checkout?forfaitId=${forfaitId}`);
  };

  const handleRenouvelerDirect = () => {
    router.push(`/dashboard/abonnement/checkout?forfaitId=${compteForfaitId}&action=renouveler`);
  };

  return (
    <div className="space-y-6">
      {statusQuery === "verif" && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold">Paiement en cours de validation</p>
            <p className="text-blue-800 mt-0.5">
              Ton règlement FedaPay est en cours de finalisation. Dès réception du webhook instantané, ton compte sera automatiquement renouvelé.
            </p>
          </div>
        </div>
      )}

      {/* Navigation par Onglets (Identique à la maquette) */}
      <div className="border-b border-neutral-200">
        <nav className="flex gap-8 -mb-px">
          <button
            onClick={() => setActiveTab("forfait")}
            className={`pb-4 px-1 text-base font-semibold transition border-b-2 flex items-center gap-2 ${
              activeTab === "forfait"
                ? "border-[#C1652D] text-[#C1652D]"
                : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"
            }`}
          >
            <span>Forfait actif</span>
          </button>

          <button
            onClick={() => setActiveTab("historique")}
            className={`pb-4 px-1 text-base font-semibold transition border-b-2 flex items-center gap-2 ${
              activeTab === "historique"
                ? "border-[#C1652D] text-[#C1652D]"
                : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"
            }`}
          >
            <span>Historique de paiements</span>
            {factures.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 font-medium">
                {factures.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("methodes")}
            className={`pb-4 px-1 text-base font-semibold transition border-b-2 flex items-center gap-2 ${
              activeTab === "methodes"
                ? "border-[#C1652D] text-[#C1652D]"
                : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"
            }`}
          >
            <span>Méthodes de paiement</span>
            {methodesPaiementInitiales.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 font-medium">
                {methodesPaiementInitiales.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* CONTENU DE L'ONGLET 1 : FORFAIT ACTIF */}
      {activeTab === "forfait" && (
        <div className="space-y-6">
          {/* Ligne synthétique épurée / Bento Card */}
          <div className="bg-white rounded-2xl p-6 sm:p-7 border border-neutral-200/80 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              {/* Colonne 1 : Formule & Statut */}
              <div className="space-y-2 lg:min-w-[200px]">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                  Formule & Statut
                </span>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-[#C1652D]/10 rounded-xl text-[#C1652D]">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#2B2119]">{compteForfaitNom}</h3>
                    <span className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full border mt-1 ${badge.bg}`}>
                      {badge.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Colonne 2 : Tarif & Cycle */}
              <div className="space-y-1 lg:border-l lg:border-neutral-100 lg:pl-6">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                  Tarif & Cycle
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-extrabold text-[#2B2119]">
                    {forfaitPrixMensuel.toLocaleString()}
                  </span>
                  <span className="text-xs font-semibold text-neutral-500">FCFA</span>
                  <span className="text-xs text-neutral-400">/{forfaitDureeJours}j</span>
                </div>
                <p className="text-xs text-neutral-500">Sans engagement</p>
              </div>

              {/* Colonne 3 : Validité & Prochaine échéance */}
              <div className="space-y-1 lg:border-l lg:border-neutral-100 lg:pl-6">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                  {statutAbonnement === "essai" ? "Fin de l'essai" : "Valide jusqu'au"}
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="w-4 h-4 text-neutral-400" />
                  <span className="text-sm font-bold text-[#2B2119]">
                    {dateEcheanceAffichage}
                  </span>
                </div>
                <p className="text-xs text-neutral-500">
                  {statutAbonnement === "expire"
                    ? "Accès en lecture seule"
                    : "Renouvellement en ligne"}
                </p>
              </div>

              {/* Colonne 4 : Quotas réels d'utilisation */}
              <div className="space-y-1 lg:border-l lg:border-neutral-100 lg:pl-6">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                  Ressources Actives
                </span>
                <div className="space-y-1.5 mt-1 text-xs">
                  <div className="flex items-center gap-2 text-neutral-700">
                    <Store className="w-3.5 h-3.5 text-[#C1652D]" />
                    <span>
                      Boutiques : <strong className="text-[#2B2119]">{nbBoutiquesActives}</strong>
                      {maxBoutiquesForfait !== null ? ` / ${maxBoutiquesForfait}` : " (illimité)"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-neutral-700">
                    <Users className="w-3.5 h-3.5 text-neutral-500" />
                    <span>
                      Employés : <strong className="text-[#2B2119]">{nbEmployes}</strong>
                      {maxEmployesForfait !== null ? ` (max ${maxEmployesForfait}/boutique)` : " (illimité)"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Colonne 5 : Actions standardisées (Dilemme 1) */}
              <div className="lg:border-l lg:border-neutral-100 lg:pl-6 flex flex-col sm:flex-row lg:flex-col gap-2.5 justify-center">
                {isPatron ? (
                  <>
                    <button
                      onClick={() => setIsModalChoixOpen(true)}
                      className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-[#2B2119] hover:bg-[#1a140f] transition flex items-center justify-center gap-2 shadow-xs"
                    >
                      <span>{actionBoutons.boutonPrincipal}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    {actionBoutons.boutonRenouvelerSecondaire && (
                      <button
                        onClick={handleRenouvelerDirect}
                        className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-[#C1652D] hover:bg-[#A05324] transition flex items-center justify-center gap-2 shadow-xs"
                      >
                        <span>Renouveler</span>
                        <Zap className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-neutral-400 italic">
                    Gestion réservée au Patron
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Réassurance FedaPay */}
          <div className="bg-white rounded-2xl p-6 border border-neutral-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-[#2B2119] text-sm">Règlement direct par Mobile Money</h4>
                <p className="text-xs text-neutral-500">
                  Compatible MTN Mobile Money Bénin, Moov Money et Cartes Bancaires.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-600 bg-[#FAF6F1] px-4 py-2 rounded-xl border border-neutral-200">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Passerelle certifiée FedaPay • Chiffrement 256-bit</span>
            </div>
          </div>
        </div>
      )}

      {/* CONTENU DE L'ONGLET 2 : HISTORIQUE DES PAIEMENTS */}
      {activeTab === "historique" && (
        <HistoriquePaiementsTab
          factures={factures}
          forfaitNom={compteForfaitNom}
        />
      )}

      {/* CONTENU DE L'ONGLET 3 : MÉTHODES DE PAIEMENT */}
      {activeTab === "methodes" && (
        <MethodesPaiementTab
          methodesInitiales={methodesPaiementInitiales}
          isPatron={isPatron}
        />
      )}

      {/* Modale de sélection de forfaits (Dilemme 2 avec quotas) */}
      <ModalChoixForfait
        isOpen={isModalChoixOpen}
        onClose={() => setIsModalChoixOpen(false)}
        forfaits={forfaits}
        compteForfaitId={compteForfaitId}
        statutAbonnement={statutAbonnement}
        nbBoutiquesActives={nbBoutiquesActives}
        onSelectForfait={handleSelectForfaitModal}
      />
    </div>
  );
}
