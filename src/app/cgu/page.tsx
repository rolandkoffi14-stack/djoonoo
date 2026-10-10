import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { siteConfig } from "@/config/site";

export const metadata = {
  title: `${siteConfig.app.nom} — Conditions Générales d'Utilisation (CGU)`,
  description: `Conditions générales d'utilisation du service SaaS ${siteConfig.app.nom} par ${siteConfig.entreprise.nom}`,
};

export default function CguPage() {
  return (
    <div className="min-h-screen bg-[#FAF6F1] text-[#2B2119] flex flex-col">
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
            Dernière mise à jour : {siteConfig.entreprise.dateDerniereMajMentions} &bull; Conforme à la législation de la {siteConfig.entreprise.pays}
          </p>
        </div>

        <section className="space-y-3 text-sm leading-relaxed text-[#57483E]">
          <h2 className="text-lg font-bold text-[#2B2119]">1. Éditeur de la plateforme</h2>
          <p>
            La plateforme logicielle <strong>{siteConfig.app.nom}</strong> est éditée et exploitée par l&apos;entreprise{" "}
            <strong>{siteConfig.entreprise.nom}</strong>, immatriculée en {siteConfig.entreprise.pays} :
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs font-mono">
            <li><strong>Siège social</strong> : {siteConfig.entreprise.adresseSiege}</li>
            <li><strong>Téléphone</strong> : {siteConfig.entreprise.telephone}</li>
            <li><strong>Courriel de contact</strong> : {siteConfig.entreprise.emailContact}</li>
            {siteConfig.entreprise.ifu && (
              <li><strong>IFU</strong> : {siteConfig.entreprise.ifu}</li>
            )}
            {siteConfig.entreprise.rccm && (
              <li><strong>RCCM</strong> : {siteConfig.entreprise.rccm}</li>
            )}
          </ul>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-[#57483E]">
          <h2 className="text-lg font-bold text-[#2B2119]">2. Objet du service</h2>
          <p>
            {siteConfig.app.nom} est un progiciel de gestion intégrée en mode SaaS (Software as a Service) dédié à la
            gestion des points de vente, des stocks, de la facturation et du suivi des créances impayées
            pour les commerçants exerçant sur le territoire de la {siteConfig.entreprise.pays}.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-[#57483E]">
          <h2 className="text-lg font-bold text-[#2B2119]">3. Période d&apos;essai et forfaits d&apos;abonnement</h2>
          <p>
            Tout nouveau compte Patron bénéficie d&apos;une période d&apos;essai gratuite configurable sur la plateforme.
            À l&apos;issue de cette période, le maintien de l&apos;accès est conditionné à la souscription d&apos;un forfait
            selon la grille tarifaire active.
          </p>
          <p>
            En cas de retard de règlement, un délai de grâce est accordé au commerçant (statut
            impayé) avant tout basculement en mode lecture seule ou suspension administrative.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-[#57483E]">
          <h2 className="text-lg font-bold text-[#2B2119]">4. Responsabilité &amp; Sécurité des données</h2>
          <p>
            Les données de ventes, de stock et de clientèle sont strictement isolées par compte entreprise
            (Règle multi-tenant). Chaque utilisateur est responsable de la conservation de ses identifiants
            et de l&apos;activation obligatoire de l&apos;authentification à double facteur (2FA TOTP) pour les rôles
            de Patron et Gérant.
          </p>
        </section>
      </main>

      <footer className="border-t border-[#E5DACF] py-6 text-center text-xs text-[#8C7A6B]">
        {siteConfig.app.nom} &bull; {siteConfig.entreprise.nom} &bull; Tous droits réservés
      </footer>
    </div>
  );
}
