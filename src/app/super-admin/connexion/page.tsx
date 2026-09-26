"use client";

import React, { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Shield, KeyRound, Lock, Mail, ArrowRight, AlertCircle } from "lucide-react";
import { connexionSuperAdminAction } from "@/app/actions/super-admin";

export default function SuperAdminConnexionPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await connexionSuperAdminAction(null, formData);
      if (!res.success) {
        setError(res.error || "Échec de l'authentification.");
      } else {
        router.push("/super-admin");
        router.refresh();
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col justify-center items-center p-4 selection:bg-[#C1652D] selection:text-white">
      {/* Container Principal */}
      <div className="w-full max-w-md">
        {/* Header / Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-mono text-slate-300 mb-4">
            <Shield className="w-3.5 h-3.5 text-[#C1652D]" />
            <span>CONSOLE D&apos;ADMINISTRATION PLATEFORME</span>
          </div>

          <div className="relative h-10 w-36 mx-auto mb-2">
            <Image
              src="/brand/01_horizontal_logos/djoonoo_logo_clair_transparent.svg"
              alt="djoonoo logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <p className="text-sm text-slate-400">
            Espace d&apos;administration technique et financière centralisé
          </p>
        </div>

        {/* Carte de Connexion */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-md">
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Super-Admin */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Adresse Email Administrateur
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="admin@djoonoo.com"
                  defaultValue="admin@djoonoo.com"
                  className="w-full pl-11 pr-4 py-3 bg-slate-800/60 border border-slate-700 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#C1652D] focus:ring-1 focus:ring-[#C1652D] transition-colors"
                />
              </div>
            </div>

            {/* Mot de Passe */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Mot de Passe Sécurisé
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  name="mot_de_passe"
                  required
                  placeholder="••••••••••••"
                  defaultValue="SuperAdmin2026!"
                  className="w-full pl-11 pr-4 py-3 bg-slate-800/60 border border-slate-700 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#C1652D] focus:ring-1 focus:ring-[#C1652D] transition-colors"
                />
              </div>
            </div>

            {/* Code TOTP 2FA (Obligatoire Super-Admin) */}
            <div className="pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Code 2FA (Application Authenticator)
                </label>
                <span className="text-[10px] text-[#C1652D] font-mono font-bold uppercase">
                  Obligatoire
                </span>
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-[#C1652D] absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  name="code_2fa"
                  required
                  maxLength={6}
                  placeholder="Ex: 123456"
                  className="w-full pl-11 pr-4 py-3 bg-slate-800/60 border border-slate-700 rounded-2xl text-base tracking-widest font-mono text-center text-white placeholder-slate-600 focus:outline-none focus:border-[#C1652D] focus:ring-1 focus:ring-[#C1652D] transition-colors"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                Clé de test TOTP : <span className="font-mono text-slate-400">Y74PATETHLNTQS6BWRRBIPIYOU6CRWED</span> (2fa.live)
              </p>
            </div>

            {/* Bouton de Soumission */}
            <button
              type="submit"
              disabled={isPending}
              className="w-full mt-2 py-3.5 px-4 bg-[#C1652D] hover:bg-[#A85324] text-white text-sm font-bold rounded-2xl transition-all shadow-lg shadow-[#C1652D]/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isPending ? (
                <span>Vérification sécurisée...</span>
              ) : (
                <>
                  <span>Accéder à la Console</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="mt-8 text-center text-xs text-slate-500">
          djoonoo &bull; Console Super-Admin isolée (Section 2 &amp; 6)
        </div>
      </div>
    </div>
  );
}
