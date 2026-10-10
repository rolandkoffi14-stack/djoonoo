"use client";

import React, { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  ShieldCheck,
  KeyRound,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Copy,
  Check,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";
import {
  genererTotpInitialisationSuperAdminAction,
  initialiserPremierSuperAdminAction,
} from "@/app/actions/super-admin";
import { siteConfig } from "@/config/site";

export default function SetupSuperAdminClient() {
  const router = useRouter();
  const [step, setStep] = useState<"credentials" | "totp">("credentials");
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Étape 1 données
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [motDePasseConfirmation, setMotDePasseConfirmation] = useState("");

  // Étape 2 données (2FA)
  const [totpSecret, setTotpSecret] = useState("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [code2fa, setCode2fa] = useState("");

  // Validation de l'étape 1 et génération du QR code
  const handleProceedToTotp = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !motDePasse) {
      setError("Veuillez renseigner un email et un mot de passe.");
      return;
    }

    if (motDePasse.length < 12) {
      setError("Le mot de passe Super-Admin doit comporter au moins 12 caractères.");
      return;
    }

    if (motDePasse !== motDePasseConfirmation) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    startTransition(async () => {
      const res = await genererTotpInitialisationSuperAdminAction(email);
      if (res.success && res.secret && res.qrCodeDataUrl) {
        setTotpSecret(res.secret);
        setQrCodeDataUrl(res.qrCodeDataUrl);
        setStep("totp");
      } else {
        setError(res.error || "Impossible de générer la clé 2FA.");
      }
    });
  };

  // Validation finale de l'étape 2 (TOTP + Création compte)
  const handleFinalizeSetup = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (code2fa.length < 6) {
      setError("Le code de vérification doit comporter 6 chiffres.");
      return;
    }

    const formData = new FormData();
    formData.append("email", email);
    formData.append("mot_de_passe", motDePasse);
    formData.append("mot_de_passe_confirmation", motDePasseConfirmation);
    formData.append("totp_secret", totpSecret);
    formData.append("code_2fa", code2fa);

    startTransition(async () => {
      const res = await initialiserPremierSuperAdminAction(null, formData);
      if (res.success) {
        router.push("/super-admin");
        router.refresh();
      } else {
        setError(res.error || "Échec de l'initialisation du compte.");
      }
    });
  };

  const copySecret = () => {
    navigator.clipboard.writeText(totpSecret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col justify-center items-center p-4 selection:bg-[#C1652D] selection:text-white">
      <div className="w-full max-w-lg">
        {/* En-tête */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#C1652D]/15 border border-[#C1652D]/30 text-xs font-mono text-[#C1652D] mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>PREMIÈRE INSTALLATION &bull; SETUP SUPER-ADMIN</span>
          </div>

          <div className="relative h-10 w-36 mx-auto mb-2">
            <Image
              src={siteConfig.app.logos.transparentClair}
              alt={siteConfig.app.nom}
              fill
              className="object-contain"
              priority
            />
          </div>
          <p className="text-sm text-slate-400">
            Initialise ton compte Administrateur Principal sans aucune valeur par défaut
          </p>
        </div>

        {/* Carte principale */}
        <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {step === "credentials" ? (
            /* ÉTAPE 1 : EMAIL & MOT DE PASSE UNIQUE */
            <form onSubmit={handleProceedToTotp} className="space-y-5">
              <div>
                <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 text-[10px] font-mono font-bold uppercase tracking-wider">
                  Étape 1 sur 2 &bull; Identifiants Maître
                </span>
                <h2 className="text-lg font-bold text-white mt-2">
                  Définit tes identifiants Super-Admin
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Ce compte aura les pleins pouvoirs d&apos;administration technique et de facturation.
                </p>
              </div>

              {/* Adresse Email */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Adresse Email Personnelle / Pro *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ex: roland@2krdigital.online"
                    className="w-full pl-11 pr-4 py-3 bg-slate-800/60 border border-slate-700 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#C1652D] focus:ring-1 focus:ring-[#C1652D] transition-colors"
                  />
                </div>
              </div>

              {/* Mot de Passe Fort */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Mot de Passe Fort (12 caractères minimum) *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={12}
                    value={motDePasse}
                    onChange={(e) => setMotDePasse(e.target.value)}
                    placeholder="••••••••••••••••"
                    className="w-full pl-11 pr-11 py-3 bg-slate-800/60 border border-slate-700 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#C1652D] focus:ring-1 focus:ring-[#C1652D] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirmation */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Confirmer le Mot de Passe *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={motDePasseConfirmation}
                    onChange={(e) => setMotDePasseConfirmation(e.target.value)}
                    placeholder="••••••••••••••••"
                    className="w-full pl-11 pr-4 py-3 bg-slate-800/60 border border-slate-700 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#C1652D] focus:ring-1 focus:ring-[#C1652D] transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full mt-3 py-3.5 px-4 bg-[#C1652D] hover:bg-[#A85324] text-white text-sm font-bold rounded-2xl transition-all shadow-lg shadow-[#C1652D]/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isPending ? (
                  <span>Génération de la clé cryptographique...</span>
                ) : (
                  <>
                    <span>Continuer vers la configuration 2FA</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* ÉTAPE 2 : CONFIGURATION TOTP ET VALIDATION */
            <form onSubmit={handleFinalizeSetup} className="space-y-5">
              <div>
                <span className="px-2.5 py-1 rounded-md bg-[#C1652D]/20 text-[#C1652D] text-[10px] font-mono font-bold uppercase tracking-wider">
                  Étape 2 sur 2 &bull; Double Authentification Obligatoire
                </span>
                <h2 className="text-lg font-bold text-white mt-2 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#C1652D]" />
                  <span>Configure ton Authenticator</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Scanne ce QR Code avec Google Authenticator, Aegis ou 1Password.
                </p>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center justify-center p-4 bg-slate-800/50 rounded-2xl border border-slate-700/60 space-y-3">
                <div className="bg-white p-3 rounded-xl shadow-md">
                  <img
                    src={qrCodeDataUrl}
                    alt="QR Code TOTP Super-Admin"
                    width={180}
                    height={180}
                    className="rounded"
                  />
                </div>

                <div className="w-full text-center">
                  <div className="text-[11px] text-slate-400 mb-1">
                    Ou saisis manuellement cette clé secrète :
                  </div>
                  <div className="flex items-center justify-center gap-2 font-mono text-xs bg-slate-900 px-3 py-2 rounded-xl border border-slate-700 text-[#C1652D]">
                    <span className="font-bold tracking-wider select-all">{totpSecret}</span>
                    <button
                      type="button"
                      onClick={copySecret}
                      className="text-slate-400 hover:text-white transition-colors"
                      title="Copier"
                    >
                      {copiedSecret ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Code de confirmation */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 text-center">
                  Saisis le code à 6 chiffres affiché sur ton téléphone *
                </label>
                <div className="relative max-w-xs mx-auto">
                  <KeyRound className="w-4 h-4 text-[#C1652D] absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    autoFocus
                    value={code2fa}
                    onChange={(e) => setCode2fa(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="000000"
                    className="w-full pl-11 pr-4 py-3 bg-slate-800/80 border border-slate-700 rounded-2xl text-xl tracking-widest font-mono text-center text-white placeholder-slate-600 focus:outline-none focus:border-[#C1652D] focus:ring-1 focus:ring-[#C1652D] transition-colors"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep("credentials")}
                  className="w-1/3 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-2xl transition cursor-pointer"
                >
                  Retour
                </button>

                <button
                  type="submit"
                  disabled={isPending || code2fa.length < 6}
                  className="w-2/3 py-3.5 px-4 bg-[#C1652D] hover:bg-[#A85324] text-white text-sm font-bold rounded-2xl transition-all shadow-lg shadow-[#C1652D]/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? (
                    <span>Initialisation en cours...</span>
                  ) : (
                    <>
                      <span>Activer & Sceller la Console</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="mt-8 text-center text-xs text-slate-500">
          {siteConfig.app.nom} &bull; Initialisation unique sans valeur par défaut (Zéro CWE-798)
        </div>
      </div>
    </div>
  );
}
