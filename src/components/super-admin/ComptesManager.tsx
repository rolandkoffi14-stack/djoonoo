"use client";

import React, { useState, useTransition } from "react";
import {
  Building2,
  Search,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Store,
  Users,
  Calendar,
  Lock,
  Unlock,
  Filter,
  Zap,
  RefreshCw,
} from "lucide-react";
import { StatutAbonnement } from "@prisma/client";
import {
  suspendreOuReactiverCompteAction,
  declencherCycleAbonnementsManuelAction,
} from "@/app/actions/super-admin";

export interface CompteAdminItem {
  id: string;
  code: string;
  nom_entreprise: string;
  email_principal: string;
  telephone_principal: string;
  ville: string;
  statut_abonnement: StatutAbonnement;
  date_fin_essai: string | null;
  date_fin_periode_courante: string | null;
  date_creation: string;
  forfait: {
    id: string;
    nom: string;
    prix_mensuel: number;
    max_boutiques: number | null;
  };
  _count: {
    boutiques: number;
    utilisateurs: number;
  };
}

interface ComptesManagerProps {
  initialComptes: CompteAdminItem[];
  stats: {
    totalComptes: number;
    comptesActifs: number;
    comptesEssai: number;
    comptesSuspendus: number;
    totalBoutiques: number;
  };
}

