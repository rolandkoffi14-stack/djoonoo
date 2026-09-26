"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  connexionAction,
  validerDeuxFaConnexionAction,
} from "@/app/actions/auth";
import {
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";

export default function ConnexionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Étape 2FA si requise
  const [require2FA, setRequire2FA] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [totpLoading, setTotpLoading] = useState(false);

  async function handleLoginSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const formData = new FormData(e.currentTarget);
    try {
      const res = await connexionAction(null, formData);
      if (res.error) {
        setErrorMsg(res.error);
      } else if (res.require2FA && res.userId) {
        setRequire2FA(true);
        setUserId(res.userId);
        setUserEmail(res.email || "");
      } else if (res.redirectUrl) {
        router.push(res.redirectUrl);
      }
    } catch {
      setErrorMsg("Une erreur inattendue est survenue. Vérifie ta connexion.");
    } finally {
      setLoading(false);
    }
  }

  async function handleTotpSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!userId || totpCode.length < 6) return;

    setTotpLoading(true);
    setErrorMsg(null);

    try {
      const res = await validerDeuxFaConnexionAction(userId, totpCode);
      if (res.success && res.redirectUrl) {
        router.push(res.redirectUrl);
      } else {
        setErrorMsg(res.error || "Code d'authentification invalide.");
      }
    } catch {
      setErrorMsg("Erreur lors de la validation 2FA.");
    } finally {
      setTotpLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF6F1] text-[#2B2119] flex flex-col justify-between selection:bg-[#C1652D]/20">
      {/* Barre supérieure épurée */}
      <header className="border-b border-[#E5DACF] bg-[#FAF6F1]/90 backdrop-blur-md px-6 py-4 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Vrai logo djoonoo */}
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

          {/* Lien droit dans la navbar */}
          <div>
            <Link
              href="/inscription"
              className="font-semibold text-sm text-[#C1652D] hover:underline"
            >
              Créer mon compte
            </Link>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl p-6 sm:p-8 shadow-sm">
            {!require2FA ? (
              <>
                <div className="mb-6 text-center">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#2B2119]">
                    Bienvenue !
                  </h1>
                  <p className="text-sm text-[#6D5D52] mt-1.5">
                    Connecte-toi pour gérer ta boutique sur djoonoo.
                  </p>
                </div>

                {errorMsg && (
                  <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
                    <div className="leading-relaxed">{errorMsg}</div>
                  </div>
                )}

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#6D5D52] mb-1.5">
                      Adresse email *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#8C7A6B] absolute left-3.5 top-3.5" />
                      <input
                        name="email"
                        type="email"
                        required
                        autoFocus
                        placeholder="Votre email"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-[#2B2119] focus:outline-none focus:ring-2 focus:ring-[#C1652D]/30 focus:border-[#C1652D] text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#6D5D52]">
                        Mot de passe *
                      </label>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#8C7A6B] absolute left-3.5 top-3.5" />
                      <input
                        name="mot_de_passe"
                        type={showPassword ? "text" : "password"}
                        required
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
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 px-6 rounded-xl bg-[#C1652D] text-[#FAF6F1] font-bold text-sm hover:bg-[#a95524] transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-60"
                    >
                      {loading ? (
                        <span>Connexion en cours...</span>
                      ) : (
                        <>
                          <span>Accéder à ma boutique</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Bloc Nouveau commerçant en bas du formulaire */}
                <div className="mt-6 pt-5 border-t border-[#E5DACF] text-center text-sm text-[#6D5D52]">
                  <span>Nouveau commerçant ? </span>
                  <Link
                    href="/inscription"
                    className="font-bold text-[#C1652D] hover:underline"
                  >
                    Créer mon compte
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div className="mb-6 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-[#C1652D]/10 text-[#C1652D] mx-auto flex items-center justify-center mb-3">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-[#2B2119]">
                    Double authentification
                  </h2>
                  <p className="text-xs text-[#6D5D52] mt-1">
                    Compte : <strong>{userEmail}</strong>
                  </p>
                </div>

                {errorMsg && (
                  <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
                    <div>{errorMsg}</div>
                  </div>
                )}

                <form onSubmit={handleTotpSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#6D5D52] mb-2 text-center">
                      Code à 6 chiffres de ton application d&apos;authentification *
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
                      placeholder="000000"
                      className="w-full text-center tracking-[0.5em] font-mono font-extrabold text-2xl py-3 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-[#2B2119] focus:outline-none focus:ring-2 focus:ring-[#C1652D]/30 focus:border-[#C1652D]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={totpLoading || totpCode.length < 6}
                    className="w-full py-3 px-6 rounded-xl bg-[#C1652D] text-[#FAF6F1] font-bold text-sm hover:bg-[#a95524] transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-60"
                  >
                    {totpLoading ? (
                      <span>Vérification...</span>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Valider et continuer</span>
                      </>
                    )}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setRequire2FA(false)}
                      className="text-xs text-[#6D5D52] hover:text-[#2B2119] underline"
                    >
                      Retour à la connexion par mot de passe
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-[#E5DACF] py-4 text-center text-xs text-[#8C7A6B]">
        djoonoo — Tous droits réservés • ETS. 2KR DIGITAL
      </footer>
    </div>
  );
}
