import Link from "next/link";
import Image from "next/image";
import { Phone, Mail, MapPin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-[rgba(43,33,25,0.12)] bg-[#FAF6F1] pt-16 pb-12 text-[#2B2119]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-[rgba(43,33,25,0.08)]">
          {/* Identité de marque */}
          <div className="md:col-span-5 space-y-4">
            <Link href="/" className="inline-block">
              <div className="relative h-9 w-40">
                <Image
                  src="/brand/01_horizontal_logos/djoonoo_logo_clair_transparent.svg"
                  alt="djoonoo logo"
                  fill
                  className="object-contain object-left"
                />
              </div>
            </Link>
            <p className="text-sm text-[#6B5C52] max-w-sm leading-relaxed">
              Ta boutique, à portée de main — où que tu sois. SaaS de facturation & gestion de vente
              spécialement développé pour les commerçants du Bénin.
            </p>
            <div className="pt-2 text-xs text-[#6B5C52] space-y-1.5">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#C1652D] shrink-0" />
                <span>Ilôt 251, parcelle C&apos;, Cocotomey, Abomey-Calavi, Bénin</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-[#C1652D] shrink-0" />
                <span>+229 01 62 16 91 01</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-[#C1652D] shrink-0" />
                <span>rolandkoffi14@gmail.com</span>
              </div>
            </div>
          </div>

          {/* Navigation Rapide */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-[#2B2119]">
              Produit
            </h4>
            <ul className="space-y-2 text-sm text-[#6B5C52]">
              <li>
                <Link href="#fonctionnalites" className="hover:text-[#C1652D] transition-colors">
                  Gestion du stock
                </Link>
              </li>
              <li>
                <Link href="#demonstration" className="hover:text-[#C1652D] transition-colors">
                  Caisse & reçus numérotés
                </Link>
              </li>
              <li>
                <Link href="#demonstration" className="hover:text-[#C1652D] transition-colors">
                  Suivi des impayés
                </Link>
              </li>
              <li>
                <Link href="#forfaits" className="hover:text-[#C1652D] transition-colors">
                  Forfaits & tarifs en FCFA
                </Link>
              </li>
            </ul>
          </div>

          {/* Mentions & Légalité */}
          <div className="md:col-span-4 space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-[#2B2119]">
              Éditeur & Légalité
            </h4>
            <p className="text-xs text-[#6B5C52] leading-relaxed">
              Propriété exclusive de <strong>ETS. 2KR DIGITAL</strong>. Tous droits réservés.
              Conforme aux exigences commerciales et fiscales de la République du Bénin.
            </p>
            <div className="pt-2 flex flex-col gap-1.5 text-xs text-[#6B5C52]">
              <Link href="/cgu" className="hover:text-[#C1652D] transition-colors underline">
                Conditions Générales d&apos;Utilisation (CGU)
              </Link>
              <Link href="/confidentialite" className="hover:text-[#C1652D] transition-colors underline">
                Politique de Confidentialité & Protection des données
              </Link>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6B5C52]">
          <p>© 2026 djoonoo — Toujours en minuscules. Fait avec rigueur au Bénin.</p>
          <p className="font-semibold text-[#2B2119]">ETS. 2KR DIGITAL</p>
        </div>
      </div>
    </footer>
  );
}
