"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Menu, X, ShieldCheck } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[rgba(43,33,25,0.08)] bg-[#FAF6F1]/90 backdrop-blur-md transition-all">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 h-20">
        {/* Logo officiel */}
        <Link href="/" className="flex items-center gap-3 group focus:outline-none">
          <div className="relative h-10 w-36 sm:w-44 transition-transform group-hover:scale-[1.02]">
            <Image
              src="/brand/01_horizontal_logos/djoonoo_logo_clair_transparent.svg"
              alt="djoonoo logo"
              fill
              className="object-contain object-left"
              priority
            />
          </div>
        </Link>

        {/* Navigation Desktop */}
        <nav className="hidden md:flex items-center gap-8 text-[15px] font-medium text-[#2B2119]">
          <Link
            href="#fonctionnalites"
            className="hover:text-[#C1652D] transition-colors py-2 focus-visible:ring-2 focus-visible:ring-[#C1652D]"
          >
            Fonctionnalités
          </Link>
          <Link
            href="#demonstration"
            className="hover:text-[#C1652D] transition-colors py-2 focus-visible:ring-2 focus-visible:ring-[#C1652D]"
          >
            Démo en direct
          </Link>
          <Link
            href="#forfaits"
            className="hover:text-[#C1652D] transition-colors py-2 focus-visible:ring-2 focus-visible:ring-[#C1652D]"
          >
            Forfaits
          </Link>
          <Link
            href="#securite"
            className="hover:text-[#C1652D] transition-colors py-2 focus-visible:ring-2 focus-visible:ring-[#C1652D]"
          >
            Sécurité & 2FA
          </Link>
        </nav>

        {/* Actions Desktop */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            href="/connexion"
            className="px-4 py-2.5 text-[15px] font-medium text-[#2B2119] hover:text-[#C1652D] transition-colors focus-visible:ring-2 focus-visible:ring-[#C1652D]"
          >
            Se connecter
          </Link>
          <Link
            href="/inscription"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#C1652D] px-5 py-2.5 text-[15px] font-semibold text-[#FAF6F1] shadow-[0_2px_4px_rgba(193,101,45,0.2)] hover:bg-[#A85422] active:scale-[0.98] transition-all min-h-[44px] focus-visible:ring-2 focus-visible:ring-[#C1652D]"
          >
            <span>Essai gratuit 14 jours</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Bouton Mobile Toggle */}
        <div className="flex md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex items-center justify-center p-2.5 rounded-lg text-[#2B2119] hover:bg-[#F3ECE2] transition-colors min-h-[44px] min-w-[44px] focus:outline-none focus:ring-2 focus:ring-[#C1652D]"
            aria-expanded={mobileMenuOpen}
            aria-label="Menu principal"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Menu Mobile */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[rgba(43,33,25,0.08)] bg-[#FAF6F1] px-4 pt-3 pb-6 space-y-3">
          <Link
            href="#fonctionnalites"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2.5 rounded-md text-base font-medium text-[#2B2119] hover:bg-[#F3ECE2] transition-colors"
          >
            Fonctionnalités
          </Link>
          <Link
            href="#demonstration"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2.5 rounded-md text-base font-medium text-[#2B2119] hover:bg-[#F3ECE2] transition-colors"
          >
            Démo en direct
          </Link>
          <Link
            href="#forfaits"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2.5 rounded-md text-base font-medium text-[#2B2119] hover:bg-[#F3ECE2] transition-colors"
          >
            Forfaits
          </Link>
          <Link
            href="#securite"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2.5 rounded-md text-base font-medium text-[#2B2119] hover:bg-[#F3ECE2] transition-colors"
          >
            Sécurité & 2FA
          </Link>
          <div className="pt-4 border-t border-[rgba(43,33,25,0.08)] flex flex-col gap-3">
            <Link
              href="/connexion"
              onClick={() => setMobileMenuOpen(false)}
              className="text-center py-2.5 rounded-lg border border-[rgba(43,33,25,0.15)] text-[15px] font-semibold text-[#2B2119] hover:bg-[#F3ECE2] min-h-[44px]"
            >
              Se connecter
            </Link>
            <Link
              href="/inscription"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 rounded-lg bg-[#C1652D] py-2.5 text-[15px] font-semibold text-[#FAF6F1] min-h-[44px]"
            >
              <span>Essai gratuit 14 jours</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
