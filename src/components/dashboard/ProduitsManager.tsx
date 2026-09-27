"use client";

import React, { useState, useTransition, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Pagination from "@/components/ui/Pagination";
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Boxes,
  Loader2,
  X,
  AlertCircle,
  Edit2,
  Trash2,
  ArrowUpRight,
  RefreshCw,
  Store,
  Tag,
} from "lucide-react";
import {
  creerProduitAction,
  modifierProduitAction,
  reapprovisionnerStockAction,
  supprimerProduitAction,
} from "@/app/actions/produits";
import { RoleUtilisateur } from "@prisma/client";

export interface ProduitItem {
  id: string;
  nom: string;
  prix_unitaire: number;
  quantite_stock: number;
  seuil_alerte: number;
  date_creation: string;
  boutique: {
    id: string;
    code: string;
    nom: string;
  };
}

export interface BoutiqueOption {
  id: string;
  code: string;
  nom: string;
  statut: string;
}

interface ProduitsManagerProps {
  produits: ProduitItem[];
  boutiques: BoutiqueOption[];
  boutiqueActiveId?: string;
  userRole: RoleUtilisateur;
  page?: number;
  limit?: number;
  totalPages?: number;
  totalElements?: number;
  initialSearch?: string;
  totalProduitsGlobal?: number;
}

type FiltreStock = "tous" | "en_stock" | "stock_bas" | "rupture";

