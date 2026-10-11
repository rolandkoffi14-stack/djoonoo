"use client";

import React from "react";
import { X, CheckCircle, AlertTriangle, ArrowRight, ShieldCheck, Zap } from "lucide-react";
import {
  evaluerCompatibiliteForfait,
  determinerAffichageCarteModale,
} from "@/lib/subscription-quotas";

export interface ForfaitItem {
  id: string;
  nom: string;
  prix_mensuel: number;
  duree_jours: number;
  max_boutiques: number | null;
  max_employes_par_boutique: number | null;
  actif: boolean;
}

interface ModalChoixForfaitProps {
  isOpen: boolean;
  onClose: () => void;
  forfaits: ForfaitItem[];
  compteForfaitId: string;
  statutAbonnement: string;
  nbBoutiquesActives: number;
  onSelectForfait: (forfaitId: string) => void;
}

export default function ModalChoixForfait({
  isOpen,
  onClose,
  forfaits,
  compteForfaitId,
  statutAbonnement,
  nbBoutiquesActives,
  onSelectForfait,
}: ModalChoixForfaitProps) {
  if (!isOpen) return null;

  const currentForfait = forfaits.find((f) => f.id === compteForfaitId);
  const currentPrix = currentForfait ? currentForfait.prix_mensuel : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-[#FAF6F1] rounded-3xl w-full max-w-4xl shadow-2xl border border-[#E5DACF] overflow-hidden my-8">
        {/* En-tête de la modale */}
        <div className="flex items-center justify-between px-6 sm:px-8 py-6 border-b border-[#E5DACF] bg-[#FAF6F1]">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-[#C1652D]/10 text-[#C1652D] rounded-lg">
                <Zap className="w-4 h-4" />
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#2B2119]">
                Choisis la formule adaptée à ton commerce
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[#6D5D52] mt-1">
              Règlement 100% sécurisé par MTN Mobile Money et Moov Money.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[#8C7A6B] hover:text-[#2B2119] hover:bg-[#E5DACF]/50 rounded-xl transition cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Grille des forfaits avec vérification universelle des quotas */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {forfaits.map((f) => {
              const isCurrent = f.id === compteForfaitId;
              const isSuperior = f.prix_mensuel > currentPrix;
              const isInferior = f.prix_mensuel < currentPrix;
              const isPopular = f.nom.toLowerCase().includes("réseau");

              // Contrôle universel des quotas
              const evalRes = evaluerCompatibiliteForfait({
                nbBoutiquesActives,
                forfaitMaxBoutiques: f.max_boutiques,
              });

              // Rendu des badges et libellés selon Dilemme 2
              const affichage = determinerAffichageCarteModale({
                statutAbonnement,
                isForfaitCompte: isCurrent,
                isSuperieur: isSuperior,
                isInferieur: isInferior,
                isRecommande: isPopular,
                forfaitNom: f.nom,
                compatible: evalRes.compatible,
                messageIncompatibilite: evalRes.message,
              });

              return (
                <div
                  key={f.id}
                  className={`relative rounded-2xl p-6 flex flex-col justify-between transition border-2 ${
                    affichage.estDesactive
                      ? "bg-[#E5DACF]/20 border-[#E5DACF] opacity-90"
                      : isPopular
                      ? "bg-[#FAF6F1] border-[#C1652D] shadow-md ring-4 ring-[#C1652D]/10"
                      : "bg-[#FAF6F1] border-[#E5DACF] hover:border-[#C1652D]/40 shadow-sm"
                  }`}
                >
                  {/* Badge en haut */}
                  {affichage.badge && (
                    <div
                      className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[9.5px] font-bold uppercase px-2.5 py-0.5 rounded-full shadow-xs tracking-wide whitespace-nowrap ${
                        affichage.badge === "Recommandé"
                          ? "bg-[#C1652D] text-white"
                          : affichage.badge === "Forfait impayé"
                          ? "bg-amber-500 text-white"
                          : affichage.badge === "Forfait expiré"
                          ? "bg-rose-600 text-white"
                          : "bg-[#2B2119] text-white"
                      }`}
                    >
                      {affichage.badge}
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-[#2B2119]">{f.nom}</h3>
                      {isCurrent && !affichage.badge && (
                        <span className="text-[9.5px] bg-[#2B2119] text-white font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                          Actuel
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-[#2B2119]">
                        {f.prix_mensuel.toLocaleString()}
                      </span>
                      <span className="text-xs font-semibold text-neutral-500">FCFA</span>
                      <span className="text-xs text-neutral-400">/{f.duree_jours} jours</span>
                    </div>

                    {/* Liste des caractéristiques */}
                    <div className="mt-5 pt-4 border-t border-neutral-100 space-y-2.5 text-xs text-neutral-700">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-[#C1652D] shrink-0" />
                        <span>
                          {f.max_boutiques === null
                            ? "Boutiques illimitées"
                            : `${f.max_boutiques} boutique${f.max_boutiques > 1 ? "s" : ""}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-[#C1652D] shrink-0" />
                        <span>
                          {f.max_employes_par_boutique === null
                            ? "Employés illimités"
                            : `Jusqu'à ${f.max_employes_par_boutique} employé${
                                f.max_employes_par_boutique > 1 ? "s" : ""
                              } / boutique`}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-[#C1652D] shrink-0" />
                        <span>Caisse POS & reçus instantanés</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-[#C1652D] shrink-0" />
                        <span>Gestion de stock & inventaire</span>
                      </div>
                    </div>
                  </div>

                  {/* Section action ou avertissement de quota */}
                  <div className="mt-6 pt-4 border-t border-neutral-100">
                    {affichage.estDesactive ? (
                      <div className="space-y-3">
                        <div className="p-2.5 bg-[#FAF6F1] border border-[#E5DACF] rounded-xl flex items-start gap-2 text-[11px] text-[#2B2119] leading-snug">
                          <AlertTriangle className="w-3.5 h-3.5 text-[#C1652D] shrink-0 mt-0.5" />
                          <span>{affichage.messageIncompatibilite}</span>
                        </div>
                        <button
                          disabled
                          className="w-full py-2.5 px-3 rounded-xl font-bold text-xs bg-neutral-200 text-neutral-400 cursor-not-allowed text-center"
                        >
                          {affichage.boutonLabel}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => onSelectForfait(f.id)}
                        className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
                          isPopular
                            ? "bg-[#C1652D] hover:bg-[#A05324] text-white shadow-xs"
                            : "bg-[#2B2119] hover:bg-[#1f1712] text-white"
                        }`}
                      >
                        <span>{affichage.boutonLabel}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pied de réassurance */}
        <div className="px-6 sm:px-8 py-4 bg-[#FAF6F1] border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-600">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#C1652D]" />
            <span>Paiement direct sécurisé • Activation automatique instantanée</span>
          </div>

          <button
            onClick={onClose}
            className="text-xs font-semibold text-neutral-500 hover:text-neutral-800 transition cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
