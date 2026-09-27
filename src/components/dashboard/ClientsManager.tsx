"use client";

import React, { useState, useTransition, useMemo, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Pagination from "@/components/ui/Pagination";
import {
  Users,
  Search,
  Plus,
  Phone,
  MessageSquare,
  TrendingUp,
  Receipt,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Eye,
  Edit2,
  X,
  Loader2,
  Calendar,
  Store,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { RoleUtilisateur } from "@prisma/client";
import {
  creerClientAction,
  modifierClientAction,
  rechercherClientsParTelephoneAction,
  getFicheClientDetailleeAction,
  ClientSearchResult,
  ClientDetailPayload,
} from "@/app/actions/clients";

export interface ClientItem {
  id: string;
  nom: string;
  telephone: string;
  date_creation: string;
  nbVentes: number;
  totalDepense: number;
  totalPaye: number;
  resteDu: number;
}

interface ClientsManagerProps {
  clientsInitiaux: ClientItem[];
  userRole: RoleUtilisateur;
  page?: number;
  limit?: number;
  totalPages?: number;
  totalElements?: number;
  initialSearch?: string;
  totalClientsGlobal?: number;
}

export default function ClientsManager({
  clientsInitiaux,
  userRole,
  page = 1,
  limit = 25,
  totalPages = 1,
  totalElements,
  initialSearch = "",
  totalClientsGlobal,
}: ClientsManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [clients, setClients] = useState<ClientItem[]>(clientsInitiaux);
  const [recherche, setRecherche] = useState(initialSearch);
  const [filtreType, setFiltreType] = useState<"tous" | "debiteurs" | "actifs">("tous");

  // Modale Création / Édition
  const [modalClientOuverte, setModalClientOuverte] = useState(false);
  const [clientEnEdition, setClientEnEdition] = useState<ClientItem | null>(null);
  const [nomInput, setNomInput] = useState("");
  const [telInput, setTelInput] = useState("");
  const [erreurForm, setErreurForm] = useState<string | null>(null);

  // Rapprochement téléphonique préalable (Décision C11)
  const [suggestionsTel, setSuggestionsTel] = useState<ClientSearchResult[]>([]);
  const [isSearchingTel, setIsSearchingTel] = useState(false);

  // Modale Fiche Client Détaillée
  const [ficheClient, setFicheClient] = useState<ClientDetailPayload | null>(null);
  const [chargementFicheId, setChargementFicheId] = useState<string | null>(null);

  // Synchronisation avec les props
  useEffect(() => {
    setClients(clientsInitiaux);
  }, [clientsInitiaux]);

  // Détection / Recherche de rapprochement à la frappe du téléphone (Décision C11)
  useEffect(() => {
    if (!modalClientOuverte || clientEnEdition) {
      setSuggestionsTel([]);
      return;
    }

    const clean = telInput.trim();
    if (clean.length < 4) {
      setSuggestionsTel([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setIsSearchingTel(true);
      const res = await rechercherClientsParTelephoneAction(clean);
      setIsSearchingTel(false);
      if (res.success && res.clients) {
        setSuggestionsTel(res.clients);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [telInput, modalClientOuverte, clientEnEdition]);

  // Filtrage du répertoire
  const clientsFiltres = useMemo(() => {
    const q = recherche.toLowerCase().trim();
    return clients.filter((c) => {
      if (filtreType === "debiteurs" && c.resteDu <= 0) return false;
      if (filtreType === "actifs" && c.nbVentes === 0) return false;

      if (!q) return true;
      const nomMatch = c.nom.toLowerCase().includes(q);
      const telMatch = c.telephone.includes(q);
      return nomMatch || telMatch;
    });
  }, [clients, recherche, filtreType]);

  // Indicateurs consolidés
  const stats = useMemo(() => {
    let caCumule = 0;
    let creancesTotales = 0;
    let nbDebiteurs = 0;

    clients.forEach((c) => {
      caCumule += c.totalDepense;
      creancesTotales += c.resteDu;
      if (c.resteDu > 0) nbDebiteurs++;
    });

    return {
      nbClients: clients.length,
      caCumule,
      creancesTotales,
      nbDebiteurs,
    };
  }, [clients]);

  // Ouvrir modal de création
  function ouvrirModalCreation() {
    setClientEnEdition(null);
    setNomInput("");
    setTelInput("");
    setErreurForm(null);
    setSuggestionsTel([]);
    setModalClientOuverte(true);
  }

  // Ouvrir modal d'édition
  function ouvrirModalEdition(c: ClientItem) {
    setClientEnEdition(c);
    setNomInput(c.nom);
    setTelInput(c.telephone);
    setErreurForm(null);
    setSuggestionsTel([]);
    setModalClientOuverte(true);
  }

  // Soumission formulaire Client
  function handleSubmitClient(e: React.FormEvent) {
    e.preventDefault();
    setErreurForm(null);

    const cleanNom = nomInput.trim();
    const cleanTel = telInput.trim();

    if (!cleanNom || !cleanTel) {
      setErreurForm("Le nom et le numéro de téléphone sont obligatoires.");
      return;
    }

    startTransition(async () => {
      if (clientEnEdition) {
        const res = await modifierClientAction(clientEnEdition.id, {
          nom: cleanNom,
          telephone: cleanTel,
        });
        if (!res.success) {
          setErreurForm(res.error || "Impossible de modifier ce client.");
        } else {
          setModalClientOuverte(false);
          router.refresh();
        }
      } else {
        const res = await creerClientAction({
          nom: cleanNom,
          telephone: cleanTel,
        });
        if (!res.success) {
          setErreurForm(res.error || "Impossible d'enregistrer le client.");
        } else {
          setModalClientOuverte(false);
          router.refresh();
        }
      }
    });
  }

  // Consulter fiche client détaillée
  async function handleVoirFiche(clientId: string) {
    setChargementFicheId(clientId);
    const res = await getFicheClientDetailleeAction(clientId);
    setChargementFicheId(null);

    if (res.success && res.client) {
      setFicheClient(res.client);
    } else {
      alert(res.error || "Impossible de charger la fiche client.");
    }
  }

  // Utiliser client suggéré (Décision C11)
  function handleSelectionnerSuggestion(suggestion: ClientSearchResult) {
    setModalClientOuverte(false);
    handleVoirFiche(suggestion.id);
  }

  const peutModifier = userRole === "patron" || userRole === "gerant";

  return (
    <div className="space-y-6">
      {/* En-tête avec indicateurs clés */}
      <div className="bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-[#C1652D]/10 text-[#C1652D]">
                <Users className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-extrabold text-[#2B2119]">
                Répertoire Clients
              </h1>
            </div>
            <p className="text-xs text-[#6D5D52]">
              Fiches clients rattachées à ton entreprise, historique d&apos;achats consolidé multi-boutiques et rapprochement automatique (Section 1.5 & Décision C11).
            </p>
          </div>

          <button
            type="button"
            onClick={ouvrirModalCreation}
            className="px-4 py-2.5 rounded-xl bg-[#C1652D] text-[#FAF6F1] font-bold text-xs hover:bg-[#a95524] transition-colors flex items-center gap-2 shadow-sm cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau client</span>
          </button>
        </div>

        {/* 4 Indicateurs consolidés */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-4 border-t border-[#E5DACF]">
          <div className="p-3.5 rounded-xl bg-[#E5DACF]/30 border border-[#E5DACF]/60">
            <div className="flex items-center justify-between text-[#6D5D52] text-[11px] font-bold uppercase mb-1">
              <span>Clients au répertoire</span>
              <UserCheck className="w-3.5 h-3.5 text-[#8C7A6B]" />
            </div>
            <div className="text-xl font-extrabold text-[#2B2119] font-mono">
              {stats.nbClients}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#E5DACF]/30 border border-[#E5DACF]/60">
            <div className="flex items-center justify-between text-[#6D5D52] text-[11px] font-bold uppercase mb-1">
              <span>Achats cumulés</span>
              <TrendingUp className="w-3.5 h-3.5 text-[#C1652D]" />
            </div>
            <div className="text-xl font-extrabold text-[#2B2119] font-mono truncate">
              {stats.caCumule.toLocaleString("fr-FR")}{" "}
              <span className="text-xs font-sans text-[#6D5D52]">FCFA</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#E5DACF]/30 border border-[#E5DACF]/60">
            <div className="flex items-center justify-between text-[#6D5D52] text-[11px] font-bold uppercase mb-1">
              <span>Créances en cours</span>
              <Clock className="w-3.5 h-3.5 text-red-600" />
            </div>
            <div className="text-xl font-extrabold text-red-700 font-mono truncate">
              {stats.creancesTotales.toLocaleString("fr-FR")}{" "}
              <span className="text-xs font-sans text-red-600">FCFA</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#E5DACF]/30 border border-[#E5DACF]/60">
            <div className="flex items-center justify-between text-[#6D5D52] text-[11px] font-bold uppercase mb-1">
              <span>Clients débiteurs</span>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-xl font-extrabold text-amber-800 font-mono">
              {stats.nbDebiteurs}
            </div>
          </div>
        </div>
      </div>

      {/* Barre d'outils et recherche */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C7A6B]" />
          <input
            type="text"
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
            placeholder="Rechercher par nom ou téléphone... (Entrée pour valider)"
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-xs text-[#2B2119] placeholder-[#8C7A6B] focus:outline-none focus:ring-2 focus:ring-[#C1652D]"
          />
          {recherche && (
            <button
              type="button"
              onClick={() => {
                setRecherche("");
                const params = new URLSearchParams(searchParams.toString());
                params.delete("q");
                params.set("page", "1");
                startTransition(() => {
                  router.push(`${pathname}?${params.toString()}`);
                });
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C7A6B] hover:text-[#2B2119] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 bg-[#E5DACF]/40 p-1 rounded-xl self-start sm:self-auto">
          {[
            { id: "tous", label: "Tous" },
            { id: "debiteurs", label: "Avec impayés" },
            { id: "actifs", label: "Clients réguliers" },
          ].map((onglet) => (
            <button
              key={onglet.id}
              type="button"
              onClick={() => setFiltreType(onglet.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filtreType === onglet.id
                  ? "bg-[#FAF6F1] text-[#2B2119] shadow-xs"
                  : "text-[#6D5D52] hover:text-[#2B2119]"
              }`}
            >
              {onglet.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tableau du répertoire clients */}
      <div className="bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl overflow-hidden shadow-sm">
        {clientsFiltres.length === 0 ? (
          <div className="p-12 text-center text-[#8C7A6B]">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <h3 className="font-bold text-sm text-[#2B2119]">Aucun client trouvé</h3>
            <p className="text-xs text-[#6D5D52] mt-1 max-w-sm mx-auto">
              {recherche || filtreType !== "tous"
                ? "Aucune fiche client ne correspond à tes filtres."
                : "Enregistre ton premier client pour suivre ses achats et ses crédits."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#E5DACF]/30 border-b border-[#E5DACF] text-[#6D5D52] font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Client</th>
                  <th className="py-3.5 px-4">Téléphone & Contact</th>
                  <th className="py-3.5 px-4 text-center">Achats</th>
                  <th className="py-3.5 px-4 text-right">Volume Acheté</th>
                  <th className="py-3.5 px-4 text-right">Reste Dû</th>
                  <th className="py-3.5 px-4">Inscrit le</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5DACF]/60">
                {clientsFiltres.map((c) => {
                  const aDesImpayes = c.resteDu > 0;
                  const estEnChargement = chargementFicheId === c.id;

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-[#E5DACF]/15 transition-colors group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-sm text-[#2B2119] group-hover:text-[#C1652D] transition-colors">
                          {c.nom}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[#2B2119] font-medium">
                            {c.telephone}
                          </span>
                          <a
                            href={`tel:${c.telephone}`}
                            className="p-1 rounded-lg hover:bg-emerald-100 text-emerald-800 transition-colors"
                            title="Appeler"
                          >
                            <Phone className="w-3 h-3" />
                          </a>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-[#6D5D52]">
                        {c.nbVentes}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-[#2B2119] whitespace-nowrap">
                        {c.totalDepense.toLocaleString("fr-FR")} FCFA
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {aDesImpayes ? (
                          <span className="font-mono font-extrabold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-lg text-xs">
                            {c.resteDu.toLocaleString("fr-FR")} FCFA
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-medium text-[11px] flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-3 h-3" /> À jour
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-[#8C7A6B] whitespace-nowrap">
                        {new Date(c.date_creation).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            disabled={estEnChargement}
                            onClick={() => handleVoirFiche(c.id)}
                            className="px-2.5 py-1.5 rounded-xl border border-[#E5DACF] text-xs font-bold text-[#2B2119] hover:bg-[#E5DACF]/50 transition-colors inline-flex items-center gap-1 cursor-pointer"
                            title="Voir l'historique complet"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#C1652D]" />
                            <span>Fiche</span>
                          </button>

                          {peutModifier && (
                            <button
                              type="button"
                              onClick={() => ouvrirModalEdition(c)}
                              className="p-1.5 rounded-xl border border-[#E5DACF] text-[#6D5D52] hover:text-[#2B2119] hover:bg-[#E5DACF]/50 transition-colors cursor-pointer"
                              title="Modifier"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
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
          totalElements={totalElements ?? clients.length}
          limit={limit}
        />
      </div>

      {/* ======================================================== */}
      {/* MODALE : CRÉATION / MODIFICATION & RAPPROCHEMENT (C11)   */}
      {/* ======================================================== */}
      {modalClientOuverte && (
        <div className="fixed inset-0 z-50 bg-[#2B2119]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5DACF]">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[#C1652D]/10 text-[#C1652D]">
                  <Users className="w-5 h-5" />
                </span>
                <h3 className="font-extrabold text-[#2B2119] text-base">
                  {clientEnEdition ? "Modifier le client" : "Nouveau client"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalClientOuverte(false)}
                className="text-[#8C7A6B] hover:text-[#2B2119] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitClient} className="mt-4 space-y-4">
              {erreurForm && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs">
                  {erreurForm}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#2B2119] mb-1">
                  Nom et prénom du client *
                </label>
                <input
                  type="text"
                  required
                  value={nomInput}
                  onChange={(e) => setNomInput(e.target.value)}
                  placeholder="Ex : Bio Chabi, Mme Adebayo..."
                  className="w-full px-3 py-2 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-xs text-[#2B2119] focus:outline-none focus:ring-2 focus:ring-[#C1652D]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2B2119] mb-1">
                  Numéro de téléphone *
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    value={telInput}
                    onChange={(e) => setTelInput(e.target.value)}
                    placeholder="Ex : +229 97 00 11 22"
                    className="w-full px-3 py-2 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-xs text-[#2B2119] focus:outline-none focus:ring-2 focus:ring-[#C1652D]"
                  />
                  {isSearchingTel && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C1652D]" />
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-[#8C7A6B] mt-1">
                  Recherche instantanée sur le compte pour éviter les doublons (Décision C11).
                </p>
              </div>

              {/* Rapprochement téléphonique préalable (Décision C11) */}
              {!clientEnEdition && suggestionsTel.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-700" />
                    <span>Client similaire déjà trouvé sur ce compte :</span>
                  </div>
                  <div className="space-y-1.5">
                    {suggestionsTel.map((s) => (
                      <div
                        key={s.id}
                        className="p-2 rounded-lg bg-[#FAF6F1] border border-amber-200 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-[#2B2119]">{s.nom}</div>
                          <div className="text-[11px] text-[#6D5D52] font-mono">
                            {s.telephone} • {s.nbVentes} achat{s.nbVentes > 1 ? "s" : ""}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSelectionnerSuggestion(s)}
                          className="px-2 py-1 rounded-lg bg-[#C1652D] text-[#FAF6F1] text-[10px] font-bold hover:bg-[#a95524] cursor-pointer"
                        >
                          Voir sa fiche
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-amber-800">
                    Tu peux quand même continuer la création si ce numéro est partagé.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E5DACF]">
                <button
                  type="button"
                  onClick={() => setModalClientOuverte(false)}
                  className="px-4 py-2 rounded-xl border border-[#E5DACF] text-xs font-bold text-[#6D5D52] hover:bg-[#E5DACF]/50 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl bg-[#C1652D] text-[#FAF6F1] text-xs font-bold hover:bg-[#a95524] transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <span>
                      {clientEnEdition ? "Mettre à jour" : "Créer le client"}
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODALE : FICHE CLIENT & HISTORIQUE MULTI-BOUTIQUES       */}
      {/* ======================================================== */}
      {ficheClient && (
        <div className="fixed inset-0 z-50 bg-[#2B2119]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-8">
            {/* Barre supérieure */}
            <div className="p-5 bg-[#FAF6F1] border-b border-[#E5DACF] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-[#C1652D]/10 text-[#C1652D]">
                    <UserCheck className="w-5 h-5" />
                  </span>
                  <h3 className="font-extrabold text-[#2B2119] text-lg">
                    {ficheClient.nom}
                  </h3>
                </div>
                <div className="flex items-center gap-3 text-xs text-[#6D5D52] mt-1">
                  <span className="font-mono font-semibold">{ficheClient.telephone}</span>
                  <span>•</span>
                  <span>
                    Client depuis le{" "}
                    {new Date(ficheClient.date_creation).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`tel:${ficheClient.telephone}`}
                  className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold hover:bg-emerald-200 transition-colors flex items-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Appeler</span>
                </a>
                <button
                  type="button"
                  onClick={() => setFicheClient(null)}
                  className="p-1.5 rounded-xl hover:bg-[#E5DACF] text-[#6D5D52] hover:text-[#2B2119] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Corps de la fiche */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* 3 Cartes de valeur client consolidée */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-[#E5DACF]/30 border border-[#E5DACF]">
                  <div className="text-[11px] font-bold text-[#6D5D52] uppercase">
                    Volume d&apos;achats
                  </div>
                  <div className="text-lg font-extrabold text-[#2B2119] font-mono mt-0.5">
                    {ficheClient.stats.totalDepense.toLocaleString("fr-FR")} FCFA
                  </div>
                  <div className="text-[10px] text-[#8C7A6B]">
                    {ficheClient.stats.nbAchats} achat{ficheClient.stats.nbAchats > 1 ? "s" : ""}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#E5DACF]/30 border border-[#E5DACF]">
                  <div className="text-[11px] font-bold text-[#6D5D52] uppercase">
                    Total Réglé
                  </div>
                  <div className="text-lg font-extrabold text-emerald-700 font-mono mt-0.5">
                    {ficheClient.stats.totalPaye.toLocaleString("fr-FR")} FCFA
                  </div>
                  <div className="text-[10px] text-emerald-700/80">Encaissé avec succès</div>
                </div>

                <div className="p-3.5 rounded-xl bg-red-50/70 border border-red-200">
                  <div className="text-[11px] font-bold text-red-800 uppercase">
                    Créances dues
                  </div>
                  <div className="text-lg font-extrabold text-red-700 font-mono mt-0.5">
                    {ficheClient.stats.totalResteDu.toLocaleString("fr-FR")} FCFA
                  </div>
                  <div className="text-[10px] text-red-700/80">
                    {ficheClient.stats.totalResteDu > 0 ? "Impayé en cours" : "Solde à jour"}
                  </div>
                </div>
              </div>

              {/* Historique multi-boutiques consolidé (Section 1.5) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-xs text-[#2B2119] uppercase tracking-wider flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-[#C1652D]" />
                    <span>Historique d&apos;achats consolidé (Toutes boutiques)</span>
                  </h4>
                  <span className="text-[11px] text-[#8C7A6B]">
                    {ficheClient.ventes.length} facture{ficheClient.ventes.length > 1 ? "s" : ""}
                  </span>
                </div>

                {ficheClient.ventes.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#8C7A6B] bg-[#E5DACF]/20 rounded-xl">
                    Aucun achat enregistré pour ce client pour le moment.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {ficheClient.ventes.map((v) => (
                      <div
                        key={v.id}
                        className="p-3.5 rounded-xl bg-[#FAF6F1] border border-[#E5DACF] hover:border-[#C1652D]/40 transition-all space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[#C1652D]">
                              {v.numero_facture}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#E5DACF] text-[#6D5D52] font-semibold flex items-center gap-1">
                              <Store className="w-3 h-3" />
                              {v.boutique_nom} ({v.boutique_code})
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                v.statut_vente === "annulee"
                                  ? "bg-stone-200 text-stone-600 border-stone-300"
                                  : v.statut_paiement === "paye"
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                  : v.statut_paiement === "partiel"
                                  ? "bg-amber-100 text-amber-800 border-amber-200"
                                  : "bg-red-100 text-red-800 border-red-200"
                              }`}
                            >
                              {v.statut_vente === "annulee"
                                ? "Annulée"
                                : v.statut_paiement === "paye"
                                ? "Payé"
                                : v.statut_paiement === "partiel"
                                ? "Partiel"
                                : "Impayé"}
                            </span>
                            <span className="text-[11px] text-[#8C7A6B]">
                              {new Date(v.date_vente).toLocaleDateString("fr-FR", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        </div>

                        {/* Lignes d'articles */}
                        <div className="text-[11px] text-[#6D5D52] pl-2 border-l-2 border-[#E5DACF]">
                          {v.lignes.map((l, idx) => (
                            <span key={idx} className="mr-3">
                              {l.quantite}x {l.produit_nom} (
                              {l.prix_unitaire.toLocaleString("fr-FR")} F)
                            </span>
                          ))}
                        </div>

                        <div className="flex justify-between items-center text-xs pt-1 border-t border-[#E5DACF]/60 font-mono">
                          <span className="text-[#6D5D52]">Total : {v.montant_total.toLocaleString("fr-FR")} FCFA</span>
                          {v.reste_du > 0 ? (
                            <span className="text-red-700 font-extrabold">
                              Reste dû : {v.reste_du.toLocaleString("fr-FR")} FCFA
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-bold">Soldé</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-[#FAF6F1] border-t border-[#E5DACF] flex justify-end">
              <button
                type="button"
                onClick={() => setFicheClient(null)}
                className="px-4 py-2 rounded-xl bg-[#2B2119] text-[#FAF6F1] text-xs font-bold hover:bg-black transition-colors cursor-pointer"
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