export default function ProduitsManager({
  produits,
  boutiques,
  boutiqueActiveId,
  userRole,
  page = 1,
  limit = 25,
  totalPages = 1,
  totalElements,
  initialSearch = "",
  totalProduitsGlobal,
}: ProduitsManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Filtres et recherche
  const [recherche, setRecherche] = useState(initialSearch);
  const [filtreActif, setFiltreActif] = useState<FiltreStock>("tous");

  // Modales
  const [modalAjoutOuverte, setModalAjoutOuverte] = useState(false);
  const [produitAEditer, setProduitAEditer] = useState<ProduitItem | null>(null);
  const [produitAReappro, setProduitAReappro] = useState<ProduitItem | null>(null);

  // Quantité ajoutée pour réapprovisionnement en temps réel
  const [quantiteReappro, setQuantiteReappro] = useState<number>(10);

  // Erreurs
  const [erreur, setErreur] = useState<string | null>(null);

  const peutModifier = userRole !== "vendeur";

  // Calcul des métriques globales
  const stats = useMemo(() => {
    let valeurTotale = 0;
    let nbStockBas = 0;
    let nbRupture = 0;

    produits.forEach((p) => {
      valeurTotale += p.quantite_stock * p.prix_unitaire;
      if (p.quantite_stock === 0) {
        nbRupture++;
      } else if (p.quantite_stock <= p.seuil_alerte) {
        nbStockBas++;
      }
    });

    return {
      totalArticles: produits.length,
      valeurTotale,
      nbStockBas,
      nbRupture,
    };
  }, [produits]);

  // Filtrage des articles
  const produitsFiltres = useMemo(() => {
    return produits.filter((p) => {
      const matchNom = p.nom.toLowerCase().includes(recherche.toLowerCase());

      if (!matchNom) return false;

      if (filtreActif === "en_stock") {
        return p.quantite_stock > p.seuil_alerte;
      }
      if (filtreActif === "stock_bas") {
        return p.quantite_stock <= p.seuil_alerte && p.quantite_stock > 0;
      }
      if (filtreActif === "rupture") {
        return p.quantite_stock === 0;
      }

      return true;
    });
  }, [produits, recherche, filtreActif]);

  // Handlers formulaires
  async function handleCreerProduit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await creerProduitAction(null, formData);
      if (!res.success) {
        setErreur(res.error || "Impossible d'ajouter cet article.");
      } else {
        setModalAjoutOuverte(false);
        router.refresh();
      }
    });
  }

  async function handleModifierProduit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await modifierProduitAction(null, formData);
      if (!res.success) {
        setErreur(res.error || "Impossible de modifier cet article.");
      } else {
        setProduitAEditer(null);
        router.refresh();
      }
    });
  }

  async function handleReapprovisionner(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await reapprovisionnerStockAction(null, formData);
      if (!res.success) {
        setErreur(res.error || "Impossible d'ajuster le stock.");
      } else {
        setProduitAReappro(null);
        router.refresh();
      }
    });
  }

  async function handleSupprimerProduit(produitId: string, nom: string) {
    if (!confirm(`Es-tu sûr de vouloir supprimer définitivement l'article "${nom}" ?`)) {
      return;
    }

    startTransition(async () => {
      const res = await supprimerProduitAction(produitId);
      if (!res.success) {
        alert(res.error || "Impossible de supprimer ce produit.");
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec métriques clés */}
      <div className="bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-1.5 rounded-lg bg-[#C1652D]/10 text-[#C1652D]">
                <Package className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-extrabold text-[#2B2119]">
                Produits & Gestion des Stocks
              </h1>
            </div>
            <p className="text-xs text-[#6D5D52] max-w-xl">
              Suis les niveaux de stock en temps réel, ajuste tes réapprovisionnements et configure tes seuils d&apos;alerte.
            </p>
          </div>

          {peutModifier && (
            <button
              onClick={() => {
                setErreur(null);
                setModalAjoutOuverte(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-[#C1652D] text-[#FAF6F1] font-bold text-xs hover:bg-[#a95524] transition-colors flex items-center gap-2 shadow-sm focus:outline-none cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau produit</span>
            </button>
          )}
        </div>

        {/* Grille des 4 indicateurs clés */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-5 border-t border-[#E5DACF]">
          {/* Total Articles */}
          <div className="p-3.5 rounded-xl bg-[#E5DACF]/30 border border-[#E5DACF]/60">
            <div className="flex items-center justify-between text-[#6D5D52] text-[11px] font-bold uppercase mb-1">
              <span>Articles</span>
              <Boxes className="w-3.5 h-3.5 text-[#8C7A6B]" />
            </div>
            <div className="text-xl font-extrabold text-[#2B2119] font-mono">
              {stats.totalArticles}
            </div>
          </div>

          {/* Valeur du Stock */}
          <div className="p-3.5 rounded-xl bg-[#E5DACF]/30 border border-[#E5DACF]/60">
            <div className="flex items-center justify-between text-[#6D5D52] text-[11px] font-bold uppercase mb-1">
              <span>Valeur Stock</span>
              <TrendingUp className="w-3.5 h-3.5 text-[#C1652D]" />
            </div>
            <div className="text-xl font-extrabold text-[#2B2119] font-mono truncate">
              {stats.valeurTotale.toLocaleString("fr-FR")}{" "}
              <span className="text-xs font-sans text-[#6D5D52]">FCFA</span>
            </div>
          </div>

          {/* Stock Bas */}
          <div className="p-3.5 rounded-xl bg-orange-50/60 border border-orange-200">
            <div className="flex items-center justify-between text-orange-800 text-[11px] font-bold uppercase mb-1">
              <span>Stock bas</span>
              <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
            </div>
            <div className="text-xl font-extrabold text-orange-950 font-mono">
              {stats.nbStockBas}
            </div>
          </div>

          {/* Ruptures */}
          <div className="p-3.5 rounded-xl bg-red-50/60 border border-red-200">
            <div className="flex items-center justify-between text-red-800 text-[11px] font-bold uppercase mb-1">
              <span>Ruptures</span>
              <XCircle className="w-3.5 h-3.5 text-red-600" />
            </div>
            <div className="text-xl font-extrabold text-red-950 font-mono">
              {stats.nbRupture}
            </div>
          </div>
        </div>
      </div>

      {/* Barre d'outils : Recherche et Filtres */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl p-3 shadow-sm">
        {/* Recherche instantanée */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#8C7A6B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher un produit... (Entrée pour valider)"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const params = new URLSearchParams(searchParams.toString());
                if (recherche.trim()) {
                  params.set("q", recherche.trim());
                } else {
                  params.delete("q");
                }
                params.set("page", "1");
                startTransition(() => {
                  router.push(`${pathname}?${params.toString()}`);
                });
              }
            }}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-xs font-medium text-[#2B2119] placeholder:text-[#8C7A6B] focus:outline-none focus:ring-2 focus:ring-[#C1652D]/30 focus:border-[#C1652D]"
          />
        </div>

        {/* Filtres de stock rapides */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFiltreActif("tous")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap focus:outline-none cursor-pointer ${
              filtreActif === "tous"
                ? "bg-[#C1652D] text-[#FAF6F1]"
                : "text-[#6D5D52] hover:bg-[#E5DACF]/50"
            }`}
          >
            Tous ({produits.length})
          </button>

          <button
            onClick={() => setFiltreActif("en_stock")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap focus:outline-none cursor-pointer ${
              filtreActif === "en_stock"
                ? "bg-[#C1652D] text-[#FAF6F1]"
                : "text-[#6D5D52] hover:bg-[#E5DACF]/50"
            }`}
          >
            En stock
          </button>

          <button
            onClick={() => setFiltreActif("stock_bas")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap focus:outline-none cursor-pointer ${
              filtreActif === "stock_bas"
                ? "bg-orange-600 text-white"
                : "text-orange-800 hover:bg-orange-100/60"
            }`}
          >
            Stock bas ({stats.nbStockBas})
          </button>

          <button
            onClick={() => setFiltreActif("rupture")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap focus:outline-none cursor-pointer ${
              filtreActif === "rupture"
                ? "bg-red-600 text-white"
                : "text-red-800 hover:bg-red-100/60"
            }`}
          >
            Rupture ({stats.nbRupture})
          </button>
        </div>
      </div>

      {/* Tableau des articles */}
      <div className="bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E5DACF] bg-[#E5DACF]/30 text-[#6D5D52] uppercase font-bold text-[11px] tracking-wider">
                <th className="py-3.5 px-4">Article</th>
                <th className="py-3.5 px-4">Boutique</th>
                <th className="py-3.5 px-4">Prix unitaire</th>
                <th className="py-3.5 px-4">Stock disponible</th>
                <th className="py-3.5 px-4">Seuil alerte</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5DACF]">
              {produitsFiltres.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#8C7A6B]">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold">Aucun article ne correspond à ta sélection.</p>
                  </td>
                </tr>
              ) : (
                produitsFiltres.map((p) => {
                  const estEnRupture = p.quantite_stock === 0;
                  const estStockBas = p.quantite_stock <= p.seuil_alerte && !estEnRupture;

                  return (
                    <tr key={p.id} className="hover:bg-[#E5DACF]/20 transition-colors">
                      {/* Nom Article */}
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-[#2B2119]">{p.nom}</div>
                      </td>

                      {/* Boutique */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-medium text-[#2B2119]">
                          <span className="px-1.5 py-0.5 rounded bg-[#FAF6F1] border border-[#E5DACF] font-mono font-bold text-[10px]">
                            {p.boutique.code}
                          </span>
                          <span className="truncate max-w-[140px]">{p.boutique.nom}</span>
                        </div>
                      </td>

                      {/* Prix unitaire */}
                      <td className="py-3.5 px-4 font-mono font-bold text-[#2B2119]">
                        {p.prix_unitaire.toLocaleString("fr-FR")}{" "}
                        <span className="text-[10px] font-sans text-[#6D5D52]">FCFA</span>
                      </td>

                      {/* Quantité & État */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-extrabold text-sm text-[#2B2119]">
                            {p.quantite_stock}
                          </span>

                          {estEnRupture ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                              <XCircle className="w-3 h-3 text-red-600" />
                              <span>Rupture</span>
                            </span>
                          ) : estStockBas ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800">
                              <AlertTriangle className="w-3 h-3 text-orange-600" />
                              <span>Stock bas</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800">
                              <CheckCircle2 className="w-3 h-3 text-green-600" />
                              <span>Optimal</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Seuil Alerte */}
                      <td className="py-3.5 px-4 text-[#6D5D52] font-mono">
                        {p.seuil_alerte} unités
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {peutModifier ? (
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Réapprovisionner */}
                            <button
                              onClick={() => {
                                setErreur(null);
                                setQuantiteReappro(10);
                                setProduitAReappro(p);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#C1652D]/10 hover:bg-[#C1652D]/20 text-[#C1652D] font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                              title="Ajouter du stock"
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>Réappro</span>
                            </button>

                            {/* Modifier */}
                            <button
                              onClick={() => {
                                setErreur(null);
                                setProduitAEditer(p);
                              }}
                              className="p-1.5 rounded-lg text-[#8C7A6B] hover:text-[#2B2119] hover:bg-[#E5DACF]/50 transition-colors"
                              title="Modifier les informations"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Supprimer */}
                            <button
                              onClick={() => handleSupprimerProduit(p.id, p.nom)}
                              className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                              title="Supprimer l'article"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-[#8C7A6B] italic">Consultation</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination du tableau */}
        <Pagination
          page={page}
          totalPages={totalPages}
          totalElements={totalElements ?? produits.length}
          limit={limit}
        />
      </div>

      {/* Modale Nouveau Produit */}
      {modalAjoutOuverte && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl max-w-md w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5DACF]">
              <div>
                <h2 className="text-lg font-extrabold text-[#2B2119]">
                  Ajouter un nouvel article
                </h2>
                <p className="text-xs text-[#6D5D52] mt-0.5">
                  Renseigne le prix en FCFA et le stock de départ.
                </p>
              </div>
              <button
                onClick={() => setModalAjoutOuverte(false)}
                className="p-1 rounded-lg text-[#8C7A6B] hover:text-[#2B2119] hover:bg-[#E5DACF]/50 focus:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {erreur && (
              <div className="my-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{erreur}</span>
              </div>
            )}

            <form onSubmit={handleCreerProduit} className="space-y-3.5 mt-3">
              {/* Choix Boutique si Patron */}
              {userRole === "patron" && (
                <div>
                  <label className="block text-xs font-bold text-[#2B2119] mb-1">
                    Boutique de rattachement *
                  </label>
                  <select
                    name="boutique_id"
                    required
                    defaultValue={boutiqueActiveId || boutiques[0]?.id}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-xs font-medium text-[#2B2119] focus:outline-none focus:ring-2 focus:ring-[#C1652D]/30 focus:border-[#C1652D]"
                  >
                    {boutiques.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code} — {b.nom}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Nom article */}
              <div>
                <label className="block text-xs font-bold text-[#2B2119] mb-1">
                  Nom de l&apos;article *
                </label>
                <input
                  type="text"
                  name="nom"
                  required
                  placeholder="Ex : Robe Wax Moderne, Chaussures Cuir 42"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-xs font-medium text-[#2B2119] placeholder:text-[#8C7A6B] focus:outline-none focus:ring-2 focus:ring-[#C1652D]/30 focus:border-[#C1652D]"
                />
              </div>

              {/* Prix unitaire */}
              <div>
                <label className="block text-xs font-bold text-[#2B2119] mb-1">
                  Prix unitaire de vente (FCFA) *
                </label>
                <input
                  type="number"
                  name="prix_unitaire"
                  required
                  min={1}
                  step={1}
                  placeholder="Ex : 5000"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-xs font-mono font-bold text-[#2B2119] placeholder:text-[#8C7A6B] focus:outline-none focus:ring-2 focus:ring-[#C1652D]/30 focus:border-[#C1652D]"
                />
              </div>

              {/* Stock initial & Seuil alerte */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#2B2119] mb-1">
                    Quantité en stock
                  </label>
                  <input
                    type="number"
                    name="quantite_initiale"
                    min={0}
                    defaultValue={10}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-xs font-mono text-[#2B2119] focus:outline-none focus:ring-2 focus:ring-[#C1652D]/30 focus:border-[#C1652D]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2B2119] mb-1">
                    Seuil d&apos;alerte bas
                  </label>
                  <input
                    type="number"
                    name="seuil_alerte"
                    min={0}
                    defaultValue={5}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-xs font-mono text-[#2B2119] focus:outline-none focus:ring-2 focus:ring-[#C1652D]/30 focus:border-[#C1652D]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5DACF]">
                <button
                  type="button"
                  onClick={() => setModalAjoutOuverte(false)}
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#6D5D52] hover:bg-[#E5DACF]/50 transition-colors"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2.5 rounded-xl bg-[#C1652D] text-[#FAF6F1] text-xs font-bold hover:bg-[#a95524] transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Enregistrer l&apos;article</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale Réapprovisionnement Rapide */}
      {produitAReappro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl max-w-md w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5DACF]">
              <div className="flex items-center gap-2 text-[#C1652D]">
                <RefreshCw className="w-5 h-5" />
                <h3 className="font-extrabold text-base text-[#2B2119]">
                  Réapprovisionner le stock
                </h3>
              </div>
              <button
                onClick={() => setProduitAReappro(null)}
                className="p-1 rounded-lg text-[#8C7A6B] hover:text-[#2B2119] hover:bg-[#E5DACF]/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {erreur && (
              <div className="my-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{erreur}</span>
              </div>
            )}

            <form onSubmit={handleReapprovisionner} className="space-y-4 mt-3">
              <input type="hidden" name="produit_id" value={produitAReappro.id} />

              {/* Récap Article */}
              <div className="p-3.5 rounded-xl bg-[#E5DACF]/30 border border-[#E5DACF]">
                <div className="text-xs font-bold text-[#2B2119] mb-1">
                  {produitAReappro.nom}
                </div>
                <div className="text-[11px] text-[#6D5D52] flex items-center gap-2">
                  <span>Stock actuel : <strong>{produitAReappro.quantite_stock} unités</strong></span>
                  <span>•</span>
                  <span>Boutique : <strong>{produitAReappro.boutique.code}</strong></span>
                </div>
              </div>

              {/* Quantité ajoutée */}
              <div>
                <label className="block text-xs font-bold text-[#2B2119] mb-1">
                  Quantité reçue / ajoutée *
                </label>
                <input
                  type="number"
                  name="quantite_ajoutee"
                  required
                  min={1}
                  value={quantiteReappro}
                  onChange={(e) => setQuantiteReappro(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-sm font-mono font-bold text-[#2B2119] focus:outline-none focus:ring-2 focus:ring-[#C1652D]/30 focus:border-[#C1652D]"
                />
              </div>

              {/* Aperçu du nouveau stock */}
              <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-green-900 text-xs font-semibold flex items-center justify-between">
                <span>Nouveau stock résultant :</span>
                <span className="font-mono font-extrabold text-sm text-green-800">
                  {produitAReappro.quantite_stock + quantiteReappro} unités
                </span>
              </div>

              {/* Motif */}
              <div>
                <label className="block text-xs font-bold text-[#2B2119] mb-1">
                  Motif du mouvement
                </label>
                <select
                  name="motif"
                  defaultValue="Livraison fournisseur"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-xs font-medium text-[#2B2119] focus:outline-none focus:ring-2 focus:ring-[#C1652D]/30 focus:border-[#C1652D]"
                >
                  <option value="Livraison fournisseur">Livraison fournisseur</option>
                  <option value="Ajustement inventaire">Ajustement inventaire physique</option>
                  <option value="Retour client">Retour client</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5DACF]">
                <button
                  type="button"
                  onClick={() => setProduitAReappro(null)}
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#6D5D52] hover:bg-[#E5DACF]/50 transition-colors"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2.5 rounded-xl bg-[#C1652D] text-[#FAF6F1] text-xs font-bold hover:bg-[#a95524] transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirmer le réappro</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale Modification Produit */}
      {produitAEditer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl max-w-md w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5DACF]">
              <div className="flex items-center gap-2 text-[#C1652D]">
                <Edit2 className="w-5 h-5" />
                <h3 className="font-extrabold text-base text-[#2B2119]">
                  Modifier l&apos;article
                </h3>
              </div>
              <button
                onClick={() => setProduitAEditer(null)}
                className="p-1 rounded-lg text-[#8C7A6B] hover:text-[#2B2119] hover:bg-[#E5DACF]/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {erreur && (
              <div className="my-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{erreur}</span>
              </div>
            )}

            <form onSubmit={handleModifierProduit} className="space-y-3.5 mt-3">
              <input type="hidden" name="produit_id" value={produitAEditer.id} />

              <div>
                <label className="block text-xs font-bold text-[#2B2119] mb-1">
                  Nom de l&apos;article *
                </label>
                <input
                  type="text"
                  name="nom"
                  required
                  defaultValue={produitAEditer.nom}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-xs font-medium text-[#2B2119] focus:outline-none focus:ring-2 focus:ring-[#C1652D]/30 focus:border-[#C1652D]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2B2119] mb-1">
                  Prix unitaire (FCFA) *
                </label>
                <input
                  type="number"
                  name="prix_unitaire"
                  required
                  min={1}
                  step={1}
                  defaultValue={produitAEditer.prix_unitaire}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-xs font-mono font-bold text-[#2B2119] focus:outline-none focus:ring-2 focus:ring-[#C1652D]/30 focus:border-[#C1652D]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2B2119] mb-1">
                  Seuil d&apos;alerte stock bas
                </label>
                <input
                  type="number"
                  name="seuil_alerte"
                  min={0}
                  defaultValue={produitAEditer.seuil_alerte}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-xs font-mono text-[#2B2119] focus:outline-none focus:ring-2 focus:ring-[#C1652D]/30 focus:border-[#C1652D]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5DACF]">
                <button
                  type="button"
                  onClick={() => setProduitAEditer(null)}
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#6D5D52] hover:bg-[#E5DACF]/50 transition-colors"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2.5 rounded-xl bg-[#C1652D] text-[#FAF6F1] text-xs font-bold hover:bg-[#a95524] transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Enregistrer les modifications</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
