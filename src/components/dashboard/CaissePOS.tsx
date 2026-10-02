"use client";

import React, { useState, useTransition, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  User,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle2,
  Printer,
  RotateCcw,
  AlertTriangle,
  AlertCircle,
  Loader2,
  Package,
  Store,
  Tag,
  UserPlus,
  X,
  Clock,
  Check,
} from "lucide-react";
import { ModePaiement, StatutPaiementVente } from "@prisma/client";
import {
  enregistrerVenteAction,
  creerClientRapideAction,
  RecuVenteData,
} from "@/app/actions/ventes";
import { rechercherClientsAction } from "@/app/actions/clients";
import RecuVenteModal from "./RecuVenteModal";

export interface ProduitCaisse {
  id: string;
  nom: string;
  prix_unitaire: number;
  quantite_stock: number;
  seuil_alerte: number;
  code_barre?: string | null;
}

export interface ClientCaisse {
  id: string;
  nom: string;
  telephone: string;
}

export interface BoutiqueInfo {
  id: string;
  code: string;
  nom: string;
  ville: string;
  adresse: string;
  telephone: string | null;
  statut: string;
}

interface CaissePOSProps {
  boutique: BoutiqueInfo;
  produitsInitiaux: ProduitCaisse[];
  clientsInitiaux: ClientCaisse[];
  vendeurNom: string;
  userRole: string;
}

interface LignePanier {
  produit: ProduitCaisse;
  quantite: number;
  imei1?: string;
  imei2?: string;
  afficherImei?: boolean;
}

