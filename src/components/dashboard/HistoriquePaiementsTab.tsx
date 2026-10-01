"use client";

import React, { useState } from "react";
import { Download, Eye, ReceiptText, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import ModalDetailFacture, { FactureDetailItem } from "./ModalDetailFacture";

interface HistoriquePaiementsTabProps {
  factures: FactureDetailItem[];
  nomEntreprise?: string;
  forfaitNom?: string;
}

export default function HistoriquePaiementsTab({
  factures,
  nomEntreprise,
  forfaitNom,
}: HistoriquePaiementsTabProps) {
  const [factureSelectionnee, setFactureSelectionnee] = useState<FactureDetailItem | null>(null);

  if (factures.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-12 border border-neutral-200/80 text-center">
        <div className="w-14 h-14 mx-auto mb-4 bg-[#FAF6F1] rounded-2xl flex items-center justify-center text-[#C1652D]">
          <ReceiptText className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-[#2B2119]">Aucune transaction pour le moment</h3>
        <p className="text-sm text-neutral-500 mt-1 max-w-md mx-auto">
          Dès que tu effectues un règlement d'abonnement djoonoo par Mobile Money ou Carte, la facture apparaîtra ici avec possibilité de téléchargement officiel.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-[#2B2119] text-base">Historique des factures d'abonnement</h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Factures officielles délivrées par l'entreprise éditrice de djoonoo.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-neutral-100 text-neutral-600 rounded-full">
            {factures.length} transaction{factures.length > 1 ? "s" : ""}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#FAF6F1]/80 text-xs text-neutral-500 uppercase tracking-wider border-b border-neutral-100">
              <tr>
                <th className="py-3.5 px-6 font-semibold">Montant</th>
                <th className="py-3.5 px-6 font-semibold">Date d'échéance</th>
                <th className="py-3.5 px-6 font-semibold">Moyen</th>
                <th className="py-3.5 px-6 font-semibold">Statut</th>
                <th className="py-3.5 px-6 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {factures.map((fc) => (
                <tr key={fc.id} className="hover:bg-neutral-50/60 transition">
                  <td className="py-4 px-6 font-bold text-[#2B2119]">
                    {fc.montant.toLocaleString()}{" "}
                    <span className="text-xs font-normal text-neutral-500">FCFA</span>
                  </td>
                  <td className="py-4 px-6 text-neutral-600 text-xs sm:text-sm">
                    {new Date(fc.date_echeance).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="py-4 px-6 text-xs text-neutral-600 font-medium">
                    <span className="px-2 py-0.5 bg-neutral-100 rounded-md uppercase font-mono">
                      {fc.fournisseur_paiement === "fedapay" ? "FedaPay" : fc.fournisseur_paiement}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    {fc.statut === "payee" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                        <CheckCircle className="w-3 h-3" />
                        Payée
                      </span>
                    ) : fc.statut === "en_attente" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                        <Clock className="w-3 h-3" />
                        En attente
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                        <AlertTriangle className="w-3 h-3" />
                        Échouée
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-right space-x-2">
                    <button
                      onClick={() => setFactureSelectionnee(fc)}
                      className="p-1.5 text-neutral-600 hover:text-[#2B2119] hover:bg-neutral-100 rounded-lg transition inline-flex items-center gap-1 text-xs font-medium"
                      title="Voir les détails"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Détails</span>
                    </button>

                    <a
                      href={`/api/factures-abonnement/${fc.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-[#C1652D] hover:bg-[#C1652D]/10 rounded-lg transition inline-flex items-center gap-1 text-xs font-semibold"
                      title="Télécharger la facture PDF"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Facture PDF</span>
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {factureSelectionnee && (
        <ModalDetailFacture
          facture={factureSelectionnee}
          onClose={() => setFactureSelectionnee(null)}
          nomEntreprise={nomEntreprise}
          forfaitNom={forfaitNom}
        />
      )}
    </div>
  );
}
