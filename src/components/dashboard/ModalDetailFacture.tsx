"use client";

import React from "react";
import Image from "next/image";
import { X, CheckCircle, Clock, AlertTriangle, Download } from "lucide-react";

export interface FactureDetailItem {
  id: string;
  montant: number;
  statut: string;
  fournisseur_paiement: string;
  reference_externe?: string | null;
  date_echeance: string;
  date_confirmation: string | null;
  forfaitId?: string | null;
  forfaitNom?: string | null;
}

interface ModalDetailFactureProps {
  facture: FactureDetailItem | null;
  onClose: () => void;
  nomEntreprise?: string;
  forfaitNom?: string;
}

export default function ModalDetailFacture({
  facture,
  onClose,
  nomEntreprise = "Ton Entreprise",
  forfaitNom = "djoonoo SaaS",
}: ModalDetailFactureProps) {
  if (!facture) return null;

  const dateAffichage = facture.date_confirmation
    ? new Date(facture.date_confirmation).toLocaleString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : new Date(facture.date_echeance).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-neutral-200 overflow-hidden">
        {/* En-tête */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100 bg-[#FAF6F1]">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 shrink-0">
              <Image
                src="/brand/02_icons/djoonoo_icon_squircle_terracotta.svg"
                alt="djoonoo"
                fill
                className="object-contain"
              />
            </div>
            <div>
              <h3 className="font-bold text-[#2B2119] text-base">Détail du règlement</h3>
              <p className="text-xs text-neutral-500">Transaction certifiée djoonoo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps */}
        <div className="p-6 space-y-5">
          {/* Montant & Statut */}
          <div className="flex items-center justify-between p-4 bg-[#FAF6F1] rounded-xl border border-neutral-200/60">
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Montant réglé</p>
              <p className="text-2xl font-extrabold text-[#2B2119]">
                {facture.montant.toLocaleString()} <span className="text-sm font-semibold text-neutral-500">FCFA</span>
              </p>
            </div>

            <div>
              {facture.statut === "payee" ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Payée
                </span>
              ) : facture.statut === "en_attente" ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  <Clock className="w-3.5 h-3.5" />
                  En attente
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Échouée
                </span>
              )}
            </div>
          </div>

          {/* Grille des caractéristiques */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
              <span className="text-xs text-neutral-500 font-medium">Bénéficiaire</span>
              <p className="font-semibold text-[#2B2119] mt-0.5">{nomEntreprise}</p>
            </div>

            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
              <span className="text-xs text-neutral-500 font-medium">Prestation</span>
              <p className="font-semibold text-[#2B2119] mt-0.5">{facture.forfaitNom || forfaitNom}</p>
            </div>

            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
              <span className="text-xs text-neutral-500 font-medium">Passerelle de paiement</span>
              <p className="font-semibold text-[#2B2119] mt-0.5 capitalize">
                {facture.fournisseur_paiement === "fedapay" ? "FedaPay (MoMo / Moov)" : facture.fournisseur_paiement}
              </p>
            </div>

            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
              <span className="text-xs text-neutral-500 font-medium">Date d'opération</span>
              <p className="font-semibold text-[#2B2119] mt-0.5 text-xs">{dateAffichage}</p>
            </div>
          </div>

          {facture.reference_externe && (
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 text-xs">
              <span className="text-neutral-500 font-medium">Référence transaction FedaPay :</span>
              <span className="font-mono font-semibold text-[#2B2119] ml-2">{facture.reference_externe}</span>
            </div>
          )}
        </div>

        {/* Pied de page & Téléchargement PDF */}
        <div className="px-6 py-4 border-t border-neutral-100 bg-[#FAF6F1] flex items-center justify-between gap-3">
          <a
            href={`/api/factures-abonnement/${facture.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#C1652D] hover:bg-[#A05324] transition shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Télécharger la facture PDF djoonoo
          </a>

          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-neutral-700 bg-white border border-neutral-200 hover:bg-neutral-50 transition cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