export default function ComptesManager({
  initialComptes,
  stats,
}: ComptesManagerProps) {
  const [comptes, setComptes] = useState<CompteAdminItem[]>(initialComptes);
  const [recherche, setRecherche] = useState("");
  const [filtreStatut, setFiltreStatut] = useState<string>("tous");
  const [isPending, startTransition] = useTransition();

  // Modale de suspension
  const [modalOpen, setModalOpen] = useState(false);
  const [compteCible, setCompteCible] = useState<CompteAdminItem | null>(null);
  const [motifSuspension, setMotifSuspension] = useState("");
  const [actionType, setActionType] = useState<"suspendre" | "reactiver">("suspendre");
  const [cronFeedback, setCronFeedback] = useState<string | null>(null);

  const handleDeclencherCron = () => {
    setCronFeedback(null);
    startTransition(async () => {
      const res = await declencherCycleAbonnementsManuelAction();
      if (res.success && res.rapport) {
        const { stats } = res.rapport;
        setCronFeedback(
          `Cycle de vie exécuté : ${stats.comptesPassesEnImpaye} passé(s) en impayé, ${stats.facturesGenerees} facture(s) créée(s), ${stats.comptesSuspendus} suspendu(s).`
        );
      } else {
        setCronFeedback(res.error || "Erreur d'exécution du cycle.");
      }
    });
  };

  const getStatutBadge = (statut: StatutAbonnement) => {
    switch (statut) {
      case "actif":
        return {
          label: "Actif",
          className: "bg-emerald-50 text-emerald-700 border-emerald-200",
          icon: CheckCircle2,
        };
      case "essai":
        return {
          label: "Essai Gratuit",
          className: "bg-blue-50 text-blue-700 border-blue-200",
          icon: Clock,
        };
      case "impaye":
        return {
          label: "Impayé",
          className: "bg-amber-50 text-amber-700 border-amber-200",
          icon: AlertTriangle,
        };
      case "suspendu":
        return {
          label: "Suspendu",
          className: "bg-rose-50 text-rose-700 border-rose-300 font-bold",
          icon: XCircle,
        };
      case "expire":
        return {
          label: "Expiré (Lecture seule)",
          className: "bg-orange-50 text-orange-700 border-orange-200",
          icon: Clock,
        };
      case "resilie":
        return {
          label: "Résilié",
          className: "bg-slate-100 text-slate-700 border-slate-300",
          icon: XCircle,
        };
      default:
        return {
          label: statut,
          className: "bg-slate-100 text-slate-700 border-slate-300",
          icon: Clock,
        };
    }
  };

  const handleConfirmerAction = () => {
    if (!compteCible) return;

    startTransition(async () => {
      const nouveauStatut =
        actionType === "suspendre"
          ? StatutAbonnement.suspendu
          : StatutAbonnement.actif;

      const res = await suspendreOuReactiverCompteAction(
        compteCible.id,
        nouveauStatut,
        motifSuspension
      );

      if (res.success) {
        setComptes((prev) =>
          prev.map((c) =>
            c.id === compteCible.id ? { ...c, statut_abonnement: nouveauStatut } : c
          )
        );
        setModalOpen(false);
        setCompteCible(null);
        setMotifSuspension("");
      } else {
        alert(res.error || "Une erreur est survenue.");
      }
    });
  };

  const comptesFiltres = comptes.filter((c) => {
    const matchQuery =
      c.nom_entreprise.toLowerCase().includes(recherche.toLowerCase()) ||
      c.code.toLowerCase().includes(recherche.toLowerCase()) ||
      c.email_principal.toLowerCase().includes(recherche.toLowerCase()) ||
      c.telephone_principal.includes(recherche);

    const matchStatut =
      filtreStatut === "tous" || c.statut_abonnement === filtreStatut;

    return matchQuery && matchStatut;
  });

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-[#C1652D]" />
            <span>Gestion des Comptes Marchands</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Supervision de toutes les entreprises inscrites sur la plateforme djoonoo
          </p>
        </div>

        <button
          onClick={handleDeclencherCron}
          disabled={isPending}
          className="px-4 py-2.5 bg-slate-900 hover:bg-[#C1652D] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-xs cursor-pointer self-start sm:self-auto disabled:opacity-50"
        >
          <Zap className={`w-4 h-4 text-amber-400 ${isPending ? "animate-spin" : ""}`} />
          <span>{isPending ? "Vérification du cycle..." : "Exécuter cycle abonnements (Cron)"}</span>
        </button>
      </div>

      {cronFeedback && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <span>{cronFeedback}</span>
          <button
            onClick={() => setCronFeedback(null)}
            className="text-amber-700 hover:text-amber-900 font-bold ml-2 underline text-[11px]"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Cartes KPI Globales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
            Total Comptes
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {stats.totalComptes}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <Store className="w-3.5 h-3.5 text-[#C1652D]" />
            <span>{stats.totalBoutiques} boutiques déployées</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
            Comptes Actifs
          </div>
          <div className="text-2xl font-black text-emerald-600 font-mono">
            {stats.comptesActifs}
          </div>
          <div className="text-xs text-slate-500 mt-1">Abonnements payés</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
            Période d&apos;Essai
          </div>
          <div className="text-2xl font-black text-blue-600 font-mono">
            {stats.comptesEssai}
          </div>
          <div className="text-xs text-slate-500 mt-1">Essais en cours</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
            Comptes Suspendus
          </div>
          <div className="text-2xl font-black text-rose-600 font-mono">
            {stats.comptesSuspendus}
          </div>
          <div className="text-xs text-slate-500 mt-1">Accès bloqué (Section 8 bis)</div>
        </div>
      </div>

      {/* Barre de Recherche et Filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par nom d'entreprise, code, email, téléphone..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#C1652D] focus:ring-1 focus:ring-[#C1652D]"
          />
        </div>

        <select
          value={filtreStatut}
          onChange={(e) => setFiltreStatut(e.target.value)}
          aria-label="Filtrer par statut d'abonnement"
          className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:border-[#C1652D]"
        >
          <option value="tous">Tous les statuts</option>
          <option value="actif">Actif</option>
          <option value="essai">Essai Gratuit</option>
          <option value="impaye">Impayé</option>
          <option value="suspendu">Suspendu</option>
          <option value="resilie">Résilié</option>
        </select>
      </div>

      {/* Table des Comptes */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Entreprise &amp; Code</th>
                <th className="py-3 px-4">Patron &amp; Contact</th>
                <th className="py-3 px-4">Forfait</th>
                <th className="py-3 px-4">Boutiques &amp; Équipe</th>
                <th className="py-3 px-4">Statut Abonnement</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {comptesFiltres.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    Aucun compte trouvé.
                  </td>
                </tr>
              ) : (
                comptesFiltres.map((c) => {
                  const badge = getStatutBadge(c.statut_abonnement);
                  const Icon = badge.icon;
                  const isSuspendu = c.statut_abonnement === "suspendu";

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Entreprise & Code */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{c.nom_entreprise}</div>
                        <div className="text-xs font-mono text-[#C1652D] font-bold">
                          Code : {c.code}
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4">
                        <div className="text-xs text-slate-800">{c.email_principal}</div>
                        <div className="text-xs font-mono text-slate-500">
                          {c.telephone_principal} &bull; {c.ville}
                        </div>
                      </td>

                      {/* Forfait */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800 text-xs px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200">
                          {c.forfait.nom} ({c.forfait.prix_mensuel.toLocaleString("fr-FR")} F)
                        </span>
                      </td>

                      {/* Boutiques & Équipe */}
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Store className="w-3.5 h-3.5 text-slate-400" />
                          <span>{c._count.boutiques} boutique(s)</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500 mt-0.5">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>{c._count.utilisateurs} utilisateur(s)</span>
                        </div>
                      </td>

                      {/* Statut Abonnement */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${badge.className}`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{badge.label}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {isSuspendu ? (
                          <button
                            onClick={() => {
                              setCompteCible(c);
                              setActionType("reactiver");
                              setModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            <span>Réactiver</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setCompteCible(c);
                              setActionType("suspendre");
                              setModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>Suspendre</span>
                          </button>
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

      {/* Modale de Confirmation de Suspension / Réactivation */}
      {modalOpen && compteCible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <span
                className={`p-2.5 rounded-2xl ${
                  actionType === "suspendre"
                    ? "bg-rose-50 text-rose-600"
                    : "bg-emerald-50 text-emerald-600"
                }`}
              >
                {actionType === "suspendre" ? (
                  <ShieldAlert className="w-6 h-6" />
                ) : (
                  <CheckCircle2 className="w-6 h-6" />
                )}
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {actionType === "suspendre"
                    ? "Suspendre le compte"
                    : "Réactiver le compte"}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {compteCible.nom_entreprise} ({compteCible.code})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              {actionType === "suspendre"
                ? "Conformément à la section 8 bis, suspendre ce compte entraînera un BLOCAGE IMMÉDIAT à la connexion pour tous les employés, y compris le Patron."
                : "La réactivation restaurera l'accès complet au dashboard et à la caisse pour l'ensemble des utilisateurs du compte."}
            </p>

            {actionType === "suspendre" && (
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Motif de la suspension
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Échéance d'abonnement impayée, anomalie détectée..."
                  value={motifSuspension}
                  onChange={(e) => setMotifSuspension(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#C1652D]"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleConfirmerAction}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-colors cursor-pointer ${
                  actionType === "suspendre"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {isPending
                  ? "Application..."
                  : actionType === "suspendre"
                  ? "Confirmer la suspension"
                  : "Confirmer la réactivation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
