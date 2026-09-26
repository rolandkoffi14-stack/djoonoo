"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "bg-[#FAF6F1]/95 backdrop-blur-md border-b border-[rgba(43,33,25,0.08)] shadow-[0_2px_12px_rgba(43,33,25,0.04)]"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 h-20">
        {/* Logo djoonoo */}
        <Link href="/" className="flex items-center gap-3 focus:outline-none">
          <div className="relative h-9 w-36 sm:w-40">
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
            className="hover:text-[#C1652D] transition-colors py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1652D] rounded"
          >
            Fonctionnalités
          </Link>
          <Link
            href="#demo"
            className="hover:text-[#C1652D] transition-colors py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1652D] rounded"
          >
            Démo
          </Link>
          <Link
            href="#tarifs"
            className="hover:text-[#C1652D] transition-colors py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1652D] rounded"
          >
            Tarifs
          </Link>
          <Link
            href="/connexion"
            className="text-[#2B2119]/80 hover:text-[#C1652D] transition-colors py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1652D] rounded"
          >
            Se connecter
          </Link>
        </nav>

        {/* Action Desktop */}
        <div className="hidden md:flex items-center">
          <Link
            href="/inscription"
            className="inline-flex items-center justify-center rounded-lg bg-[#C1652D] px-5 py-2.5 text-sm font-semibold text-[#FAF6F1] shadow-[0_2px_8px_rgba(193,101,45,0.2)] hover:bg-[#A85422] active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1652D]"
          >
            Essai gratuit
          </Link>
        </div>

        {/* Bouton Mobile */}
        <div className="flex md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-[#2B2119] hover:bg-[rgba(43,33,25,0.06)] transition-colors focus:outline-none focus:ring-2 focus:ring-[#C1652D]"
            aria-label="Ouvrir le menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Menu Mobile */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[rgba(43,33,25,0.08)] bg-[#FAF6F1] px-4 pt-2 pb-6 space-y-3">
          <div className="flex flex-col space-y-2">
            <Link
              href="#fonctionnalites"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-base font-medium text-[#2B2119] hover:bg-[rgba(43,33,25,0.05)] hover:text-[#C1652D] transition-colors"
            >
              Fonctionnalités
            </Link>
            <Link
              href="#demo"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-base font-medium text-[#2B2119] hover:bg-[rgba(43,33,25,0.05)] hover:text-[#C1652D] transition-colors"
            >
              Démo
            </Link>
            <Link
              href="#tarifs"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-base font-medium text-[#2B2119] hover:bg-[rgba(43,33,25,0.05)] hover:text-[#C1652D] transition-colors"
            >
              Tarifs
            </Link>
            <Link
              href="/connexion"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-base font-medium text-[#2B2119]/80 hover:bg-[rgba(43,33,25,0.05)] hover:text-[#C1652D] transition-colors"
            >
              Se connecter
            </Link>
          </div>
          <div className="pt-2">
            <Link
              href="/inscription"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full inline-flex items-center justify-center rounded-lg bg-[#C1652D] px-5 py-3 text-base font-semibold text-[#FAF6F1] shadow-[0_2px_8px_rgba(193,101,45,0.2)] hover:bg-[#A85422] transition-colors"
            >
              Essai gratuit
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
