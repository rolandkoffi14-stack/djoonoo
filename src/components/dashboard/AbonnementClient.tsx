"use client";

import React, { useState } from "react";
import { initierPaiementAbonnementAction } from "@/app/actions/subscription";
import {
  CheckCircle,
  CreditCard,
  ShieldCheck,
  Zap,
  ArrowRight,
  Loader2,
  AlertTriangle,
  Lock,
  Smartphone,
} from "lucide-react";

interface ForfaitItem {
  id: string;
  nom: string;
  prix_mensuel: number;
  duree_jours: number;
  max_boutiques: number | null;
  max_employes_par_boutique: number | null;
  actif: boolean;
}

interface FactureItem {
  id: string;
  montant: number;
  statut: string;
  fournisseur_paiement: string;
  date_echeance: string;
  date_confirmation: string | null;
}

interface AbonnementClientProps {
  forfaits: ForfaitItem[];
  compteForfaitId: string;
  statutAbonnement: string;
  dateFinPeriode: string | null;
  dateFinEssai: string | null;
  isPatron: boolean;
  factures: FactureItem[];
  statusQuery?: string;
}

export default function AbonnementClient({
  forfaits,
  compteForfaitId,
  statutAbonnement,
  dateFinPeriode,
  dateFinEssai,
  isPatron,
  factures,
  statusQuery,
}: AbonnementClientProps) {
  const [selectedForfaitId, setSelectedForfaitId] = useState<string>(compteForfaitId);
  const [loadingForfaitId, setLoadingForfaitId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlePayer = async (forfaitId: string) => {
    setLoadingForfaitId(forfaitId);
    setErrorMessage(null);

    try {
      const res = await initierPaiementAbonnementAction(forfaitId);
      if (res.success && res.urlPaiement) {
        window.location.href = res.urlPaiement;
      } else {
        setErrorMessage(res.error || "Impossible d'initialiser le paiement.");
        setLoadingForfaitId(null);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Erreur réseau lors de la redirection de paiement.");
      setLoadingForfaitId(null);
    }
  };

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

  return (
    <div className="space-y-8">
      {statusQuery === "verif" && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold">Paiement en cours de validation</p>
            <p className="text-blue-800 mt-0.5">
              Ton règlement FedaPay est en cours de traitement. Dès réception de la confirmation instantanée, ton compte sera automatiquement mis à jour.
            </p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
          <div className="text-sm text-rose-900">
            <p className="font-semibold">Erreur de paiement</p>
            <p className="text-rose-800 mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Carte d'état actuel */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-neutral-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-[#2B2119]">Statut de ton compte</h2>
            <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${badge.bg}`}>
              {badge.label}
            </span>
          </div>

          <p className="text-sm text-neutral-600 mt-2">
            {statutAbonnement === "essai" && dateFinEssai && (
              <>Période d'essai gratuite active jusqu'au <span className="font-semibold text-[#2B2119]">{new Date(dateFinEssai).toLocaleDateString()}</span>.</>
            )}
            {statutAbonnement === "actif" && dateFinPeriode && (
              <>Abonnement renouvelé jusqu'au <span className="font-semibold text-[#2B2119]">{new Date(dateFinPeriode).toLocaleDateString()}</span>.</>
            )}
            {statutAbonnement === "impaye" && (
              <>Ton échéance est échue. Tu disposes de ton accès complet pendant le délai de grâce.</>
            )}
            {statutAbonnement === "expire" && (
              <>Ton abonnement a expiré. Choisis un forfait ci-dessous pour réactiver tes ventes immédiatement.</>
            )}
          </p>
        </div>

        <div className="flex items-center gap-4 bg-[#FAF6F1] p-4 rounded-xl border border-neutral-200/60">
          <div className="p-3 bg-[#C1652D]/10 rounded-lg text-[#C1652D]">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-neutral-500 font-semibold">Paiement Mobile Money & Cartes</p>
            <p className="text-sm font-bold text-[#2B2119]">Sans engagement • Immédiat</p>
          </div>
        </div>
      </div>

      {/* Grille des forfaits */}
      <div>
        <div className="text-center max-w-xl mx-auto mb-8">
          <h2 className="text-2xl font-bold text-[#2B2119]">Choisis la formule adaptée à ton commerce</h2>
          <p className="text-sm text-neutral-600 mt-1">
            Règlement sécurisé par MTN Mobile Money, Moov Money ou Carte bancaire.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {forfaits.map((f) => {
            const isCurrent = f.id === compteForfaitId;
            const isPopular = f.nom.toLowerCase().includes("réseau");
            const isLoading = loadingForfaitId === f.id;

            return (
              <div
                key={f.id}
                className={`relative rounded-2xl p-6 sm:p-7 flex flex-col justify-between transition border-2 ${
                  isPopular
                    ? "bg-white border-[#C1652D] shadow-md ring-4 ring-[#C1652D]/10"
                    : "bg-white border-neutral-200 hover:border-neutral-300 shadow-sm"
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#C1652D] text-white text-xs font-bold tracking-wide uppercase px-3.5 py-1 rounded-full shadow-sm">
                    Recommandé
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-[#2B2119]">{f.nom}</h3>
                    {isCurrent && (
                      <span className="text-xs bg-[#2B2119] text-white font-medium px-2.5 py-0.5 rounded-full">
                        Actuel
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-[#2B2119]">
                      {f.prix_mensuel.toLocaleString()}
                    </span>
                    <span className="text-sm font-semibold text-neutral-500">FCFA</span>
                    <span className="text-xs text-neutral-400">/{f.duree_jours} jours</span>
                  </div>

                  <div className="mt-6 pt-6 border-t border-neutral-100 space-y-3.5 text-sm">
                    <div className="flex items-center gap-2.5 text-neutral-700">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        {f.max_boutiques === null
                          ? "Boutiques illimitées"
                          : `${f.max_boutiques} boutique${f.max_boutiques > 1 ? "s" : ""}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 text-neutral-700">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        {f.max_employes_par_boutique === null
                          ? "Employés illimités"
                          : `Jusqu'à ${f.max_employes_par_boutique} employé${f.max_employes_par_boutique > 1 ? "s" : ""} par boutique`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 text-neutral-700">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Caisse POS & reçus instantanés</span>
                    </div>

                    <div className="flex items-center gap-2.5 text-neutral-700">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Gestion de stock & alertes ruptures</span>
                    </div>

                    <div className="flex items-center gap-2.5 text-neutral-700">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Traçabilité & rapports financiers</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-4">
                  {isPatron ? (
                    <button
                      onClick={() => handlePayer(f.id)}
                      disabled={loadingForfaitId !== null}
                      className={`w-full py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition ${
                        isPopular
                          ? "bg-[#C1652D] hover:bg-[#A05324] text-white shadow-sm"
                          : "bg-[#2B2119] hover:bg-[#1f1712] text-white"
                      } disabled:opacity-50`}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Redirection FedaPay...</span>
                        </>
                      ) : (
                        <>
                          <span>{isCurrent && statutAbonnement === "actif" ? "Prolonger ce forfait" : `Choisir ${f.nom}`}</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  ) : (
                    <p className="text-xs text-neutral-400 text-center italic">
                      Seul le Patron peut initier le paiement
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Réassurance FedaPay */}
      <div className="bg-white rounded-2xl p-6 border border-neutral-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-[#2B2119] text-sm sm:text-base">Moyens de paiement acceptés</h4>
            <p className="text-xs sm:text-sm text-neutral-500">
              Paiement direct et sécurisé par <span className="font-semibold text-[#2B2119]">MTN MoMo, Moov Money et Cartes Bancaires</span>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-600 bg-[#FAF6F1] px-4 py-2 rounded-lg border border-neutral-200">
          <Lock className="w-3.5 h-3.5 text-emerald-600" />
          <span>Passerelle certifiée FedaPay • Chiffrement 256-bit</span>
        </div>
      </div>

      {/* Historique des factures d'abonnement */}
      {factures.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-neutral-200/80 shadow-sm">
          <h3 className="text-lg font-bold text-[#2B2119] mb-4">Historique de tes factures d'abonnement</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-200 text-xs text-neutral-500 uppercase">
                <tr>
                  <th className="pb-3 font-semibold">Montant</th>
                  <th className="pb-3 font-semibold">Échéance</th>
                  <th className="pb-3 font-semibold">Paiement</th>
                  <th className="pb-3 font-semibold">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {factures.map((fc) => (
                  <tr key={fc.id} className="hover:bg-neutral-50/50">
                    <td className="py-3 font-bold text-[#2B2119]">
                      {fc.montant.toLocaleString()} FCFA
                    </td>
                    <td className="py-3 text-neutral-600">
                      {new Date(fc.date_echeance).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-neutral-600 uppercase text-xs font-medium">
                      {fc.fournisseur_paiement}
                    </td>
                    <td className="py-3">
                      <span
                        className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                          fc.statut === "payee"
                            ? "bg-emerald-100 text-emerald-800"
                            : fc.statut === "en_attente"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-neutral-100 text-neutral-700"
                        }`}
                      >
                        {fc.statut === "payee" ? "Payée" : fc.statut === "en_attente" ? "En attente" : fc.statut}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
