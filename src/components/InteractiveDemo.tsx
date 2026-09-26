"use client";

import { useState } from "react";
import { Check, ShoppingBag, Smartphone, Banknote, RefreshCw, ArrowRight } from "lucide-react";
import Link from "next/link";

interface DemoProduct {
  id: string;
  nom: string;
  prix: number;
  stockInitial: number;
}

const DEMO_PRODUCTS: DemoProduct[] = [
  { id: "p1", nom: "Sac de Riz Parfumé 25kg", prix: 17500, stockInitial: 14 },
  { id: "p2", nom: "Bidon d'Huile raffinée 5L", prix: 6500, stockInitial: 8 },
  { id: "p3", nom: "Savon Noir Artisanal (Pack 6)", prix: 1200, stockInitial: 25 },
];

export default function InteractiveDemo() {
  const [selectedProduct, setSelectedProduct] = useState<DemoProduct>(DEMO_PRODUCTS[0]);
  const [quantite, setQuantite] = useState<number>(1);
  const [modePaiement, setModePaiement] = useState<"mtn_momo" | "moov_money" | "especes">("mtn_momo");
  const [typeReglement, setTypeReglement] = useState<"total" | "acompte" | "credit">("total");
  const [venteEnregistree, setVenteEnregistree] = useState<boolean>(false);
  const [numeroFacture, setNumeroFacture] = useState<string>("FAC-2026-0042");

  const total = selectedProduct.prix * quantite;

  // Calcul du montant versé selon le type de règlement
  const montantVerse =
    typeReglement === "total"
      ? total
      : typeReglement === "acompte"
      ? Math.round(total / 2)
      : 0;

  const resteAPayer = Math.max(0, total - montantVerse);

  // Statuts réels (vert / orange / rouge exclusivement réservés aux entités réelles)
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
            Choisis un article, un moyen de paiement, et regarde le total et le statut se mettre à jour instantanément.
          </p>
        </div>

        {/* Cadre de Démo Stylisée Interactive */}
        <div className="mx-auto max-w-3xl rounded-2xl border border-[rgba(43,33,25,0.12)] bg-[#F5EDE3]/50 p-6 sm:p-8 shadow-[0_4px_20px_rgba(43,33,25,0.04)]">
          {!venteEnregistree ? (
            <div className="space-y-6">
              {/* Étape 1 : Choix de l'article */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#6B5C52] mb-3">
                  1. Choisis un produit d'exemple
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {DEMO_PRODUCTS.map((p) => {
                    const isSelected = selectedProduct.id === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedProduct(p);
                          setQuantite(1);
                        }}
                        className={`text-left p-3.5 rounded-xl border transition-all ${
                          isSelected
                            ? "border-[#C1652D] bg-[#FAF6F1] shadow-[0_2px_8px_rgba(193,101,45,0.15)]"
                            : "border-[rgba(43,33,25,0.1)] bg-[#FAF6F1]/70 hover:border-[rgba(43,33,25,0.2)]"
                        }`}
                      >
                        <p className="text-sm font-semibold text-[#2B2119]">{p.nom}</p>
                        <p className="text-xs font-bold text-[#C1652D] mt-1">
                          {p.prix.toLocaleString("fr-FR")} FCFA
                        </p>
                        <p className="text-[11px] text-[#6B5C52] mt-0.5">
                          En stock : {p.stockInitial} unités
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
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-all ${
                      modePaiement === "mtn_momo"
                        ? "border-[#C1652D] bg-[#FAF6F1] text-[#C1652D] shadow-sm"
                        : "border-[rgba(43,33,25,0.1)] bg-[#FAF6F1]/70 text-[#2B2119] hover:border-[rgba(43,33,25,0.2)]"
                    }`}
                  >
                    <Smartphone className="h-4 w-4" />
                    <span>MTN MoMo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModePaiement("moov_money")}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-all ${
                      modePaiement === "moov_money"
                        ? "border-[#C1652D] bg-[#FAF6F1] text-[#C1652D] shadow-sm"
                        : "border-[rgba(43,33,25,0.1)] bg-[#FAF6F1]/70 text-[#2B2119] hover:border-[rgba(43,33,25,0.2)]"
                    }`}
                  >
                    <Smartphone className="h-4 w-4" />
                    <span>Moov Money</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModePaiement("especes")}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-all ${
                      modePaiement === "especes"
                        ? "border-[#C1652D] bg-[#FAF6F1] text-[#C1652D] shadow-sm"
                        : "border-[rgba(43,33,25,0.1)] bg-[#FAF6F1]/70 text-[#2B2119] hover:border-[rgba(43,33,25,0.2)]"
                    }`}
                  >
                    <Banknote className="h-4 w-4" />
                    <span>Espèces</span>
                  </button>
                </div>
              </div>

              {/* Étape 3 : Scénario d'encaissement (Total / Acompte / Crédit) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#6B5C52] mb-3">
                  3. Situation de règlement
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setTypeReglement("total")}
                    className={`p-2.5 rounded-lg border text-center font-medium transition-all ${
                      typeReglement === "total"
                        ? "border-[#C1652D] bg-[#FAF6F1] text-[#2B2119] font-bold"
                        : "border-[rgba(43,33,25,0.1)] bg-[#FAF6F1]/60 text-[#6B5C52]"
                    }`}
                  >
                    Règlement total
                  </button>
                  <button
                    type="button"
                    onClick={() => setTypeReglement("acompte")}
                    className={`p-2.5 rounded-lg border text-center font-medium transition-all ${
                      typeReglement === "acompte"
                        ? "border-[#C1652D] bg-[#FAF6F1] text-[#2B2119] font-bold"
                        : "border-[rgba(43,33,25,0.1)] bg-[#FAF6F1]/60 text-[#6B5C52]"
                    }`}
                  >
                    Acompte partiel
                  </button>
                  <button
                    type="button"
                    onClick={() => setTypeReglement("credit")}
                    className={`p-2.5 rounded-lg border text-center font-medium transition-all ${
                      typeReglement === "credit"
                        ? "border-[#C1652D] bg-[#FAF6F1] text-[#2B2119] font-bold"
                        : "border-[rgba(43,33,25,0.1)] bg-[#FAF6F1]/60 text-[#6B5C52]"
                    }`}
                  >
                    À crédit (impayé)
                  </button>
                </div>
              </div>

              {/* Récapitulatif dynamique sous les yeux */}
              <div className="rounded-xl border border-[rgba(43,33,25,0.1)] bg-[#FAF6F1] p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[rgba(43,33,25,0.08)]">
                  <div>
                    <span className="text-xs text-[#6B5C52]">Article sélectionné</span>
                    <p className="text-base font-bold text-[#2B2119]">{selectedProduct.nom}</p>
                  </div>
                  <div className="sm:text-right">
                    <span className="text-xs text-[#6B5C52]">Total à régler</span>
                    <p className="text-xl font-bold text-[#C1652D]">
                      {total.toLocaleString("fr-FR")} FCFA
                    </p>
                  </div>
                </div>

                <div className="pt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-[#6B5C52]">Montant versé : </span>
                    <strong className="text-[#2B2119]">
                      {montantVerse.toLocaleString("fr-FR")} FCFA
                    </strong>
                    {resteAPayer > 0 && (
                      <span className="text-[#C53030] ml-2 font-medium">
                        (Reste dû : {resteAPayer.toLocaleString("fr-FR")} FCFA)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#6B5C52]">Statut calculé :</span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statut.classes}`}>
                      {statut.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bouton d'action */}
              <button
                type="button"
                onClick={handleEnregistrerVente}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#C1652D] px-6 py-4 text-base font-semibold text-[#FAF6F1] shadow-[0_2px_8px_rgba(193,101,45,0.25)] hover:bg-[#A85422] active:scale-[0.99] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1652D]"
              >
                <span>Enregistrer la vente</span>
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          ) : (
            /* Confirmation après enregistrement */
            <div className="text-center py-6 space-y-5">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EDF7EE] text-[#1E7E34] border border-[#1E7E34]/20">
                <Check className="h-7 w-7" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-[#2B2119]">Vente enregistrée avec succès !</h3>
                <p className="text-xs font-medium text-[#6B5C52] mt-1">
                  Numéro de facture : <strong className="text-[#2B2119]">{numeroFacture}</strong> (généré automatiquement)
                </p>
              </div>

              <div className="mx-auto max-w-sm rounded-xl border border-[rgba(43,33,25,0.08)] bg-[#FAF6F1] p-4 text-xs text-left space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#6B5C52]">Produit :</span>
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
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-[rgba(43,33,25,0.2)] bg-[#FAF6F1] px-5 py-2.5 text-xs font-semibold text-[#2B2119] hover:bg-[#F2EAE0] transition-colors"
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
