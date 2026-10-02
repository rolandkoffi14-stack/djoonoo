"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  inscrirePatronAction,
  validerDeuxFaInscriptionAction,
  InscriptionState,
} from "@/app/actions/auth";
import {
  Building2,
  Mail,
  Lock,
  User,
  Phone,
  MapPin,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";

export default function InscriptionPage() {
  const router = useRouter();
  const [step, setStep] = useState<"infos" | "deux_fa">("infos");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedForfait, setSelectedForfait] = useState("Réseau");

  // Données de l'étape 2 (2FA)
  const [deuxFaData, setDeuxFaData] = useState<{
    userId: string;
    email: string;
    qrCodeDataUrl: string;
    secret: string;
    codeCompte: string;
    codeBoutique: string;
  } | null>(null);

  const [totpCode, setTotpCode] = useState("");
  const [totpLoading, setTotpLoading] = useState(false);
  const [totpError, setTotpError] = useState<string | null>(null);

  // Soumission Étape 1 : Inscription
  async function handleInfosSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setFieldErrors({});

    const formData = new FormData(e.currentTarget);
    try {
      const res = await inscrirePatronAction(null, formData);
      if (res.success && res.data) {
        setDeuxFaData(res.data);
        setStep("deux_fa");
      } else {
        if (res.error) setErrorMsg(res.error);
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
      }
    } catch (err: any) {
      setErrorMsg("Une erreur imprévue est survenue. Merci de réessayer.");
    } finally {
      setLoading(false);
    }
  }

  // Soumission Étape 2 : Validation TOTP
  async function handleTotpSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!deuxFaData || totpCode.length < 6) return;

    setTotpLoading(true);
    setTotpError(null);

    try {
      const res = await validerDeuxFaInscriptionAction(deuxFaData.userId, totpCode);
      if (res.success && res.redirectUrl) {
        router.push(res.redirectUrl);
      } else {
        setTotpError(res.error || "Code invalide.");
      }
    } catch {
      setTotpError("Erreur de connexion. Vérifie ton réseau et réessaie.");
    } finally {
      setTotpLoading(false);
    }
  }

  function copierSecret() {
    if (!deuxFaData?.secret) return;
    navigator.clipboard.writeText(deuxFaData.secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  }

  return (
    <div className="min-h-screen bg-[#FAF6F1] text-[#2B2119] flex flex-col justify-between selection:bg-[#C1652D]/20">
      {/* Barre supérieure épurée */}
      <header className="border-b border-[#E5DACF] bg-[#FAF6F1]/90 backdrop-blur-md px-6 py-4 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group focus:outline-none">
            <div className="relative h-9 w-32 sm:w-36 transition-transform group-hover:scale-[1.02]">
              <Image
                src="/brand/01_horizontal_logos/djoonoo_logo_clair_transparent.svg"
                alt="djoonoo logo"
                fill
                className="object-contain object-left"
                priority
              />
            </div>
          </Link>
          <div className="text-sm">
            <Link
              href="/connexion"
              className="font-semibold text-[#C1652D] hover:underline"
            >
              Se connecter
            </Link>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-xl">
          {/* Indicateur de progression */}
          <div className="mb-8 flex items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step === "infos"
                    ? "bg-[#C1652D] text-[#FAF6F1]"
                    : "bg-[#E5DACF] text-[#2B2119]"
                }`}
              >
                1
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6D5D52]">
                Ton entreprise
              </span>
            </div>
            <div className="w-8 h-0.5 bg-[#E5DACF]" />
            <div className="flex items-center gap-2">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step === "deux_fa"
                    ? "bg-[#C1652D] text-[#FAF6F1]"
                    : "bg-[#E5DACF] text-[#6D5D52]"
                }`}
              >
                2
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6D5D52]">
                Sécurité 2FA
              </span>
            </div>
          </div>

          {/* Étape 1 : Formulaire d'information */}
          {step === "infos" && (
            <div className="bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl p-6 sm:p-8 shadow-sm">
              <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#2B2119]">
                  Crée ton compte djoonoo
                </h1>
                <p className="text-sm text-[#6D5D52] mt-1">
                  Rejoins les commerçants du Bénin qui gèrent leurs ventes et stock en toute sérénité.
                </p>
              </div>

              {errorMsg && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
                  <div>{errorMsg}</div>
                </div>
              )}

              <form onSubmit={handleInfosSubmit} className="space-y-4">
                {/* Nom entreprise */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#6D5D52] mb-1.5">
                    Nom de ton entreprise ou commerce *
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-[#8C7A6B] absolute left-3.5 top-3.5" />
                    <input
                      name="nom_entreprise"
                      type="text"
                      required
                      placeholder="Raison sociale ou nom boutique"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-[#2B2119] focus:outline-none focus:ring-2 focus:ring-[#C1652D]/30 focus:border-[#C1652D] text-sm"
                    />
                  </div>
                  {fieldErrors.nom_entreprise && (
                    <p className="text-xs text-red-600 mt-1">{fieldErrors.nom_entreprise}</p>
                  )}
                </div>

                {/* Nom du patron */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#6D5D52] mb-1.5">
                      Ton nom complet *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-[#8C7A6B] absolute left-3.5 top-3.5" />
                      <input
                        name="nom"
                        type="text"
                        required
                        placeholder="Nom et prénom"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-[#2B2119] focus:outline-none focus:ring-2 focus:ring-[#C1652D]/30 focus:border-[#C1652D] text-sm"
                      />
                    </div>
                    {fieldErrors.nom && (
                      <p className="text-xs text-red-600 mt-1">{fieldErrors.nom}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#6D5D52] mb-1.5">
                      Téléphone principal *
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-[#8C7A6B] absolute left-3.5 top-3.5" />
                      <input
                        name="telephone"
                        type="tel"
                        required
                        placeholder="Numéro de téléphone"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-[#2B2119] focus:outline-none focus:ring-2 focus:ring-[#C1652D]/30 focus:border-[#C1652D] text-sm"
                      />
                    </div>
                    {fieldErrors.telephone && (
                      <p className="text-xs text-red-600 mt-1">{fieldErrors.telephone}</p>
                    )}
                  </div>
                </div>

                {/* Email de connexion */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#6D5D52] mb-1.5">
                    Adresse email de connexion *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#8C7A6B] absolute left-3.5 top-3.5" />
                    <input
                      name="email"
                      type="email"
                      required
                      placeholder="Votre email"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-[#2B2119] focus:outline-none focus:ring-2 focus:ring-[#C1652D]/30 focus:border-[#C1652D] text-sm"
                    />
                  </div>
                  {fieldErrors.email && (
                    <p className="text-xs text-red-600 mt-1">{fieldErrors.email}</p>
                  )}
                </div>

                {/* Mot de passe */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#6D5D52] mb-1.5">
                    Mot de passe (8 caractères minimum) *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#8C7A6B] absolute left-3.5 top-3.5" />
                    <input
                      name="mot_de_passe"
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      placeholder="Mot de passe"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-[#2B2119] focus:outline-none focus:ring-2 focus:ring-[#C1652D]/30 focus:border-[#C1652D] text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-[#8C7A6B] hover:text-[#2B2119] transition-colors focus:outline-none"
                      aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {fieldErrors.mot_de_passe && (
                    <p className="text-xs text-red-600 mt-1">{fieldErrors.mot_de_passe}</p>
                  )}
                </div>

                {/* Localisation & Secteur */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#6D5D52] mb-1.5">
                      Ville d&apos;activité *
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-[#8C7A6B] absolute left-3.5 top-3.5" />
                      <input
                        name="ville"
                        type="text"
                        required
                        placeholder="Ville"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-[#2B2119] focus:outline-none focus:ring-2 focus:ring-[#C1652D]/30 focus:border-[#C1652D] text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#6D5D52] mb-1.5">
                      Secteur d&apos;activité
                    </label>
                    <input
                      name="secteur_activite"
                      type="text"
                      placeholder="Activité"
                      className="w-full px-4 py-2.5 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-[#2B2119] focus:outline-none focus:ring-2 focus:ring-[#C1652D]/30 focus:border-[#C1652D] text-sm"
                    />
                  </div>
                </div>

                {/* Choix du forfait pour l'essai gratuit de 14 jours (Tâche 7) */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#6D5D52]">
                      Forfait souhaité après essai *
                    </label>
                    <span className="text-[11px] font-semibold text-[#C1652D] bg-[#C1652D]/10 px-2.5 py-0.5 rounded-full">
                      14 jours d&apos;essai gratuit inclus
                    </span>
                  </div>
                  <input type="hidden" name="forfait_nom" value={selectedForfait} />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {[
                      {
                        nom: "Solo",
                        prix: "5 000",
                        boutiques: "1 boutique",
                        employes: "1 employé",
                      },
                      {
                        nom: "Réseau",
                        prix: "15 000",
                        boutiques: "3 boutiques",
                        employes: "5 employés/btq",
                        recommande: true,
                      },
                      {
                        nom: "Empire",
                        prix: "35 000",
                        boutiques: "Illimitées",
                        employes: "Illimités",
                      },
                    ].map((f) => {
                      const isSelected = selectedForfait === f.nom;
                      return (
                        <button
                          key={f.nom}
                          type="button"
                          onClick={() => setSelectedForfait(f.nom)}
                          className={`relative text-left p-3 rounded-xl border-2 transition-all ${
                            isSelected
                              ? "border-[#C1652D] bg-[#C1652D]/5 ring-2 ring-[#C1652D]/20 shadow-sm"
                              : "border-[#E5DACF] hover:border-neutral-300 bg-white"
                          }`}
                        >
                          {f.recommande && (
                            <span className="absolute -top-2 right-2 text-[10px] font-bold uppercase bg-[#C1652D] text-white px-1.5 py-0.2 rounded-full">
                              Recommandé
                            </span>
                          )}
                          <div className="font-bold text-sm text-[#2B2119]">{f.nom}</div>
                          <div className="text-xs font-semibold text-[#C1652D] mt-0.5">
                            {f.prix} F<span className="text-[10px] text-[#6D5D52]">/mois</span>
                          </div>
                          <div className="text-[11px] text-[#6D5D52] mt-1.5 leading-tight">
                            <div>{f.boutiques}</div>
                            <div>{f.employes}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-[#8C7A6B] mt-1.5 italic">
                    Aucun paiement n&apos;est requis aujourd&apos;hui. Tu testeras l&apos;intégralité des fonctionnalités gratuitement pendant 14 jours.
                  </p>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-6 rounded-xl bg-[#C1652D] text-[#FAF6F1] font-bold text-sm hover:bg-[#a95524] transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-60"
                  >
                    {loading ? (
                      <span>Création de ton compte...</span>
                    ) : (
                      <>
                        <span>Continuer vers la sécurisation 2FA</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>

                {/* Bloc Tu as déjà un compte en bas du formulaire */}
                <div className="mt-6 pt-5 border-t border-[#E5DACF] text-center text-sm text-[#6D5D52]">
                  <span>Tu as déjà un compte ? </span>
                  <Link
                    href="/connexion"
                    className="font-bold text-[#C1652D] hover:underline"
                  >
                    Se connecter
                  </Link>
                </div>
              </form>
            </div>
          )}

          {/* Étape 2 : Configuration 2FA TOTP (Section 7) */}
          {step === "deux_fa" && deuxFaData && (
            <div className="bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl p-6 sm:p-8 shadow-sm">
              <div className="mb-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-[#C1652D]/10 text-[#C1652D] mx-auto flex items-center justify-center mb-3">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-extrabold tracking-tight text-[#2B2119]">
                  Active ta double authentification
                </h2>
                <p className="text-sm text-[#6D5D52] mt-1 max-w-sm mx-auto">
                  La double authentification est obligatoire pour protéger tes finances et ton stock.
                </p>
              </div>

              {totpError && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
                  <div>{totpError}</div>
                </div>
              )}

              {/* Affichage du QR Code */}
              <div className="flex flex-col items-center justify-center mb-6">
                <div className="p-3 bg-[#FAF6F1] border-2 border-dashed border-[#C1652D]/40 rounded-2xl shadow-sm mb-3">
                  <img
                    src={deuxFaData.qrCodeDataUrl}
                    alt="QR Code TOTP djoonoo"
                    className="w-48 h-48 rounded-lg"
                  />
                </div>
                <p className="text-xs text-[#6D5D52] text-center max-w-xs">
                  Scanne ce QR code avec <strong>Google Authenticator</strong> ou <strong>Authy</strong> sur ton smartphone.
                </p>
              </div>

              {/* Clé de secours textuelle */}
              <div className="mb-6 p-3 rounded-xl bg-[#FAF6F1] border border-[#E5DACF] flex items-center justify-between">
                <div className="truncate mr-2">
                  <span className="block text-[10px] font-bold uppercase text-[#8C7A6B]">
                    Clé manuelle si impossible de scanner :
                  </span>
                  <code className="text-xs font-mono font-bold text-[#2B2119]">
                    {deuxFaData.secret}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={copierSecret}
                  className="px-2.5 py-1.5 rounded-lg border border-[#E5DACF] hover:bg-[#E5DACF]/50 text-xs font-semibold flex items-center gap-1.5 transition-colors text-[#2B2119]"
                >
                  {copiedSecret ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#C1652D]" />
                      <span className="text-[#C1652D]">Copié</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-[#8C7A6B]" />
                      <span>Copier</span>
                    </>
                  )}
                </button>
              </div>

              {/* Formulaire de validation des 6 chiffres */}
              <form onSubmit={handleTotpSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#6D5D52] mb-1.5 text-center">
                    Saisis le code à 6 chiffres affiché sur ton application *
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    required
                    autoFocus
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="123456"
                    className="w-full text-center tracking-[0.5em] font-mono font-extrabold text-2xl py-3 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-[#2B2119] focus:outline-none focus:ring-2 focus:ring-[#C1652D]/30 focus:border-[#C1652D]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={totpLoading || totpCode.length < 6}
                  className="w-full py-3 px-6 rounded-xl bg-[#C1652D] text-[#FAF6F1] font-bold text-sm hover:bg-[#a95524] transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-60"
                >
                  {totpLoading ? (
                    <span>Vérification en cours...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Activer et accéder à mon espace</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* Pied de page épuré */}
      <footer className="border-t border-[#E5DACF] py-4 text-center text-xs text-[#8C7A6B]">
        djoonoo — Tous droits réservés • ETS. 2KR DIGITAL
      </footer>
    </div>
  );
}
