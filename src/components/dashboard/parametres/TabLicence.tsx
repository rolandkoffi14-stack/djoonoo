"use client";

import React from "react";
import { KeyRound, CheckCircle2, ShieldCheck, Store, Calendar, Laptop } from "lucide-react";

export interface LicenceInfoProps {
  active: boolean;
  nomEntreprise?: string;
  maxBoutiques: number | null;
  cle?: string;
}

export default function TabLicence({ licence }: { licence: LicenceInfoProps }) {
  // Masquer le milieu de la clé pour sécurité d'affichage
  const cleMasquee = licence.cle
    ? licence.cle.length > 25
      ? `${licence.cle.slice(0, 14)}...${licence.cle.slice(-10)}`
      : licence.cle
    : "Non enregistrée";

  return (
    <div className="space-y-6">
      {/* Carte d'état principale */}
      <div className="p-6 rounded-2xl bg-white border border-[#E5DACF] shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-[#FAF6F1]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#2B2119]">
                Licence d'utilisation djoonoo
              </h2>
              <p className="text-xs text-[#6D5D52]">
                Version Hors-SaaS — Déploiement autonome
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-extrabold uppercase">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Licence Permanente Active</span>
          </div>
        </div>

        {/* Grille d'informations de la licence */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-[#FAF6F1]/70 border border-[#E5DACF] space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C7A6B] flex items-center gap-1.5">
              <Laptop className="w-3.5 h-3.5 text-[#C1652D]" />
              Type de Licence
            </span>
            <p className="text-sm font-black text-[#2B2119]">
              Licence à Vie (Paiement Comptant)
            </p>
            <p className="text-xs text-[#6D5D52]">
              Aucun abonnement ni prélèvement mensuel récurrent.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#FAF6F1]/70 border border-[#E5DACF] space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C7A6B] flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-[#C1652D]" />
              Quota de Boutiques
            </span>
            <p className="text-sm font-black text-[#2B2119]">
              {licence.maxBoutiques === null
                ? "Boutiques Illimitées"
                : `${licence.maxBoutiques} boutique(s) autorisée(s)`}
            </p>
            <p className="text-xs text-[#6D5D52]">
              {licence.maxBoutiques === null
                ? "Formule Réseau sans restriction de points de vente."
                : "Licence mono-boutique extensible sur demande."}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#FAF6F1]/70 border border-[#E5DACF] space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C7A6B] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#C1652D]" />
              Titulaire Déclaré
            </span>
            <p className="text-sm font-bold text-[#2B2119]">
              {licence.nomEntreprise || "Entreprise enregistrée"}
            </p>
            <p className="text-xs text-[#6D5D52]">
              Lié cryptographiquement à votre dénomination commerciale.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#FAF6F1]/70 border border-[#E5DACF] space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C7A6B] flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-[#C1652D]" />
              Empreinte Cryptographique
            </span>
            <p className="font-mono text-xs font-bold text-[#2B2119] select-all">
              {cleMasquee}
            </p>
            <p className="text-xs text-[#6D5D52]">
              Signature HMAC-SHA256 officielle djoonoo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

