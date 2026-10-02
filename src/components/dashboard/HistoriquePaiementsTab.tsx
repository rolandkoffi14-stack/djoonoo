"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Download, Eye, ReceiptText, CheckCircle, Clock, AlertTriangle, ArrowUpRight, XCircle, Loader2 } from "lucide-react";
import ModalDetailFacture, { FactureDetailItem } from "./ModalDetailFacture";
import { annulerFactureEnAttenteAction } from "@/app/actions/subscription";

interface HistoriquePaiementsTabProps {
  factures: FactureDetailItem[];
  nomEntreprise?: string;
  forfaitNom?: string;
}

export default function HistoriquePaiementsTab({
  factures: facturesInitiales,
  nomEntreprise,
  forfaitNom,
}: HistoriquePaiementsTabProps) {
  const [factures, setFactures] = useState<FactureDetailItem[]>(facturesInitiales);
  const [factureSelectionnee, setFactureSelectionnee] = useState<FactureDetailItem | null>(null);
  const [factureAAnnuler, setFactureAAnnuler] = useState<FactureDetailItem | null>(null);
  const [loadingAnnulerId, setLoadingAnnulerId] = useState<string | null>(null);
  const [erreurAnnulation, setErreurAnnulation] = useState<string | null>(null);

  const handleConfirmerAnnulation = async () => {
    if (!factureAAnnuler) return;
    const factureId = factureAAnnuler.id;

    setLoadingAnnulerId(factureId);
    setErreurAnnulation(null);
    try {
      const res = await annulerFactureEnAttenteAction(factureId);
      if (res.success) {
        setFactures((prev) =>
          prev.map((f) => (f.id === factureId ? { ...f, statut: "annulee" } : f))
        );
        setFactureAAnnuler(null);
      } else {
        setErreurAnnulation(res.error || "Impossible d'annuler cette facture.");
      }
    } catch {
      setErreurAnnulation("Une erreur réseau est survenue lors de l'annulation.");
    } finally {
      setLoadingAnnulerId(null);
    }
  };

  if (factures.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-12 border border-neutral-200/80 text-center">
        <div className="w-14 h-14 mx-auto mb-4 bg-[#FAF6F1] rounded-2xl flex items-center justify-center text-[#C1652D]">
          <ReceiptText className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-[#2B2119]">Aucune transaction pour le moment</h3>
        <p className="text-sm text-neutral-500 mt-1 max-w-md mx-auto">
          Dès que tu effectues un règlement d'abonnement djoonoo par Mobile Money (MTN MoMo ou Moov Money), la facture apparaîtra ici avec possibilité de téléchargement officiel.
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
                    ) : fc.statut === "annulee" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-600">
                        <XCircle className="w-3 h-3" />
                        Annulée
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                        <AlertTriangle className="w-3 h-3" />
                        Échouée
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Reprise ou annulation pour les factures en attente */}
                      {fc.statut === "en_attente" && (
                        <>
                          <Link
                            href={`/abonnement/checkout${fc.forfaitId ? `?forfaitId=${fc.forfaitId}` : ""}`}
                            className="px-2.5 py-1.5 bg-[#C1652D] hover:bg-[#A05324] text-white rounded-lg transition inline-flex items-center gap-1 text-xs font-bold shadow-2xs cursor-pointer"
                            title="Finaliser ce paiement"
                          >
                            <span>Reprendre</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </Link>

                          <button
                            type="button"
                            onClick={() => {
                              setErreurAnnulation(null);
                              setFactureAAnnuler(fc);
                            }}
                            disabled={loadingAnnulerId === fc.id}
                            className="px-2.5 py-1.5 border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-lg transition inline-flex items-center gap-1.5 text-xs font-bold cursor-pointer disabled:opacity-50"
                            title="Annuler cette tentative"
                          >
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            <span>Annuler</span>
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => setFactureSelectionnee(fc)}
                        className="p-1.5 text-neutral-600 hover:text-[#2B2119] hover:bg-neutral-100 rounded-lg transition inline-flex items-center gap-1 text-xs font-medium cursor-pointer"
                        title="Voir les détails"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Détails</span>
                      </button>

                      <a
                        href={`/api/factures-abonnement/${fc.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-[#C1652D] hover:bg-[#C1652D]/10 rounded-lg transition inline-flex items-center gap-1 text-xs font-semibold cursor-pointer"
                        title="Télécharger la facture PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Facture PDF</span>
                      </a>
                    </div>
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

      {/* Modale de Confirmation d'Annulation */}
      {factureAAnnuler && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-2xl p-6 border border-[#E5DACF] shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-extrabold text-[#2B2119]">
                Annuler cette tentative de paiement ?
              </h3>
              <p className="text-xs text-[#6D5D52] leading-relaxed">
                Tu es sur le point d&apos;annuler la tentative de règlement de{" "}
                <span className="font-bold text-[#2B2119]">
                  {factureAAnnuler.montant.toLocaleString("fr-FR")} FCFA
                </span>
                . Cette facture sera classée comme annulée et tu pourras relancer un paiement à tout moment.
              </p>
            </div>

            {erreurAnnulation && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium text-center">
                {erreurAnnulation}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setFactureAAnnuler(null);
                  setErreurAnnulation(null);
                }}
                disabled={loadingAnnulerId === factureAAnnuler.id}
                className="flex-1 py-2.5 px-4 rounded-xl border border-[#E5DACF] text-xs font-bold text-[#6D5D52] hover:text-[#2B2119] hover:bg-[#FAF6F1] transition-colors cursor-pointer disabled:opacity-50"
              >
                Garder en attente
              </button>

              <button
                type="button"
                onClick={handleConfirmerAnnulation}
                disabled={loadingAnnulerId === factureAAnnuler.id}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-sm cursor-pointer inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {loadingAnnulerId === factureAAnnuler.id ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Annulation...</span>
                  </>
                ) : (
                  <span>Confirmer l&apos;annulation</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
