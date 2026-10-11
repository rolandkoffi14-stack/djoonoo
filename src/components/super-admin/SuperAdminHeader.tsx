"use client";

import React from "react";
import { usePathname } from "next/navigation";
import {
  Building2,
  CreditCard,
  Layers,
  Settings,
} from "lucide-react";

export default function SuperAdminHeader() {
  const pathname = usePathname();

  // Détermination dynamique de la section courante
  const getSectionInfo = () => {
    if (pathname === "/super-admin/abonnements") {
      return {
        title: "Paiements d'Abonnement",
        subtitle: "Validation et suivi des transactions",
        icon: CreditCard,
      };
    }
    if (pathname === "/super-admin/forfaits") {
      return {
        title: "Forfaits & Limites",
        subtitle: "Configuration des offres et quotas",
        icon: Layers,
      };
    }
    if (pathname === "/super-admin/parametres") {
      return {
        title: "Paramètres Plateforme",
        subtitle: "Configuration globale du système",
        icon: Settings,
      };
    }
    return {
      title: "Comptes Marchands",
      subtitle: "Supervision des entreprises",
      icon: Building2,
    };
  };

  const currentSection = getSectionInfo();
  const SectionIcon = currentSection.icon;

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/95 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-10 pl-16 md:pl-6 text-white shadow-xs">
      {/* Titre & Fil d'Ariane de la section */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700/60 flex items-center justify-center flex-shrink-0">
          <SectionIcon className="w-4 h-4 text-[#C1652D]" />
        </div>
        <div className="truncate">
          <h2 className="text-sm font-bold text-slate-100 truncate flex items-center gap-2">
            <span>{currentSection.title}</span>
          </h2>
          <p className="text-[11px] text-slate-400 hidden sm:block truncate">
            {currentSection.subtitle}
          </p>
        </div>
      </div>
    </header>
  );
}
