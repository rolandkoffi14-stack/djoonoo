"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Plus,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Loader2,
  X,
  AlertCircle,
  Power,
  Mail,
  KeyRound,
  ArrowRightLeft,
  Clock,
  Sparkles,
} from "lucide-react";
import {
  creerEmployeAction,
  changerStatutEmployeAction,
  transfererEmployeAction,
  renvoyerInvitationAction,
} from "@/app/actions/employes";
import { RoleUtilisateur, StatutUtilisateur } from "@prisma/client";

export interface EmployeItem {
  id: string;
  nom: string;
  email: string;
  telephone: string;
  role: RoleUtilisateur;
  deux_fa_active: boolean;
  statut: StatutUtilisateur;
  boutique?: {
    id: string;
    code: string;
    nom: string;
  } | null;
  date_creation: string;
}

export interface BoutiqueOption {
  id: string;
  code: string;
  nom: string;
}

interface EquipeManagerProps {
  employes: EmployeItem[];
  boutiques: BoutiqueOption[];
  userRole: RoleUtilisateur;
  currentUserId: string;
  forfait: {
    nom: string;
    max_employes_par_boutique: number | null;
  };
}

export default function EquipeManager({
  employes,
  boutiques,
  userRole,
  currentUserId,
  forfait,
}: EquipeManagerProps) {
  const router = useRouter();
  const [modalOuverte, setModalOuverte] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const [messageSucces, setMessageSucces] = useState<string | null>(null);
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [renvoiEnCoursId, setRenvoiEnCoursId] = useState<string | null>(null);

  // Form state
  const [selectedRole, setSelectedRole] = useState<RoleUtilisateur>("vendeur");

  // State Transfert d'employé (Section 1.1, Décision H20, Règle 2)
  const [employeATransferer, setEmployeATransferer] = useState<EmployeItem | null>(null);
  const [nouvelleBoutiqueId, setNouvelleBoutiqueId] = useState<string>("");
  const [erreurTransfert, setErreurTransfert] = useState<string | null>(null);

  function handleOuvrirModalTransfert(employe: EmployeItem) {
    setEmployeATransferer(employe);
    setErreurTransfert(null);
    const autres = boutiques.filter((b) => b.id !== employe.boutique?.id);
    setNouvelleBoutiqueId(autres[0]?.id || "");
  }

  function handleConfirmerTransfert(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!employeATransferer || !nouvelleBoutiqueId) return;
    setErreurTransfert(null);

    startTransition(async () => {
      const res = await transfererEmployeAction({
        employeId: employeATransferer.id,
        nouvelleBoutiqueId,
      });

      if (!res.success) {
        setErreurTransfert(res.error || "Impossible de transférer ce collaborateur.");
      } else {
        setEmployeATransferer(null);
        setMessageSucces(`Collaborateur transféré avec succès vers la nouvelle boutique.`);
        setTimeout(() => setMessageSucces(null), 5000);
        router.refresh();
      }
    });
  }

  function handleOuvrirModal() {
    setErreur(null);
    setSelectedRole("vendeur");
    setModalOuverte(true);
  }

  async function handleCreerEmploye(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await creerEmployeAction(null, formData);
      if (!res.success) {
        setErreur(res.error || "Impossible d'inviter ce collaborateur.");
      } else {
        setModalOuverte(false);
        if (res.avertissement) {
          alert(res.avertissement);
        } else {
          setMessageSucces(
            `L'invitation a été envoyée par email à ${res.employe?.email || "votre collaborateur"} (valable 48h).`
          );
          setTimeout(() => setMessageSucces(null), 6000);
        }
        router.refresh();
      }
    });
  }

  async function handleRenvoyerInvitation(employeId: string) {
    setRenvoiEnCoursId(employeId);
    setMessageSucces(null);
    try {
      const res = await renvoyerInvitationAction(employeId);
      if (!res.success) {
        alert(res.error || "Impossible de renvoyer l'invitation.");
      } else {
        setMessageSucces("Un nouveau lien d'invitation (valable 48h) a été envoyé avec succès !");
        setTimeout(() => setMessageSucces(null), 5000);
      }
    } catch {
      alert("Erreur lors de l'envoi de l'invitation.");
    } finally {
      setRenvoiEnCoursId(null);
    }
  }

  async function handleToggleStatut(employeId: string, statutActuel: StatutUtilisateur) {
    const nouveauStatut = statutActuel === "actif" ? "inactif" : "actif";
    setActionUserId(employeId);

    startTransition(async () => {
      const res = await changerStatutEmployeAction(employeId, nouveauStatut);
      if (!res.success) {
        alert(res.error || "Impossible de modifier le statut du collaborateur.");
      } else {
        router.refresh();
      }
      setActionUserId(null);
    });
  }

  const getRoleBadge = (role: RoleUtilisateur) => {
    switch (role) {
      case "patron":
        return { label: "Patron", color: "bg-[#C1652D]/10 text-[#C1652D] border border-[#C1652D]/30" };
      case "gerant":
        return { label: "Gérant", color: "bg-[#FAF6F1] text-[#2B2119] border border-[#E5DACF]" };
      case "vendeur":
        return { label: "Vendeur", color: "bg-[#FAF6F1] text-[#6D5D52] border border-[#E5DACF]" };
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-1.5 rounded-lg bg-[#C1652D]/10 text-[#C1652D]">
                <Users className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-extrabold text-[#2B2119]">
                Équipe & Collaborateurs
              </h1>
            </div>
            <p className="text-xs text-[#6D5D52] max-w-xl">
              Invite tes gérants et vendeurs par email, contrôle leurs accès aux boutiques et assure la sécurité par authentification forte.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full lg:w-auto">
            <div className="px-3.5 py-2 rounded-xl bg-[#E5DACF]/40 border border-[#E5DACF] text-xs font-semibold text-[#2B2119] flex flex-wrap items-center justify-between sm:justify-start gap-2">
              <span className="text-[#6D5D52]">Plafond Forfait {forfait.nom} :</span>
              <span className="font-bold text-[#C1652D] whitespace-nowrap">
                {forfait.max_employes_par_boutique === null
                  ? "Collaborateurs illimités"
                  : `${forfait.max_employes_par_boutique} employé(s) / boutique`}
              </span>
            </div>

            <button
              type="button"
              onClick={handleOuvrirModal}
              className="px-4 py-2.5 rounded-xl bg-[#C1652D] text-[#FAF6F1] font-bold text-xs hover:bg-[#a95524] transition-colors flex items-center justify-center gap-2 shadow-sm focus:outline-none cursor-pointer w-full sm:w-auto shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Inviter un collaborateur</span>
            </button>
          </div>
        </div>
      </div>

      {/* Message de notification succès */}
      {messageSucces && (
        <div className="p-3.5 rounded-xl bg-[#FAF6F1] border border-[#C1652D]/30 text-[#2B2119] text-xs flex items-center justify-between gap-2 shadow-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#C1652D] shrink-0" />
            <span className="font-semibold">{messageSucces}</span>
          </div>
          <button
            onClick={() => setMessageSucces(null)}
            className="p-1 text-[#6D5D52] hover:text-[#2B2119] rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Table des collaborateurs */}
      <div className="bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E5DACF] bg-[#E5DACF]/30 text-[#6D5D52] uppercase font-bold text-[11px] tracking-wider">
                <th className="py-3.5 px-4">Collaborateur</th>
                <th className="py-3.5 px-4">Rôle</th>
                <th className="py-3.5 px-4">Boutique affectée</th>
                <th className="py-3.5 px-4">Téléphone</th>
                <th className="py-3.5 px-4">Sécurité 2FA</th>
                <th className="py-3.5 px-4">Statut</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5DACF]">
              {employes.map((e) => {
                const roleBadge = getRoleBadge(e.role);
                const estActif = e.statut === "actif";
                const estEnAttente = e.statut === "en_attente";
                const estMoi = e.id === currentUserId;
                const enCours = actionUserId === e.id && isPending;

                return (
                  <tr
                    key={e.id}
                    className={`hover:bg-[#E5DACF]/20 transition-colors ${
                      e.statut === "inactif" ? "opacity-60 bg-stone-50" : ""
                    }`}
                  >
                    {/* Nom & Email */}
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-[#2B2119] flex items-center gap-1.5">
                        <span>{e.nom}</span>
                        {estMoi && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 bg-[#C1652D]/10 text-[#C1652D] rounded">
                            Toi
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#8C7A6B]">{e.email}</div>
                    </td>

                    {/* Rôle */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-md font-bold text-[11px] border ${roleBadge.color}`}
                      >
                        {roleBadge.label}
                      </span>
                    </td>

                    {/* Boutique */}
                    <td className="py-3.5 px-4">
                      {e.boutique ? (
                        <div className="flex items-center gap-1.5 font-medium text-[#2B2119]">
                          <span className="px-1.5 py-0.5 rounded bg-[#FAF6F1] border border-[#E5DACF] font-mono font-bold text-[10px]">
                            {e.boutique.code}
                          </span>
                          <span className="truncate max-w-[150px]">{e.boutique.nom}</span>
                        </div>
                      ) : (
                        <span className="text-[#8C7A6B] italic">Toutes (Patron)</span>
                      )}
                    </td>

                    {/* Téléphone */}
                    <td className="py-3.5 px-4 text-[#6D5D52] font-mono">
                      {e.telephone}
                    </td>

                    {/* Sécurité 2FA */}
                    <td className="py-3.5 px-4">
                      {e.deux_fa_active ? (
                        <span className="inline-flex items-center gap-1.5 text-[#2B2119] font-bold text-[11px]">
                          <ShieldCheck className="w-3.5 h-3.5 text-[#C1652D]" />
                          <span>Sécurisé 2FA</span>
                        </span>
                      ) : estEnAttente && e.role === "gerant" ? (
                        <span className="inline-flex items-center gap-1.5 text-[#6D5D52] font-semibold text-[11px]">
                          <Clock className="w-3.5 h-3.5 text-[#8C7A6B]" />
                          <span>2FA à l&apos;activation</span>
                        </span>
                      ) : e.role === "gerant" ? (
                        <span className="inline-flex items-center gap-1.5 text-[#6D5D52] font-medium text-[11px]">
                          <KeyRound className="w-3.5 h-3.5 text-[#8C7A6B]" />
                          <span>En attente 2FA</span>
                        </span>
                      ) : (
                        <span className="text-[#8C7A6B] text-[11px]">Non requise</span>
                      )}
                    </td>

                    {/* Statut compte */}
                    <td className="py-3.5 px-4">
                      {estEnAttente ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>EN ATTENTE</span>
                        </span>
                      ) : estActif ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>ACTIF</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-rose-50 text-rose-700 border border-rose-200">
                          <XCircle className="w-3 h-3 text-rose-600" />
                          <span>INACTIF</span>
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      {!estMoi && (
                        <div className="flex items-center justify-end gap-1.5">
                          {estEnAttente ? (
                            <button
                              type="button"
                              onClick={() => handleRenvoyerInvitation(e.id)}
                              disabled={renvoiEnCoursId === e.id}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold text-[#C1652D] bg-[#C1652D]/10 hover:bg-[#C1652D]/20 transition-colors focus:outline-none cursor-pointer disabled:opacity-50"
                              title="Renvoyer un nouveau lien d'invitation (48h)"
                            >
                              {renvoiEnCoursId === e.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Mail className="w-3.5 h-3.5" />
                              )}
                              <span>Renvoyer l&apos;invitation</span>
                            </button>
                          ) : (
                            <>
                              {userRole === "patron" && boutiques.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleOuvrirModalTransfert(e)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-[#C1652D] hover:bg-[#C1652D]/10 transition-colors focus:outline-none cursor-pointer"
                                  title="Transférer vers une autre boutique"
                                >
                                  <ArrowRightLeft className="w-3.5 h-3.5" />
                                  <span>Transférer</span>
                                </button>
                              )}

                              <button
                                onClick={() => handleToggleStatut(e.id, e.statut)}
                                disabled={enCours}
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors focus:outline-none cursor-pointer ${
                                  estActif
                                    ? "text-stone-600 hover:text-stone-900 hover:bg-stone-200/50"
                                    : "text-[#C1652D] hover:bg-[#C1652D]/10"
                                }`}
                                title={estActif ? "Désactiver ce collaborateur" : "Réactiver ce collaborateur"}
                              >
                                {enCours ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Power className="w-3.5 h-3.5" />
                                )}
                                <span>{estActif ? "Désactiver" : "Réactiver"}</span>
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modale d'Invitation de Collaborateur */}
      {modalOuverte && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl max-w-lg w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#E5DACF]">
                <div>
                  <h2 className="text-lg font-extrabold text-[#2B2119]">
                    Inviter un nouveau collaborateur
                  </h2>
                  <p className="text-xs text-[#6D5D52] mt-0.5">
                    Rattache un gérant ou un vendeur à une boutique de ton entreprise.
                  </p>
                </div>
                <button
                  onClick={() => setModalOuverte(false)}
                  className="p-1 rounded-lg text-[#8C7A6B] hover:text-[#2B2119] hover:bg-[#E5DACF]/50 focus:outline-none cursor-pointer"
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

              <form onSubmit={handleCreerEmploye} className="space-y-3.5 mt-3">
                {/* Choix du rôle */}
                <div>
                  <label className="block text-xs font-bold text-[#2B2119] mb-1">
                    Rôle attribué *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                        selectedRole === "vendeur"
                          ? "border-[#C1652D] bg-[#C1652D]/5"
                          : "border-[#E5DACF] hover:bg-[#E5DACF]/30"
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value="vendeur"
                        checked={selectedRole === "vendeur"}
                        onChange={() => setSelectedRole("vendeur")}
                        className="mt-0.5 text-[#C1652D] focus:ring-[#C1652D]"
                      />
                      <div>
                        <div className="font-bold text-xs text-[#2B2119]">Vendeur</div>
                        <div className="text-[11px] text-[#6D5D52] mt-0.5">
                          Encaisse les ventes, consulte le stock disponible.
                        </div>
                      </div>
                    </label>

                    {userRole === "patron" && (
                      <label
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                          selectedRole === "gerant"
                            ? "border-[#C1652D] bg-[#C1652D]/5"
                            : "border-[#E5DACF] hover:bg-[#E5DACF]/30"
                        }`}
                      >
                        <input
                          type="radio"
                          name="role"
                          value="gerant"
                          checked={selectedRole === "gerant"}
                          onChange={() => setSelectedRole("gerant")}
                          className="mt-0.5 text-[#C1652D] focus:ring-[#C1652D]"
                        />
                        <div>
                          <div className="font-bold text-xs text-[#2B2119] flex items-center gap-1">
                            <span>Gérant</span>
                            <span className="text-[9px] font-extrabold text-[#C1652D] bg-[#C1652D]/10 px-1 rounded border border-[#C1652D]/20">
                              2FA
                            </span>
                          </div>
                          <div className="text-[11px] text-[#6D5D52] mt-0.5">
                            Supervise la boutique, gère stocks & vendeurs.
                          </div>
                        </div>
                      </label>
                    )}
                  </div>
                </div>

                {/* Choix de la boutique */}
                <div>
                  <label className="block text-xs font-bold text-[#2B2119] mb-1">
                    Boutique d&apos;affectation *
                  </label>
                  <select
                    name="boutique_id"
                    required
                    defaultValue={boutiques[0]?.id}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-xs font-medium text-[#2B2119] focus:outline-none focus:ring-2 focus:ring-[#C1652D]/30 focus:border-[#C1652D]"
                  >
                    {boutiques.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code} — {b.nom}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Nom complet */}
                <div>
                  <label className="block text-xs font-bold text-[#2B2119] mb-1">
                    Nom et prénom du collaborateur *
                  </label>
                  <input
                    type="text"
                    name="nom"
                    required
                    placeholder="Nom et prénoms"
                    className="w-full px-3.5 py-2 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-xs font-medium text-[#2B2119] placeholder:text-[#8C7A6B] focus:outline-none focus:ring-2 focus:ring-[#C1652D]/30 focus:border-[#C1652D]"
                  />
                </div>

                {/* Email & Téléphone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#2B2119] mb-1">
                      Adresse email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      placeholder="Adresse email"
                      className="w-full px-3.5 py-2 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-xs font-medium text-[#2B2119] placeholder:text-[#8C7A6B] focus:outline-none focus:ring-2 focus:ring-[#C1652D]/30 focus:border-[#C1652D]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2B2119] mb-1">
                      Téléphone *
                    </label>
                    <input
                      type="tel"
                      name="telephone"
                      required
                      placeholder="Numéro de téléphone"
                      className="w-full px-3.5 py-2 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-xs font-medium text-[#2B2119] placeholder:text-[#8C7A6B] focus:outline-none focus:ring-2 focus:ring-[#C1652D]/30 focus:border-[#C1652D]"
                    />
                  </div>
                </div>

                {/* Note d'information invitation sans mot de passe */}
                <div className="p-3.5 rounded-xl bg-[#E5DACF]/30 border border-[#E5DACF] text-xs text-[#2B2119] space-y-1.5">
                  <div className="font-bold flex items-center gap-2 text-[#C1652D]">
                    <Sparkles className="w-4 h-4" />
                    <span>Processus d&apos;invitation autonome sécurisé</span>
                  </div>
                  <p className="text-[11px] text-[#6D5D52] leading-relaxed">
                    Aucun mot de passe initial n&apos;est requis. Un lien d&apos;invitation sécurisé valable <strong>48 heures</strong> sera immédiatement envoyé à l&apos;adresse email indiquée. Le collaborateur configurera son mot de passe lui-même.
                    {selectedRole === "gerant" && (
                      <span className="block mt-1 text-[#2B2119] font-medium">
                        Pour le rôle <strong>Gérant</strong>, la configuration du 2FA TOTP (Google Authenticator) s&apos;effectuera également de façon guidée et autonome sur son écran.
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5DACF]">
                  <button
                    type="button"
                    onClick={() => setModalOuverte(false)}
                    disabled={isPending}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-[#6D5D52] hover:bg-[#E5DACF]/50 transition-colors focus:outline-none cursor-pointer"
                  >
                    Annuler
                  </button>

                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-5 py-2.5 rounded-xl bg-[#C1652D] text-[#FAF6F1] text-xs font-bold hover:bg-[#a95524] transition-colors flex items-center gap-2 shadow-sm focus:outline-none disabled:opacity-50 cursor-pointer"
                  >
                    {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Envoyer l&apos;invitation</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modale de Transfert de Collaborateur (Section 1.1, Décision H20, Règle 2) */}
      {employeATransferer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl max-w-md w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5DACF]">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[#C1652D]/10 text-[#C1652D]">
                  <ArrowRightLeft className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-base font-extrabold text-[#2B2119]">
                    Transférer le collaborateur
                  </h2>
                  <p className="text-[11px] text-[#6D5D52]">
                    Mutation d&apos;un point de vente à un autre (Décision H20).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEmployeATransferer(null)}
                className="p-1 rounded-lg text-[#8C7A6B] hover:text-[#2B2119] hover:bg-[#E5DACF]/50 focus:outline-none cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {erreurTransfert && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{erreurTransfert}</span>
              </div>
            )}

            <form onSubmit={handleConfirmerTransfert} className="space-y-4 text-xs">
              {/* Profil concerné */}
              <div className="p-3 rounded-xl bg-[#E5DACF]/30 border border-[#E5DACF] space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#2B2119] text-sm">
                    {employeATransferer.nom}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#C1652D]/10 text-[#C1652D]">
                    {employeATransferer.role}
                  </span>
                </div>
                <div className="text-[11px] text-[#6D5D52]">
                  Affectation actuelle :{" "}
                  <strong>
                    {employeATransferer.boutique
                      ? `${employeATransferer.boutique.code} — ${employeATransferer.boutique.nom}`
                      : "Aucune"}
                  </strong>
                </div>
              </div>

              {/* Choix de la nouvelle boutique */}
              <div>
                <label className="block text-xs font-bold text-[#2B2119] mb-1">
                  Nouvelle boutique d&apos;affectation *
                </label>
                <select
                  required
                  value={nouvelleBoutiqueId}
                  onChange={(e) => setNouvelleBoutiqueId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-xs text-[#2B2119] focus:outline-none focus:ring-2 focus:ring-[#C1652D]"
                >
                  {boutiques
                    .filter((b) => b.id !== employeATransferer.boutique?.id)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code} — {b.nom}
                      </option>
                    ))}
                </select>
              </div>

              {/* Encadré Pédagogique Règle 2 */}
              <div className="p-3 rounded-xl bg-[#FAF6F1] border border-[#C1652D]/20 text-[#2B2119] space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-[11px] text-[#2B2119]">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#C1652D]" />
                  <span>Règle 2 — Historique des ventes immuable :</span>
                </div>
                <p className="text-[11px] leading-relaxed text-[#6D5D52]">
                  Toutes les ventes passées déjà enregistrées par <strong>{employeATransferer.nom}</strong> restent définitivement rattachées à sa boutique d&apos;origine. Seules ses futures transactions seront imputées à la nouvelle boutique.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5DACF]">
                <button
                  type="button"
                  onClick={() => setEmployeATransferer(null)}
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#6D5D52] hover:bg-[#E5DACF]/50 transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending || !nouvelleBoutiqueId}
                  className="px-4 py-2 rounded-xl bg-[#C1652D] text-[#FAF6F1] text-xs font-bold hover:bg-[#a95524] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirmer la mutation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
