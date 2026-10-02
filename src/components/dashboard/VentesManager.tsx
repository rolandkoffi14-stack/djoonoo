"use client";

import React, { useState, useTransition, useMemo } from "react";
import {
  Receipt,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Printer,
  X,
  TrendingUp,
  Banknote,
  DollarSign,
  User,
  Store,
  ChevronRight,
  Calendar,
  Smartphone,
  CreditCard,
} from "lucide-react";
import { StatutPaiementVente, ModePaiement, RoleUtilisateur } from "@prisma/client";
import { getRecuVenteAction, RecuVenteData } from "@/app/actions/ventes";
import Pagination from "@/components/ui/Pagination";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import RecuVenteModal from "./RecuVenteModal";

export interface VenteListItem {
  id: string;
  numero_facture: string;
  date_vente: string;
  montant_total: number;
  montant_remise: number;
  statut_paiement: StatutPaiementVente;
  statut_vente: string;
  boutique: {
    id: string;
    code: string;
    nom: string;
  };
  utilisateur: {
    id: string;
    nom: string;
  };
  client: {
    id: string;
    nom: string;
    telephone: string;
  } | null;
  paiements: {
    id: string;
    montant: number;
    mode_paiement: ModePaiement;
  }[];
}

interface VentesManagerProps {
  ventes: VenteListItem[];
  boutiqueNom: string;
  boutiqueCode: string;
  userRole: RoleUtilisateur;
  page?: number;
  limit?: number;
  totalPages?: number;
  totalElements?: number;
  initialSearch?: string;
  initialStatut?: string;
  statsGlobales?: {
    nombreVentes: number;
    caTotal: number;
    totalEncaisse: number;
    totalImpayes: number;
  };
}

