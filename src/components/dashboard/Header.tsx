"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Store,
  Clock,
  Sparkles,
  Plus,
  ChevronDown,
} from "lucide-react";

interface HeaderProps {
  boutiques: { id: string; code: string; nom: string }[];
  boutiqueActiveId?: string;
  statutAbonnement: string;
  joursEssaiRestants?: number;
  userRole?: string;
}

export default function Header({
  boutiques,
  boutiqueActiveId,
  statutAbonnement,
  joursEssaiRestants = 14,
  userRole = "patron",
}: HeaderProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  function handleBoutiqueChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newBoutiqueId = e.target.value;
    // Mise à jour du cookie de boutique active
    document.cookie = `djoonoo_active_boutique=${newBoutiqueId}; path=/; max-age=2592000; SameSite=Lax`;
    startTransition(() => {
      router.refresh();
    });
  }

  const activeBoutique =
    boutiques.find((b) => b.id === boutiqueActiveId) || boutiques[0];

  // Le changement de boutique est strictement réservé au Patron possédant plusieurs boutiques
  const peutChangerBoutique = userRole === "patron" && boutiques.length > 1;

  return (
    <header className="h-16 border-b border-[#E5DACF] bg-[#FAF6F1]/95 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-10 pl-16 md:pl-6">
      {/* Sélecteur ou Badge de Boutique */}
      <div className="flex items-center gap-3">
        {peutChangerBoutique ? (
          <div className="relative inline-flex items-center">
            <Store className="w-4 h-4 text-[#C1652D] absolute left-3 pointer-events-none" />
            <select
              value={activeBoutique?.id || ""}
              onChange={handleBoutiqueChange}
              className="pl-9 pr-8 py-1.5 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] font-bold text-xs text-[#2B2119] focus:outline-none focus:ring-2 focus:ring-[#C1652D]/30 focus:border-[#C1652D] appearance-none cursor-pointer"
            >
              {boutiques.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} — {b.nom}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 pointer-events-none" />
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#E5DACF]/40 border border-[#E5DACF] text-xs">
            <Store className="w-3.5 h-3.5 text-[#C1652D]" />
            <span className="font-mono font-bold text-[#2B2119]">
              {activeBoutique?.code || "B01"}
            </span>
            <span className="text-[#6D5D52] truncate max-w-[140px]">
              {activeBoutique?.nom || "Boutique Principale"}
            </span>
          </div>
        )}
      </div>

      {/* Droite : Abonnement & Action rapide */}
      <div className="flex items-center gap-3">
        {/* Badge Statut Abonnement */}
        {statutAbonnement === "essai" ? (
          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C1652D]/10 text-[#C1652D] text-xs font-semibold">
            <Clock className="w-3.5 h-3.5" />
            <span>Essai gratuit ({joursEssaiRestants}j restants)</span>
          </div>
        ) : statutAbonnement === "actif" ? (
          <div className="hidden sm:inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
            <span>Abonnement Actif</span>
          </div>
        ) : (
          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-semibold">
            <Clock className="w-3.5 h-3.5 text-orange-600" />
            <span>À régulariser</span>
          </div>
        )}

        {/* Bouton Nouvelle Vente */}
        <Link
          href="/dashboard/caisse"
          className="px-3.5 py-1.5 rounded-xl bg-[#C1652D] text-[#FAF6F1] font-bold text-xs hover:bg-[#a95524] transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Vente</span>
        </Link>
      </div>
    </header>
  );
}
