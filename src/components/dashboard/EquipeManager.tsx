"use client";

import React, { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Users,
  UserCheck,
  Plus,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Loader2,
  X,
  AlertCircle,
  Power,
  Store,
  Mail,
  Phone,
  KeyRound,
  Copy,
  Check,
  Lock,
  ArrowRightLeft,
} from "lucide-react";
import {
  creerEmployeAction,
  changerStatutEmployeAction,
  transfererEmployeAction,
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
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [copie, setCopie] = useState(false);

  // Écran de succès avec QR code 2FA pour le Gérant
  const [resultatCreation, setResultatCreation] = useState<{
    nom: string;
    email: string;
    role: RoleUtilisateur;
    totpQrCode?: string;
    totpSecret?: string;
  } | null>(null);

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
        router.refresh();
      }
    });
  }

  function handleOuvrirModal() {
    setErreur(null);
    setResultatCreation(null);
    setSelectedRole("vendeur");
    setModalOuverte(true);
  }

  function handleCopierSecret(secret: string) {
    navigator.clipboard.writeText(secret);
    setCopie(true);
    setTimeout(() => setCopie(false), 2000);
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
        if (res.totpQrCode && res.totpSecret) {
          // Affichage de l'écran 2FA pour le Gérant
          setResultatCreation({
            nom: res.employe!.nom,
            email: res.employe!.email,
            role: res.employe!.role,
            totpQrCode: res.totpQrCode,
            totpSecret: res.totpSecret,
          });
        } else {
          setModalOuverte(false);
          router.refresh();
        }
      }
    });
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
        return { label: "Patron", color: "bg-[#C1652D]/15 text-[#C1652D] border-[#C1652D]/30" };
      case "gerant":
        return { label: "Gérant", color: "bg-blue-100 text-blue-800 border-blue-200" };
      case "vendeur":
        return { label: "Vendeur", color: "bg-amber-100 text-amber-800 border-amber-200" };
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
              Gère tes gérants et vendeurs, contrôle leurs accès aux boutiques et assure la sécurité par authentification forte.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3.5 py-2 rounded-xl bg-[#E5DACF]/40 border border-[#E5DACF] text-xs font-semibold text-[#2B2119] flex items-center gap-2">
              <span className="text-[#6D5D52]">Plafond Forfait {forfait.nom} :</span>
              <span className="font-bold text-[#C1652D]">
                {forfait.max_employes_par_boutique === null
                  ? "Collaborateurs illimités"
                  : `${forfait.max_employes_par_boutique} employé(s) / boutique`}
              </span>
            </div>

            <button
              onClick={handleOuvrirModal}
              className="px-4 py-2.5 rounded-xl bg-[#C1652D] text-[#FAF6F1] font-bold text-xs hover:bg-[#a95524] transition-colors flex items-center gap-2 shadow-sm focus:outline-none cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Inviter un collaborateur</span>
            </button>
          </div>
        </div>
      </div>

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
                const estMoi = e.id === currentUserId;
                const enCours = actionUserId === e.id && isPending;

                return (
                  <tr
                    key={e.id}
                    className={`hover:bg-[#E5DACF]/20 transition-colors ${
                      !estActif ? "opacity-60 bg-stone-50" : ""
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
                        <span className="inline-flex items-center gap-1 text-green-700 font-bold text-[11px]">
                          <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
                          <span>Sécurisé 2FA</span>
                        </span>
                      ) : e.role === "gerant" ? (
                        <span className="inline-flex items-center gap-1 text-blue-700 font-bold text-[11px]">
                          <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                          <span>En attente 2FA</span>
                        </span>
                      ) : (
                        <span className="text-[#8C7A6B] text-[11px]">Non requise</span>
                      )}
                    </td>

                    {/* Statut compte */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          estActif
                            ? "bg-green-100 text-green-800"
                            : "bg-stone-200 text-stone-700"
                        }`}
                      >
                        {estActif ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-green-600" />
                            <span>Actif</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-stone-500" />
                            <span>Inactif</span>
                          </>
                        )}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      {!estMoi && (
                        <div className="flex items-center justify-end gap-1.5">
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
            {/* Si un Gérant vient d'être créé : écran QR Code */}
            {resultatCreation ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E5DACF]">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <h2 className="text-base font-extrabold text-[#2B2119]">
                      Gérant invité avec succès !
                    </h2>
                  </div>
                  <button
                    onClick={() => {
                      setModalOuverte(false);
                      setResultatCreation(null);
                      router.refresh();
                    }}
                    className="p-1 rounded-lg text-[#8C7A6B] hover:text-[#2B2119] hover:bg-[#E5DACF]/50"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <strong>2FA TOTP Obligatoire pour le Gérant :</strong> Fais scanner ce code QR au gérant <strong>{resultatCreation.nom}</strong> avec <em>Google Authenticator</em> ou <em>Authy</em> dès sa prise de poste.
                  </div>
                </div>

                {resultatCreation.totpQrCode && (
                  <div className="flex flex-col items-center justify-center py-2">
                    <div className="p-3 bg-white rounded-2xl border border-[#E5DACF] shadow-inner">
                      <Image
                        src={resultatCreation.totpQrCode}
                        alt="QR Code TOTP"
                        width={180}
                        height={180}
                        className="rounded-lg"
                      />
                    </div>

                    {resultatCreation.totpSecret && (
                      <div className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#E5DACF]/40 border border-[#E5DACF] text-xs font-mono">
                        <span className="text-[#6D5D52]">Clé secrète :</span>
                        <strong className="text-[#2B2119]">{resultatCreation.totpSecret}</strong>
                        <button
                          type="button"
                          onClick={() => handleCopierSecret(resultatCreation.totpSecret!)}
                          className="p-1 rounded text-[#C1652D] hover:bg-[#C1652D]/10"
                          title="Copier la clé"
                        >
                          {copie ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-3 border-t border-[#E5DACF] flex justify-end">
                  <button
                    onClick={() => {
                      setModalOuverte(false);
                      setResultatCreation(null);
                      router.refresh();
                    }}
                    className="px-5 py-2.5 rounded-xl bg-[#C1652D] text-[#FAF6F1] font-bold text-xs hover:bg-[#a95524] transition-colors"
                  >
                    J&apos;ai transmis le code • Fermer
                  </button>
                </div>
              </div>
            ) : (
              // Formulaire d'invitation normal
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
                              <span className="text-[9px] font-extrabold text-blue-700 bg-blue-100 px-1 rounded">
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
                      placeholder="Ex : Koffi Mensah"
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
                        placeholder="collaborateur@gmail.com"
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
                        placeholder="+229 97 00 00 00"
                        className="w-full px-3.5 py-2 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-xs font-medium text-[#2B2119] placeholder:text-[#8C7A6B] focus:outline-none focus:ring-2 focus:ring-[#C1652D]/30 focus:border-[#C1652D]"
                      />
                    </div>
                  </div>

                  {/* Mot de passe initial */}
                  <div>
                    <label className="block text-xs font-bold text-[#2B2119] mb-1">
                      Mot de passe initial de connexion *
                    </label>
                    <input
                      type="password"
                      name="mot_de_passe"
                      required
                      minLength={6}
                      placeholder="Minimum 6 caractères"
                      className="w-full px-3.5 py-2 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-xs font-medium text-[#2B2119] placeholder:text-[#8C7A6B] focus:outline-none focus:ring-2 focus:ring-[#C1652D]/30 focus:border-[#C1652D]"
                    />
                  </div>

                  {selectedRole === "gerant" && (
                    <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-[11px] flex items-start gap-2">
                      <Lock className="w-3.5 h-3.5 text-blue-700 shrink-0 mt-0.5" />
                      <span>
                        <strong>Règle de sécurité 2FA :</strong> À la création, un QR code TOTP te sera présenté pour configurer l&apos;application Google Authenticator du Gérant.
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5DACF]">
                    <button
                      type="button"
                      onClick={() => setModalOuverte(false)}
                      disabled={isPending}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-[#6D5D52] hover:bg-[#E5DACF]/50 transition-colors focus:outline-none"
                    >
                      Annuler
                    </button>

                    <button
                      type="submit"
                      disabled={isPending}
                      className="px-5 py-2.5 rounded-xl bg-[#C1652D] text-[#FAF6F1] text-xs font-bold hover:bg-[#a95524] transition-colors flex items-center gap-2 shadow-sm focus:outline-none disabled:opacity-50"
                    >
                      {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>Inviter le collaborateur</span>
                    </button>
                  </div>
                </form>
              </div>
            )}
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
              <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                  <span>Règle 2 — Historique des ventes immuable :</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800">
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
