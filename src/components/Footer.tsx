import Link from "next/link";
import Image from "next/image";
import { Phone, Mail, MapPin } from "lucide-react";
import { siteConfig } from "@/config/site";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-[rgba(43,33,25,0.12)] bg-[#FAF6F1] pt-16 pb-12 text-[#2B2119]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-[rgba(43,33,25,0.08)]">
          {/* Colonne 1 : Identité de marque */}
          <div className="md:col-span-5 space-y-4">
            <Link href="/" className="inline-block focus:outline-none">
              <div className="relative h-9 w-40">
                <Image
                  src={siteConfig.app.logos.transparentClair}
                  alt={siteConfig.app.nom}
                  fill
                  className="object-contain object-left"
                />
              </div>
            </Link>
            <p className="text-sm text-[#6B5C52] max-w-sm leading-relaxed">
              {siteConfig.app.slogan} {siteConfig.app.descriptionCourte}
            </p>
            <div className="pt-2 text-xs text-[#6B5C52] space-y-1.5">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#C1652D] shrink-0" />
                <span>{siteConfig.entreprise.adresseSiege}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-[#C1652D] shrink-0" />
                <a href={siteConfig.entreprise.telephoneHref} className="hover:text-[#C1652D] transition-colors">
                  {siteConfig.entreprise.telephone}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-[#C1652D] shrink-0" />
                <a href={`mailto:${siteConfig.entreprise.emailContact}`} className="hover:text-[#C1652D] transition-colors">
                  {siteConfig.entreprise.emailContact}
                </a>
              </div>
            </div>
          </div>

          {/* Colonne 2 : Liens Produit */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-[#2B2119]">
              Produit
            </h4>
            <ul className="space-y-2 text-sm text-[#6B5C52]">
              <li>
                <Link href="#fonctionnalites" className="hover:text-[#C1652D] transition-colors">
                  Fonctionnalités
                </Link>
              </li>
              <li>
                <Link href="#demo" className="hover:text-[#C1652D] transition-colors">
                  Démo en direct
                </Link>
              </li>
              <li>
                <Link href="#tarifs" className="hover:text-[#C1652D] transition-colors">
                  Tarifs
                </Link>
              </li>
              <li>
                <Link href="/connexion" className="hover:text-[#C1652D] transition-colors">
                  Se connecter
                </Link>
              </li>
            </ul>
          </div>

          {/* Colonne 3 : Éditeur & Légalité */}
          <div className="md:col-span-4 space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-[#2B2119]">
              Éditeur & Légal
            </h4>
            <p className="text-xs text-[#6B5C52] leading-relaxed">
              Édité par <strong className="text-[#2B2119]">{siteConfig.entreprise.nom}</strong>.
            </p>
            <div className="pt-2 flex flex-col gap-2 text-xs text-[#6B5C52]">
              <Link href="/cgu" className="hover:text-[#C1652D] transition-colors underline">
                Conditions Générales d&apos;Utilisation (CGU)
              </Link>
              <Link href="/confidentialite" className="hover:text-[#C1652D] transition-colors underline">
                Politique de Confidentialité
              </Link>
            </div>
          </div>
        </div>

        {/* Ligne du bas : Copyright dynamique */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6B5C52]">
          <p>© {currentYear} {siteConfig.app.nom} — Tous droits réservés.</p>
          <p className="font-semibold text-[#2B2119]">{siteConfig.entreprise.nom}</p>
        </div>
      </div>
    </footer>
  );
}
