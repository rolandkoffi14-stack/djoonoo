import React from "react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSuperAdminSession } from "@/lib/super-admin-auth";
import { deconnexionSuperAdminAction } from "@/app/actions/super-admin";
import {
  ShieldAlert,
  Building2,
  CreditCard,
  Layers,
  Settings,
  LogOut,
  ShieldCheck,
} from "lucide-react";

export const metadata = {
  title: "Super-Admin Console — djoonoo",
  description: "Console centrale d'administration de la plateforme djoonoo",
};

export const dynamic = "force-dynamic";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSuperAdminSession();

  // Si non authentifié et pas sur la page de connexion, la protection est gérée
  // dans les pages ou via redirection immédiate ici pour le sous-arbre protégé.

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans">
      {/* Top Navbar Super-Admin */}
      {session && (
        <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            {/* Logo & Badge Plateforme */}
            <div className="flex items-center gap-6">
              <Link href="/super-admin" className="flex items-center gap-3">
                <div className="relative h-7 w-24">
                  <Image
                    src="/brand/01_horizontal_logos/djoonoo_logo_clair_transparent.svg"
                    alt="djoonoo logo"
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
                <span className="px-2 py-0.5 rounded-md bg-[#C1652D]/20 border border-[#C1652D]/40 text-[#C1652D] text-[10px] font-mono font-bold tracking-wider uppercase">
                  Super-Admin
                </span>
              </Link>

              {/* Navigation Tabs */}
              <nav className="hidden md:flex items-center gap-1 text-sm font-semibold">
                <Link
                  href="/super-admin"
                  className="px-3.5 py-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-colors flex items-center gap-2"
                >
                  <Building2 className="w-4 h-4 text-[#C1652D]" />
                  <span>Comptes Marchands</span>
                </Link>
                <Link
                  href="/super-admin/abonnements"
                  className="px-3.5 py-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-colors flex items-center gap-2"
                >
                  <CreditCard className="w-4 h-4 text-[#C1652D]" />
                  <span>Paiements d&apos;Abonnement</span>
                </Link>
                <Link
                  href="/super-admin/forfaits"
                  className="px-3.5 py-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-colors flex items-center gap-2"
                >
                  <Layers className="w-4 h-4 text-[#C1652D]" />
                  <span>Forfaits &amp; Limites</span>
                </Link>
                <Link
                  href="/super-admin/parametres"
                  className="px-3.5 py-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-colors flex items-center gap-2"
                >
                  <Settings className="w-4 h-4 text-[#C1652D]" />
                  <span>Paramètres Plateforme</span>
                </Link>
              </nav>
            </div>

            {/* Profil & Déconnexion */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-slate-200">{session.email}</span>
                <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 justify-end">
                  <ShieldCheck className="w-3 h-3 text-[#C1652D]" />
                  2FA Validée
                </span>
              </div>

              <form action={deconnexionSuperAdminAction}>
                <button
                  type="submit"
                  title="Déconnexion Super-Admin"
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors focus:outline-none"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </header>
      )}

      {/* Contenu de la Page */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
