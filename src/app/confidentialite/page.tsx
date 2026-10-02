import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ShieldCheck, Lock } from "lucide-react";

export const metadata = {
  title: "djoonoo — Politique de Confidentialité & Protection des Données",
  description: "Politique de confidentialité et protection des données commerciales de djoonoo par ETS. 2KR DIGITAL",
};

export default function ConfidentialitePage() {
  return (
    <div className="min-h-screen bg-[#FAF6F1] text-[#2B2119] flex flex-col">
      <header className="border-b border-[#E5DACF] bg-[#FAF6F1] py-4 px-6 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="inline-block">
            <div className="relative h-8 w-32">
              <Image
                src="/brand/01_horizontal_logos/djoonoo_logo_clair_transparent.svg"
                alt="djoonoo logo"
                fill
                className="object-contain"
                priority
              />
            </div>
          </Link>
          <Link
            href="/"
            className="text-xs font-bold text-[#6D5D52] hover:text-[#C1652D] flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour à l&apos;accueil</span>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 flex-1 space-y-8">
        <div>
          <span className="px-3 py-1 rounded-full bg-[#C1652D]/10 text-[#C1652D] border border-[#C1652D]/20 text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" />
            <span>Protection des Données</span>
          </span>
          <h1 className="text-3xl font-black text-[#2B2119] tracking-tight mt-3">
            Politique de Confidentialité
          </h1>
          <p className="text-xs text-[#8C7A6B] mt-1 font-mono">
            Édité par ETS. 2KR DIGITAL &bull; République du Bénin
          </p>
        </div>

        <section className="space-y-3 text-sm leading-relaxed text-[#57483E]">
          <h2 className="text-lg font-bold text-[#2B2119]">1. Collecte et finalité des données</h2>
          <p>
            Dans le cadre de l&apos;utilisation de <strong>djoonoo</strong>, nous collectons exclusivement les données
            strictement nécessaires à l&apos;exploitation du progiciel :
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li>Identifiants de connexion (adresse email, mot de passe chiffré par algorithme bcrypt).</li>
            <li>Coordonnées de l&apos;entreprise (Raison sociale, IFU, RCCM, numéro de téléphone, ville).</li>
            <li>Données d&apos;activité commerciale (ventes, stocks, inventaires, coordonnées téléphoniques des clients).</li>
          </ul>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-[#57483E]">
          <h2 className="text-lg font-bold text-[#2B2119]">2. Étanchéité Multi-Tenant &amp; Règle 5</h2>
          <p>
            Chaque entreprise dispose d&apos;un espace rigoureusement isolé. Aucune boutique ni aucun employé d&apos;une
            entreprise tierce ne peut accéder aux chiffres d&apos;affaires, aux créances ou aux stocks d&apos;une autre
            entreprise. Ce cloisonnement est garanti au niveau architectural et applicatif (Règle 5).
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-[#57483E]">
          <h2 className="text-lg font-bold text-[#2B2119]">3. Sécurité et Authentification 2FA</h2>
          <p>
            Pour prévenir toute usurpation d&apos;identité et protéger les finances de nos commerçants,
            l&apos;authentification à double facteur (TOTP via Google Authenticator ou application compatible)
            est rendue obligatoire pour les Patrons et les Gérants de boutique.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-[#57483E]">
          <h2 className="text-lg font-bold text-[#2B2119]">4. Contact &amp; Exercice de vos droits</h2>
          <p>
            Pour toute demande relative à vos données ou à la suppression de votre compte, contactez l&apos;équipe
            support par courriel à <strong>rolandkoffi14@gmail.com</strong> ou par téléphone au{" "}
            <strong>+229 01 62 16 91 01</strong>.
          </p>
        </section>
      </main>

      <footer className="border-t border-[#E5DACF] py-6 text-center text-xs text-[#8C7A6B]">
        djoonoo &bull; ETS. 2KR DIGITAL &bull; Tous droits réservés
      </footer>
    </div>
  );
}
