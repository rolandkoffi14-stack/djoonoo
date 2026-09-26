"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { RoleUtilisateur } from "@prisma/client";
import { deconnexionAction } from "@/app/actions/auth";
import {
  LayoutDashboard,
  Calculator,
  Store,
  Package,
  Receipt,
  Users,
  UserCheck,
  CreditCard,
  Settings,
  Clock,
  LogOut,
  ChevronRight,
  Menu,
  X,
  Building2,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

interface SidebarProps {
  userRole: RoleUtilisateur;
  userName: string;
  userEmail: string;
  compteCode: string;
  boutiqueCode?: string;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export default function Sidebar({
  userRole,
  userName,
  userEmail,
  compteCode,
  boutiqueCode,
}: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Éléments de navigation conditionnés par le rôle (Section 2)
  const getNavItems = (): NavItem[] => {
    switch (userRole) {
      case "patron":
        return [
          { label: "Vue d'ensemble", href: "/dashboard", icon: LayoutDashboard },
          { label: "Caisse POS", href: "/dashboard/caisse", icon: Calculator },
          { label: "Boutiques", href: "/dashboard/boutiques", icon: Store },
          { label: "Produits & Stock", href: "/dashboard/produits", icon: Package },
          { label: "Ventes & Factures", href: "/dashboard/ventes", icon: Receipt },
          { label: "Clients", href: "/dashboard/clients", icon: Users },
          { label: "Rapports & Finances", href: "/dashboard/rapports", icon: TrendingUp },
          { label: "Équipe & Rôles", href: "/dashboard/equipe", icon: UserCheck },
          { label: "Journal d'Audit", href: "/dashboard/audit", icon: ShieldCheck },
          { label: "Abonnement", href: "/dashboard/abonnement", icon: CreditCard },
          { label: "Paramètres", href: "/dashboard/parametres", icon: Settings },
        ];
      case "gerant":
        return [
          { label: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
          { label: "Caisse POS", href: "/dashboard/caisse", icon: Calculator },
          { label: "Stock & Réappro", href: "/dashboard/produits", icon: Package },
          { label: "Ventes boutique", href: "/dashboard/ventes", icon: Receipt },
          { label: "Clients", href: "/dashboard/clients", icon: Users },
          { label: "Rapports Financiers", href: "/dashboard/rapports", icon: TrendingUp },
          { label: "Vendeurs", href: "/dashboard/equipe", icon: UserCheck },
        ];
      case "vendeur":
      default:
        return [
          { label: "Caisse POS", href: "/dashboard/caisse", icon: Calculator },
          { label: "Mes Ventes", href: "/dashboard/ventes", icon: Receipt },
          { label: "Suivi impayés", href: "/dashboard/ventes/impayes", icon: Clock },
          { label: "Stock disponible", href: "/dashboard/produits", icon: Package },
        ];
    }
  };

  const navItems = getNavItems();

  const getRoleBadge = (role: RoleUtilisateur) => {
    switch (role) {
      case "patron":
        return { label: "Patron", color: "bg-[#C1652D]/15 text-[#C1652D] border-[#C1652D]/30" };
      case "gerant":
        return { label: "Gérant", color: "bg-blue-100 text-blue-800 border-blue-200" };
      case "vendeur":
        return { label: "Vendeur", color: "bg-amber-100 text-amber-800 border-amber-200" };
    }
  };

  const roleInfo = getRoleBadge(userRole);

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#FAF6F1] border-r border-[#E5DACF] text-[#2B2119]">
      {/* Header Logo */}
      <div className="p-5 border-b border-[#E5DACF] flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-3 focus:outline-none">
          <div className="relative h-8 w-28 transition-transform hover:scale-[1.02]">
            <Image
              src="/brand/01_horizontal_logos/djoonoo_logo_clair_transparent.svg"
              alt="djoonoo logo"
              fill
              className="object-contain object-left"
              priority
            />
          </div>
        </Link>

        {/* Bouton fermeture sur mobile */}
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden p-1.5 rounded-lg text-[#6D5D52] hover:bg-[#E5DACF]/50"
          aria-label="Fermer le menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Badge Contexte Entreprise / Boutique */}
      <div className="px-4 py-3 mx-4 my-3 rounded-xl bg-[#E5DACF]/40 border border-[#E5DACF] text-xs">
        <div className="flex items-center justify-between font-mono font-bold text-[#2B2119]">
          <span className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-[#C1652D]" />
            {compteCode}
          </span>
          {boutiqueCode && (
            <span className="px-2 py-0.5 rounded-md bg-[#FAF6F1] border border-[#E5DACF] text-[11px]">
              {boutiqueCode}
            </span>
          )}
        </div>
      </div>

      {/* Navigation principale */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all group ${
                isActive
                  ? "bg-[#C1652D] text-[#FAF6F1] shadow-sm shadow-[#C1652D]/20"
                  : "text-[#6D5D52] hover:bg-[#E5DACF]/50 hover:text-[#2B2119]"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? "text-[#FAF6F1]" : "text-[#8C7A6B] group-hover:text-[#2B2119]"
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-[#FAF6F1]/80" />}
            </Link>
          );
        })}
      </nav>

      {/* Pied de Sidebar : Utilisateur & Déconnexion */}
      <div className="p-4 border-t border-[#E5DACF] bg-[#FAF6F1]/80">
        <div className="flex items-center justify-between gap-2">
          <div className="truncate flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-bold text-sm text-[#2B2119] truncate">{userName}</span>
              <span
                className={`text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded border ${roleInfo.color}`}
              >
                {roleInfo.label}
              </span>
            </div>
            <div className="text-xs text-[#8C7A6B] truncate">{userEmail}</div>
          </div>

          <form action={deconnexionAction}>
            <button
              type="submit"
              title="Se déconnecter"
              className="p-2 rounded-xl border border-[#E5DACF] hover:bg-[#E5DACF]/60 text-[#8C7A6B] hover:text-[#2B2119] transition-colors focus:outline-none"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
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
          className="p-2 rounded-xl bg-[#FAF6F1] border border-[#E5DACF] text-[#2B2119] shadow-sm flex items-center justify-center focus:outline-none"
          aria-label="Ouvrir le menu"
        >
          <Menu className="w-5 h-5 text-[#2B2119]" />
        </button>
      </div>

      {/* Drawer Mobile Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-72 max-w-[80vw] h-full shadow-xl z-10">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Sidebar Desktop Fixe */}
      <aside className="hidden md:block w-64 h-screen sticky top-0 flex-shrink-0 z-20">
        {sidebarContent}
      </aside>
    </>
  );
}