export default function VentesManager({
  ventes,
  boutiqueNom,
  boutiqueCode,
  userRole,
  page = 1,
  limit = 25,
  totalPages = 1,
  totalElements,
  initialSearch = "",
  initialStatut = "tous",
  statsGlobales,
}: VentesManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [recherche, setRecherche] = useState(initialSearch);
  const [filtreStatut, setFiltreStatut] = useState<string>(initialStatut);
  const [recuSelectionne, setRecuSelectionne] = useState<RecuVenteData | null>(null);
  const [chargementRecuId, setChargementRecuId] = useState<string | null>(null);

  const appliquerFiltres = (nouveauStatut?: string, nouvelleRecherche?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const stat = nouveauStatut !== undefined ? nouveauStatut : filtreStatut;
    const q = nouvelleRecherche !== undefined ? nouvelleRecherche : recherche;

    if (stat && stat !== "tous") {
      params.set("statut", stat);
    } else {
      params.delete("statut");
    }

    if (q.trim()) {
      params.set("q", q.trim());
    } else {
      params.delete("q");
    }

    params.set("page", "1");

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  // Statistiques calculées ou globales
  const stats = useMemo(() => {
    if (statsGlobales) return statsGlobales;

    let caTotal = 0;
    let totalEncaisse = 0;
    let totalImpayes = 0;

    ventes.forEach((v) => {
      caTotal += v.montant_total;
      const paye = v.paiements.reduce((acc, p) => acc + p.montant, 0);
      totalEncaisse += paye;
      if (v.montant_total > paye) {
        totalImpayes += v.montant_total - paye;
      }
    });

    return {
      nombreVentes: totalElements ?? ventes.length,
      caTotal,
      totalEncaisse,
      totalImpayes,
    };
  }, [ventes, statsGlobales, totalElements]);

  // Charger le reçu pour réimpression
  async function handleOuvrirRecu(venteId: string) {
    setChargementRecuId(venteId);
    const res = await getRecuVenteAction(venteId);
    setChargementRecuId(null);

    if (res.success && res.recu) {
      setRecuSelectionne(res.recu);
    } else {
      alert(res.error || "Impossible de charger la facture.");
    }
  }

  const getStatutBadge = (statut: StatutPaiementVente) => {
    switch (statut) {
      case "paye":
        return {
          label: "Payé",
          badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
          icon: CheckCircle2,
        };
      case "partiel":
        return {
          label: "Partiel",
          badgeClass: "bg-amber-100 text-amber-800 border-amber-200",
          icon: Clock,
        };
      case "impaye":
        return {
          label: "Impayé",
          badgeClass: "bg-red-100 text-red-800 border-red-200",
          icon: AlertCircle,
        };
    }
  };

  const getModePaiementLabel = (mode?: ModePaiement) => {
    switch (mode) {
      case "especes":
        return { label: "Espèces", icon: Banknote };
      case "mtn_momo":
        return { label: "MTN MoMo", icon: Smartphone };
      case "moov_money":
        return { label: "Moov Money", icon: CreditCard };
      default:
        return { label: "Non réglé", icon: Clock };
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec métriques */}
      <div className="bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-[#C1652D]/10 text-[#C1652D]">
                <Receipt className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-extrabold text-[#2B2119]">
                Ventes & Factures — {boutiqueNom}
              </h1>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-[#E5DACF] text-[#6D5D52]">
                {boutiqueCode}
              </span>
            </div>
            <p className="text-xs text-[#6D5D52]">
              Historique complet des transactions, numéros de factures séquentiels et réimpression des reçus.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/dashboard/ventes/impayes"
              className="px-3.5 py-2 rounded-xl bg-[#FAF6F1] border border-[#E5DACF] text-[#2B2119] hover:border-[#C1652D] font-bold text-xs transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Clock className="w-4 h-4 text-[#C1652D]" />
              <span>Suivi des Impayés ({stats.totalImpayes.toLocaleString("fr-FR")} F)</span>
            </a>
          </div>
        </div>

        {/* 4 Indicateurs de ventes */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-4 border-t border-[#E5DACF]">
          <div className="p-3.5 rounded-xl bg-[#E5DACF]/30 border border-[#E5DACF]/60">
            <div className="flex items-center justify-between text-[#6D5D52] text-[11px] font-bold uppercase mb-1">
              <span>Transactions</span>
              <Receipt className="w-3.5 h-3.5 text-[#8C7A6B]" />
            </div>
            <div className="text-xl font-extrabold text-[#2B2119] font-mono">
              {stats.nombreVentes}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#E5DACF]/30 border border-[#E5DACF]/60">
            <div className="flex items-center justify-between text-[#6D5D52] text-[11px] font-bold uppercase mb-1">
              <span>CA Réalisé</span>
              <TrendingUp className="w-3.5 h-3.5 text-[#C1652D]" />
            </div>
            <div className="text-xl font-extrabold text-[#2B2119] font-mono truncate">
              {stats.caTotal.toLocaleString("fr-FR")}{" "}
              <span className="text-xs font-sans text-[#6D5D52]">FCFA</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#E5DACF]/30 border border-[#E5DACF]/60">
            <div className="flex items-center justify-between text-[#6D5D52] text-[11px] font-bold uppercase mb-1">
              <span>Encaissé</span>
              <Banknote className="w-3.5 h-3.5 text-[#C1652D]" />
            </div>
            <div className="text-xl font-extrabold text-[#2B2119] font-mono truncate">
              {stats.totalEncaisse.toLocaleString("fr-FR")}{" "}
              <span className="text-xs font-sans text-[#6D5D52]">FCFA</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#E5DACF]/30 border border-[#E5DACF]/60">
            <div className="flex items-center justify-between text-[#6D5D52] text-[11px] font-bold uppercase mb-1">
              <span>Reste à recouvrer</span>
              <Clock className="w-3.5 h-3.5 text-rose-600" />
            </div>
            <div className="text-xl font-extrabold text-rose-700 font-mono truncate">
              {stats.totalImpayes.toLocaleString("fr-FR")}{" "}
              <span className="text-xs font-sans text-rose-600">FCFA</span>
            </div>
          </div>
        </div>
      </div>

      {/* Barre d'outils et filtres */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Recherche texte */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C7A6B]" />
          <input
            type="text"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                appliquerFiltres(filtreStatut, recherche);
              }
            }}
            placeholder="Rechercher par N° facture, client... (Entrée pour valider)"
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-xs text-[#2B2119] placeholder-[#8C7A6B] focus:outline-none focus:ring-2 focus:ring-[#C1652D]"
          />
          {recherche && (
            <button
              type="button"
              onClick={() => {
                setRecherche("");
                appliquerFiltres(filtreStatut, "");
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C7A6B] hover:text-[#2B2119] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filtres de statut de paiement */}
        <div className="flex items-center gap-1.5 bg-[#E5DACF]/40 p-1 rounded-xl self-start sm:self-auto">
          {[
            { id: "tous", label: "Toutes" },
            { id: "paye", label: "Payées" },
            { id: "partiel", label: "Partielles" },
            { id: "impaye", label: "Impayées" },
          ].map((onglet) => (
            <button
              key={onglet.id}
              type="button"
              onClick={() => {
                setFiltreStatut(onglet.id);
                appliquerFiltres(onglet.id, recherche);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filtreStatut === onglet.id
                  ? "bg-[#FAF6F1] text-[#2B2119] shadow-xs"
                  : "text-[#6D5D52] hover:text-[#2B2119]"
              }`}
            >
              {onglet.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tableau des ventes */}
      <div className="bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl overflow-hidden shadow-sm">
        {ventes.length === 0 ? (
          <div className="p-12 text-center text-[#8C7A6B]">
            <Receipt className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <h3 className="font-bold text-sm text-[#2B2119]">Aucune vente trouvée</h3>
            <p className="text-xs text-[#6D5D52] mt-1">
              {recherche || filtreStatut !== "tous"
                ? "Aucune facture ne correspond à tes critères de recherche."
                : "Les ventes enregistrées sur cette boutique apparaîtront ici."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#E5DACF]/30 border-b border-[#E5DACF] text-[#6D5D52] font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">N° Facture</th>
                  <th className="py-3.5 px-4">Date & Heure</th>
                  <th className="py-3.5 px-4">Client</th>
                  <th className="py-3.5 px-4">Vendeur</th>
                  <th className="py-3.5 px-4">Règlement</th>
                  <th className="py-3.5 px-4 text-right">Montant Net</th>
                  <th className="py-3.5 px-4 text-center">Statut</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5DACF]/60">
                {ventes.map((v) => {
                  const statutInfo = getStatutBadge(v.statut_paiement);
                  const IconStatut = statutInfo.icon;
                  const premierPaiement = v.paiements[0];
                  const modeInfo = getModePaiementLabel(premierPaiement?.mode_paiement);
                  const ModeIcon = modeInfo.icon;
                  const estEnChargement = chargementRecuId === v.id;

                  return (
                    <tr
                      key={v.id}
                      className="hover:bg-[#E5DACF]/15 transition-colors group"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-[#C1652D]">
                        {v.numero_facture}
                      </td>
                      <td className="py-3.5 px-4 text-[#6D5D52] whitespace-nowrap">
                        {new Date(v.date_vente).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3.5 px-4">
                        {v.client ? (
                          <div>
                            <div className="font-bold text-[#2B2119]">{v.client.nom}</div>
                            <div className="text-[11px] text-[#8C7A6B]">{v.client.telephone}</div>
                          </div>
                        ) : (
                          <span className="text-[#8C7A6B] italic">Client comptoir</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-[#2B2119] font-medium">
                        {v.utilisateur.nom}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#E5DACF]/40 text-[#2B2119] text-[11px] font-medium">
                          <ModeIcon className="w-3.5 h-3.5 text-[#C1652D]" />
                          {modeInfo.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-extrabold text-[#2B2119] whitespace-nowrap">
                        {v.montant_total.toLocaleString("fr-FR")} FCFA
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statutInfo.badgeClass}`}
                        >
                          <IconStatut className="w-3 h-3" />
                          {statutInfo.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          disabled={estEnChargement}
                          onClick={() => handleOuvrirRecu(v.id)}
                          className="px-3 py-1.5 rounded-xl border border-[#E5DACF] text-xs font-bold text-[#2B2119] hover:bg-[#E5DACF]/50 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5 text-[#C1652D]" />
                          <span>Reçu</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination du tableau */}
        <Pagination
          page={page}
          totalPages={totalPages}
          totalElements={totalElements ?? ventes.length}
          limit={limit}
        />
      </div>

      {/* ======================================================== */}
      {/* MODALE : REÇU / FACTURE OFFICIELLE IMPRIMABLE           */}
      {/* ======================================================== */}
      {/* ======================================================== */}
      {/* MODALE : REÇU / FACTURE OFFICIELLE (80 mm & A4)          */}
      {/* ======================================================== */}
      {recuSelectionne && (
        <RecuVenteModal
          recu={recuSelectionne}
          onClose={() => setRecuSelectionne(null)}
          titreSucces={`Facture ${recuSelectionne.numero_facture}`}
        />
      )}
    </div>
  );
}
