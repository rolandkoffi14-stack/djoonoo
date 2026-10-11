"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { deconnexionSuperAdminAction } from "@/app/actions/super-admin";
import {
  Building2,
  CreditCard,
  Layers,
  Settings,
  LogOut,
  ShieldCheck,
  ChevronRight,
  Menu,
  X,
  LayoutDashboard,
} from "lucide-react";

interface SuperAdminSidebarProps {
  adminEmail: string;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export default function SuperAdminSidebar({ adminEmail }: SuperAdminSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showModalDeconnexion, setShowModalDeconnexion] = useState(false);

  const navItems: NavItem[] = [
    { label: "Comptes Marchands", href: "/super-admin", icon: Building2 },
    { label: "Paiements d'Abonnement", href: "/super-admin/abonnements", icon: CreditCard },
    { label: "Forfaits & Limites", href: "/super-admin/forfaits", icon: Layers },
    { label: "Paramètres Plateforme", href: "/super-admin/parametres", icon: Settings },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-950 border-r border-slate-800 text-slate-200">
      {/* Header Logo */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <Link href="/super-admin" className="flex items-center gap-3 focus:outline-none">
          <div className="relative h-7 w-26 transition-transform hover:scale-[1.02]">
            <Image
              src="/brand/01_horizontal_logos/djoonoo_logo_sombre_transparent.svg"
              alt="djoonoo logo"
              fill
              className="object-contain object-left"
              priority
            />
          </div>
          <span className="px-2 py-0.5 rounded-md bg-[#C1652D]/20 border border-[#C1652D]/40 text-[#C1652D] text-[10px] font-mono font-bold tracking-wider uppercase">
            Super-Admin
          </span>
        </Link>

        {/* Bouton fermeture sur mobile */}
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Fermer le menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* En-tête de navigation : Tableau de bord */}
      <div className="px-4 py-2.5 mx-4 my-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
        <div className="flex items-center gap-2.5 font-bold text-slate-200">
          <LayoutDashboard className="w-4 h-4 text-[#C1652D]" />
          <span className="tracking-wide">Tableau de bord</span>
        </div>
      </div>

      {/* Navigation principale */}
      <nav className="flex-1 px-3 py-2 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/super-admin"
              ? pathname === "/super-admin"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all group ${
                isActive
                  ? "bg-[#C1652D] text-white shadow-sm shadow-[#C1652D]/25"
                  : "text-slate-400 hover:bg-slate-900 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-4 h-4 flex-shrink-0 transition-colors ${
                    isActive ? "text-white" : "text-[#C1652D] group-hover:text-white"
                  }`}
                />
                <span className="whitespace-nowrap">{item.label}</span>
              </div>
              {isActive && (
                <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 text-white/80 ml-2" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Pied de Sidebar : Utilisateur & Déconnexion */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/90">
        <div className="flex items-center justify-between gap-2">
          <div className="truncate flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-bold text-sm text-slate-200 truncate">{adminEmail}</span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-[#C1652D]" />
              2FA Validée
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowModalDeconnexion(true)}
            title="Se déconnecter"
            className="p-2 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors focus:outline-none cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Bouton Hamburger Mobile Flottant */}
      <div className="md:hidden fixed top-3 left-4 z-40">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 shadow-sm flex items-center justify-center focus:outline-none hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Ouvrir le menu"
        >
          <Menu className="w-5 h-5 text-slate-200" />
        </button>
      </div>

      {/* Drawer Mobile Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Sidebar Desktop Fixe */}
      <aside className="hidden md:block w-72 h-screen sticky top-0 flex-shrink-0 z-20">
        {sidebarContent}
      </aside>

      {/* Modale de Confirmation de Déconnexion */}
      {showModalDeconnexion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-[#C1652D]/15 text-[#C1652D] flex items-center justify-center mx-auto border border-[#C1652D]/30">
              <LogOut className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-extrabold text-slate-100">
                Confirmer la déconnexion
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Souhaites-tu fermer ta session Super-Admin sur la console centrale djoonoo ?
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowModalDeconnexion(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Annuler
              </button>

              <form action={deconnexionSuperAdminAction} className="flex-1">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-[#C1652D] hover:bg-[#a95524] text-white text-xs font-bold transition-colors shadow-sm cursor-pointer"
                >
                  Se déconnecter
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
