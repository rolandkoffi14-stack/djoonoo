"use client";

import React, { useState } from "react";
import { X, Smartphone, CreditCard, ShieldCheck, Loader2, AlertCircle } from "lucide-react";
import { ajouterMethodePaiementAction } from "@/app/actions/payment-methods";

interface ModalAjoutMethodeProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (nouvelleMethode: any) => void;
}

export default function ModalAjoutMethode({
  isOpen,
  onClose,
  onSuccess,
}: ModalAjoutMethodeProps) {
  const [type, setType] = useState<string>("mtn_momo");
  const [numeroTelephone, setNumeroTelephone] = useState<string>("");
  const [nomTitulaire, setNomTitulaire] = useState<string>("");
  const [parDefaut, setParDefaut] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [erreur, setErreur] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur(null);
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("type", type);
      formData.append("numero_telephone", numeroTelephone);
      formData.append("nom_titulaire", nomTitulaire);
      formData.append("par_defaut", parDefaut ? "true" : "false");

      const res = await ajouterMethodePaiementAction(formData);
      if (res.success && res.data) {
        onSuccess(res.data);
        onClose();
      } else {
        setErreur(res.error || "Impossible d'ajouter ce moyen de paiement.");
      }
    } catch (err: any) {
      setErreur(err.message || "Erreur de communication avec le serveur.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-neutral-200 overflow-hidden">
        {/* En-tête */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100 bg-[#FAF6F1]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#C1652D]/10 rounded-lg text-[#C1652D]">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-[#2B2119] text-base">Ajouter un moyen de paiement</h3>
              <p className="text-xs text-neutral-500">MTN MoMo & Moov Money Bénin</p>
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

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {erreur && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
              <span>{erreur}</span>
            </div>
          )}

          {/* Choix du type de moyen : MTN et Moov uniquement */}
          <div>
            <label className="block text-xs font-bold text-[#2B2119] mb-2 uppercase tracking-wider">
              Opérateur Mobile Money (Bénin)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType("mtn_momo")}
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
                  type === "mtn_momo"
                    ? "bg-[#C1652D]/10 border-[#C1652D] text-[#C1652D] ring-2 ring-[#C1652D]/20"
                    : "bg-white border-neutral-200 hover:bg-neutral-50 text-neutral-700"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 text-[#C1652D]" />
                <span>MTN MoMo</span>
              </button>

              <button
                type="button"
                onClick={() => setType("moov_money")}
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
                  type === "moov_money"
                    ? "bg-[#C1652D]/10 border-[#C1652D] text-[#C1652D] ring-2 ring-[#C1652D]/20"
                    : "bg-white border-neutral-200 hover:bg-neutral-50 text-neutral-700"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 text-[#C1652D]" />
                <span>Moov Money</span>
              </button>
            </div>
          </div>

          {/* Numéro de téléphone */}
          <div>
            <label className="block text-xs font-bold text-[#2B2119] mb-1.5">
              Numéro de téléphone Mobile Money
            </label>
            <div className="relative">
              <input
                type="tel"
                required
                value={numeroTelephone}
                onChange={(e) => setNumeroTelephone(e.target.value)}
                placeholder="Numéro de téléphone"
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#C1652D] focus:border-[#C1652D]"
              />
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">
              Format béninois (+229) ou numéro local sans indicatif.
            </p>
          </div>

          {/* Nom du titulaire */}
          <div>
            <label className="block text-xs font-bold text-[#2B2119] mb-1.5">
              Nom du titulaire <span className="font-normal text-neutral-500">(optionnel)</span>
            </label>
            <input
              type="text"
              value={nomTitulaire}
              onChange={(e) => setNomTitulaire(e.target.value)}
              placeholder="Nom et prénoms du titulaire"
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#C1652D] focus:border-[#C1652D]"
            />
          </div>

          {/* Par défaut */}
          <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={parDefaut}
              onChange={(e) => setParDefaut(e.target.checked)}
              className="w-4 h-4 rounded text-[#C1652D] focus:ring-[#C1652D] border-neutral-300 cursor-pointer"
            />
            <span className="text-xs font-semibold text-[#2B2119]">
              Définir comme méthode de paiement par défaut
            </span>
          </label>

          {/* Boutons */}
          <div className="pt-3 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-neutral-700 bg-white border border-neutral-200 hover:bg-neutral-50 transition cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#C1652D] hover:bg-[#A05324] transition disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <span>Enregistrer</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
