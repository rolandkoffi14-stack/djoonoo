"use client";

import { useState } from "react";
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Receipt,
  Smartphone,
  CheckCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  User,
  Search,
  Check,
} from "lucide-react";

interface Product {
  id: string;
  nom: string;
  prix_unitaire: number;
  stock: number;
  seuil_alerte: number;
  categorie: string;
}

const PRODUCTS_SAMPLE: Product[] = [
  {
    id: "p1",
    nom: "Sac de Riz Parfumé 25kg",
    prix_unitaire: 17500,
    stock: 18,
    seuil_alerte: 5,
    categorie: "Céréales & Vivres",
  },
  {
    id: "p2",
    nom: "Huile végétale raffinée 5L",
    prix_unitaire: 6500,
    stock: 4,
    seuil_alerte: 6,
    categorie: "Condiments",
  },
  {
    id: "p3",
    nom: "Savon Noir Artisanal (Pack 6)",
    prix_unitaire: 1200,
    stock: 35,
    seuil_alerte: 10,
    categorie: "Hygiène",
  },
  {
    id: "p4",
    nom: "Pagne Woodin Original (3 pièces)",
    prix_unitaire: 18000,
    stock: 12,
    seuil_alerte: 3,
    categorie: "Textile",
  },
  {
    id: "p5",
    nom: "Sucre blanc en morceaux 1kg",
    prix_unitaire: 950,
    stock: 45,
    seuil_alerte: 12,
    categorie: "Épicerie",
  },
];

interface CartItem {
  product: Product;
  quantite: number;
}

