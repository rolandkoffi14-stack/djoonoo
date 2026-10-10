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
import { siteConfig } from "@/config/site";
import type { ForfaitCatalogue } from "@/lib/plateforme-config";
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

interface InscriptionClientProps {
  forfaits: ForfaitCatalogue[];
  dureeEssaiJours: number;
}

export default function InscriptionClient({
  forfaits,
  dureeEssaiJours,
}: InscriptionClientProps) {
  const router = useRouter();
  const [step, setStep] = useState<"infos" | "deux_fa">("infos");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Par défaut, sélectionner le forfait recommandé ou le premier forfait
  const forfaitParDefaut =
    forfaits.find((f) => f.badge)?.nom || forfaits[0]?.nom || "Solo";
  const [selectedForfait, setSelectedForfait] = useState(forfaitParDefaut);

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

  // Soumission de l'Étape 1 (Informations Entreprise & Patron)
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

    // Assure la présence des deux clés pour compatibilité ascendante
    if (nomPatron) {
      formData.set("nom", nomPatron);
      formData.set("nom_patron", nomPatron);
    }
    if (telPatron) {
      formData.set("telephone", telPatron);
      formData.set("telephone_patron", telPatron);
    }

    try {
      const res: InscriptionState = await inscrirePatronAction(null, formData);

      if (res.success && res.step === "deux_fa" && res.data) {
        setDeuxFaData({
          userId: res.data.userId,
          email: res.data.email,
          qrCodeDataUrl: res.data.qrCodeDataUrl,
          secret: res.data.secret,
          codeCompte: res.data.codeCompte,
          codeBoutique: res.data.codeBoutique,
        });
        setStep("deux_fa");
      } else {
        const errorText =
          res.error ||
          (res.fieldErrors && Object.keys(res.fieldErrors).length > 0
            ? Object.values(res.fieldErrors)[0]
            : "Une erreur est survenue lors de l'inscription.");
        setErrorMsg(errorText);
        if (res.fieldErrors) {
          setFieldErrors(res.fieldErrors);
        }
      }
    } catch {
      setErrorMsg("Une erreur réseau imprévue est survenue.");
    } finally {
      setLoading(false);
    }
  };

  // Soumission de l'Étape 2 (Validation 2FA obligatoire)
  const handleSubmitDeuxFa = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!deuxFaData || totpCode.length < 6) return;

    setTotpLoading(true);
    setErrorMsg(null);

    try {
      const res = await validerDeuxFaInscriptionAction(
        deuxFaData.userId,
        totpCode
      );

      if (res.success) {
        router.push("/dashboard");
      } else {
        setErrorMsg(res.error || "Code d'authentification invalide.");
      }
    } catch {
      setErrorMsg("Erreur de validation du code.");
    } finally {
      setTotpLoading(false);
    }
  };

  const copySecretToClipboard = () => {
    if (deuxFaData?.secret) {
      navigator.clipboard.writeText(deuxFaData.secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF6F1] flex flex-col justify-between">
      {/* En-tête avec marque */}
      <header className="border-b border-[#E5DACF] bg-[#FAF6F1] py-4 px-6 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="inline-block">
            <div className="relative h-8 w-32">
              <Image
                src={siteConfig.app.logos.transparentClair}
                alt={siteConfig.app.nom}
                fill
                className="object-contain"
                priority
              />
            </div>
          </Link>
          <div className="text-xs font-semibold text-[#6D5D52]">
            Déjà un compte ?{" "}
            <Link
              href="/connexion"
              className="text-[#C1652D] hover:underline font-bold"
            >
              Se connecter
            </Link>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-6">
        <div className="w-full max-w-xl">
          {errorMsg && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3 shadow-xs animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Une attention est requise</p>
                <p className="text-xs mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          {step === "infos" ? (
            <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-[#E5DACF] space-y-6">
              <div>
                <span className="px-3 py-1 rounded-full bg-[#C1652D]/10 text-[#C1652D] text-xs font-bold uppercase tracking-wider">
                  Étape 1 sur 2
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-[#2B2119] tracking-tight mt-2">
                  Crée ton entreprise
                </h1>
                <p className="text-sm text-[#6D5D52] mt-1">
                  Démarre tes {dureeEssaiJours} jours d&apos;essai gratuit. Sans engagement ni carte bancaire.
                </p>
              </div>

              <form onSubmit={handleSubmitInfos} className="space-y-4">
                {/* SECTION 1 : ENTREPRISE */}
                <div className="pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#C1652D] mb-3 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>L&apos;Entreprise & La Boutique</span>
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#6D5D52] mb-1">
                        Nom de l&apos;entreprise / Commerce *
                      </label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-[#8C7A6B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          name="nom_entreprise"
                          required
                          placeholder="Ex: Établissement Le Bonheur"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-[#2B2119] focus:outline-none focus:ring-2 focus:ring-[#C1652D]/30 focus:border-[#C1652D] text-sm"
                        />
                      </div>
                      {fieldErrors.nom_entreprise && (
                        <p className="text-xs text-rose-600 mt-1">{fieldErrors.nom_entreprise}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#6D5D52] mb-1">
                          Nom de la 1ère boutique *
                        </label>
                        <input
                          type="text"
                          name="nom_boutique"
                          required
                          placeholder="Ex: Boutique Principale"
                          className="w-full px-4 py-2.5 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-[#2B2119] focus:outline-none focus:ring-2 focus:ring-[#C1652D]/30 focus:border-[#C1652D] text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#6D5D52] mb-1">
                          Secteur d&apos;activité *
                        </label>
                        <select
                          name="secteur_activite"
                          required
                          className="w-full px-4 py-2.5 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-[#2B2119] focus:outline-none focus:ring-2 focus:ring-[#C1652D]/30 focus:border-[#C1652D] text-sm"
                        >
                          <option value="Commerce général">Commerce général</option>
                          <option value="Prêt-à-porter & Mode">Prêt-à-porter & Mode</option>
                          <option value="Électronique & Informatique">Électronique & Informatique</option>
                          <option value="Alimentation & Supérette">Alimentation & Supérette</option>
                          <option value="Pharmacie & Cosmétique">Pharmacie & Cosmétique</option>
                          <option value="Quincaillerie & Matériaux">Quincaillerie & Matériaux</option>
                          <option value="Autre commerce">Autre commerce</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#6D5D52] mb-1">
                          Ville d&apos;implantation *
                        </label>
                        <div className="relative">
                          <MapPin className="w-4 h-4 text-[#8C7A6B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            name="ville"
                            required
                            placeholder="Ex: Cotonou"
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-[#2B2119] focus:outline-none focus:ring-2 focus:ring-[#C1652D]/30 focus:border-[#C1652D] text-sm"
                          />
                        </div>
                        {fieldErrors.ville && (
                          <p className="text-xs text-rose-600 mt-1">{fieldErrors.ville}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#6D5D52] mb-1">
                          Adresse / Quartier boutique *
                        </label>
                        <input
                          type="text"
                          name="adresse_boutique"
                          required
                          placeholder="Ex: Marché Dantokpa, Allée 4"
                          className="w-full px-4 py-2.5 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-[#2B2119] focus:outline-none focus:ring-2 focus:ring-[#C1652D]/30 focus:border-[#C1652D] text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 2 : COMPTE PATRON */}
                <div className="pt-4 border-t border-[#E5DACF]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#C1652D] mb-3 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    <span>Identifiants du Patron (Propriétaire)</span>
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#6D5D52] mb-1">
                        Nom complet du patron *
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-[#8C7A6B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          name="nom_patron"
                          required
                          placeholder="Ex: Roland KOFFI"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-[#2B2119] focus:outline-none focus:ring-2 focus:ring-[#C1652D]/30 focus:border-[#C1652D] text-sm"
                        />
                      </div>
                      {(fieldErrors.nom_patron || fieldErrors.nom) && (
                        <p className="text-xs text-rose-600 mt-1">{fieldErrors.nom_patron || fieldErrors.nom}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#6D5D52] mb-1">
                          Email professionnel *
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-[#8C7A6B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="email"
                            name="email"
                            required
                            placeholder="patron@commerce.bj"
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-[#2B2119] focus:outline-none focus:ring-2 focus:ring-[#C1652D]/30 focus:border-[#C1652D] text-sm"
                          />
                        </div>
                        {fieldErrors.email && (
                          <p className="text-xs text-rose-600 mt-1">{fieldErrors.email}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#6D5D52] mb-1">
                          Téléphone principal *
                        </label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-[#8C7A6B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="tel"
                            name="telephone_patron"
                            required
                            placeholder="+229 01 ..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-[#2B2119] focus:outline-none focus:ring-2 focus:ring-[#C1652D]/30 focus:border-[#C1652D] text-sm"
                          />
                        </div>
                        {(fieldErrors.telephone_patron || fieldErrors.telephone) && (
                          <p className="text-xs text-rose-600 mt-1">{fieldErrors.telephone_patron || fieldErrors.telephone}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#6D5D52] mb-1">
                          Mot de passe *
                        </label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-[#8C7A6B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type={showPassword ? "text" : "password"}
                            name="mot_de_passe"
                            required
                            placeholder="••••••••••••"
                            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-[#2B2119] focus:outline-none focus:ring-2 focus:ring-[#C1652D]/30 focus:border-[#C1652D] text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C7A6B] hover:text-[#2B2119]"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {fieldErrors.mot_de_passe && (
                          <p className="text-xs text-rose-600 mt-1">{fieldErrors.mot_de_passe}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#6D5D52] mb-1">
                          Confirmer le mot de passe *
                        </label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-[#8C7A6B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type={showPassword ? "text" : "password"}
                            name="mot_de_passe_confirmation"
                            required
                            placeholder="••••••••••••"
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-[#2B2119] focus:outline-none focus:ring-2 focus:ring-[#C1652D]/30 focus:border-[#C1652D] text-sm"
                          />
                        </div>
                        {fieldErrors.mot_de_passe_confirmation && (
                          <p className="text-xs text-rose-600 mt-1">{fieldErrors.mot_de_passe_confirmation}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 3 : FORFAIT D'ABONNEMENT SOUHAITÉ (100% Dynamique BDD) */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#6D5D52]">
                      Forfait souhaité après essai *
                    </label>
                    <span className="text-[11px] font-semibold text-[#C1652D] bg-[#C1652D]/10 px-2.5 py-0.5 rounded-full">
                      {dureeEssaiJours} jours d&apos;essai gratuit inclus
                    </span>
                  </div>
                  <input type="hidden" name="forfait_nom" value={selectedForfait} />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {forfaits.map((f) => {
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
                          {f.badge && (
                            <span className="absolute -top-2 right-2 text-[10px] font-bold uppercase bg-[#C1652D] text-white px-1.5 py-0.2 rounded-full">
                              {f.badge}
                            </span>
                          )}
                          <div className="font-bold text-sm text-[#2B2119]">{f.nom}</div>
                          <div className="text-xs font-semibold text-[#C1652D] mt-0.5">
                            {f.prix.toLocaleString("fr-FR")} {siteConfig.regional.devise}
                            <span className="text-[10px] text-[#6D5D52]">/mois</span>
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
                    Aucun paiement n&apos;est requis aujourd&apos;hui. Tu testeras l&apos;intégralité des fonctionnalités gratuitement pendant {dureeEssaiJours} jours.
                  </p>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-6 rounded-xl bg-[#C1652D] text-[#FAF6F1] font-bold text-sm hover:bg-[#a95524] transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 cursor-pointer"
                  >
                    {loading ? (
                      <span>Création de l&apos;entreprise...</span>
                    ) : (
                      <>
                        <span>Passer à la sécurisation 2FA</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* ÉTAPE 2 : ACTIVATION 2FA TOTP OBLIGATOIRE */
            <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-[#E5DACF] space-y-6">
              <div>
                <span className="px-3 py-1 rounded-full bg-[#C1652D]/10 text-[#C1652D] text-xs font-bold uppercase tracking-wider">
                  Étape 2 sur 2 • Sécurité Obligatoire
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-[#2B2119] tracking-tight mt-2 flex items-center gap-2">
                  <ShieldCheck className="w-7 h-7 text-[#C1652D]" />
                  <span>Double Authentification (2FA)</span>
                </h1>
                <p className="text-sm text-[#6D5D52] mt-1">
                  En tant que Patron, le 2FA protège les finances de ton commerce. Scanne le QR code avec Google Authenticator ou une application compatible.
                </p>
              </div>

              {deuxFaData && (
                <div className="bg-[#FAF6F1] p-4 rounded-2xl border border-[#E5DACF] space-y-3 text-xs text-[#57483E]">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E5DACF]">
                    <span className="font-semibold">Code unique Entreprise :</span>
                    <span className="font-mono font-bold text-[#C1652D] bg-white px-2 py-0.5 rounded border border-[#E5DACF]">
                      {deuxFaData.codeCompte}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Boutique n°1 créée :</span>
                    <span className="font-mono font-bold text-[#2B2119]">
                      {deuxFaData.codeBoutique}
                    </span>
                  </div>
                </div>
              )}

              {deuxFaData?.qrCodeDataUrl && (
                <div className="flex flex-col items-center justify-center p-4 bg-[#FAF6F1] rounded-2xl border border-[#E5DACF] space-y-3">
                  <div className="bg-white p-3 rounded-xl shadow-xs border border-[#E5DACF]">
                    <img
                      src={deuxFaData.qrCodeDataUrl}
                      alt="QR Code 2FA TOTP"
                      width={180}
                      height={180}
                      className="rounded"
                    />
                  </div>
                  <p className="text-xs text-[#6D5D52] text-center">
                    Scanne ce QR Code dans Google Authenticator
                  </p>

                  <div className="w-full pt-2">
                    <div className="text-[11px] text-[#8C7A6B] text-center mb-1">
                      Ou saisis cette clé manuellement :
                    </div>
                    <div className="flex items-center justify-center gap-2 font-mono text-xs bg-white px-3 py-1.5 rounded-lg border border-[#E5DACF]">
                      <span className="font-bold text-[#2B2119] tracking-wider">
                        {deuxFaData.secret}
                      </span>
                      <button
                        type="button"
                        onClick={copySecretToClipboard}
                        className="text-[#C1652D] hover:text-[#a95524] transition-colors"
                        title="Copier le secret"
                      >
                        {copiedSecret ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmitDeuxFa} className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#6D5D52] mb-1">
                    Code de confirmation à 6 chiffres *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    pattern="[0-9]{6}"
                    inputMode="numeric"
                    autoFocus
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="123456"
                    className="w-full text-center text-2xl font-mono tracking-widest py-3 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-[#2B2119] focus:outline-none focus:ring-2 focus:ring-[#C1652D] font-bold"
                  />
                  <p className="text-xs text-[#8C7A6B] mt-1 text-center">
                    Saisis le code généré par ton application pour activer ton compte
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={totpLoading || totpCode.length < 6}
                  className="w-full py-3.5 px-6 rounded-xl bg-[#C1652D] text-[#FAF6F1] font-bold text-sm hover:bg-[#a95524] transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 cursor-pointer"
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
        {siteConfig.app.nom} — Tous droits réservés • {siteConfig.entreprise.nom}
      </footer>
    </div>
  );
}
