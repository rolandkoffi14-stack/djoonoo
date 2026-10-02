"use client";

import React, { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  Search,
  Filter,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Banknote,
  Smartphone,
  CreditCard,
  User,
  Store,
  Phone,
  MessageSquare,
  Printer,
  X,
  Trash2,
  RotateCcw,
  Loader2,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  Users,
  Receipt,
} from "lucide-react";
import { StatutPaiementVente, ModePaiement, RoleUtilisateur } from "@prisma/client";
import {
  enregistrerReglementImpayeAction,
  annulerVenteImpayeeAction,
} from "@/app/actions/impayes";
import { getRecuVenteAction, RecuVenteData } from "@/app/actions/ventes";
import RecuVenteModal from "./RecuVenteModal";

export interface ImpayeItem {
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
    date_paiement: string;
  }[];
  lignes_vente: {
    id: string;
    produit_nom: string;
    quantite: number;
    prix_unitaire: number;
  }[];
}

interface ImpayesManagerProps {
  impayes: ImpayeItem[];
  boutiqueNom: string;
  boutiqueCode: string;
  userRole: RoleUtilisateur;
}

export default function ImpayesManager({
  impayes,
  boutiqueNom,
  boutiqueCode,
  userRole,
}: ImpayesManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [recherche, setRecherche] = useState("");
  const [filtreType, setFiltreType] = useState<"tous" | "impaye" | "partiel">("tous");

  // Modale Règlement
  const [venteARegler, setVenteARegler] = useState<ImpayeItem | null>(null);
  const [montantReglement, setMontantReglement] = useState<string>("");
  const [modeReglement, setModeReglement] = useState<ModePaiement>("especes");
  const [montantRecuEspeces, setMontantRecuEspeces] = useState<string>("");
  const [erreurReglement, setErreurReglement] = useState<string | null>(null);

  // Modale Annulation (Règle 10)
  const [venteAAnnuler, setVenteAAnnuler] = useState<ImpayeItem | null>(null);
  const [erreurAnnulation, setErreurAnnulation] = useState<string | null>(null);

  // Modale Reçu
  const [recuAffiche, setRecuAffiche] = useState<RecuVenteData | null>(null);
  const [chargementRecuId, setChargementRecuId] = useState<string | null>(null);

  // Calcul des montants d'une vente
  const getMontantsVente = (v: ImpayeItem) => {
    const totalPaye = v.paiements.reduce((acc, p) => acc + p.montant, 0);
    const resteDu = Math.max(0, v.montant_total - totalPaye);
    return { totalPaye, resteDu };
  };

  // Filtrage
  const impayesFiltres = useMemo(() => {
    const q = recherche.toLowerCase().trim();
    return impayes.filter((v) => {
      if (v.statut_vente === "annulee") return false;
      if (filtreType === "impaye" && v.statut_paiement !== "impaye") return false;
      if (filtreType === "partiel" && v.statut_paiement !== "partiel") return false;

      if (!q) return true;
      const numMatch = v.numero_facture.toLowerCase().includes(q);
      const clientNom = v.client?.nom.toLowerCase().includes(q);
      const clientTel = v.client?.telephone.includes(q);
      const vendeurNom = v.utilisateur.nom.toLowerCase().includes(q);
      return numMatch || clientNom || clientTel || vendeurNom;
    });
  }, [impayes, recherche, filtreType]);

  // Statistiques consolidées des créances
  const stats = useMemo(() => {
    let creancesTotales = 0;
    let nbFactures = 0;
    const clientsDebiteursSet = new Set<string>();

    impayes.forEach((v) => {
      if (v.statut_vente === "annulee") return;
      const { resteDu } = getMontantsVente(v);
      if (resteDu > 0) {
        creancesTotales += resteDu;
        nbFactures++;
        if (v.client) clientsDebiteursSet.add(v.client.id);
      }
    });

    return {
      creancesTotales,
      nbFactures,
      nbClientsDebiteurs: clientsDebiteursSet.size,
    };
  }, [impayes]);

  // Ouvrir modale règlement
  function ouvrirModalReglement(vente: ImpayeItem) {
    const { resteDu } = getMontantsVente(vente);
    setVenteARegler(vente);
    setMontantReglement(resteDu.toString());
    setModeReglement("especes");
    setMontantRecuEspeces(resteDu.toString());
    setErreurReglement(null);
  }

  // Soumettre un règlement
  function handleValiderReglement(e: React.FormEvent) {
    e.preventDefault();
    if (!venteARegler) return;
    setErreurReglement(null);

    const montant = parseInt(montantReglement, 10);
    const { resteDu } = getMontantsVente(venteARegler);

    if (isNaN(montant) || montant <= 0) {
      setErreurReglement("Le montant du règlement doit être supérieur à 0 FCFA.");
      return;
    }

    if (montant > resteDu) {
      setErreurReglement(
        `Le montant (${montant.toLocaleString("fr-FR")} FCFA) ne peut pas dépasser le reste dû (${resteDu.toLocaleString("fr-FR")} FCFA).`
      );
      return;
    }

    startTransition(async () => {
      const res = await enregistrerReglementImpayeAction({
        vente_id: venteARegler.id,
        montant,
        mode_paiement: modeReglement,
      });

      if (!res.success) {
        setErreurReglement(res.error || "Impossible d'enregistrer le règlement.");
      } else {
        setVenteARegler(null);
        router.refresh();
      }
    });
  }

  // Soumettre une annulation (Règle 10)
  function handleConfirmerAnnulation() {
    if (!venteAAnnuler) return;
    setErreurAnnulation(null);

    startTransition(async () => {
      const res = await annulerVenteImpayeeAction(venteAAnnuler.id);
      if (!res.success) {
        setErreurAnnulation(res.error || "Impossible d'annuler cette vente.");
      } else {
        setVenteAAnnuler(null);
        router.refresh();
      }
    });
  }

  // Ouvrir le reçu
  async function handleVoirRecu(venteId: string) {
    setChargementRecuId(venteId);
    const res = await getRecuVenteAction(venteId);
    setChargementRecuId(null);

    if (res.success && res.recu) {
      setRecuAffiche(res.recu);
    } else {
      alert(res.error || "Impossible d'afficher le reçu.");
    }
  }

  // Calcul monnaie en espèces pour la modale
  const monnaieRendueModal = useMemo(() => {
    if (modeReglement !== "especes") return 0;
    const aPayer = parseInt(montantReglement, 10) || 0;
    const recu = parseInt(montantRecuEspeces, 10) || 0;
    return recu > aPayer ? recu - aPayer : 0;
  }, [modeReglement, montantReglement, montantRecuEspeces]);

  const peutAnnuler = userRole === "patron" || userRole === "gerant";

  return (
    <div className="space-y-6">
      {/* En-tête avec métriques des créances */}
      <div className="bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-red-100 text-red-700">
                <Clock className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-extrabold text-[#2B2119]">
                Suivi des Impayés & Créances — {boutiqueNom}
              </h1>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-[#E5DACF] text-[#6D5D52]">
                {boutiqueCode}
              </span>
            </div>
            <p className="text-xs text-[#6D5D52]">
              Gestion des crédits clients, encaissement des acomptes ultérieurs et annulation des ventes impayées (Règle 10).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/dashboard/ventes"
              className="px-3.5 py-2 rounded-xl border border-[#E5DACF] text-[#2B2119] font-bold text-xs hover:bg-[#E5DACF]/50 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Receipt className="w-4 h-4 text-[#C1652D]" />
              <span>Toutes les ventes</span>
            </a>
          </div>
        </div>

        {/* 3 Indicateurs clés des impayés */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[#E5DACF]">
          <div className="p-4 rounded-xl bg-white border border-[#E5DACF]">
            <div className="flex items-center justify-between text-[#6D5D52] text-[11px] font-bold uppercase mb-1">
              <span>Créances en cours</span>
              <TrendingDown className="w-4 h-4 text-[#C1652D]" />
            </div>
            <div className="text-2xl font-extrabold text-rose-700 font-mono">
              {stats.creancesTotales.toLocaleString("fr-FR")}{" "}
              <span className="text-xs font-sans text-rose-600">FCFA</span>
            </div>
            <p className="text-[11px] text-[#8C7A6B] mt-1">Montant total restant à recouvrer</p>
          </div>

          <div className="p-4 rounded-xl bg-[#E5DACF]/30 border border-[#E5DACF]/60">
            <div className="flex items-center justify-between text-[#6D5D52] text-[11px] font-bold uppercase mb-1">
              <span>Factures avec solde dû</span>
              <Receipt className="w-4 h-4 text-[#8C7A6B]" />
            </div>
            <div className="text-2xl font-extrabold text-[#2B2119] font-mono">
              {stats.nbFactures}
            </div>
            <p className="text-[11px] text-[#6D5D52] mt-1">Ventes à crédit ou paiements partiels</p>
          </div>

          <div className="p-4 rounded-xl bg-[#E5DACF]/30 border border-[#E5DACF]/60">
            <div className="flex items-center justify-between text-[#6D5D52] text-[11px] font-bold uppercase mb-1">
              <span>Clients débiteurs</span>
              <Users className="w-4 h-4 text-[#C1652D]" />
            </div>
            <div className="text-2xl font-extrabold text-[#2B2119] font-mono">
              {stats.nbClientsDebiteurs}
            </div>
            <p className="text-[11px] text-[#6D5D52] mt-1">Clients ayant au moins une dette active</p>
          </div>
        </div>
      </div>

      {/* Barre de filtres et recherche */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C7A6B]" />
          <input
            type="text"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher par N° Facture, client ou vendeur..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-xs text-[#2B2119] placeholder-[#8C7A6B] focus:outline-none focus:ring-2 focus:ring-[#C1652D]"
          />
          {recherche && (
            <button
              type="button"
              onClick={() => setRecherche("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C7A6B] hover:text-[#2B2119] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 bg-[#E5DACF]/40 p-1 rounded-xl self-start sm:self-auto">
          {[
            { id: "tous", label: "Toutes les créances" },
            { id: "impaye", label: "100% Impayées" },
            { id: "partiel", label: "Partielles (Acomptes)" },
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

      {/* Tableau des créances */}
      <div className="bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl overflow-hidden shadow-sm">
        {impayesFiltres.length === 0 ? (
          <div className="p-12 text-center text-[#8C7A6B]">
            <CheckCircle2 className="w-12 h-12 text-[#C1652D] mx-auto mb-3 opacity-80" />
            <h3 className="font-bold text-sm text-[#2B2119]">Aucun impayé trouvé !</h3>
            <p className="text-xs text-[#6D5D52] mt-1 max-w-sm mx-auto">
              {recherche || filtreType !== "tous"
                ? "Aucune créance ne correspond à tes filtres."
                : "Toutes les ventes de cette boutique ont été intégralement réglées. Excellent travail !"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#E5DACF]/30 border-b border-[#E5DACF] text-[#6D5D52] font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">N° Facture</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Client Débiteur</th>
                  <th className="py-3.5 px-4 text-right">Total Net</th>
                  <th className="py-3.5 px-4 text-right">Déjà Versé</th>
                  <th className="py-3.5 px-4 text-right">Reste Dû</th>
                  <th className="py-3.5 px-4 text-center">Statut</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5DACF]/60">
                {impayesFiltres.map((v) => {
                  const { totalPaye, resteDu } = getMontantsVente(v);
                  const est100Impaye = v.statut_paiement === "impaye" && v.paiements.length === 0;

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
                        })}
                      </td>
                      <td className="py-3.5 px-4">
                        {v.client ? (
                          <div className="space-y-0.5">
                            <div className="font-bold text-[#2B2119]">{v.client.nom}</div>
                            <div className="flex items-center gap-2 text-[11px]">
                              <a
                                href={`tel:${v.client.telephone}`}
                                className="text-[#6D5D52] hover:text-[#C1652D] hover:underline flex items-center gap-0.5"
                                title="Appeler le client"
                              >
                                <Phone className="w-3 h-3" />
                                {v.client.telephone}
                              </a>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[#8C7A6B] italic">Client de passage (Anonyme)</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-[#2B2119]">
                        {v.montant_total.toLocaleString("fr-FR")} F
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-[#2B2119] font-semibold">
                        {totalPaye.toLocaleString("fr-FR")} F
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-red-700 text-sm whitespace-nowrap">
                        {resteDu.toLocaleString("fr-FR")} FCFA
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            v.statut_paiement === "partiel"
                              ? "bg-amber-100 text-amber-800 border-amber-200"
                              : "bg-red-100 text-red-800 border-red-200"
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          {v.statut_paiement === "partiel" ? "Partiel" : "Impayé"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Bouton Régler */}
                          <button
                            type="button"
                            onClick={() => ouvrirModalReglement(v)}
                            className="px-3 py-1.5 rounded-xl bg-[#C1652D] text-[#FAF6F1] font-bold text-xs hover:bg-[#a95524] transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                          >
                            <Banknote className="w-3.5 h-3.5" />
                            <span>Régler</span>
                          </button>

                          {/* Bouton Annulation (Règle 10 : uniquement si non payée et rôle Patron/Gérant) */}
                          {peutAnnuler && est100Impaye && (
                            <button
                              type="button"
                              onClick={() => {
                                setErreurAnnulation(null);
                                setVenteAAnnuler(v);
                              }}
                              className="p-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Annuler la vente et remettre les articles en stock"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Reçu */}
                          <button
                            type="button"
                            disabled={chargementRecuId === v.id}
                            onClick={() => handleVoirRecu(v.id)}
                            className="p-1.5 rounded-xl border border-[#E5DACF] text-[#6D5D52] hover:text-[#2B2119] hover:bg-[#E5DACF]/50 transition-colors cursor-pointer"
                            title="Consulter le reçu"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODALE : ENREGISTREMENT D'UN RÈGLEMENT (Règle 4)         */}
      {/* ======================================================== */}
      {venteARegler && (
        <div className="fixed inset-0 z-50 bg-[#2B2119]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5DACF]">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[#C1652D]/10 text-[#C1652D]">
                  <Banknote className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-[#2B2119] text-base">
                    Enregistrer un règlement
                  </h3>
                  <p className="text-[11px] font-mono text-[#C1652D]">
                    {venteARegler.numero_facture}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVenteARegler(null)}
                className="text-[#8C7A6B] hover:text-[#2B2119] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleValiderReglement} className="mt-4 space-y-4">
              {erreurReglement && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                  <div>{erreurReglement}</div>
                </div>
              )}

              {/* Rappel du solde */}
              <div className="p-3 rounded-xl bg-[#E5DACF]/40 border border-[#E5DACF] flex justify-between items-center text-xs">
                <div>
                  <div className="text-[#6D5D52]">Client débiteur :</div>
                  <div className="font-bold text-[#2B2119]">
                    {venteARegler.client ? venteARegler.client.nom : "Client comptoir"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[#6D5D52]">Reste dû à solder :</div>
                  <div className="font-extrabold text-red-700 text-sm font-mono">
                    {getMontantsVente(venteARegler).resteDu.toLocaleString("fr-FR")} FCFA
                  </div>
                </div>
              </div>

              {/* Saisie du montant du versement */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold text-[#2B2119]">
                  <span>Montant versé aujourd&apos;hui (FCFA) *</span>
                  <button
                    type="button"
                    onClick={() => {
                      const max = getMontantsVente(venteARegler).resteDu;
                      setMontantReglement(max.toString());
                      if (modeReglement === "especes") setMontantRecuEspeces(max.toString());
                    }}
                    className="text-[#C1652D] hover:underline text-[11px] cursor-pointer"
                  >
                    Tout solder
                  </button>
                </div>

                <input
                  type="number"
                  min="100"
                  max={getMontantsVente(venteARegler).resteDu}
                  step="50"
                  required
                  value={montantReglement}
                  onChange={(e) => {
                    setMontantReglement(e.target.value);
                    if (modeReglement === "especes") setMontantRecuEspeces(e.target.value);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-xs font-mono font-bold text-[#2B2119] focus:outline-none focus:ring-2 focus:ring-[#C1652D]/30 focus:border-[#C1652D]"
                />
              </div>

              {/* Choix du mode de paiement */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#2B2119]">
                  Moyen de paiement *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setModeReglement("especes")}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      modeReglement === "especes"
                        ? "border-[#C1652D] bg-[#C1652D]/10 text-[#C1652D] font-bold"
                        : "border-[#E5DACF] bg-[#FAF6F1] text-[#6D5D52]"
                    }`}
                  >
                    <Banknote className="w-4 h-4 mx-auto mb-1" />
                    <span className="text-[11px]">Espèces</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModeReglement("mtn_momo")}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      modeReglement === "mtn_momo"
                        ? "border-[#C1652D] bg-[#C1652D]/10 text-[#C1652D] font-bold"
                        : "border-[#E5DACF] bg-[#FAF6F1] text-[#6D5D52]"
                    }`}
                  >
                    <Smartphone className="w-4 h-4 mx-auto mb-1" />
                    <span className="text-[11px]">MTN MoMo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModeReglement("moov_money")}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      modeReglement === "moov_money"
                        ? "border-[#C1652D] bg-[#C1652D]/10 text-[#C1652D] font-bold"
                        : "border-[#E5DACF] bg-[#FAF6F1] text-[#6D5D52]"
                    }`}
                  >
                    <CreditCard className="w-4 h-4 mx-auto mb-1" />
                    <span className="text-[11px]">Moov Money</span>
                  </button>
                </div>
              </div>

              {/* Si Espèces : Calculateur de monnaie */}
              {modeReglement === "especes" && (
                <div className="p-3 rounded-xl bg-[#E5DACF]/30 border border-[#E5DACF] space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[#2B2119]">
                    <span>Billet reçu (FCFA)</span>
                    {monnaieRendueModal > 0 && (
                      <span className="text-[#C1652D] font-extrabold font-mono">
                        Rendre : {monnaieRendueModal.toLocaleString("fr-FR")} FCFA
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    min={montantReglement}
                    value={montantRecuEspeces}
                    onChange={(e) => setMontantRecuEspeces(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-xs font-mono text-[#2B2119] focus:outline-none focus:ring-2 focus:ring-[#C1652D]"
                  />
                </div>
              )}

              {/* Boutons d'action */}
              <div className="flex justify-end gap-2 pt-2 border-t border-[#E5DACF]">
                <button
                  type="button"
                  onClick={() => setVenteARegler(null)}
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
                      <span>Validation...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Valider le règlement</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODALE : ANNULATION VENTE IMPAYÉE (Règle 10)              */}
      {/* ======================================================== */}
      {venteAAnnuler && (
        <div className="fixed inset-0 z-50 bg-[#2B2119]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 pb-3 border-b border-[#E5DACF]">
              <div className="p-2 rounded-xl bg-red-100 text-red-700">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-[#2B2119] text-base">
                  Annuler la vente impayée
                </h3>
                <p className="text-[11px] font-mono text-red-700">
                  {venteAAnnuler.numero_facture}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-4 text-xs text-[#6D5D52]">
              {erreurAnnulation && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs">
                  {erreurAnnulation}
                </div>
              )}

              <p>
                Es-tu sûr de vouloir annuler définitivement cette facture d&apos;un montant de{" "}
                <strong className="text-[#2B2119]">
                  {venteAAnnuler.montant_total.toLocaleString("fr-FR")} FCFA
                </strong>{" "}
                ?
              </p>

              {/* Articles restaurés en stock (Règle 10) */}
              <div className="p-3 rounded-xl bg-[#FAF6F1] border border-[#C1652D]/20 space-y-2">
                <div className="font-bold text-[#2B2119] flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4 text-[#C1652D]" />
                  Restauration atomique du stock (Règle 10) :
                </div>
                <ul className="divide-y divide-[#E5DACF]/60 text-[11px]">
                  {venteAAnnuler.lignes_vente.map((l) => (
                    <li key={l.id} className="py-1 flex justify-between">
                      <span className="text-[#6D5D52]">{l.produit_nom}</span>
                      <span className="font-bold text-[#C1652D]">
                        +{l.quantite} remis en stock
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="text-[11px] text-stone-500 italic">
                Cette opération sera tracée dans le journal d&apos;audit.
              </p>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E5DACF]">
                <button
                  type="button"
                  onClick={() => setVenteAAnnuler(null)}
                  className="px-4 py-2 rounded-xl border border-[#E5DACF] text-xs font-bold text-[#6D5D52] hover:bg-[#E5DACF]/50 cursor-pointer"
                >
                  Fermer
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleConfirmerAnnulation}
                  className="px-4 py-2 rounded-xl bg-red-700 text-[#FAF6F1] text-xs font-bold hover:bg-red-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Annulation en cours...</span>
                    </>
                  ) : (
                    <span>Confirmer l&apos;annulation</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODALE : REÇU / FACTURE OFFICIELLE                       */}
      {/* ======================================================== */}
      {recuAffiche && (
        <RecuVenteModal
          recu={recuAffiche}
          onClose={() => setRecuAffiche(null)}
          titreSucces={`Facture de créance ${recuAffiche.numero_facture}`}
        />
      )}
    </div>
  );
}