export default function InteractiveDemo() {
  const [cart, setCart] = useState<CartItem[]>([
    { product: PRODUCTS_SAMPLE[0], quantite: 1 },
    { product: PRODUCTS_SAMPLE[1], quantite: 1 },
  ]);
  const [remise, setRemise] = useState<number>(0);
  const [modePaiement, setModePaiement] = useState<"mtn_momo" | "moov_money" | "especes">("mtn_momo");
  const [montantVerse, setMontantVerse] = useState<number>(24000);
  const [clientTel, setClientTel] = useState<string>("0162169101");
  const [clientFound, setClientFound] = useState<boolean>(true);
  const [factureGeneree, setFactureGeneree] = useState<boolean>(false);

  // Calcul du sous-total (Règle 9)
  const sousTotal = cart.reduce((acc, item) => acc + item.product.prix_unitaire * item.quantite, 0);
  const montantTotal = Math.max(0, sousTotal - (remise || 0));

  // Statut dérivé automatique (Règle 4)
  const getStatutPaiement = () => {
    if (montantVerse >= montantTotal && montantTotal > 0) {
      return { label: "payé", color: "bg-[#EDF7EE] text-[#1E7E34] border-[#1E7E34]/20" };
    }
    if (montantVerse > 0 && montantVerse < montantTotal) {
      return { label: "partiel", color: "bg-[#FEF3EB] text-[#DD6B20] border-[#DD6B20]/20" };
    }
    return { label: "impayé", color: "bg-[#FDE8E8] text-[#C53030] border-[#C53030]/20" };
  };

  const statut = getStatutPaiement();

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantite: i.quantite + 1 } : i
        );
      }
      return [...prev, { product, quantite: 1 }];
    });
    setFactureGeneree(false);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const nextQty = item.quantite + delta;
            return nextQty > 0 ? { ...item, quantite: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
    setFactureGeneree(false);
  };

  const handleValidate = () => {
    setFactureGeneree(true);
  };

  return (
    <section id="demonstration" className="py-16 sm:py-24 bg-[#F3ECE2]/50 border-y border-[rgba(43,33,25,0.08)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* En-tête de section */}
        <div className="max-w-2xl mb-12">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#C1652D] mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-[#C1652D]" />
            Démonstration en temps réel
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#2B2119]">
            Essaie la caisse djoonoo maintenant
          </h2>
          <p className="mt-3 text-base text-[#6B5C52]">
            Ajoute un produit, choisis un mode de règlement et observe le calcul automatique des
            impayés et la numérotation légale de facture.
          </p>
        </div>

        {/* Console Interactive */}
        <div className="rounded-2xl border border-[rgba(43,33,25,0.12)] bg-[#FAF6F1] shadow-[0_4px_20px_rgba(43,33,25,0.06)] overflow-hidden">
          {/* Top Bar de la caisse */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[rgba(43,33,25,0.08)] bg-[#FFFFFF] px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-3 w-3 rounded-full bg-[#1E7E34] animate-pulse" />
              <div>
                <p className="text-sm font-bold text-[#2B2119]">Boutique B01 — Cocotomey (Siège)</p>
                <p className="text-xs text-[#6B5C52]">Vendeuse : Ablawa D. • Connectée</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F5EAE3] px-3 py-1 text-xs font-semibold text-[#C1652D]">
                <span>FAC-2KR-B01-2026-00042</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[rgba(43,33,25,0.08)]">
            {/* Colonne gauche : Catalogue Produits (7 cols) */}
            <div className="lg:col-span-7 p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-bold text-[#2B2119]">Articles de la boutique</h3>
                <span className="text-xs font-medium text-[#6B5C52]">
                  {PRODUCTS_SAMPLE.length} produits en stock
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {PRODUCTS_SAMPLE.map((prod) => {
                  const inCart = cart.find((i) => i.product.id === prod.id);
                  const isStockBas = prod.stock <= prod.seuil_alerte;

                  return (
                    <div
                      key={prod.id}
                      onClick={() => addToCart(prod)}
                      className="group relative flex flex-col justify-between rounded-xl border border-[rgba(43,33,25,0.09)] bg-[#FFFFFF] p-4 text-left transition-all hover:border-[#C1652D] hover:shadow-sm cursor-pointer select-none"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-[11px] font-medium text-[#6B5C52] uppercase tracking-wider">
                            {prod.categorie}
                          </span>
                          {isStockBas ? (
                            <span className="inline-flex items-center gap-1 rounded bg-[#FDE8E8] px-1.5 py-0.5 text-[10px] font-bold text-[#C53030]">
                              <AlertTriangle className="h-2.5 w-2.5" />
                              Alerte {prod.stock} restant(s)
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold text-[#1E7E34]">
                              {prod.stock} en stock
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-semibold text-[#2B2119] group-hover:text-[#C1652D] transition-colors leading-snug">
                          {prod.nom}
                        </h4>
                      </div>

                      <div className="mt-4 flex items-center justify-between pt-2 border-t border-[rgba(43,33,25,0.05)]">
                        <span className="text-base font-bold text-[#2B2119]">
                          {prod.prix_unitaire.toLocaleString("fr-FR")} FCFA
                        </span>
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F5EAE3] text-[#C1652D] group-hover:bg-[#C1652D] group-hover:text-[#FAF6F1] transition-all min-h-[32px] min-w-[32px]"
                          aria-label={`Ajouter ${prod.nom}`}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      {inCart && (
                        <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#C1652D] text-[10px] font-bold text-white">
                          {inCart.quantite}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Colonne droite : Caisse & Panier en direct (5 cols) */}
            <div className="lg:col-span-5 p-6 sm:p-8 bg-[#FFFFFF] flex flex-col justify-between">
              <div>
                {/* Rapprochement Client (Décision C11 de l'audit) */}
                <div className="mb-6 rounded-xl border border-[rgba(43,33,25,0.1)] bg-[#FAF6F1] p-3.5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#2B2119] flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-[#C1652D]" />
                      Client (Rapprochement par téléphone)
                    </span>
                    <span className="text-[11px] text-[#1E7E34] font-semibold flex items-center gap-1">
                      <Check className="h-3 w-3" /> Fiche trouvée
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="tel"
                      value={clientTel}
                      onChange={(e) => setClientTel(e.target.value)}
                      placeholder="+229 01 62 16 91 01"
                      className="w-full rounded-lg border border-[rgba(43,33,25,0.15)] bg-white px-3 py-1.5 text-xs font-medium text-[#2B2119] focus:border-[#C1652D] focus:outline-none"
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-[#6B5C52]">
                    Client rattaché : <strong>Koffi D. (Cocotomey)</strong> • 3 achats précédents
                  </p>
                </div>

                {/* Liste du panier */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-[#2B2119] flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4 text-[#C1652D]" />
                      Panier en cours ({cart.length})
                    </h3>
                    {cart.length > 0 && (
                      <button
                        onClick={() => setCart([])}
                        className="text-xs text-[#C53030] hover:underline"
                      >
                        Vider
                      </button>
                    )}
                  </div>

                  {cart.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[#6B5C52] border border-dashed border-[rgba(43,33,25,0.15)] rounded-xl">
                      Panier vide. Clique sur un produit pour l'ajouter.
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                      {cart.map((item) => (
                        <div
                          key={item.product.id}
                          className="flex items-center justify-between rounded-lg border border-[rgba(43,33,25,0.06)] bg-[#FAF6F1] p-2.5 text-xs"
                        >
                          <div className="pr-2 truncate">
                            <p className="font-semibold text-[#2B2119] truncate">{item.product.nom}</p>
                            <p className="text-[11px] text-[#6B5C52]">
                              {item.product.prix_unitaire.toLocaleString("fr-FR")} FCFA / unité
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="flex items-center rounded border border-[rgba(43,33,25,0.15)] bg-white">
                              <button
                                onClick={() => updateQuantity(item.product.id, -1)}
                                className="p-1 hover:bg-[#F3ECE2] text-[#2B2119]"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="px-2 font-bold text-xs">{item.quantite}</span>
                              <button
                                onClick={() => updateQuantity(item.product.id, 1)}
                                className="p-1 hover:bg-[#F3ECE2] text-[#2B2119]"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                            <span className="font-bold text-[#2B2119] min-w-[70px] text-right">
                              {(item.product.prix_unitaire * item.quantite).toLocaleString("fr-FR")} F
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Moyen de Paiement */}
                <div className="mb-5">
                  <label className="block text-xs font-bold text-[#2B2119] mb-2">
                    Moyen de règlement (Saisie manuelle vente)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setModePaiement("mtn_momo")}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-semibold transition-all min-h-[44px] ${
                        modePaiement === "mtn_momo"
                          ? "border-[#C1652D] bg-[#F5EAE3] text-[#C1652D]"
                          : "border-[rgba(43,33,25,0.1)] text-[#6B5C52] hover:bg-[#FAF6F1]"
                      }`}
                    >
                      <span>MTN MoMo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setModePaiement("moov_money")}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-semibold transition-all min-h-[44px] ${
                        modePaiement === "moov_money"
                          ? "border-[#C1652D] bg-[#F5EAE3] text-[#C1652D]"
                          : "border-[rgba(43,33,25,0.1)] text-[#6B5C52] hover:bg-[#FAF6F1]"
                      }`}
                    >
                      <span>Moov Money</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setModePaiement("especes")}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-semibold transition-all min-h-[44px] ${
                        modePaiement === "especes"
                          ? "border-[#C1652D] bg-[#F5EAE3] text-[#C1652D]"
                          : "border-[rgba(43,33,25,0.1)] text-[#6B5C52] hover:bg-[#FAF6F1]"
                      }`}
                    >
                      <span>Espèces</span>
                    </button>
                  </div>
                </div>

                {/* Montant Versé & Dérivation automatique Règle 4 */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div>
                    <label className="block text-[11px] font-bold text-[#2B2119] mb-1">
                      Remise accordée (F)
                    </label>
                    <input
                      type="number"
                      value={remise || ""}
                      onChange={(e) => setRemise(Number(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full rounded-lg border border-[rgba(43,33,25,0.15)] bg-white px-3 py-1.5 text-xs font-bold text-[#2B2119] focus:border-[#C1652D] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#2B2119] mb-1">
                      Montant reçu aujourd'hui
                    </label>
                    <input
                      type="number"
                      value={montantVerse}
                      onChange={(e) => setMontantVerse(Number(e.target.value) || 0)}
                      className="w-full rounded-lg border border-[rgba(43,33,25,0.15)] bg-white px-3 py-1.5 text-xs font-bold text-[#2B2119] focus:border-[#C1652D] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Total et Statut */}
                <div className="pt-4 border-t border-[rgba(43,33,25,0.1)] space-y-2 mb-6">
                  <div className="flex justify-between items-center text-xs text-[#6B5C52]">
                    <span>Sous-total articles :</span>
                    <span>{sousTotal.toLocaleString("fr-FR")} FCFA</span>
                  </div>
                  {remise > 0 && (
                    <div className="flex justify-between items-center text-xs text-[#C53030]">
                      <span>Remise appliquée :</span>
                      <span>-{remise.toLocaleString("fr-FR")} FCFA</span>
                    </div>
                  )}
                  <div className="flex justify-between items-baseline pt-1">
                    <span className="text-sm font-bold text-[#2B2119]">Total vente à payer :</span>
                    <span className="text-2xl font-bold text-[#2B2119]">
                      {montantTotal.toLocaleString("fr-FR")}{" "}
                      <span className="text-xs font-medium text-[#6B5C52]">FCFA</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-[#6B5C52]">Statut de paiement automatique :</span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-bold border uppercase tracking-wider ${statut.color}`}
                    >
                      {statut.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bouton d'action */}
              <div>
                <button
                  type="button"
                  onClick={handleValidate}
                  disabled={cart.length === 0}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#C1652D] px-6 py-3.5 text-sm font-semibold text-[#FAF6F1] shadow-[0_2px_6px_rgba(193,101,45,0.2)] hover:bg-[#A85422] active:scale-[0.98] disabled:opacity-50 transition-all min-h-[48px]"
                >
                  <Receipt className="h-4 w-4" />
                  <span>Enregistrer la vente & Imprimer reçu</span>
                </button>

                {factureGeneree && (
                  <div className="mt-3 p-3 rounded-lg bg-[#EDF7EE] border border-[#1E7E34]/20 text-[#1E7E34] text-xs flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 shrink-0" />
                    <span>
                      Vente enregistrée ! Facture <strong>FAC-2KR-B01-2026-00042</strong> générée et
                      stock décrémenté atomiquement (Règle 1).
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
