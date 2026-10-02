"use client";

import React, { useState } from "react";
import { Lock, ShieldCheck, ShieldAlert, KeyRound, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { modifierMotDePasseAction, basculer2FAVendeurAction } from "@/app/actions/parametres";

interface TabSecuriteProps {
  role: string;
  deuxFaActive: boolean;
}

export default function TabSecurite({ role, deuxFaActive: initialDeuxFa }: TabSecuriteProps) {
  // Mot de passe
  const [ancienMotDePasse, setAncienMotDePasse] = useState("");
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState("");
  const [confirmationMotDePasse, setConfirmationMotDePasse] = useState("");
  const [loadingMdp, setLoadingMdp] = useState(false);
  const [messageMdp, setMessageMdp] = useState<string | null>(null);
  const [erreurMdp, setErreurMdp] = useState<string | null>(null);

  // 2FA Vendeur
  const [deuxFaActive, setDeuxFaActive] = useState(initialDeuxFa);
  const [loading2FA, setLoading2FA] = useState(false);
  const [message2FA, setMessage2FA] = useState<string | null>(null);
  const [erreur2FA, setErreur2FA] = useState<string | null>(null);

  const handleSubmitMdp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingMdp(true);
    setMessageMdp(null);
    setErreurMdp(null);

    const formData = new FormData();
    formData.append("ancienMotDePasse", ancienMotDePasse);
    formData.append("nouveauMotDePasse", nouveauMotDePasse);
    formData.append("confirmationMotDePasse", confirmationMotDePasse);

    try {
      const res = await modifierMotDePasseAction(formData);
      if (res.success) {
        setMessageMdp(res.message || "Mot de passe modifié avec succès.");
        setAncienMotDePasse("");
        setNouveauMotDePasse("");
        setConfirmationMotDePasse("");
      } else {
        setErreurMdp(res.error || "Impossible de modifier le mot de passe.");
      }
    } catch {
      setErreurMdp("Erreur de connexion.");
    } finally {
      setLoadingMdp(false);
    }
  };

  const handleToggle2FAVendeur = async () => {
    setLoading2FA(true);
    setMessage2FA(null);
    setErreur2FA(null);

    const nouvEtat = !deuxFaActive;
    const formData = new FormData();
    formData.append("active", nouvEtat ? "true" : "false");

    try {
      const res = await basculer2FAVendeurAction(formData);
      if (res.success) {
        setDeuxFaActive(nouvEtat);
        setMessage2FA(res.message || "Paramètres 2FA mis à jour.");
      } else {
        setErreur2FA(res.error || "Erreur lors de la mise à jour 2FA.");
      }
    } catch {
      setErreur2FA("Erreur réseau.");
    } finally {
      setLoading2FA(false);
    }
  };

  const is2FAObligatoire = role === "patron" || role === "gerant";

  return (
    <div className="space-y-6">
      {/* SECTION 1 : MODIFICATION DU MOT DE PASSE */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-neutral-200/80 shadow-xs">
        <div className="flex items-center gap-3 pb-6 mb-6 border-b border-neutral-100">
          <div className="p-2.5 bg-[#FAF6F1] text-[#C1652D] rounded-xl">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-[#2B2119] text-lg">Modifier le mot de passe</h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Choisis un mot de passe robuste d'au moins 8 caractères.
            </p>
          </div>
        </div>

        {messageMdp && (
          <div className="mb-6 p-4 bg-[#FAF6F1] border border-[#C1652D]/30 rounded-xl flex items-center gap-3 text-xs text-[#2B2119] animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-[#C1652D] shrink-0" />
            <span className="font-medium">{messageMdp}</span>
          </div>
        )}

        {erreurMdp && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-xs text-rose-800 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{erreurMdp}</span>
          </div>
        )}

        <form onSubmit={handleSubmitMdp} className="space-y-4 max-w-xl">
          <div>
            <label className="block text-xs font-bold text-[#2B2119] mb-1.5 uppercase tracking-wider">
              Ancien mot de passe
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="password"
                required
                value={ancienMotDePasse}
                onChange={(e) => setAncienMotDePasse(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#C1652D]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#2B2119] mb-1.5 uppercase tracking-wider">
                Nouveau mot de passe
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={nouveauMotDePasse}
                  onChange={(e) => setNouveauMotDePasse(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#C1652D]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2B2119] mb-1.5 uppercase tracking-wider">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmationMotDePasse}
                  onChange={(e) => setConfirmationMotDePasse(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#C1652D]"
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loadingMdp}
              className="px-6 py-2.5 bg-[#2B2119] hover:bg-[#1a140f] text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer inline-flex items-center gap-2 disabled:opacity-50"
            >
              {loadingMdp ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Modification...</span>
                </>
              ) : (
                <span>Mettre à jour le mot de passe</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 2 : DOUBLE AUTHENTIFICATION (2FA) */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-neutral-200/80 shadow-xs">
        <div className="flex items-center justify-between pb-6 mb-6 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#FAF6F1] text-[#C1652D] rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-[#2B2119] text-lg">Double Authentification (2FA TOTP)</h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Protection par code temporaire à 6 chiffres via Google Authenticator ou Twilio Authy.
              </p>
            </div>
          </div>

          <div>
            {is2FAObligatoire ? (
              <span className="px-3 py-1 bg-[#C1652D]/10 text-[#C1652D] text-xs font-bold rounded-full border border-[#C1652D]/30 inline-flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#C1652D]" />
                <span>Obligatoire & Actif</span>
              </span>
            ) : deuxFaActive ? (
              <span className="px-3 py-1 bg-[#C1652D]/10 text-[#C1652D] text-xs font-bold rounded-full border border-[#C1652D]/30 inline-flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#C1652D]" />
                <span>Activé</span>
              </span>
            ) : (
              <span className="px-3 py-1 bg-neutral-100 text-neutral-600 text-xs font-medium rounded-full">
                Désactivé
              </span>
            )}
          </div>
        </div>

        {message2FA && (
          <div className="mb-6 p-4 bg-[#FAF6F1] border border-[#C1652D]/30 rounded-xl flex items-center gap-3 text-xs text-[#2B2119] animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-[#C1652D] shrink-0" />
            <span className="font-medium">{message2FA}</span>
          </div>
        )}

        {erreur2FA && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-xs text-rose-800 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{erreur2FA}</span>
          </div>
        )}

        {is2FAObligatoire ? (
          <div className="p-4 bg-[#FAF6F1] rounded-xl border border-neutral-200 text-xs text-neutral-700 space-y-2">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-[#C1652D] mt-0.5 shrink-0" />
              <div>
                <p className="font-bold text-[#2B2119]">
                  Sécurité non négociable imposée pour le rôle {role === "patron" ? "Patron" : "Gérant"}
                </p>
                <p className="text-neutral-600 mt-0.5">
                  Conformément aux règles de sécurité djoonoo, un code TOTP à 6 chiffres est exigé à chaque connexion pour protéger les stocks, caisses et données financières contre toute intrusion.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-neutral-600">
              En tant que vendeur, vous pouvez activer la double authentification pour empêcher qu'un collègue n'utilise votre session de caisse sur un appareil partagé.
            </p>

            <button
              onClick={handleToggle2FAVendeur}
              disabled={loading2FA}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer inline-flex items-center gap-2 ${
                deuxFaActive
                  ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                  : "bg-[#C1652D] text-white hover:bg-[#A05324]"
              }`}
            >
              {loading2FA ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Mise à jour...</span>
                </>
              ) : deuxFaActive ? (
                <span>Désactiver le 2FA pour mon compte</span>
              ) : (
                <span>Activer le 2FA maintenant</span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
