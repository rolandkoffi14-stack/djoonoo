"use client";

import React, { useState, useTransition } from "react";
import {
  CreditCard,
  CheckCircle2,
  Clock,
  XCircle,
  Building2,
  Calendar,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { StatutFactureAbonnement } from "@prisma/client";
import { confirmerPaiementAbonnementAction } from "@/app/actions/super-admin";

export interface FactureAbonnementItem {
  id: string;
  compte_id: string;
  montant: number;
  statut: StatutFactureAbonnement;
  fournisseur_paiement: string;
  reference_externe: string | null;
  confirme_par_super_admin_id: string | null;
  date_echeance: string;
  date_confirmation: string | null;
  compte: {
    id: string;
    nom_entreprise: string;
    code: string;
    email_principal: string;
    statut_abonnement: string;
    forfait: {
      nom: string;
      prix_mensuel: number;
      duree_jours?: number;
    };
  };
}

interface PaiementsAbonnementManagerProps {
  initialFactures: FactureAbonnementItem[];
}

export default function PaiementsAbonnementManager({
  initialFactures,
}: PaiementsAbonnementManagerProps) {
  const [factures, setFactures] = useState<FactureAbonnementItem[]>(initialFactures);
  const [filtreStatut, setFiltreStatut] = useState<string>("tous");
  const [recherche, setRecherche] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleConfirmerPaiement = (
    factureId: string,
    nomEntreprise: string,
    dureeJours: number = 30
  ) => {
    if (
      !confirm(
        `Confirmer manuellement la réception du paiement pour ${nomEntreprise} ?\nCette action exceptionnelle activera le compte et prolongera l'abonnement de ${dureeJours} jours.`
      )
    ) {
      return;
    }

    startTransition(async () => {
      const res = await confirmerPaiementAbonnementAction(factureId);
      if (res.success) {
        setFactures((prev) =>
          prev.map((f) =>
            f.id === factureId
              ? {
                  ...f,
                  statut: StatutFactureAbonnement.payee,
                  date_confirmation: new Date().toISOString(),
                }
              : f
          )
        );
      } else {
        alert(res.error || "Une erreur est survenue.");
      }
    });
  };

  const getStatutBadge = (statut: StatutFactureAbonnement) => {
    switch (statut) {
      case "payee":
        return {
          label: "Payée & Validée",
          className: "bg-emerald-50 text-emerald-700 border-emerald-200",
          icon: CheckCircle2,
        };
      case "en_attente":
        return {
          label: "En attente",
          className: "bg-amber-50 text-amber-800 border-amber-300 font-bold",
          icon: Clock,
        };
      case "echouee":
        return {
          label: "Échouée",
          className: "bg-rose-50 text-rose-700 border-rose-200",
          icon: XCircle,
        };
      case "annulee":
        return {
          label: "Annulée",
          className: "bg-slate-100 text-slate-700 border-slate-200",
          icon: XCircle,
        };
    }
  };

  const facturesFiltrees = factures.filter((f) => {
    const matchQuery =
      f.compte.nom_entreprise.toLowerCase().includes(recherche.toLowerCase()) ||
      f.compte.code.toLowerCase().includes(recherche.toLowerCase()) ||
      f.compte.email_principal.toLowerCase().includes(recherche.toLowerCase()) ||
      (f.reference_externe && f.reference_externe.toLowerCase().includes(recherche.toLowerCase())) ||
      f.fournisseur_paiement.toLowerCase().includes(recherche.toLowerCase());

    const matchStatut =
      filtreStatut === "tous" || f.statut === filtreStatut;

    return matchQuery && matchStatut;
  });

  const totalEnAttente = factures.filter((f) => f.statut === "en_attente").length;
  const totalPayeesFedaPay = factures.filter(
    (f) => f.statut === "payee" && f.fournisseur_paiement === "fedapay"
  ).length;
  const montantTotalEncaisse = factures
    .filter((f) => f.statut === "payee")
    .reduce((acc, curr) => acc + curr.montant, 0);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <CreditCard className="w-6 h-6 text-emerald-600" />
            <span>Supervision des Abonnements &amp; Paiements</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Suivi temps réel des règlements FedaPay (MTN MoMo, Moov Money, CB) et régularisations manuelles
          </p>
        </div>
      </div>

      {/* KPI Paiements */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
            Encaissé via FedaPay
          </div>
          <div className="text-2xl font-black text-emerald-600 font-mono">
            {totalPayeesFedaPay} transaction(s)
          </div>
          <div className="text-xs text-slate-500 mt-1">Paiements 100% automatisés</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
            Volume Total Encaissé
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {montantTotalEncaisse.toLocaleString("fr-FR")} FCFA
          </div>
          <div className="text-xs text-slate-500 mt-1">Revenus d&apos;abonnements validés</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
            En Attente de Règlement
          </div>
          <div className="text-2xl font-black text-amber-600 font-mono">
            {totalEnAttente} facture(s)
          </div>
          <div className="text-xs text-slate-500 mt-1">Initiées ou à régulariser</div>
        </div>
      </div>

      {/* Filtres & Recherche */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par référence FedaPay, entreprise, email, code..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
          />
        </div>

        <select
          value={filtreStatut}
          onChange={(e) => setFiltreStatut(e.target.value)}
          aria-label="Filtrer par statut de paiement"
          className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:border-emerald-600"
        >
          <option value="tous">Tous les statuts</option>
          <option value="payee">Payées (validées)</option>
          <option value="en_attente">En attente</option>
          <option value="echouee">Échouées</option>
          <option value="annulee">Annulées</option>
        </select>
      </div>

      {/* Table des Factures d'Abonnement */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Réf. FedaPay</th>
                <th className="py-3 px-4">Entreprise cliente</th>
                <th className="py-3 px-4">Forfait</th>
                <th className="py-3 px-4">Montant</th>
                <th className="py-3 px-4">Moyen de paiement</th>
                <th className="py-3 px-4">Échéance</th>
                <th className="py-3 px-4">Statut</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {facturesFiltrees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500">
                    Aucune facture d&apos;abonnement trouvée.
                  </td>
                </tr>
              ) : (
                facturesFiltrees.map((f) => {
                  const badge = getStatutBadge(f.statut);
                  const Icon = badge.icon;
                  const isEnAttente = f.statut === "en_attente";
                  const duree = f.compte.forfait.duree_jours || 30;

                  return (
                    <tr key={f.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Référence FedaPay */}
                      <td className="py-3.5 px-4">
                        {f.reference_externe ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 font-mono font-bold text-xs text-slate-800">
                            {f.fournisseur_paiement === "fedapay" && (
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            )}
                            <span>#{f.reference_externe}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-mono italic">
                            Hors passerelle
                          </span>
                        )}
                      </td>

                      {/* Entreprise cliente */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">
                          {f.compte.nom_entreprise}
                        </div>
                        <div className="text-xs text-slate-500 font-mono">
                          Code : {f.compte.code} &bull; {f.compte.email_principal}
                        </div>
                      </td>

                      {/* Forfait */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">
                          {f.compte.forfait.nom}
                        </div>
                        <div className="text-xs text-slate-500">
                          Validité : {duree} j
                        </div>
                      </td>

                      {/* Montant */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900">
                          {f.montant.toLocaleString("fr-FR")} FCFA
                        </div>
                      </td>

                      {/* Moyen de paiement */}
                      <td className="py-3.5 px-4">
                        {f.fournisseur_paiement === "fedapay" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800">
                            <Zap className="w-3.5 h-3.5 text-emerald-600" />
                            <span>FedaPay (MoMo/Moov/CB)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
                            <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                            <span>Manuel</span>
                          </span>
                        )}
                      </td>

                      {/* Échéance */}
                      <td className="py-3.5 px-4 text-xs font-mono text-slate-600">
                        {new Date(f.date_echeance).toLocaleDateString("fr-FR")}
                      </td>

                      {/* Statut */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${badge.className}`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{badge.label}</span>
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        {isEnAttente ? (
                          <button
                            onClick={() =>
                              handleConfirmerPaiement(
                                f.id,
                                f.compte.nom_entreprise,
                                duree
                              )
                            }
                            disabled={isPending}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                            title="Validation manuelle de secours"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Valider (secours)</span>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 font-mono">
                            {f.date_confirmation
                              ? `Validé le ${new Date(f.date_confirmation).toLocaleDateString("fr-FR")}`
                              : "Automatique"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
