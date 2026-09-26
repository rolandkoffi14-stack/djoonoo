"use client";

import { useState } from "react";
import { Check, Smartphone, Banknote, RefreshCw, ArrowRight } from "lucide-react";
import Link from "next/link";

interface DemoProduct {
  id: string;
  nom: string;
  categorie: string;
  prix: number;
  stockInitial: number;
}

const PHONE_PRODUCTS: DemoProduct[] = [
  {
    id: "phone-1",
    nom: "Infinix Hot 40 (128 Go)",
    categorie: "Smartphone Android",
    prix: 85000,
    stockInitial: 7,
  },
  {
    id: "phone-2",
    nom: "Tecno Spark 20 (64 Go)",
    categorie: "Smartphone Android",
    prix: 65000,
    stockInitial: 5,
  },
  {
    id: "phone-3",
    nom: "Écouteurs Oraimo FreePods",
    categorie: "Accessoires audio",
    prix: 15000,
    stockInitial: 14,
  },
];

export default function InteractiveDemo() {
  const [selectedProduct, setSelectedProduct] = useState<DemoProduct>(PHONE_PRODUCTS[0]);
  const [modePaiement, setModePaiement] = useState<"mtn_momo" | "moov_money" | "especes">("mtn_momo");
  const [typeReglement, setTypeReglement] = useState<"total" | "acompte" | "credit">("total");
  const [venteEnregistree, setVenteEnregistree] = useState<boolean>(false);
  const [numeroFacture, setNumeroFacture] = useState<string>("FAC-2026-0042");

  const total = selectedProduct.prix;

  // Calcul du montant versé selon la situation choisie
  const montantVerse =
    typeReglement === "total"
      ? total
      : typeReglement === "acompte"
      ? Math.round(total / 2)
      : 0;

  const resteAPayer = Math.max(0, total - montantVerse);

  // Statuts réels (vert / orange / rouge)
  const getStatutBadge = () => {
    if (montantVerse >= total && total > 0) {
      return {
        label: "Payé",
        classes: "bg-[#EDF7EE] text-[#1E7E34] border border-[#1E7E34]/25",
      };
    }
    if (montantVerse > 0 && montantVerse < total) {
      return {
        label: "Partiel",
        classes: "bg-[#FEF3EB] text-[#C1652D] border border-[#C1652D]/25",
      };
    }
    return {
      label: "Impayé",
      classes: "bg-[#FDE8E8] text-[#C53030] border border-[#C53030]/25",
    };
  };

  const statut = getStatutBadge();

  const handleEnregistrerVente = () => {
    const randomSeq = String(Math.floor(Math.random() * 900) + 100);
    setNumeroFacture(`FAC-2026-${randomSeq}`);
    setVenteEnregistree(true);
  };

  const handleReset = () => {
    setVenteEnregistree(false);
  };

  return (
    <section id="demo" className="py-16 sm:py-24 bg-[#FAF6F1] border-t border-[rgba(43,33,25,0.08)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(193,101,45,0.2)] bg-[#F5EDE3] px-3.5 py-1 text-xs font-semibold text-[#C1652D] mb-3">
            <span>Démo interactive</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#2B2119]">
            Essaie par toi-même : enregistre une vente test
          </h2>
          <p className="mt-3 text-base sm:text-lg text-[#6B5C52]">
            Exemple d'une boutique de téléphones : clique sur un modèle, choisis le paiement, et
            regarde le total et le statut se calculer sous tes yeux.
          </p>
        </div>

        {/* Cadre de Démo Stylisée Interactive */}
        <div className="mx-auto max-w-3xl rounded-2xl border border-[rgba(43,33,25,0.12)] bg-[#F5EDE3]/50 p-6 sm:p-8 shadow-[0_4px_20px_rgba(43,33,25,0.04)]">
          {!venteEnregistree ? (
            <div className="space-y-6">
              {/* Étape 1 : Choix du téléphone / accessoire */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#6B5C52] mb-3">
                  1. Choisis un article dans la boutique
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {PHONE_PRODUCTS.map((p) => {
                    const isSelected = selectedProduct.id === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedProduct(p)}
                        className={`text-left p-4 rounded-xl transition-all cursor-pointer select-none ${
                          isSelected
                            ? "border-2 border-[#C1652D] bg-[#FAF6F1] shadow-[0_2px_12px_rgba(193,101,45,0.18)]"
                            : "border border-[rgba(43,33,25,0.12)] bg-[#FAF6F1]/80 hover:bg-[#FAF6F1] hover:border-[rgba(43,33,25,0.25)]"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <p className="text-sm font-bold text-[#2B2119] leading-snug">{p.nom}</p>
                          {isSelected && (
                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#C1652D] text-[#FAF6F1]">
                              <Check className="h-2.5 w-2.5" />
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-extrabold text-[#C1652D] mt-2">
                          {p.prix.toLocaleString("fr-FR")} FCFA
                        </p>
                        <p className="text-[11px] text-[#6B5C52] mt-1">
                          Stock en magasin : {p.stockInitial} unités
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Étape 2 : Mode de règlement */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#6B5C52] mb-3">
                  2. Choisis le mode de paiement
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setModePaiement("mtn_momo")}
                    className={`flex items-center justify-center gap-2 p-3.5 rounded-xl text-sm font-semibold transition-all cursor-pointer select-none ${
                      modePaiement === "mtn_momo"
                        ? "border-2 border-[#C1652D] bg-[#FAF6F1] text-[#C1652D] shadow-[0_2px_8px_rgba(193,101,45,0.15)] font-bold"
                        : "border border-[rgba(43,33,25,0.12)] bg-[#FAF6F1]/80 text-[#2B2119] hover:bg-[#FAF6F1]"
                    }`}
                  >
                    <Smartphone className="h-4 w-4 shrink-0" />
                    <span>MTN MoMo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModePaiement("moov_money")}
                    className={`flex items-center justify-center gap-2 p-3.5 rounded-xl text-sm font-semibold transition-all cursor-pointer select-none ${
                      modePaiement === "moov_money"
                        ? "border-2 border-[#C1652D] bg-[#FAF6F1] text-[#C1652D] shadow-[0_2px_8px_rgba(193,101,45,0.15)] font-bold"
                        : "border border-[rgba(43,33,25,0.12)] bg-[#FAF6F1]/80 text-[#2B2119] hover:bg-[#FAF6F1]"
                    }`}
                  >
                    <Smartphone className="h-4 w-4 shrink-0" />
                    <span>Moov Money</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModePaiement("especes")}
                    className={`flex items-center justify-center gap-2 p-3.5 rounded-xl text-sm font-semibold transition-all cursor-pointer select-none ${
                      modePaiement === "especes"
                        ? "border-2 border-[#C1652D] bg-[#FAF6F1] text-[#C1652D] shadow-[0_2px_8px_rgba(193,101,45,0.15)] font-bold"
                        : "border border-[rgba(43,33,25,0.12)] bg-[#FAF6F1]/80 text-[#2B2119] hover:bg-[#FAF6F1]"
                    }`}
                  >
                    <Banknote className="h-4 w-4 shrink-0" />
                    <span>Espèces</span>
                  </button>
                </div>
              </div>

              {/* Étape 3 : Situation de règlement */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#6B5C52] mb-3">
                  3. Situation de règlement
                </label>
                <div className="grid grid-cols-3 gap-2.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setTypeReglement("total")}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer select-none ${
                      typeReglement === "total"
                        ? "border-2 border-[#C1652D] bg-[#FAF6F1] text-[#2B2119] font-bold shadow-sm"
                        : "border border-[rgba(43,33,25,0.12)] bg-[#FAF6F1]/70 text-[#6B5C52] hover:bg-[#FAF6F1]"
                    }`}
                  >
                    Paiement comptant (Totalité)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTypeReglement("acompte")}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer select-none ${
                      typeReglement === "acompte"
                        ? "border-2 border-[#C1652D] bg-[#FAF6F1] text-[#2B2119] font-bold shadow-sm"
                        : "border border-[rgba(43,33,25,0.12)] bg-[#FAF6F1]/70 text-[#6B5C52] hover:bg-[#FAF6F1]"
                    }`}
                  >
                    Acompte (50% versé)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTypeReglement("credit")}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer select-none ${
                      typeReglement === "credit"
                        ? "border-2 border-[#C1652D] bg-[#FAF6F1] text-[#2B2119] font-bold shadow-sm"
                        : "border border-[rgba(43,33,25,0.12)] bg-[#FAF6F1]/70 text-[#6B5C52] hover:bg-[#FAF6F1]"
                    }`}
                  >
                    À crédit (0 FCFA versé)
                  </button>
                </div>
              </div>

              {/* Récapitulatif instantané calculé sous les yeux */}
              <div className="rounded-xl border border-[rgba(43,33,25,0.12)] bg-[#FAF6F1] p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[rgba(43,33,25,0.08)]">
                  <div>
                    <span className="text-xs text-[#6B5C52]">Article sélectionné</span>
                    <p className="text-base font-bold text-[#2B2119]">{selectedProduct.nom}</p>
                    <span className="text-xs text-[#6B5C52]">{selectedProduct.categorie}</span>
                  </div>
                  <div className="sm:text-right">
                    <span className="text-xs text-[#6B5C52]">Prix de vente</span>
                    <p className="text-2xl font-black text-[#C1652D]">
                      {total.toLocaleString("fr-FR")} FCFA
                    </p>
                  </div>
                </div>

                <div className="pt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-[#6B5C52]">Somme encaissée : </span>
                    <strong className="text-[#2B2119] text-sm">
                      {montantVerse.toLocaleString("fr-FR")} FCFA
                    </strong>
                    {resteAPayer > 0 && (
                      <span className="text-[#C53030] ml-2 font-semibold">
                        (Créance client : {resteAPayer.toLocaleString("fr-FR")} FCFA)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#6B5C52]">Statut calculé :</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${statut.classes}`}>
                      {statut.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bouton d'action */}
              <button
                type="button"
                onClick={handleEnregistrerVente}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#C1652D] px-6 py-4 text-base font-semibold text-[#FAF6F1] shadow-[0_2px_8px_rgba(193,101,45,0.25)] hover:bg-[#A85422] active:scale-[0.99] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1652D]"
              >
                <span>Enregistrer la vente</span>
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          ) : (
            /* Confirmation après enregistrement de vente */
            <div className="text-center py-6 space-y-5">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EDF7EE] text-[#1E7E34] border border-[#1E7E34]/20">
                <Check className="h-7 w-7" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-[#2B2119]">Vente enregistrée avec succès !</h3>
                <p className="text-xs font-medium text-[#6B5C52] mt-1">
                  Numéro de reçu : <strong className="text-[#2B2119]">{numeroFacture}</strong> (généré automatiquement)
                </p>
              </div>

              <div className="mx-auto max-w-sm rounded-xl border border-[rgba(43,33,25,0.08)] bg-[#FAF6F1] p-4 text-xs text-left space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#6B5C52]">Article :</span>
                  <span className="font-semibold text-[#2B2119]">{selectedProduct.nom}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B5C52]">Montant total :</span>
                  <span className="font-semibold text-[#2B2119]">
                    {total.toLocaleString("fr-FR")} FCFA
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B5C52]">Mode de paiement :</span>
                  <span className="font-semibold text-[#2B2119]">
                    {modePaiement === "mtn_momo"
                      ? "MTN Mobile Money"
                      : modePaiement === "moov_money"
                      ? "Moov Money"
                      : "Espèces"}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-[rgba(43,33,25,0.08)]">
                  <span className="text-[#6B5C52]">Statut :</span>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${statut.classes}`}>
                    {statut.label}
                  </span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-[#6B5C52]">Nouveau stock restant :</span>
                  <span className="font-bold text-[#C1652D]">
                    {selectedProduct.stockInitial - 1} unités
                  </span>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-[rgba(43,33,25,0.2)] bg-[#FAF6F1] px-5 py-2.5 text-xs font-semibold text-[#2B2119] hover:bg-[#F2EAE0] transition-colors cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Tester une autre vente</span>
                </button>
                <Link
                  href="/inscription"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[#C1652D] px-5 py-2.5 text-xs font-semibold text-[#FAF6F1] shadow-sm hover:bg-[#A85422] transition-colors"
                >
                  <span>Créer mon compte pour ma boutique</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
