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
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-neutral-200 overflow-hidden my-8">
        {/* En-tête de la modale */}
        <div className="flex items-center justify-between px-6 sm:px-8 py-6 border-b border-neutral-100 bg-[#FAF6F1]">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-[#C1652D]/10 text-[#C1652D] rounded-lg">
                <Zap className="w-4 h-4" />
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#2B2119]">
                Choisis la formule adaptée à ton commerce
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-neutral-600 mt-1">
              Règlement 100% sécurisé par MTN Mobile Money et Moov Money.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-xl transition cursor-pointer"
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
                      ? "bg-neutral-50/80 border-neutral-200 opacity-90"
                      : isPopular
                      ? "bg-white border-[#C1652D] shadow-md ring-4 ring-[#C1652D]/10"
                      : "bg-white border-neutral-200 hover:border-neutral-300 shadow-xs"
                  }`}
                >
                  {/* Badge en haut */}
                  {affichage.badge && (
                    <div
                      className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-extrabold uppercase px-3 py-0.5 rounded-full shadow-xs tracking-wider ${
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
                        <span className="text-[11px] bg-[#2B2119] text-white font-medium px-2 py-0.5 rounded-full">
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
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>
                          {f.max_boutiques === null
                            ? "Boutiques illimitées"
                            : `${f.max_boutiques} boutique${f.max_boutiques > 1 ? "s" : ""}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>
                          {f.max_employes_par_boutique === null
                            ? "Employés illimités"
                            : `Jusqu'à ${f.max_employes_par_boutique} employé${
                                f.max_employes_par_boutique > 1 ? "s" : ""
                              } / boutique`}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Caisse POS & reçus instantanés</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Gestion de stock & inventaire</span>
                      </div>
                    </div>
                  </div>

                  {/* Section action ou avertissement de quota */}
                  <div className="mt-6 pt-4 border-t border-neutral-100">
                    {affichage.estDesactive ? (
                      <div className="space-y-3">
                        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-[11px] text-amber-900 leading-snug">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
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
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
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
