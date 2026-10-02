"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Copy,
  Check,
  Building2,
  Store,
  ArrowRight,
} from "lucide-react";
import {
  verifierTokenInvitationAction,
  finaliserActivationCompteAction,
  InfoInvitation,
} from "@/app/actions/invitation";

export default function InvitationActivationPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;

  const [chargementInitial, setChargementInitial] = useState(true);
  const [erreurInitiale, setErreurInitiale] = useState<string | null>(null);
  const [compteDejaActif, setCompteDejaActif] = useState(false);
  const [invitation, setInvitation] = useState<InfoInvitation | null>(null);
  const [totpData, setTotpData] = useState<{ secret: string; qrCode: string } | null>(null);

  // Formulaire
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmationMdp, setConfirmationMdp] = useState("");
  const [codeTotp, setCodeTotp] = useState("");
  const [voirMdp, setVoirMdp] = useState(false);
  const [cleCopiee, setCleCopiee] = useState(false);
  const [erreurSoumission, setErreurSoumission] = useState<string | null>(null);
  const [activationReussie, setActivationReussie] = useState(false);

  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function verifierToken() {
      if (!token) {
        setErreurInitiale("Lien d'invitation manquant.");
        setChargementInitial(false);
        return;
      }

      const res = await verifierTokenInvitationAction(token);
      setChargementInitial(false);

      if (!res.success) {
        setErreurInitiale(res.error || "Lien invalide.");
        if (res.dejaActif) {
          setCompteDejaActif(true);
        }
        return;
      }

      if (res.invitation) {
        setInvitation(res.invitation);
      }
      if (res.totp) {
        setTotpData(res.totp);
      }
    }

    verifierToken();
  }, [token]);

  function handleCopierSecret(secret: string) {
    navigator.clipboard.writeText(secret);
    setCleCopiee(true);
    setTimeout(() => setCleCopiee(false), 2000);
  }

  function handleSoumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreurSoumission(null);

    if (motDePasse.length < 8) {
      setErreurSoumission("Le mot de passe doit comporter au moins 8 caractères.");
      return;
    }

    if (motDePasse !== confirmationMdp) {
      setErreurSoumission("Les deux mots de passe ne correspondent pas.");
      return;
    }

    if (invitation?.role === "gerant" && codeTotp.trim().length !== 6) {
      setErreurSoumission("Veuillez saisir le code à 6 chiffres affiché sur votre application d'authentification.");
      return;
    }

    startTransition(async () => {
      const res = await finaliserActivationCompteAction({
        token,
        motDePasse,
        codeTotp: invitation?.role === "gerant" ? codeTotp.trim() : undefined,
        totpSecret: totpData?.secret,
      });

      if (!res.success) {
        setErreurSoumission(res.error || "Impossible d'activer le compte.");
        return;
      }

      setActivationReussie(true);
      setTimeout(() => {
        router.push("/connexion?invite=succes");
      }, 2500);
    });
  }

  // Jauge de force mot de passe
  const aLongueur = motDePasse.length >= 8;
  const aMajuscule = /[A-Z]/.test(motDePasse);
  const aChiffre = /[0-9]/.test(motDePasse);
  const scoreForce = [aLongueur, aMajuscule, aChiffre].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-[#FAF6F1] flex flex-col justify-center py-12 sm:px-6 lg:px-8 px-4">
      {/* En-tête / Logo djoonoo */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <Link href="/" className="inline-block">
          <span className="text-3xl font-black text-[#2B2119] tracking-tight">
            djoo<span className="text-[#C1652D]">noo</span>
          </span>
        </Link>
        <p className="text-xs text-[#8C7A6B] font-bold uppercase tracking-wider mt-1">
          Activation de compte collaborateur
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-6 sm:px-10 border border-[#E5DACF] rounded-3xl shadow-xl space-y-6">
          {/* ======================================================== */}
          {/* 1. ÉTAT CHARGEMENT INITIAL                               */}
          {/* ======================================================== */}
          {chargementInitial && (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#C1652D]" />
              <p className="text-xs font-semibold text-[#6D5D52]">
                Vérification de votre lien d&apos;invitation en cours...
              </p>
            </div>
          )}

          {/* ======================================================== */}
          {/* 2. ÉTAT ERREUR OU EXPIRATION                             */}
          {/* ======================================================== */}
          {!chargementInitial && erreurInitiale && (
            <div className="space-y-5 text-center py-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-black text-[#2B2119]">
                  {compteDejaActif ? "Compte déjà activé" : "Lien d'invitation non valide"}
                </h2>
                <p className="text-xs text-[#6D5D52] leading-relaxed max-w-sm mx-auto">
                  {erreurInitiale}
                </p>
              </div>

              <div className="pt-3">
                <Link
                  href="/connexion"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2B2119] text-[#FAF6F1] text-xs font-bold hover:bg-black transition-colors"
                >
                  <span>Accéder à la page de connexion</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 3. ÉTAT SUCCÈS D'ACTIVATION                              */}
          {/* ======================================================== */}
          {!chargementInitial && activationReussie && (
            <div className="space-y-5 text-center py-6 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-[#C1652D]/10 text-[#C1652D] border border-[#C1652D]/20 flex items-center justify-center shadow-xs">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-xl font-black text-[#2B2119]">
                  Compte activé avec succès !
                </h2>
                <p className="text-xs text-[#6D5D52]">
                  Votre mot de passe{invitation?.role === "gerant" ? " et votre sécurité 2FA ont été configurés" : " a été enregistré"}. Redirection vers la page de connexion...
                </p>
              </div>
              <div className="flex justify-center pt-2">
                <Loader2 className="w-5 h-5 animate-spin text-[#C1652D]" />
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 4. FORMULAIRE PRINCIPAL D'ACTIVATION                     */}
          {/* ======================================================== */}
          {!chargementInitial && !erreurInitiale && !activationReussie && invitation && (
            <div className="space-y-6">
              {/* Encart récapitulatif du poste */}
              <div className="p-4 rounded-2xl bg-[#FAF6F1] border border-[#E5DACF] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#8C7A6B] uppercase tracking-wider">
                    Bienvenue dans l&apos;équipe
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                      invitation.role === "gerant"
                        ? "bg-[#FAF6F1] text-[#2B2119] border border-[#E5DACF]"
                        : "bg-[#FAF6F1] text-[#6D5D52] border border-[#E5DACF]"
                    }`}
                  >
                    {invitation.role === "gerant" ? "Gérant" : "Vendeur"}
                  </span>
                </div>
                <div className="text-base font-extrabold text-[#2B2119]">
                  {invitation.nom}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#6D5D52] pt-1">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#C1652D]" />
                    <span>Entreprise : <strong>{invitation.nomEntreprise}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-[#C1652D]" />
                    <span>Boutique : <strong>{invitation.boutiqueNom}</strong></span>
                  </div>
                </div>
              </div>

              {erreurSoumission && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium">
                  {erreurSoumission}
                </div>
              )}

              <form onSubmit={handleSoumettre} className="space-y-5">
                {/* SECTION 1 : Mot de passe */}
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 border-b border-[#E5DACF] pb-2">
                    <Lock className="w-4 h-4 text-[#C1652D]" />
                    <h3 className="font-extrabold text-xs text-[#2B2119] uppercase tracking-wider">
                      1. Définition de votre mot de passe
                    </h3>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2B2119] mb-1">
                      Nouveau mot de passe *
                    </label>
                    <div className="relative">
                      <input
                        type={voirMdp ? "text" : "password"}
                        required
                        minLength={8}
                        value={motDePasse}
                        onChange={(e) => setMotDePasse(e.target.value)}
                        placeholder="Au moins 8 caractères"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-xs font-medium text-[#2B2119] focus:outline-none focus:ring-2 focus:ring-[#C1652D]"
                      />
                      <button
                        type="button"
                        onClick={() => setVoirMdp(!voirMdp)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C7A6B] hover:text-[#2B2119]"
                      >
                        {voirMdp ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Jauge de complexité */}
                    {motDePasse.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <div className="flex gap-1 h-1.5 w-full">
                          <div
                            className={`flex-1 rounded-full transition-colors ${
                              scoreForce >= 1 ? "bg-[#C1652D]/40" : "bg-stone-200"
                            }`}
                          />
                          <div
                            className={`flex-1 rounded-full transition-colors ${
                              scoreForce >= 2 ? "bg-[#C1652D]/70" : "bg-stone-200"
                            }`}
                          />
                          <div
                            className={`flex-1 rounded-full transition-colors ${
                              scoreForce >= 3 ? "bg-[#C1652D]" : "bg-stone-200"
                            }`}
                          />
                        </div>
                        <p className="text-[10px] text-[#8C7A6B]">
                          {scoreForce === 3
                            ? "Mot de passe robuste (longueur, majuscule et chiffre)."
                            : "Conseil : utilisez 8+ caractères, au moins une majuscule et un chiffre."}
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2B2119] mb-1">
                      Confirmez le mot de passe *
                    </label>
                    <input
                      type={voirMdp ? "text" : "password"}
                      required
                      value={confirmationMdp}
                      onChange={(e) => setConfirmationMdp(e.target.value)}
                      placeholder="Répétez votre mot de passe"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-xs font-medium text-[#2B2119] focus:outline-none focus:ring-2 focus:ring-[#C1652D]"
                    />
                  </div>
                </div>

                {/* SECTION 2 (Conditionnelle) : 2FA TOTP pour le Gérant */}
                {invitation.role === "gerant" && totpData && (
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center gap-1.5 border-b border-[#E5DACF] pb-2">
                      <ShieldCheck className="w-4 h-4 text-[#C1652D]" />
                      <h3 className="font-extrabold text-xs text-[#2B2119] uppercase tracking-wider">
                        2. Configuration de votre application 2FA (Obligatoire)
                      </h3>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#FAF6F1] border border-[#E5DACF] text-xs text-[#2B2119] space-y-1.5 leading-relaxed">
                      <p className="font-bold">
                        En tant que Gérant de boutique, la double authentification (2FA) protège vos accès sensibles.
                      </p>
                      <ol className="list-decimal list-inside space-y-1 text-[11px] text-[#6D5D52]">
                        <li>Ouvrez <strong>Google Authenticator</strong> ou <strong>Authy</strong> sur votre téléphone.</li>
                        <li>Scannez le code QR ci-dessous (ou saisissez la clé manuellement).</li>
                        <li>Entrez le code à 6 chiffres affiché par l&apos;application pour confirmer.</li>
                      </ol>
                    </div>

                    {/* QR Code et Clé */}
                    <div className="flex flex-col items-center justify-center p-4 bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl space-y-3">
                      <div className="p-2.5 bg-white rounded-xl shadow-xs border border-stone-200">
                        <Image
                          src={totpData.qrCode}
                          alt="QR Code Google Authenticator"
                          width={160}
                          height={160}
                          className="rounded-lg"
                        />
                      </div>

                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-[#E5DACF] text-xs font-mono">
                        <span className="text-[#8C7A6B]">Clé :</span>
                        <strong className="text-[#2B2119] tracking-wider">{totpData.secret}</strong>
                        <button
                          type="button"
                          onClick={() => handleCopierSecret(totpData.secret)}
                          className="p-1 rounded text-[#C1652D] hover:bg-[#FAF6F1]"
                          title="Copier la clé"
                        >
                          {cleCopiee ? <Check className="w-3.5 h-3.5 text-[#C1652D]" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Saisie du code TOTP de confirmation */}
                    <div>
                      <label className="block text-xs font-bold text-[#2B2119] mb-1">
                        Code de test à 6 chiffres généré par l&apos;application *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={codeTotp}
                        onChange={(e) => setCodeTotp(e.target.value.replace(/\D/g, ""))}
                        placeholder="Ex : 123456"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-sm font-mono font-bold tracking-widest text-center text-[#2B2119] focus:outline-none focus:ring-2 focus:ring-[#C1652D]"
                      />
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full py-3 px-4 rounded-xl bg-[#C1652D] text-[#FAF6F1] text-xs font-extrabold hover:bg-[#a95524] transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Activation de votre compte...</span>
                      </>
                    ) : (
                      <span>Activer mon compte et me connecter</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
