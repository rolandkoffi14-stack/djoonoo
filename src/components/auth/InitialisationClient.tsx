"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  initialiserEntrepriseAction,
  validerDeuxFaInscriptionAction,
  InscriptionState,
} from "@/app/actions/auth";
import { siteConfig } from "@/config/site";
import {
  KeyRound,
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

export default function InitialisationClient() {
  const router = useRouter();
  const [step, setStep] = useState<"infos" | "deux_fa">("infos");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  // Soumission de l'Étape 1 (Informations Entreprise & Licence & Patron)
  const handleSubmitInfos = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setFieldErrors({});

    const form = e.currentTarget;
    const formData = new FormData(form);

    const nomPatron = (formData.get("nom_patron") || formData.get("nom")) as string;
    const telPatron = (formData.get("telephone_patron") || formData.get("telephone")) as string;
    const mdp = formData.get("mot_de_passe") as string;
    const mdpConf = formData.get("mot_de_passe_confirmation") as string;

    if (mdp && mdpConf && mdp !== mdpConf) {
      setErrorMsg("Les mots de passe saisis ne correspondent pas.");
      setFieldErrors({ mot_de_passe_confirmation: "Les mots de passe ne correspondent pas." });
      setLoading(false);
      return;
    }

    if (nomPatron) {
      formData.set("nom", nomPatron);
      formData.set("nom_patron", nomPatron);
    }
    if (telPatron) {
      formData.set("telephone", telPatron);
      formData.set("telephone_patron", telPatron);
    }

    try {
      const res: InscriptionState = await initialiserEntrepriseAction(null, formData);

      if (!res.success) {
        setErrorMsg(res.error || "Une erreur est survenue lors de l'initialisation.");
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        setLoading(false);
        return;
      }

      if (res.step === "deux_fa" && res.data) {
        setDeuxFaData(res.data);
        setStep("deux_fa");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Erreur réseau. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  // Soumission de l'Étape 2 (Validation 2FA TOTP)
  const handleVerifyTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deuxFaData || !totpCode.trim()) return;

    setTotpLoading(true);
    setErrorMsg(null);

    try {
      const res = await validerDeuxFaInscriptionAction(deuxFaData.userId, totpCode.trim());

      if (!res.success) {
        setErrorMsg(res.error || "Code 2FA invalide. Vérifiez l'heure de votre appareil.");
        setTotpLoading(false);
        return;
      }

      // Succès -> redirection tableau de bord
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err?.message || "Erreur lors de la validation du code.");
      setTotpLoading(false);
    }
  };

  const handleCopySecret = () => {
    if (!deuxFaData?.secret) return;
    navigator.clipboard.writeText(deuxFaData.secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#FAF6F1] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* En-tête Marque */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="relative h-12 w-36 mx-auto mb-4">
          <Image
            src="/brand/01_horizontal_logos/djoonoo_logo_clair_transparent.svg"
            alt="djoonoo logo"
            fill
            className="object-contain"
            priority
          />
        </div>

        <h2 className="text-2xl font-black text-[#2B2119] tracking-tight">
          {step === "infos" ? "Activation de votre Logiciel" : "Sécurisation par Double Authentification"}
        </h2>
        <p className="mt-1 text-sm text-[#6D5D52]">
          {step === "infos"
            ? "Configurez votre entreprise et activez votre licence à vie."
            : "Scannez le QR Code pour lier votre application d'authentification."}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-6 shadow-sm border border-[#E5DACF] rounded-2xl sm:px-10">
          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-sm text-red-700 leading-relaxed font-medium">
                {errorMsg}
              </div>
            </div>
          )}

          {step === "infos" ? (
            <form onSubmit={handleSubmitInfos} className="space-y-6">
              {/* SECTION 1 : CLÉ DE LICENCE */}
              <div className="p-4 rounded-xl bg-[#FAF6F1]/80 border border-[#C1652D]/30 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#C1652D]">
                  <KeyRound className="w-4 h-4" />
                  <span>Clé de Licence Officielle</span>
                </div>
                <div>
                  <input
                    type="text"
                    name="cle_licence"
                    id="cle_licence"
                    required
                    placeholder="DJN-LFT.eyJub21FbnRyZXByaXNl... (fournie à l'achat)"
                    className={`block w-full font-mono text-xs rounded-xl border px-3.5 py-2.5 bg-white text-[#2B2119] shadow-2xs focus:ring-2 focus:ring-[#C1652D] focus:outline-hidden ${
                      fieldErrors.cle_licence ? "border-red-400" : "border-[#E5DACF]"
                    }`}
                  />
                  {fieldErrors.cle_licence ? (
                    <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.cle_licence}</p>
                  ) : (
                    <p className="mt-1 text-[11px] text-[#8C7A6B]">
                      Clé de licence délivrée lors de votre achat comptant.
                    </p>
                  )}
                </div>
              </div>

              {/* SECTION 2 : ENTREPRISE */}
              <div className="space-y-4 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#8C7A6B] border-b border-[#FAF6F1] pb-2 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#C1652D]" />
                  Votre Entreprise
                </h3>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor="nom_entreprise" className="block text-xs font-bold text-[#2B2119]">
                      Nom officiel de l'entreprise / commerce *
                    </label>
                    <input
                      type="text"
                      name="nom_entreprise"
                      id="nom_entreprise"
                      required
                      placeholder="Ex: Établissement Alafia & Frères"
                      className="mt-1 block w-full rounded-xl border border-[#E5DACF] px-3.5 py-2.5 text-sm bg-white text-[#2B2119] focus:ring-2 focus:ring-[#C1652D] focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label htmlFor="ville" className="block text-xs font-bold text-[#2B2119]">
                      Ville d'activité *
                    </label>
                    <div className="relative mt-1">
                      <MapPin className="w-4 h-4 text-[#8C7A6B] absolute left-3 top-3" />
                      <input
                        type="text"
                        name="ville"
                        id="ville"
                        required
                        placeholder="Ex: Cotonou, Porto-Novo"
                        className="block w-full pl-9 rounded-xl border border-[#E5DACF] px-3.5 py-2.5 text-sm bg-white text-[#2B2119] focus:ring-2 focus:ring-[#C1652D] focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="secteur_activite" className="block text-xs font-bold text-[#2B2119]">
                      Secteur d'activité
                    </label>
                    <input
                      type="text"
                      name="secteur_activite"
                      id="secteur_activite"
                      placeholder="Ex: Alimentation, Prêt-à-porter"
                      defaultValue="Commerce général"
                      className="mt-1 block w-full rounded-xl border border-[#E5DACF] px-3.5 py-2.5 text-sm bg-white text-[#2B2119] focus:ring-2 focus:ring-[#C1652D] focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3 : COMPTE PATRON */}
              <div className="space-y-4 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#8C7A6B] border-b border-[#FAF6F1] pb-2 flex items-center gap-2">
                  <User className="w-4 h-4 text-[#C1652D]" />
                  Compte Administrateur (Patron)
                </h3>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="nom_patron" className="block text-xs font-bold text-[#2B2119]">
                      Nom complet *
                    </label>
                    <input
                      type="text"
                      name="nom_patron"
                      id="nom_patron"
                      required
                      placeholder="Prénom et Nom"
                      className="mt-1 block w-full rounded-xl border border-[#E5DACF] px-3.5 py-2.5 text-sm bg-white text-[#2B2119] focus:ring-2 focus:ring-[#C1652D] focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label htmlFor="telephone_patron" className="block text-xs font-bold text-[#2B2119]">
                      Numéro de téléphone *
                    </label>
                    <div className="relative mt-1">
                      <Phone className="w-4 h-4 text-[#8C7A6B] absolute left-3 top-3" />
                      <input
                        type="tel"
                        name="telephone_patron"
                        id="telephone_patron"
                        required
                        placeholder="+229 01 00 00 00"
                        className="block w-full pl-9 rounded-xl border border-[#E5DACF] px-3.5 py-2.5 text-sm bg-white text-[#2B2119] focus:ring-2 focus:ring-[#C1652D] focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="email" className="block text-xs font-bold text-[#2B2119]">
                      Adresse e-mail (identifiant de connexion) *
                    </label>
                    <div className="relative mt-1">
                      <Mail className="w-4 h-4 text-[#8C7A6B] absolute left-3 top-3" />
                      <input
                        type="email"
                        name="email"
                        id="email"
                        required
                        placeholder="patron@moncommerce.com"
                        className="block w-full pl-9 rounded-xl border border-[#E5DACF] px-3.5 py-2.5 text-sm bg-white text-[#2B2119] focus:ring-2 focus:ring-[#C1652D] focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="mot_de_passe" className="block text-xs font-bold text-[#2B2119]">
                      Mot de passe *
                    </label>
                    <div className="relative mt-1">
                      <Lock className="w-4 h-4 text-[#8C7A6B] absolute left-3 top-3" />
                      <input
                        type={showPassword ? "text" : "password"}
                        name="mot_de_passe"
                        id="mot_de_passe"
                        required
                        placeholder="Min. 8 caractères"
                        className="block w-full pl-9 pr-9 rounded-xl border border-[#E5DACF] px-3.5 py-2.5 text-sm bg-white text-[#2B2119] focus:ring-2 focus:ring-[#C1652D] focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-[#8C7A6B] hover:text-[#2B2119]"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="mot_de_passe_confirmation" className="block text-xs font-bold text-[#2B2119]">
                      Confirmer le mot de passe *
                    </label>
                    <div className="relative mt-1">
                      <Lock className="w-4 h-4 text-[#8C7A6B] absolute left-3 top-3" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        name="mot_de_passe_confirmation"
                        id="mot_de_passe_confirmation"
                        required
                        placeholder="Répéter le mot de passe"
                        className="block w-full pl-9 pr-9 rounded-xl border border-[#E5DACF] px-3.5 py-2.5 text-sm bg-white text-[#2B2119] focus:ring-2 focus:ring-[#C1652D] focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-3 text-[#8C7A6B] hover:text-[#2B2119]"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-bold text-[#FAF6F1] bg-[#C1652D] hover:bg-[#a95524] transition-colors shadow-sm focus:outline-hidden disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <span>Initialisation en cours...</span>
                  ) : (
                    <>
                      <span>Initialiser & Configurer la sécurité</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* ÉTAPE 2 : SCAN 2FA TOTP */
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex p-3 rounded-2xl bg-[#C1652D]/10 text-[#C1652D] mb-1">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-black text-[#2B2119]">
                  Application d'authentification (2FA)
                </h3>
                <p className="text-xs text-[#6D5D52] max-w-sm mx-auto leading-relaxed">
                  Ouvrez <strong>Google Authenticator</strong> ou <strong>Authy</strong> sur votre smartphone et scannez le QR code ci-dessous.
                </p>
              </div>

              {deuxFaData?.qrCodeDataUrl && (
                <div className="flex justify-center p-4 bg-[#FAF6F1] rounded-2xl border border-[#E5DACF]">
                  <Image
                    src={deuxFaData.qrCodeDataUrl}
                    alt="QR Code TOTP djoonoo"
                    width={220}
                    height={220}
                    className="rounded-xl shadow-xs"
                    unoptimized
                  />
                </div>
              )}

              {/* Clé secrète manuelle */}
              <div className="p-3 bg-[#FAF6F1]/60 rounded-xl border border-[#E5DACF] text-xs flex items-center justify-between">
                <div>
                  <span className="text-[#8C7A6B] block text-[10px] uppercase font-bold">Clé manuelle :</span>
                  <span className="font-mono font-bold text-[#2B2119] select-all">
                    {deuxFaData?.secret}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopySecret}
                  className="p-1.5 rounded-lg border border-[#E5DACF] bg-white hover:bg-[#FAF6F1] text-[#6D5D52]"
                  title="Copier la clé secrète"
                >
                  {copiedSecret ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <form onSubmit={handleVerifyTotp} className="space-y-4">
                <div>
                  <label htmlFor="totp_code" className="block text-xs font-bold text-[#2B2119] mb-1 text-center">
                    Code à 6 chiffres affiché sur votre application :
                  </label>
                  <input
                    type="text"
                    id="totp_code"
                    maxLength={6}
                    required
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="000000"
                    autoFocus
                    className="block w-48 mx-auto text-center font-mono text-2xl tracking-[0.3em] font-black rounded-xl border border-[#E5DACF] py-2.5 bg-white text-[#2B2119] focus:ring-2 focus:ring-[#C1652D] focus:outline-hidden"
                  />
                </div>

                <button
                  type="submit"
                  disabled={totpLoading || totpCode.length !== 6}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-bold text-[#FAF6F1] bg-[#C1652D] hover:bg-[#a95524] transition-colors shadow-sm focus:outline-hidden disabled:opacity-50 cursor-pointer"
                >
                  {totpLoading ? (
                    <span>Validation en cours...</span>
                  ) : (
                    <>
                      <span>Activer et accéder au logiciel</span>
                      <CheckCircle2 className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

