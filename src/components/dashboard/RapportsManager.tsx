"use client";

import React, { useState, useTransition } from "react";
import {
  TrendingUp,
  Calendar,
  Store,
  Banknote,
  Smartphone,
  CreditCard,
  Users,
  ShoppingBag,
  Coins,
  Clock,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Receipt,
  PieChart,
  BarChart2,
  ArrowUpRight,
} from "lucide-react";
import { RoleUtilisateur } from "@prisma/client";
import {
  PeriodeRapport,
  RapportFinancierData,
  getRapportFinancierAction,
} from "@/app/actions/rapports";

export interface BoutiqueOption {
  id: string;
  code: string;
  nom: string;
}

interface RapportsManagerProps {
  initialData: RapportFinancierData;
  boutiques: BoutiqueOption[];
  userRole: RoleUtilisateur;
  activeBoutiqueId?: string;
}

export default function RapportsManager({
  initialData,
  boutiques,
  userRole,
  activeBoutiqueId,
}: RapportsManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState<RapportFinancierData>(initialData);
  const [periode, setPeriode] = useState<PeriodeRapport>(initialData.periode);
  const [boutiqueSelectionnee, setBoutiqueSelectionnee] = useState<string>(
    activeBoutiqueId || "tous"
  );

  function rechargerRapport(nouvellePeriode: PeriodeRapport, nouvelleBoutiqueId: string) {
    setPeriode(nouvellePeriode);
    setBoutiqueSelectionnee(nouvelleBoutiqueId);

    startTransition(async () => {
      const res = await getRapportFinancierAction({
        periode: nouvellePeriode,
        boutiqueId: nouvelleBoutiqueId,
      });

      if (res.success && res.data) {
        setData(res.data);
      } else {
        alert(res.error || "Impossible de charger le rapport.");
      }
    });
  }

  // Trouver la valeur maximale pour calibrer le graphique en barres
  const maxCaEvolution = Math.max(...data.evolution.map((p) => p.ca), 1);

  return (
    <div className="space-y-6">
      {/* En-tête principal & filtres */}
      <div className="bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-[#C1652D]/10 text-[#C1652D]">
                <TrendingUp className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-extrabold text-[#2B2119]">
                Rapports & Finances
              </h1>
            </div>
            <p className="text-xs text-[#6D5D52]">
              Analyse du chiffre d&apos;affaires, ventilation des règlements et panier moyen{" "}
              {userRole === "patron" ? "consolidé ou par boutique" : "de ta boutique"}.
            </p>
          </div>

          {/* Sélecteurs de Boutique et de Période */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Sélecteur de Boutique pour le Patron */}
            {userRole === "patron" && (
              <div className="relative">
                <select
                  value={boutiqueSelectionnee}
                  disabled={isPending}
                  onChange={(e) => rechargerRapport(periode, e.target.value)}
                  className="w-full sm:w-auto px-3 py-2 pr-8 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-xs font-bold text-[#2B2119] focus:outline-none focus:ring-2 focus:ring-[#C1652D] cursor-pointer appearance-none"
                >
                  <option value="tous">Toutes les boutiques (Consolidé)</option>
                  {boutiques.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nom} ({b.code})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}

            {/* Sélecteur Période */}
            <div className="flex items-center gap-1 bg-[#E5DACF]/40 p-1 rounded-xl">
              {[
                { id: "jour", label: "Aujourd'hui" },
                { id: "semaine", label: "7 jours" },
                { id: "mois", label: "Ce mois" },
                { id: "annee", label: "Cette année" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={isPending}
                  onClick={() => rechargerRapport(p.id as PeriodeRapport, boutiqueSelectionnee)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    periode === p.id
                      ? "bg-[#FAF6F1] text-[#2B2119] shadow-xs"
                      : "text-[#6D5D52] hover:text-[#2B2119]"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 4 Indicateurs financiers majeurs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-4 border-t border-[#E5DACF]">
          {/* Chiffre d'Affaires Net */}
          <div className="p-4 rounded-xl bg-[#FAF6F1] border border-[#E5DACF] relative overflow-hidden">
            <div className="flex items-center justify-between text-[#6D5D52] text-[11px] font-bold uppercase mb-1">
              <span>Chiffre d&apos;Affaires Net</span>
              <Coins className="w-4 h-4 text-[#C1652D]" />
            </div>
            <div className="text-2xl font-extrabold text-[#2B2119] font-mono truncate">
              {data.caNet.toLocaleString("fr-FR")}{" "}
              <span className="text-xs font-sans text-[#6D5D52]">FCFA</span>
            </div>
            <div className="text-[10px] text-[#8C7A6B] mt-1 truncate">
              Brut: {data.caBrut.toLocaleString("fr-FR")} F • Remises: {data.totalRemises.toLocaleString("fr-FR")} F
            </div>
          </div>

          {/* Total Encaissé en Caisse */}
          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 relative overflow-hidden">
            <div className="flex items-center justify-between text-emerald-800 text-[11px] font-bold uppercase mb-1">
              <span>Total Encaissé</span>
              <Banknote className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-700 font-mono truncate">
              {data.totalEncaisse.toLocaleString("fr-FR")}{" "}
              <span className="text-xs font-sans text-emerald-600">FCFA</span>
            </div>
            <div className="text-[10px] text-emerald-700/80 mt-1">
              {data.caNet > 0
                ? `${Math.round((data.totalEncaisse / data.caNet) * 100)}% du CA déjà encaissé`
                : "Aucune vente sur la période"}
            </div>
          </div>

          {/* Créances / Impayés */}
          <div className="p-4 rounded-xl bg-red-50/60 border border-red-200 relative overflow-hidden">
            <div className="flex items-center justify-between text-red-800 text-[11px] font-bold uppercase mb-1">
              <span>Créances en cours</span>
              <Clock className="w-4 h-4 text-red-600" />
            </div>
            <div className="text-2xl font-extrabold text-red-700 font-mono truncate">
              {data.totalCreances.toLocaleString("fr-FR")}{" "}
              <span className="text-xs font-sans text-red-600">FCFA</span>
            </div>
            <div className="text-[10px] text-red-700/80 mt-1">
              {data.totalCreances > 0 ? "Reste à recouvrer auprès des clients" : "Zéro créance en attente"}
            </div>
          </div>

          {/* Panier Moyen & Volumes */}
          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 relative overflow-hidden">
            <div className="flex items-center justify-between text-blue-800 text-[11px] font-bold uppercase mb-1">
              <span>Panier Moyen</span>
              <ShoppingBag className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-extrabold text-blue-900 font-mono truncate">
              {data.panierMoyen.toLocaleString("fr-FR")}{" "}
              <span className="text-xs font-sans text-blue-800">FCFA</span>
            </div>
            <div className="text-[10px] text-blue-800/80 mt-1">
              {data.nbVentes} vente{data.nbVentes > 1 ? "s" : ""} • {data.nbArticlesVendus} article{data.nbArticlesVendus > 1 ? "s" : ""}
            </div>
          </div>
        </div>
      </div>

      {/* Grille 2 colonnes : Évolution temporelle & Modes de règlement */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne Gauche (2/3) : Évolution du CA */}
        <div className="lg:col-span-2 bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-[#C1652D]/10 text-[#C1652D]">
                <BarChart2 className="w-4 h-4" />
              </span>
              <h2 className="font-extrabold text-sm text-[#2B2119]">
                Évolution du Chiffre d&apos;Affaires
              </h2>
            </div>
            <span className="text-[11px] text-[#8C7A6B]">
              {data.evolution.length} point{data.evolution.length > 1 ? "s" : ""} analysé{data.evolution.length > 1 ? "s" : ""}
            </span>
          </div>

          {/* Visualisation en barres verticales */}
          <div className="pt-6 pb-2">
            <div className="h-44 flex items-end justify-between gap-2 px-2 border-b border-[#E5DACF]">
              {data.evolution.map((point, index) => {
                const hauteurPourcentage =
                  point.ca > 0 ? Math.max(8, Math.round((point.ca / maxCaEvolution) * 100)) : 4;

                return (
                  <div
                    key={index}
                    className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end"
                  >
                    {/* Tooltip au survol */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-[#2B2119] text-[#FAF6F1] text-[10px] font-mono font-bold px-2 py-1 rounded-md pointer-events-none whitespace-nowrap z-10 shadow-md">
                      {point.ca.toLocaleString("fr-FR")} FCFA
                    </div>

                    {/* Barre visuelle */}
                    <div
                      style={{ height: `${hauteurPourcentage}%` }}
                      className={`w-full rounded-t-lg transition-all duration-300 ${
                        point.ca > 0
                          ? "bg-[#C1652D] group-hover:bg-[#a95524]"
                          : "bg-[#E5DACF]/60"
                      }`}
                    />
                    <span className="text-[10px] font-semibold text-[#6D5D52] truncate max-w-full">
                      {point.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Colonne Droite (1/3) : Répartition par Mode de Règlement */}
        <div className="bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-emerald-100 text-emerald-800">
              <PieChart className="w-4 h-4" />
            </span>
            <h2 className="font-extrabold text-sm text-[#2B2119]">
              Modes d&apos;Encaissement
            </h2>
          </div>

          <p className="text-xs text-[#6D5D52]">
            Répartition des {data.totalEncaisse.toLocaleString("fr-FR")} FCFA encaissés sur la période.
          </p>

          <div className="space-y-4 pt-2">
            {data.modesPaiement.map((modeStat) => {
              const IconMode =
                modeStat.mode === "especes"
                  ? Banknote
                  : modeStat.mode === "mtn_momo"
                  ? Smartphone
                  : CreditCard;

              const colorClass =
                modeStat.mode === "especes"
                  ? "bg-emerald-600"
                  : modeStat.mode === "mtn_momo"
                  ? "bg-amber-500"
                  : "bg-blue-600";

              return (
                <div key={modeStat.mode} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-[#2B2119]">
                      <IconMode className="w-3.5 h-3.5 text-[#C1652D]" />
                      <span>{modeStat.label}</span>
                    </div>
                    <div className="font-mono text-[11px] font-bold text-[#2B2119]">
                      {modeStat.montant.toLocaleString("fr-FR")} FCFA ({modeStat.pourcentage}%)
                    </div>
                  </div>

                  {/* Barre de progression */}
                  <div className="w-full h-2 rounded-full bg-[#E5DACF]/60 overflow-hidden">
                    <div
                      style={{ width: `${modeStat.pourcentage}%` }}
                      className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grille inférieure : Répartition multi-boutiques & Vendeurs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance par boutique (si Patron en vue consolidée) */}
        {userRole === "patron" && (
          <div className="bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-lg bg-[#C1652D]/10 text-[#C1652D]">
                  <Store className="w-4 h-4" />
                </span>
                <h2 className="font-extrabold text-sm text-[#2B2119]">
                  Chiffre d&apos;Affaires par Boutique
                </h2>
              </div>
              <span className="text-[11px] text-[#8C7A6B]">
                {data.ventesParBoutique.length} point{data.ventesParBoutique.length > 1 ? "s" : ""} de vente
              </span>
            </div>

            {data.ventesParBoutique.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#8C7A6B]">
                Aucune vente enregistrée sur cette période.
              </div>
            ) : (
              <div className="divide-y divide-[#E5DACF]/60">
                {data.ventesParBoutique.map((b) => (
                  <div
                    key={b.boutiqueId}
                    className="py-3 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-[#2B2119] flex items-center gap-1.5">
                        <span>{b.boutiqueNom}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-[#E5DACF] text-[#6D5D52]">
                          {b.boutiqueCode}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#8C7A6B]">
                        {b.nbVentes} vente{b.nbVentes > 1 ? "s" : ""} réalisée{b.nbVentes > 1 ? "s" : ""}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono font-extrabold text-[#2B2119]">
                        {b.caNet.toLocaleString("fr-FR")} FCFA
                      </div>
                      <div className="text-[10px] text-emerald-700 font-medium">
                        Encaissé : {b.totalEncaisse.toLocaleString("fr-FR")} FCFA
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Classement des vendeurs */}
        <div
          className={`bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl p-6 shadow-sm space-y-4 ${
            userRole !== "patron" ? "lg:col-span-2" : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-[#C1652D]/10 text-[#C1652D]">
                <Users className="w-4 h-4" />
              </span>
              <h2 className="font-extrabold text-sm text-[#2B2119]">
                Activité des Vendeurs
              </h2>
            </div>
            <span className="text-[11px] text-[#8C7A6B]">
              {data.ventesParVendeur.length} équipier{data.ventesParVendeur.length > 1 ? "s" : ""} actif{data.ventesParVendeur.length > 1 ? "s" : ""}
            </span>
          </div>

          {data.ventesParVendeur.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#8C7A6B]">
              Aucune vente enregistrée sur cette période.
            </div>
          ) : (
            <div className="divide-y divide-[#E5DACF]/60">
              {data.ventesParVendeur.map((v, idx) => (
                <div
                  key={v.vendeurId}
                  className="py-3 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-[#E5DACF]/60 text-[#2B2119] text-[11px] font-extrabold flex items-center justify-center font-mono">
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="font-bold text-[#2B2119]">{v.vendeurNom}</div>
                      <div className="text-[11px] text-[#8C7A6B]">
                        {v.nbVentes} vente{v.nbVentes > 1 ? "s" : ""} enregistrée{v.nbVentes > 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono font-extrabold text-[#C1652D]">
                      {v.caNet.toLocaleString("fr-FR")} FCFA
                    </div>
                    <div className="text-[10px] text-[#8C7A6B]">
                      {data.caNet > 0
                        ? `${Math.round((v.caNet / data.caNet) * 100)}% du total`
                        : "0%"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