export default function CaissePOS({
  boutique,
  produitsInitiaux,
  clientsInitiaux,
  vendeurNom,
  userRole,
}: CaissePOSProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Produits & Clients
  const [produits, setProduits] = useState<ProduitCaisse[]>(produitsInitiaux);
  const [clients, setClients] = useState<ClientCaisse[]>(clientsInitiaux);

  React.useEffect(() => {
    setProduits(produitsInitiaux);
  }, [produitsInitiaux]);

  React.useEffect(() => {
    setClients(clientsInitiaux);
  }, [clientsInitiaux]);

  const [rechercheProduit, setRechercheProduit] = useState("");
  const [filtreStock, setFiltreStock] = useState<"tous" | "disponibles">("disponibles");

  // Panier
  const [panier, setPanier] = useState<LignePanier[]>([]);
  const [clientSelectionneId, setClientSelectionneId] = useState<string>("");
  const [clientSelectionneObjet, setClientSelectionneObjet] = useState<ClientCaisse | null>(null);
  const [remiseSaisie, setRemiseSaisie] = useState<string>("0");

  // Combobox recherche client dynamique
  const [rechercheClientQuery, setRechercheClientQuery] = useState("");
  const [resultatsClients, setResultatsClients] = useState<ClientCaisse[]>(clientsInitiaux);
  const [isSearchingClient, setIsSearchingClient] = useState(false);
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const comboboxClientRef = useRef<HTMLDivElement>(null);

  // Client sélectionné actuel
  const clientSelectionne = useMemo(() => {
    if (!clientSelectionneId) return null;
    if (clientSelectionneObjet && clientSelectionneObjet.id === clientSelectionneId) {
      return clientSelectionneObjet;
    }
    return (
      clients.find((c) => c.id === clientSelectionneId) ||
      resultatsClients.find((c) => c.id === clientSelectionneId) ||
      null
    );
  }, [clientSelectionneId, clientSelectionneObjet, clients, resultatsClients]);

  // Fermeture du dropdown au clic en dehors
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        comboboxClientRef.current &&
        !comboboxClientRef.current.contains(event.target as Node)
      ) {
        setIsClientDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Recherche dynamique debouncée : déclenchée UNIQUEMENT à chaque saisie utilisateur
  useEffect(() => {
    const q = rechercheClientQuery.trim();
    if (!q) {
      setResultatsClients(clients.slice(0, 10));
      setIsSearchingClient(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingClient(true);
      try {
        const res = await rechercherClientsAction(q);
        if (res.success && res.clients) {
          setResultatsClients(res.clients);
        } else {
          setResultatsClients([]);
        }
      } catch (err) {
        console.error("Erreur recherche clients", err);
        setResultatsClients([]);
      } finally {
        setIsSearchingClient(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [rechercheClientQuery]);

  // Mode de règlement
  const [typeReglement, setTypeReglement] = useState<"comptant" | "partiel" | "credit">("comptant");
  const [modePaiement, setModePaiement] = useState<ModePaiement>("especes");
  const [montantRecuEspeces, setMontantRecuEspeces] = useState<string>("");
  const [acompteSaisi, setAcompteSaisi] = useState<string>("");

  // Modale nouveau client rapide
  const [modalNouveauClient, setModalNouveauClient] = useState(false);
  const [nouveauClientNom, setNouveauClientNom] = useState("");
  const [nouveauClientTel, setNouveauClientTel] = useState("");
  const [erreurNouveauClient, setErreurNouveauClient] = useState<string | null>(null);
  const [isCreatingClient, setIsCreatingClient] = useState(false);

  // Modale Reçu post-vente
  const [recuVente, setRecuVente] = useState<RecuVenteData | null>(null);
  const [erreurVente, setErreurVente] = useState<string | null>(null);

  // Clé d'idempotence UUID persistée pour la transaction en cours (Règle 6)
  const [cleIdempotence, setCleIdempotence] = useState<string>(() => {
    return typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : "idem-" + Date.now() + "-" + Math.random().toString(36).substring(2, 9);
  });

  // Effet sonore discret lors du scan réussi
  function jouerBipSucces() {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch {
      // Ignoré si l'utilisateur n'a pas encore interagi
    }
  }

  // Filtrage du catalogue par nom ou code SKU / code-barres
  const produitsFiltres = useMemo(() => {
    const q = rechercheProduit.toLowerCase().trim();
    return produits.filter((p) => {
      const matchNom = p.nom.toLowerCase().includes(q);
      const matchSku = p.code_barre ? p.code_barre.toLowerCase().includes(q) : false;
      if (!matchNom && !matchSku) return false;
      if (filtreStock === "disponibles") {
        return p.quantite_stock > 0;
      }
      return true;
    });
  }, [produits, rechercheProduit, filtreStock]);

  // Calculs financiers stricts côté client (pour prévisualisation)
  const sousTotal = useMemo(() => {
    return panier.reduce((acc, ligne) => acc + ligne.produit.prix_unitaire * ligne.quantite, 0);
  }, [panier]);

  const remise = useMemo(() => {
    const r = parseInt(remiseSaisie, 10);
    return isNaN(r) || r < 0 ? 0 : r;
  }, [remiseSaisie]);

  const montantNet = useMemo(() => {
    return Math.max(0, sousTotal - remise);
  }, [sousTotal, remise]);

  // Montant à payer selon le type de règlement
  const montantAPayerActuel = useMemo(() => {
    if (typeReglement === "credit") return 0;
    if (typeReglement === "partiel") {
      const ac = parseInt(acompteSaisi, 10);
      return isNaN(ac) || ac < 0 ? 0 : Math.min(ac, montantNet);
    }
    return montantNet;
  }, [typeReglement, acompteSaisi, montantNet]);

  // Monnaie à rendre si paiement espèces
  const monnaieRendue = useMemo(() => {
    if (modePaiement !== "especes" || typeReglement === "credit") return 0;
    const recu = parseInt(montantRecuEspeces, 10);
    if (isNaN(recu) || recu <= montantAPayerActuel) return 0;
    return recu - montantAPayerActuel;
  }, [modePaiement, typeReglement, montantRecuEspeces, montantAPayerActuel]);

  // Ajouter au panier
  function ajouterAuPanier(produit: ProduitCaisse) {
    if (produit.quantite_stock <= 0) return;

    setPanier((prev) => {
      const index = prev.findIndex((l) => l.produit.id === produit.id);
      if (index >= 0) {
        const existante = prev[index];
        if (existante.quantite >= produit.quantite_stock) {
          return prev; // Atteint le stock max disponible
        }
        const updated = [...prev];
        updated[index] = { ...existante, quantite: existante.quantite + 1 };
        return updated;
      }
      return [...prev, { produit, quantite: 1 }];
    });
  }

  // Modifier la quantité
  function modifierQuantite(produitId: string, nouvelleQuantite: number) {
    setPanier((prev) => {
      return prev
        .map((l) => {
          if (l.produit.id === produitId) {
            const stockMax = l.produit.quantite_stock;
            const qte = Math.min(Math.max(1, nouvelleQuantite), stockMax);
            return { ...l, quantite: qte };
          }
          return l;
        })
        .filter((l) => l.quantite > 0);
    });
  }

  // Supprimer une ligne
  function supprimerLigne(produitId: string) {
    setPanier((prev) => prev.filter((l) => l.produit.id !== produitId));
  }

  // Modifier les IMEIs d'une ligne
  function modifierImeiLigne(produitId: string, imei1: string, imei2: string) {
    setPanier((prev) =>
      prev.map((l) => (l.produit.id === produitId ? { ...l, imei1, imei2 } : l))
    );
  }

  // Basculer l'affichage des champs IMEI
  function toggleImeiLigne(produitId: string) {
    setPanier((prev) =>
      prev.map((l) => (l.produit.id === produitId ? { ...l, afficherImei: !l.afficherImei } : l))
    );
  }

  // Vider le panier
  function viderPanier() {
    setPanier([]);
    setClientSelectionneId("");
    setClientSelectionneObjet(null);
    setRemiseSaisie("0");
    setMontantRecuEspeces("");
    setAcompteSaisi("");
    setTypeReglement("comptant");
    setErreurVente(null);
    genererNouvelleCleIdempotence();
  }

  function genererNouvelleCleIdempotence() {
    const nouvelleCle =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : "idem-" + Date.now() + "-" + Math.random().toString(36).substring(2, 9);
    setCleIdempotence(nouvelleCle);
  }

  // Création rapide d'un client
  async function handleCreerClientRapide(e: React.FormEvent) {
    e.preventDefault();
    setErreurNouveauClient(null);
    if (!nouveauClientNom.trim() || !nouveauClientTel.trim()) {
      setErreurNouveauClient("Veuillez renseigner le nom et le téléphone.");
      return;
    }

    setIsCreatingClient(true);
    const res = await creerClientRapideAction(nouveauClientNom, nouveauClientTel);
    setIsCreatingClient(false);

    if (!res.success || !res.client) {
      setErreurNouveauClient(res.error || "Erreur lors de l'enregistrement du client.");
      return;
    }

    // Ajouter à la liste locale si pas déjà présent
    setClients((prev) => {
      if (prev.some((c) => c.id === res.client!.id)) return prev;
      return [res.client!, ...prev];
    });

    setClientSelectionneId(res.client.id);
    setClientSelectionneObjet(res.client);
    setRechercheClientQuery("");
    setIsClientDropdownOpen(false);
    setModalNouveauClient(false);
    setNouveauClientNom("");
    setNouveauClientTel("");
    router.refresh();
  }

  // Validation finale de l'encaissement
  function handleEncaisser() {
    if (panier.length === 0) return;
    setErreurVente(null);

    // Validation vente à crédit : un client doit être sélectionné
    if ((typeReglement === "credit" || typeReglement === "partiel") && !clientSelectionneId) {
      setErreurVente(
        "Pour une vente à crédit ou avec acompte partiel, tu dois sélectionner ou créer un client (Section 1.4)."
      );
      return;
    }

    startTransition(async () => {
      const payloadLignes = panier.map((l) => ({
        produit_id: l.produit.id,
        quantite: l.quantite,
        imei1: l.imei1 || null,
        imei2: l.imei2 || null,
      }));

      const res = await enregistrerVenteAction({
        boutique_id: boutique.id,
        client_id: clientSelectionneId || null,
        lignes: payloadLignes,
        remise: remise,
        paiement:
          typeReglement === "credit"
            ? null
            : {
                montant: montantAPayerActuel,
                mode_paiement: modePaiement,
              },
        cle_idempotence: cleIdempotence,
      });

      if (!res.success || !res.recu) {
        setErreurVente(res.error || "Impossible d'enregistrer la vente.");
        return;
      }

      // Vente réussie ! Mettre à jour les stocks locaux
      setProduits((prev) =>
        prev.map((p) => {
          const l = panier.find((item) => item.produit.id === p.id);
          if (l) {
            return { ...p, quantite_stock: Math.max(0, p.quantite_stock - l.quantite) };
          }
          return p;
        })
      );

      // Ouvrir le reçu
      setRecuVente(res.recu);

      // Réinitialiser le panier pour la prochaine vente
      setPanier([]);
      setRemiseSaisie("0");
      setMontantRecuEspeces("");
      setAcompteSaisi("");
      setTypeReglement("comptant");
      genererNouvelleCleIdempotence();
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col xl:flex-row gap-6 items-start">
      {/* ======================================================== */}
      {/* COLONNE GAUCHE : CATALOGUE ARTICLES & RECHERCHE         */}
      {/* ======================================================== */}
      <div className="flex-1 w-full space-y-4">
        {/* Barre supérieure : Boutique active & recherche */}
        <div className="bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[#C1652D]/10 text-[#C1652D]">
                  <Store className="w-5 h-5" />
                </span>
                <h1 className="text-xl font-extrabold text-[#2B2119]">
                  Caisse POS — {boutique.nom}
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#E5DACF] text-[#6D5D52] font-bold">
                  {boutique.code}
                </span>
              </div>
              <p className="text-xs text-[#6D5D52] mt-1">
                Vendeur connecté : <span className="font-semibold text-[#2B2119]">{vendeurNom}</span>
              </p>
            </div>

            {/* Filtres de disponibilité */}
            <div className="flex items-center gap-1.5 bg-[#E5DACF]/40 p-1 rounded-xl self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setFiltreStock("disponibles")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filtreStock === "disponibles"
                    ? "bg-[#FAF6F1] text-[#2B2119] shadow-xs"
                    : "text-[#6D5D52] hover:text-[#2B2119]"
                }`}
              >
                En stock
              </button>
              <button
                type="button"
                onClick={() => setFiltreStock("tous")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filtreStock === "tous"
                    ? "bg-[#FAF6F1] text-[#2B2119] shadow-xs"
                    : "text-[#6D5D52] hover:text-[#2B2119]"
                }`}
              >
                Tous ({produits.length})
              </button>
            </div>
          </div>

          {/* Champ recherche produit & scan code-barres */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C7A6B]" />
            <input
              type="text"
              value={rechercheProduit}
              onChange={(e) => setRechercheProduit(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const q = rechercheProduit.trim().toLowerCase();
                  if (!q) return;
                  const cible =
                    produits.find((p) => p.code_barre && p.code_barre.toLowerCase() === q) ||
                    (produitsFiltres.length === 1 ? produitsFiltres[0] : null);
                  if (cible && cible.quantite_stock > 0) {
                    ajouterAuPanier(cible);
                    setRechercheProduit("");
                    jouerBipSucces();
                  }
                }
              }}
              placeholder="Rechercher par nom ou biper code SKU (Entrée)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-xs text-[#2B2119] placeholder-[#8C7A6B] focus:outline-none focus:ring-2 focus:ring-[#C1652D]"
            />
            {rechercheProduit && (
              <button
                type="button"
                onClick={() => setRechercheProduit("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C7A6B] hover:text-[#2B2119] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Grille de cartes de produits */}
        {produitsFiltres.length === 0 ? (
          <div className="bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl p-10 text-center">
            <Package className="w-10 h-10 text-[#8C7A6B] mx-auto mb-2 opacity-50" />
            <h3 className="text-sm font-bold text-[#2B2119]">Aucun article trouvé</h3>
            <p className="text-xs text-[#6D5D52] mt-1 max-w-sm mx-auto">
              {rechercheProduit
                ? `Aucun article ne correspond à "${rechercheProduit}".`
                : "Aucun article disponible en stock dans cette boutique."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {produitsFiltres.map((produit) => {
              const estEpuise = produit.quantite_stock <= 0;
              const estStockBas =
                produit.quantite_stock > 0 && produit.quantite_stock <= produit.seuil_alerte;
              const dansPanier = panier.find((l) => l.produit.id === produit.id);
              const qtePanier = dansPanier ? dansPanier.quantite : 0;
              const stockRestantApresPanier = produit.quantite_stock - qtePanier;

              return (
                <button
                  key={produit.id}
                  type="button"
                  disabled={estEpuise || stockRestantApresPanier <= 0}
                  onClick={() => ajouterAuPanier(produit)}
                  className={`text-left p-3.5 rounded-2xl border transition-all relative flex flex-col justify-between group cursor-pointer ${
                    estEpuise
                      ? "bg-stone-100 border-stone-200 opacity-60 cursor-not-allowed"
                      : stockRestantApresPanier <= 0
                      ? "bg-stone-50 border-stone-200 opacity-70 cursor-not-allowed"
                      : qtePanier > 0
                      ? "bg-[#FAF6F1] border-[#C1652D] shadow-sm hover:border-[#a95524]"
                      : "bg-[#FAF6F1] border-[#E5DACF] hover:border-[#C1652D] hover:shadow-xs"
                  }`}
                >
                  {/* Badge quantité dans le panier */}
                  {qtePanier > 0 && (
                    <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#C1652D] text-[#FAF6F1] text-xs font-extrabold flex items-center justify-center shadow-xs">
                      {qtePanier}
                    </span>
                  )}

                  <div>
                    <h3 className="font-bold text-xs text-[#2B2119] line-clamp-2 mb-1 group-hover:text-[#C1652D] transition-colors">
                      {produit.nom}
                    </h3>
                    {produit.code_barre && (
                      <div className="text-[10px] font-mono text-[#8C7A6B] flex items-center gap-1 mb-1">
                        <Tag className="w-2.5 h-2.5 text-[#C1652D]" />
                        <span className="truncate max-w-[120px]">{produit.code_barre}</span>
                      </div>
                    )}
                    <div className="text-sm font-extrabold text-[#C1652D] font-mono">
                      {produit.prix_unitaire.toLocaleString("fr-FR")}{" "}
                      <span className="text-[10px] font-sans font-normal text-[#6D5D52]">FCFA</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-[#E5DACF]/60 flex items-center justify-between text-[11px]">
                    {estEpuise ? (
                      <span className="text-red-700 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Épuisé
                      </span>
                    ) : estStockBas ? (
                      <span className="text-amber-700 font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> {produit.quantite_stock} rest.
                      </span>
                    ) : (
                      <span className="text-stone-600 font-medium">
                        Stock : {produit.quantite_stock}
                      </span>
                    )}

                    <span className="p-1 rounded-lg bg-[#E5DACF]/50 group-hover:bg-[#C1652D] group-hover:text-[#FAF6F1] transition-colors text-[#6D5D52]">
                      <Plus className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* COLONNE DROITE : PANIER & TERMINAL D'ENCAISSEMENT        */}
      {/* ======================================================== */}
      <div className="w-full xl:w-[420px] bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl p-5 shadow-sm space-y-5 sticky top-20">
        {/* Entête du panier */}
        <div className="flex items-center justify-between border-b border-[#E5DACF] pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#C1652D]/10 text-[#C1652D]">
              <ShoppingCart className="w-5 h-5" />
            </span>
            <h2 className="font-extrabold text-[#2B2119] text-base">
              Panier en cours
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-[#E5DACF] text-xs font-bold text-[#6D5D52]">
              {panier.reduce((acc, l) => acc + l.quantite, 0)}
            </span>
          </div>

          {panier.length > 0 && (
            <button
              type="button"
              onClick={viderPanier}
              className="text-xs text-[#8C7A6B] hover:text-red-600 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Vider</span>
            </button>
          )}
        </div>

        {/* Message d'erreur de vente */}
        {erreurVente && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
            <div className="flex-1">{erreurVente}</div>
            <button
              type="button"
              onClick={() => setErreurVente(null)}
              className="text-red-400 hover:text-red-700 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Liste des articles du panier */}
        <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
          {panier.length === 0 ? (
            <div className="py-10 text-center text-[#8C7A6B]">
              <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs">Le panier est vide.</p>
              <p className="text-[11px] text-[#8C7A6B]/80 mt-0.5">
                Clique sur un article à gauche pour l&apos;ajouter.
              </p>
            </div>
          ) : (
            panier.map((ligne) => {
              const ligneTotal = ligne.produit.prix_unitaire * ligne.quantite;
              const maxAtteint = ligne.quantite >= ligne.produit.quantite_stock;

              return (
                <div
                  key={ligne.produit.id}
                  className="p-2.5 rounded-xl bg-[#FAF6F1] border border-[#E5DACF] flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-[#2B2119] truncate">
                        {ligne.produit.nom}
                      </h4>
                      <p className="text-[11px] text-[#6D5D52] font-mono">
                        {ligne.produit.prix_unitaire.toLocaleString("fr-FR")} FCFA / unité
                      </p>
                    </div>

                    {/* Contrôles de quantité */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => modifierQuantite(ligne.produit.id, ligne.quantite - 1)}
                        className="w-6 h-6 rounded-lg bg-[#E5DACF]/60 hover:bg-[#E5DACF] text-[#2B2119] flex items-center justify-center cursor-pointer transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-extrabold font-mono text-[#2B2119]">
                        {ligne.quantite}
                      </span>
                      <button
                        type="button"
                        disabled={maxAtteint}
                        onClick={() => modifierQuantite(ligne.produit.id, ligne.quantite + 1)}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                          maxAtteint
                            ? "bg-stone-200 text-stone-400 cursor-not-allowed"
                            : "bg-[#E5DACF]/60 hover:bg-[#E5DACF] text-[#2B2119] cursor-pointer"
                        }`}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Sous-total ligne & suppression */}
                    <div className="text-right pl-2">
                      <div className="text-xs font-bold font-mono text-[#2B2119]">
                        {ligneTotal.toLocaleString("fr-FR")} F
                      </div>
                      <button
                        type="button"
                        onClick={() => supprimerLigne(ligne.produit.id)}
                        className="text-[#8C7A6B] hover:text-red-600 transition-colors mt-0.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Saisie IMEI optionnelle pour téléphones (Dual SIM max) */}
                  <div className="pt-1 border-t border-[#E5DACF]/50">
                    <button
                      type="button"
                      onClick={() => toggleImeiLigne(ligne.produit.id)}
                      className="text-[10px] text-[#C1652D] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <Smartphone className="w-2.5 h-2.5" />
                      {ligne.imei1 || ligne.imei2
                        ? `IMEI : ${[ligne.imei1, ligne.imei2].filter(Boolean).join(" / ")}`
                        : "+ IMEI / N° Série (téléphone)"}
                    </button>

                    {(ligne.afficherImei || ligne.imei1 || ligne.imei2) && (
                      <div className="mt-1.5 grid grid-cols-2 gap-2 bg-[#E5DACF]/30 p-2 rounded-lg">
                        <div>
                          <label className="text-[9px] font-bold text-[#6D5D52] block mb-0.5">
                            IMEI 1 (Optionnel)
                          </label>
                          <input
                            type="text"
                            placeholder="Ex: 354892110293847"
                            value={ligne.imei1 || ""}
                            onChange={(e) =>
                              modifierImeiLigne(ligne.produit.id, e.target.value, ligne.imei2 || "")
                            }
                            className="w-full px-2 py-1 bg-white border border-[#E5DACF] rounded text-[11px] font-mono text-[#2B2119] focus:outline-none focus:ring-1 focus:ring-[#C1652D]"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-[#6D5D52] block mb-0.5">
                            IMEI 2 (Dual SIM)
                          </label>
                          <input
                            type="text"
                            placeholder="Ex: 354892110293848"
                            value={ligne.imei2 || ""}
                            onChange={(e) =>
                              modifierImeiLigne(ligne.produit.id, ligne.imei1 || "", e.target.value)
                            }
                            className="w-full px-2 py-1 bg-white border border-[#E5DACF] rounded text-[11px] font-mono text-[#2B2119] focus:outline-none focus:ring-1 focus:ring-[#C1652D]"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Section Client */}
        <div className="pt-2 border-t border-[#E5DACF] space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#2B2119]">
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#C1652D]" />
              Client
            </span>
            <button
              type="button"
              onClick={() => {
                setErreurNouveauClient(null);
                setModalNouveauClient(true);
              }}
              className="text-[#C1652D] hover:underline flex items-center gap-1 text-[11px] cursor-pointer"
            >
              <UserPlus className="w-3 h-3" /> Nouveau
            </button>
          </div>

          {clientSelectionne ? (
            <div className="flex items-center justify-between p-2.5 rounded-xl border border-[#C1652D]/40 bg-[#C1652D]/5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-[#C1652D]/15 text-[#C1652D] flex items-center justify-center font-bold text-xs shrink-0">
                  {clientSelectionne.nom.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#2B2119] truncate">{clientSelectionne.nom}</p>
                  <p className="text-[11px] text-[#6D5D52] font-mono">{clientSelectionne.telephone}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setClientSelectionneId("");
                  setClientSelectionneObjet(null);
                  setRechercheClientQuery("");
                }}
                className="p-1 rounded-lg text-[#8C7A6B] hover:text-red-600 hover:bg-[#E5DACF]/50 transition-colors cursor-pointer"
                title="Désélectionner (revenir en comptoir anonyme)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div ref={comboboxClientRef} className="relative">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#8C7A6B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={rechercheClientQuery}
                  onChange={(e) => {
                    setRechercheClientQuery(e.target.value);
                    setIsClientDropdownOpen(true);
                  }}
                  onFocus={() => setIsClientDropdownOpen(true)}
                  placeholder="Rechercher client (nom ou tél)..."
                  className="w-full pl-9 pr-8 py-2 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-xs text-[#2B2119] placeholder:text-[#8C7A6B] focus:outline-none focus:ring-2 focus:ring-[#C1652D]"
                />
                {isSearchingClient && (
                  <Loader2 className="w-3.5 h-3.5 text-[#C1652D] animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                )}
              </div>

              {isClientDropdownOpen && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-[#FAF6F1] border border-[#E5DACF] rounded-xl shadow-lg max-h-56 overflow-y-auto py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setClientSelectionneId("");
                      setClientSelectionneObjet(null);
                      setIsClientDropdownOpen(false);
                      setRechercheClientQuery("");
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-[#E5DACF]/40 flex items-center justify-between text-xs text-[#6D5D52] border-b border-[#E5DACF]/60 cursor-pointer"
                  >
                    <span>Client comptoir anonyme</span>
                    {!clientSelectionneId && <Check className="w-3.5 h-3.5 text-[#C1652D]" />}
                  </button>

                  {isSearchingClient ? (
                    <div className="px-3 py-3 text-center text-xs text-[#8C7A6B] flex items-center justify-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C1652D]" />
                      Recherche...
                    </div>
                  ) : resultatsClients.length === 0 && rechercheClientQuery.trim() !== "" ? (
                    <div className="px-3 py-3 text-center text-xs text-[#8C7A6B] italic">
                      Aucun client trouvé
                    </div>
                  ) : (
                    resultatsClients.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setClientSelectionneId(c.id);
                          setClientSelectionneObjet(c);
                          setIsClientDropdownOpen(false);
                          setRechercheClientQuery("");
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-[#E5DACF]/50 flex items-center justify-between text-xs cursor-pointer transition-colors"
                      >
                        <div>
                          <span className="font-semibold text-[#2B2119] block">{c.nom}</span>
                          <span className="text-[11px] text-[#6D5D52] font-mono">{c.telephone}</span>
                        </div>
                        {clientSelectionneId === c.id && (
                          <Check className="w-3.5 h-3.5 text-[#C1652D]" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section Remise commerciale (Règle 9) */}
        <div className="pt-2 border-t border-[#E5DACF] space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#2B2119]">
            <span className="flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-[#C1652D]" />
              Remise (FCFA)
            </span>
            {remise > 0 && (
              <span className="text-[11px] text-[#C1652D] font-bold">
                -{remise.toLocaleString("fr-FR")} FCFA
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              step="100"
              value={remiseSaisie}
              onChange={(e) => setRemiseSaisie(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-1.5 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-xs font-mono text-[#2B2119] focus:outline-none focus:ring-2 focus:ring-[#C1652D]"
            />
            {/* Presets rapides de remise */}
            <div className="flex gap-1">
              {[500, 1000].map((montantPreset) => (
                <button
                  key={montantPreset}
                  type="button"
                  onClick={() => setRemiseSaisie(montantPreset.toString())}
                  className="px-2 py-1.5 rounded-lg border border-[#E5DACF] text-[10px] font-bold text-[#6D5D52] hover:bg-[#E5DACF]/50 cursor-pointer"
                >
                  +{montantPreset}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Mode de règlement & Modalités */}
        <div className="pt-2 border-t border-[#E5DACF] space-y-3">
          <div className="text-xs font-bold text-[#2B2119]">Modalité de paiement</div>

          {/* Onglets : Comptant / Partiel (Acompte) / Crédit total */}
          <div className="grid grid-cols-3 gap-1.5 bg-[#E5DACF]/40 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setTypeReglement("comptant")}
              className={`py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                typeReglement === "comptant"
                  ? "bg-[#FAF6F1] text-[#2B2119] shadow-xs"
                  : "text-[#6D5D52] hover:text-[#2B2119]"
              }`}
            >
              Comptant
            </button>
            <button
              type="button"
              onClick={() => setTypeReglement("partiel")}
              className={`py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                typeReglement === "partiel"
                  ? "bg-[#FAF6F1] text-[#2B2119] shadow-xs border border-[#C1652D]/30"
                  : "text-[#6D5D52] hover:text-[#2B2119]"
              }`}
            >
              Acompte
            </button>
            <button
              type="button"
              onClick={() => setTypeReglement("credit")}
              className={`py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                typeReglement === "credit"
                  ? "bg-[#FAF6F1] text-[#2B2119] shadow-xs border border-[#C1652D]/30"
                  : "text-[#6D5D52] hover:text-[#2B2119]"
              }`}
            >
              Crédit 100%
            </button>
          </div>

          {/* Si Comptant ou Partiel : choix du moyen de paiement */}
          {typeReglement !== "credit" && (
            <div className="space-y-2.5">
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setModePaiement("especes")}
                  className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    modePaiement === "especes"
                      ? "border-[#C1652D] bg-[#C1652D]/10 text-[#C1652D] font-bold"
                      : "border-[#E5DACF] bg-[#FAF6F1] text-[#6D5D52]"
                  }`}
                >
                  <Banknote className="w-4 h-4 mx-auto mb-1" />
                  <span className="text-[11px]">Espèces</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModePaiement("mtn_momo")}
                  className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    modePaiement === "mtn_momo"
                      ? "border-[#C1652D] bg-[#C1652D]/10 text-[#C1652D] font-bold"
                      : "border-[#E5DACF] bg-[#FAF6F1] text-[#6D5D52]"
                  }`}
                >
                  <Smartphone className="w-4 h-4 mx-auto mb-1" />
                  <span className="text-[11px]">MTN MoMo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModePaiement("moov_money")}
                  className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    modePaiement === "moov_money"
                      ? "border-[#C1652D] bg-[#C1652D]/10 text-[#C1652D] font-bold"
                      : "border-[#E5DACF] bg-[#FAF6F1] text-[#6D5D52]"
                  }`}
                >
                  <CreditCard className="w-4 h-4 mx-auto mb-1" />
                  <span className="text-[11px]">Moov Money</span>
                </button>
              </div>

              {/* Si Acompte partiel : saisie du montant de l'acompte */}
              {typeReglement === "partiel" && (
                <div className="p-2.5 rounded-xl bg-[#FAF6F1] border border-[#E5DACF] space-y-1.5">
                  <div className="flex justify-between text-[11px] font-bold text-[#2B2119]">
                    <span>Acompte versé aujourd&apos;hui (FCFA) :</span>
                    <span className="text-[#6D5D52]">Reste dû : {(montantNet - montantAPayerActuel).toLocaleString("fr-FR")} FCFA</span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max={montantNet}
                    value={acompteSaisi}
                    onChange={(e) => setAcompteSaisi(e.target.value)}
                    placeholder="Montant de l'acompte..."
                    className="w-full px-3 py-1.5 rounded-lg border border-[#E5DACF] bg-white text-xs font-mono text-[#2B2119] focus:outline-none focus:ring-2 focus:ring-[#C1652D]/30 focus:border-[#C1652D]"
                  />
                </div>
              )}

              {/* Si Espèces : Calculateur de monnaie rendu */}
              {modePaiement === "especes" && (
                <div className="p-3 rounded-xl bg-[#E5DACF]/30 border border-[#E5DACF] space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[#2B2119]">
                    <span>Billet / Espèces reçues (FCFA)</span>
                    {monnaieRendue > 0 && (
                      <span className="text-[#C1652D] font-extrabold font-mono">
                        Rendre : {monnaieRendue.toLocaleString("fr-FR")} FCFA
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    min={montantAPayerActuel}
                    value={montantRecuEspeces}
                    onChange={(e) => setMontantRecuEspeces(e.target.value)}
                    placeholder={montantAPayerActuel.toString()}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-xs font-mono text-[#2B2119] focus:outline-none focus:ring-2 focus:ring-[#C1652D]"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Synthèse des totaux */}
        <div className="pt-2 border-t border-[#E5DACF] space-y-2">
          <div className="flex justify-between text-xs text-[#6D5D52]">
            <span>Sous-total articles :</span>
            <span className="font-mono">{sousTotal.toLocaleString("fr-FR")} FCFA</span>
          </div>

          {remise > 0 && (
            <div className="flex justify-between text-xs text-[#C1652D]">
              <span>Remise accordée :</span>
              <span className="font-mono">-{remise.toLocaleString("fr-FR")} FCFA</span>
            </div>
          )}

          <div className="flex justify-between text-base font-extrabold text-[#2B2119] pt-1 border-t border-[#E5DACF]/60">
            <span>Net total :</span>
            <span className="font-mono text-lg text-[#C1652D]">
              {montantNet.toLocaleString("fr-FR")} FCFA
            </span>
          </div>
        </div>

        {/* Bouton d'action principal Encaisser */}
        <button
          type="button"
          disabled={panier.length === 0 || isPending}
          onClick={handleEncaisser}
          className={`w-full py-3.5 rounded-xl font-extrabold text-sm text-[#FAF6F1] shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
            panier.length === 0 || isPending
              ? "bg-stone-300 cursor-not-allowed text-stone-500"
              : typeReglement === "credit"
              ? "bg-rose-700 hover:bg-rose-800"
              : "bg-[#C1652D] hover:bg-[#a95524]"
          }`}
        >
          {isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Validation de la vente...</span>
            </>
          ) : typeReglement === "credit" ? (
            <>
              <Clock className="w-5 h-5" />
              <span>Enregistrer à crédit ({montantNet.toLocaleString("fr-FR")} FCFA)</span>
            </>
          ) : typeReglement === "partiel" ? (
            <>
              <Check className="w-5 h-5" />
              <span>
                Encaisser acompte ({montantAPayerActuel.toLocaleString("fr-FR")} FCFA)
              </span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" />
              <span>Encaisser {montantNet.toLocaleString("fr-FR")} FCFA</span>
            </>
          )}
        </button>
      </div>

      {/* ======================================================== */}
      {/* MODALE : CRÉATION RAPIDE D'UN CLIENT AU COMPTOIR        */}
      {/* ======================================================== */}
      {modalNouveauClient && (
        <div className="fixed inset-0 z-50 bg-[#2B2119]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl p-6 w-full max-w-md shadow-xl animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5DACF]">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[#C1652D]/10 text-[#C1652D]">
                  <UserPlus className="w-5 h-5" />
                </span>
                <h3 className="font-extrabold text-[#2B2119] text-base">
                  Nouveau client comptoir
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalNouveauClient(false)}
                className="text-[#8C7A6B] hover:text-[#2B2119] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreerClientRapide} className="mt-4 space-y-4">
              {erreurNouveauClient && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs">
                  {erreurNouveauClient}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#2B2119] mb-1">
                  Nom complet du client *
                </label>
                <input
                  type="text"
                  required
                  value={nouveauClientNom}
                  onChange={(e) => setNouveauClientNom(e.target.value)}
                  placeholder="Ex : Bio Chabi, Mme Adebayo..."
                  className="w-full px-3 py-2 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-xs text-[#2B2119] focus:outline-none focus:ring-2 focus:ring-[#C1652D]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2B2119] mb-1">
                  Numéro de téléphone (WhatsApp / Momo) *
                </label>
                <input
                  type="tel"
                  required
                  value={nouveauClientTel}
                  onChange={(e) => setNouveauClientTel(e.target.value)}
                  placeholder="Ex : +229 97 00 11 22"
                  className="w-full px-3 py-2 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-xs text-[#2B2119] focus:outline-none focus:ring-2 focus:ring-[#C1652D]"
                />
                <p className="text-[11px] text-[#8C7A6B] mt-1">
                  Utilisé pour le suivi des factures et le rappel des impayés.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalNouveauClient(false)}
                  className="px-4 py-2 rounded-xl border border-[#E5DACF] text-xs font-bold text-[#6D5D52] hover:bg-[#E5DACF]/50 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isCreatingClient}
                  className="px-4 py-2 rounded-xl bg-[#C1652D] text-[#FAF6F1] text-xs font-bold hover:bg-[#a95524] transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {isCreatingClient ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <span>Enregistrer le client</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODALE : REÇU / FACTURE OFFICIELLE (80 mm & A4)          */}
      {/* ======================================================== */}
      {recuVente && (
        <RecuVenteModal
          recu={recuVente}
          onClose={() => setRecuVente(null)}
          titreSucces="Vente enregistrée avec succès !"
        />
      )}
    </div>
  );
}
