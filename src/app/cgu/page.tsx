import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "djoonoo — Conditions Générales d'Utilisation (CGU)",
  description: "Conditions générales d'utilisation du service SaaS djoonoo par ETS. 2KR DIGITAL",
};

export default function CguPage() {
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
          <span className="px-3 py-1 rounded-full bg-[#C1652D]/10 text-[#C1652D] text-xs font-bold uppercase tracking-wider">
            Mentions Légales
          </span>
          <h1 className="text-3xl font-black text-[#2B2119] tracking-tight mt-3">
            Conditions Générales d&apos;Utilisation (CGU)
          </h1>
          <p className="text-xs text-[#8C7A6B] mt-1 font-mono">
            Dernière mise à jour : 26 septembre 2026 &bull; Conforme à la législation de la République du Bénin
          </p>
        </div>

        <section className="space-y-3 text-sm leading-relaxed text-[#57483E]">
          <h2 className="text-lg font-bold text-[#2B2119]">1. Éditeur de la plateforme</h2>
          <p>
            La plateforme logicielle <strong>djoonoo</strong> est éditée et exploitée par l&apos;entreprise{" "}
            <strong>ETS. 2KR DIGITAL</strong>, immatriculée en République du Bénin :
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs font-mono">
            <li><strong>Siège social</strong> : Ilôt 251, parcelle C&apos;, Cocotomey, Abomey-Calavi, Bénin</li>
            <li><strong>Téléphone</strong> : +229 01 62 16 91 01</li>
            <li><strong>Courriel de contact</strong> : rolandkoffi14@gmail.com</li>
          </ul>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-[#57483E]">
          <h2 className="text-lg font-bold text-[#2B2119]">2. Objet du service</h2>
          <p>
            djoonoo est un progiciel de gestion intégrée en mode SaaS (Software as a Service) dédié à la
            gestion des points de vente, des stocks, de la facturation et du suivi des créances impayées
            pour les commerçants exerçant sur le territoire de la République du Bénin.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-[#57483E]">
          <h2 className="text-lg font-bold text-[#2B2119]">3. Période d&apos;essai et forfaits d&apos;abonnement</h2>
          <p>
            Tout nouveau compte Patron bénéficie d&apos;une période d&apos;essai gratuite de 14 jours. À l&apos;issue de
            cette période, le maintien de l&apos;accès est conditionné à la souscription d&apos;un forfait mensuel
            (Solo, Réseau, Empire ou tout forfait personnalisé défini sur la plateforme).
          </p>
          <p>
            En cas de retard de règlement, un délai de grâce de 7 jours est accordé au commerçant (statut
            impayé) avant toute suspension administrative de l&apos;accès à son tableau de bord.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-[#57483E]">
          <h2 className="text-lg font-bold text-[#2B2119]">4. Responsabilité &amp; Sécurité des données</h2>
          <p>
            Les données de ventes, de stock et de clientèle sont strictement isolées par compte entreprise
            (Règle 5 multi-tenant). Chaque utilisateur est responsable de la conservation de ses identifiants
            et de l&apos;activation obligatoire de l&apos;authentification à double facteur (2FA TOTP) pour les rôles
            de Patron et Gérant.
          </p>
        </section>
      </main>

      <footer className="border-t border-[#E5DACF] py-6 text-center text-xs text-[#8C7A6B]">
        djoonoo &bull; ETS. 2KR DIGITAL &bull; Tous droits réservés
      </footer>
    </div>
  );
}
