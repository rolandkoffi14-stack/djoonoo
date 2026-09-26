"use client";

import React, { useState, useTransition } from "react";
import {
  ShieldCheck,
  Search,
  Filter,
  User,
  Clock,
  ArrowRightLeft,
  XCircle,
  Package,
  ShoppingCart,
  Store,
  Eye,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  FileText,
  Key,
  ChevronRight,
  X,
  RefreshCw,
} from "lucide-react";
import { JournalAuditItem, recupererJournalAuditAction } from "@/app/actions/audit";

interface AuditManagerProps {
  initialLogs: JournalAuditItem[];
  initialStats: {
    totalGlobal: number;
    totalAujourdhui: number;
    totalSensibles: number;
  };
  utilisateurs: {
    id: string;
    nom: string;
    email: string;
    role: string;
  }[];
}

export default function AuditManager({
  initialLogs,
  initialStats,
  utilisateurs,
}: AuditManagerProps) {
  const [logs, setLogs] = useState<JournalAuditItem[]>(initialLogs);
  const [stats, setStats] = useState(initialStats);
  const [selectedCategorie, setSelectedCategorie] = useState<string>("toutes");
  const [selectedUtilisateur, setSelectedUtilisateur] = useState<string>("tous");
  const [recherche, setRecherche] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  // Inspecteur modal pour les détails JSON
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [inspectedLog, setInspectedLog] = useState<JournalAuditItem | null>(null);

  const rechargerLogs = (
    cat = selectedCategorie,
    user = selectedUtilisateur,
    query = recherche
  ) => {
    startTransition(async () => {
      const res = await recupererJournalAuditAction({
        categorie: cat,
        utilisateurId: user,
        recherche: query,
      });

      if (res.success && res.data) {
        setLogs(res.data.logs);
        setStats(res.data.stats);
      }
    });
  };

  const handleCategorieChange = (cat: string) => {
    setSelectedCategorie(cat);
    rechargerLogs(cat, selectedUtilisateur, recherche);
  };

  const handleUtilisateurChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedUtilisateur(val);
    rechargerLogs(selectedCategorie, val, recherche);
  };

  const handleRecherche = (e: React.FormEvent) => {
    e.preventDefault();
    rechargerLogs(selectedCategorie, selectedUtilisateur, recherche);
  };

  // Helper de formatage pour les types d'actions
  const getActionBadge = (action: string) => {
    switch (action) {
      case "creation_vente":
        return {
          label: "Vente Enregistrée",
          color: "bg-emerald-50 text-emerald-800 border-emerald-200",
          icon: ShoppingCart,
        };
      case "annulation_vente":
        return {
          label: "Annulation Vente (Règle 10)",
          color: "bg-rose-50 text-rose-800 border-rose-300 font-bold",
          icon: XCircle,
        };
      case "reglement_dette":
        return {
          label: "Règlement Facture",
          color: "bg-blue-50 text-blue-800 border-blue-200",
          icon: CheckCircle2,
        };
      case "creation_produit":
        return {
          label: "Nouveau Produit",
          color: "bg-amber-50 text-amber-800 border-amber-200",
          icon: Package,
        };
      case "modification_prix_produit":
        return {
          label: "Changement de Prix",
          color: "bg-purple-50 text-purple-800 border-purple-200",
          icon: AlertTriangle,
        };
      case "reapprovisionnement_stock":
        return {
          label: "Réapprovisionnement Stock",
          color: "bg-teal-50 text-teal-800 border-teal-200",
          icon: Package,
        };
      case "transfert_employe":
        return {
          label: "Mutation Employé (H20)",
          color: "bg-[#C1652D]/10 text-[#C1652D] border-[#C1652D]/30 font-bold",
          icon: ArrowRightLeft,
        };
      case "invitation_employe":
        return {
          label: "Nouvel Employé",
          color: "bg-indigo-50 text-indigo-800 border-indigo-200",
          icon: User,
        };
      case "creation_boutique":
        return {
          label: "Nouvelle Boutique",
          color: "bg-cyan-50 text-cyan-800 border-cyan-200",
          icon: Store,
        };
      case "creation_compte":
        return {
          label: "Création Compte SaaS",
          color: "bg-slate-100 text-slate-800 border-slate-300",
          icon: Key,
        };
      default:
        return {
          label: action.replace(/_/g, " "),
          color: "bg-gray-100 text-gray-800 border-gray-200",
          icon: FileText,
        };
    }
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case "patron":
        return "bg-[#C1652D]/15 text-[#C1652D] border-[#C1652D]/30";
      case "gerant":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "vendeur":
        return "bg-amber-100 text-amber-800 border-amber-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const formatDateTime = (dateVal: string | Date) => {
    const d = new Date(dateVal);
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(d);
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec titre et badge de conformité */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#C1652D]/10 text-[#C1652D]">
              <ShieldCheck className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-black text-[#2B2119] tracking-tight">
              Journal d&apos;Audit & Traçabilité
            </h1>
          </div>
          <p className="text-sm text-[#8C7A6B] mt-1">
            Historique inaltérable de toutes les opérations sensibles réalisées au sein de ton entreprise.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Isolation Multi-Tenant Garantie (Règle 5)</span>
          </div>

          <button
            onClick={() => rechargerLogs()}
            disabled={isPending}
            className="p-2 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] hover:bg-[#E5DACF]/50 text-[#6D5D52] hover:text-[#2B2119] transition-colors focus:outline-none"
            title="Rafraîchir les logs"
          >
            <RefreshCw className={`w-4 h-4 ${isPending ? "animate-spin text-[#C1652D]" : ""}`} />
          </button>
        </div>
      </div>

      {/* Cartes KPI / Statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-[#E5DACF] shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-[#8C7A6B] uppercase tracking-wider mb-2">
            <span>Événements Enregistrés</span>
            <FileText className="w-4 h-4 text-[#8C7A6B]" />
          </div>
          <div className="text-3xl font-black text-[#2B2119] font-mono">
            {stats.totalGlobal.toLocaleString("fr-FR")}
          </div>
          <p className="text-xs text-[#8C7A6B] mt-1">Traçabilité complète depuis la création</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E5DACF] shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-[#8C7A6B] uppercase tracking-wider mb-2">
            <span>Activité Aujourd&apos;hui</span>
            <Calendar className="w-4 h-4 text-[#C1652D]" />
          </div>
          <div className="text-3xl font-black text-[#C1652D] font-mono">
            {stats.totalAujourdhui.toLocaleString("fr-FR")}
          </div>
          <p className="text-xs text-[#8C7A6B] mt-1">Actions posées ces dernières 24h</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E5DACF] shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-[#8C7A6B] uppercase tracking-wider mb-2">
            <span>Opérations Sensibles</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-3xl font-black text-amber-700 font-mono">
            {stats.totalSensibles.toLocaleString("fr-FR")}
          </div>
          <p className="text-xs text-[#8C7A6B] mt-1">Annulations, mutations, changements de prix</p>
        </div>
      </div>

      {/* Barre de filtres par catégorie */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E5DACF] pb-3">
        {[
          { id: "toutes", label: "Toutes les actions", count: stats.totalGlobal },
          { id: "ventes", label: "🛒 Ventes & Caisses" },
          { id: "stocks", label: "📦 Stocks & Prix" },
          { id: "equipe", label: "👥 Équipe & Mutations" },
          { id: "boutiques", label: "🏪 Boutiques" },
          { id: "securite", label: "🔐 Sécurité & Compte" },
        ].map((tab) => {
          const isActive = selectedCategorie === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleCategorieChange(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 focus:outline-none ${
                isActive
                  ? "bg-[#C1652D] text-[#FAF6F1] shadow-xs"
                  : "bg-white text-[#6D5D52] border border-[#E5DACF] hover:bg-[#FAF6F1] hover:text-[#2B2119]"
              }`}
            >
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Barre de recherche et filtre collaborateur */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleRecherche} className="relative flex-1">
          <Search className="w-4 h-4 text-[#8C7A6B] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par action, entité, numéro de facture, nom d'employé..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            className="w-full pl-10 pr-24 py-2.5 bg-white border border-[#E5DACF] rounded-xl text-sm text-[#2B2119] focus:outline-none focus:border-[#C1652D] focus:ring-1 focus:ring-[#C1652D]"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 bg-[#FAF6F1] border border-[#E5DACF] hover:bg-[#E5DACF]/50 text-xs font-bold text-[#2B2119] rounded-lg transition-colors"
          >
            Filtrer
          </button>
        </form>

        <div className="flex items-center gap-2">
          <select
            value={selectedUtilisateur}
            onChange={handleUtilisateurChange}
            aria-label="Filtrer par collaborateur"
            className="px-3.5 py-2.5 bg-white border border-[#E5DACF] rounded-xl text-sm font-semibold text-[#2B2119] focus:outline-none focus:border-[#C1652D]"
          >
            <option value="tous">Tous les collaborateurs</option>
            {utilisateurs.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nom} ({u.role.toUpperCase()})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tableau / Liste du Journal d'Audit */}
      <div className="bg-white rounded-2xl border border-[#E5DACF] overflow-hidden shadow-xs">
        {logs.length === 0 ? (
          <div className="p-12 text-center">
            <ShieldCheck className="w-12 h-12 text-[#E5DACF] mx-auto mb-3" />
            <h3 className="text-base font-bold text-[#2B2119]">Aucun événement trouvé</h3>
            <p className="text-sm text-[#8C7A6B] mt-1 max-w-sm mx-auto">
              Aucune action ne correspond aux critères de recherche sélectionnés.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5DACF] bg-[#FAF6F1]/60 text-[11px] font-bold uppercase tracking-wider text-[#8C7A6B]">
                  <th className="py-3 px-4">Date & Heure</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Auteur</th>
                  <th className="py-3 px-4">Entité concernée</th>
                  <th className="py-3 px-4 text-right">Détails</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5DACF]/60 text-sm">
                {logs.map((log) => {
                  const badge = getActionBadge(log.action);
                  const Icon = badge.icon;
                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-[#FAF6F1]/40 transition-colors group"
                    >
                      {/* Date & Heure */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-xs font-mono text-[#6D5D52]">
                          <Clock className="w-3.5 h-3.5 text-[#8C7A6B]" />
                          <span>{formatDateTime(log.date)}</span>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${badge.color}`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            <span>{badge.label}</span>
                          </span>
                        </div>
                      </td>

                      {/* Auteur */}
                      <td className="py-3.5 px-4">
                        {log.utilisateur ? (
                          <div className="flex items-center gap-2">
                            <div>
                              <div className="font-bold text-[#2B2119] text-xs">
                                {log.utilisateur.nom}
                              </div>
                              <div className="text-[11px] text-[#8C7A6B]">
                                {log.utilisateur.email}
                              </div>
                            </div>
                            <span
                              className={`text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded border ${getRoleBadge(
                                log.utilisateur.role
                              )}`}
                            >
                              {log.utilisateur.role}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-[#8C7A6B] italic">Système</span>
                        )}
                      </td>

                      {/* Entité concernée */}
                      <td className="py-3.5 px-4">
                        <div className="text-xs font-mono text-[#2B2119] font-medium">
                          {log.entite_concernee}
                        </div>
                        <div className="text-[11px] font-mono text-[#8C7A6B] truncate max-w-[200px]" title={log.entite_id}>
                          ID: {log.entite_id}
                        </div>
                      </td>

                      {/* Bouton inspecter */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setInspectedLog(log);
                            setInspectModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 rounded-lg border border-[#E5DACF] bg-[#FAF6F1] hover:bg-[#E5DACF]/60 text-xs font-bold text-[#6D5D52] hover:text-[#2B2119] transition-colors inline-flex items-center gap-1.5"
                          title="Voir les métadonnées de l'opération"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#C1652D]" />
                          <span>Détails</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODALE D'INSPECTION DES DÉTAILS DE L'AUDIT */}
      {inspectModalOpen && inspectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white border border-[#E5DACF] rounded-2xl shadow-2xl max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header de la modale */}
            <div className="p-5 border-b border-[#E5DACF] flex items-center justify-between bg-[#FAF6F1]">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-[#C1652D]/10 text-[#C1652D]">
                  <FileText className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-black text-[#2B2119]">
                    Métadonnées de l&apos;opération
                  </h3>
                  <p className="text-xs text-[#8C7A6B] font-mono">
                    ID Événement : {inspectedLog.id}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setInspectModalOpen(false)}
                className="p-1.5 rounded-lg text-[#8C7A6B] hover:bg-[#E5DACF]/50 hover:text-[#2B2119]"
                aria-label="Fermer la modale"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Corps de la modale */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-sm">
              {/* Infos clés */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#FAF6F1]/50 border border-[#E5DACF]">
                <div>
                  <div className="text-[11px] font-bold text-[#8C7A6B] uppercase">Action</div>
                  <div className="font-bold text-[#2B2119] mt-0.5">{inspectedLog.action}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-[#8C7A6B] uppercase">Horodatage</div>
                  <div className="font-mono text-xs text-[#2B2119] mt-0.5">
                    {formatDateTime(inspectedLog.date)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-[#8C7A6B] uppercase">Auteur</div>
                  <div className="font-semibold text-xs text-[#2B2119] mt-0.5">
                    {inspectedLog.utilisateur?.nom || "Système"}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-[#8C7A6B] uppercase">Entité</div>
                  <div className="font-mono text-xs text-[#2B2119] mt-0.5">
                    {inspectedLog.entite_concernee}
                  </div>
                </div>
              </div>

              {/* Payload JSON formatté */}
              <div>
                <div className="text-xs font-bold text-[#2B2119] mb-1.5 flex items-center justify-between">
                  <span>Détails & Modifications (Payload JSON)</span>
                  <span className="text-[11px] font-mono text-[#8C7A6B]">Inaltérable</span>
                </div>
                <div className="p-4 rounded-xl bg-[#2B2119] text-[#FAF6F1] font-mono text-xs overflow-x-auto border border-[#2B2119] shadow-inner max-h-64">
                  {inspectedLog.details ? (
                    <pre className="whitespace-pre-wrap break-words">
                      {JSON.stringify(inspectedLog.details, null, 2)}
                    </pre>
                  ) : (
                    <span className="text-[#8C7A6B] italic">Aucune charge utile supplémentaire.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Pied de la modale */}
            <div className="p-4 border-t border-[#E5DACF] bg-[#FAF6F1] flex justify-end">
              <button
                onClick={() => setInspectModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#2B2119] text-[#FAF6F1] text-xs font-bold hover:bg-[#C1652D] transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
