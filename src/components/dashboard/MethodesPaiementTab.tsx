"use client";

import React, { useState } from "react";
import { Plus, Trash2, CheckCircle2, Smartphone, CreditCard, Star, Loader2 } from "lucide-react";
import ModalAjoutMethode from "./ModalAjoutMethode";
import {
  definirMethodeParDefautAction,
  supprimerMethodePaiementAction,
} from "@/app/actions/payment-methods";

export interface MethodePaiementItem {
  id: string;
  type: string;
  numero_telephone: string;
  nom_titulaire?: string | null;
  derniers_chiffres: string;
  par_defaut: boolean;
}

interface MethodesPaiementTabProps {
  methodesInitiales: MethodePaiementItem[];
  isPatron: boolean;
}

export default function MethodesPaiementTab({
  methodesInitiales,
  isPatron,
}: MethodesPaiementTabProps) {
  const [methodes, setMethodes] = useState<MethodePaiementItem[]>(methodesInitiales);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleSetDefault = async (id: string) => {
    setLoadingId(id);
    try {
      const res = await definirMethodeParDefautAction(id);
      if (res.success) {
        setMethodes((prev) =>
          prev
            .map((m) => ({
              ...m,
              par_defaut: m.id === id,
            }))
            .sort((a, b) => (b.par_defaut ? 1 : 0) - (a.par_defaut ? 1 : 0))
        );
      }
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Es-tu certain de vouloir retirer ce moyen de paiement ?")) return;

    setLoadingId(id);
    try {
      const res = await supprimerMethodePaiementAction(id);
      if (res.success) {
        setMethodes((prev) => {
          const restants = prev.filter((m) => m.id !== id);
          if (restants.length > 0 && !restants.some((m) => m.par_defaut)) {
            restants[0].par_defaut = true;
          }
          return restants;
        });
      }
    } finally {
      setLoadingId(null);
    }
  };

  const handleAjoutSuccess = (nouvelle: MethodePaiementItem) => {
    setMethodes((prev) => {
      let updated = nouvelle.par_defaut
        ? prev.map((m) => ({ ...m, par_defaut: false }))
        : [...prev];
      updated.push(nouvelle);
      return updated.sort((a, b) => (b.par_defaut ? 1 : 0) - (a.par_defaut ? 1 : 0));
    });
  };

  const getLabelType = (type: string) => {
    switch (type) {
      case "mtn_momo":
        return { label: "MTN Mobile Money", dot: "bg-amber-400" };
      case "moov_money":
        return { label: "Moov Money", dot: "bg-blue-500" };
      case "carte":
        return { label: "Carte Bancaire", dot: "bg-emerald-500" };
      default:
        return { label: type, dot: "bg-neutral-400" };
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête de section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-[#2B2119] text-base">Tes moyens de paiement enregistrés</h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            Sélectionne un moyen par défaut pour renouveler tes abonnements en 1 clic.
          </p>
        </div>

        {isPatron && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#C1652D] hover:bg-[#A05324] transition shadow-xs shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter un moyen</span>
          </button>
        )}
      </div>

      {/* Grille des moyens de paiement */}
      {methodes.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 border border-neutral-200/80 text-center">
          <div className="w-12 h-12 mx-auto mb-3 bg-[#FAF6F1] rounded-2xl flex items-center justify-center text-[#C1652D]">
            <Smartphone className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-[#2B2119] text-sm">Aucun moyen de paiement enregistré</h4>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
            Ajoute ton compte MTN MoMo ou Moov Money pour accélérer tes prochains renouvellements.
          </p>
          {isPatron && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-[#C1652D] bg-[#C1652D]/10 hover:bg-[#C1652D]/20 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Ajouter maintenant
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {methodes.map((m) => {
            const typeInfo = getLabelType(m.type);
            const isLoading = loadingId === m.id;

            return (
              <div
                key={m.id}
                className={`relative rounded-2xl p-5 border-2 transition bg-white flex flex-col justify-between ${
                  m.par_defaut
                    ? "border-[#C1652D] shadow-sm ring-2 ring-[#C1652D]/10"
                    : "border-neutral-200 hover:border-neutral-300"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${typeInfo.dot}`} />
                      <span className="text-xs font-bold text-[#2B2119]">{typeInfo.label}</span>
                    </div>

                    {m.par_defaut && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3 h-3" />
                        Par défaut
                      </span>
                    )}
                  </div>

                  <div className="mt-4">
                    <p className="font-mono text-base font-bold text-[#2B2119]">
                      •••• •••• •• {m.derniers_chiffres}
                    </p>
                    {m.nom_titulaire && (
                      <p className="text-xs text-neutral-500 mt-1 truncate">{m.nom_titulaire}</p>
                    )}
                  </div>
                </div>

                {isPatron && (
                  <div className="mt-5 pt-4 border-t border-neutral-100 flex items-center justify-between text-xs">
                    {!m.par_defaut ? (
                      <button
                        onClick={() => handleSetDefault(m.id)}
                        disabled={isLoading}
                        className="text-neutral-600 hover:text-[#C1652D] font-medium transition inline-flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                      >
                        {isLoading ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Star className="w-3.5 h-3.5" />
                        )}
                        <span>Définir par défaut</span>
                      </button>
                    ) : (
                      <span className="text-neutral-400 italic text-[11px]">Méthode active</span>
                    )}

                    <button
                      onClick={() => handleDelete(m.id)}
                      disabled={isLoading}
                      className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition disabled:opacity-50 ml-auto cursor-pointer"
                      title="Supprimer ce moyen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal d'ajout */}
      <ModalAjoutMethode
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleAjoutSuccess}
      />
    </div>
  );
}
