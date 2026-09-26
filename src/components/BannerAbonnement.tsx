"use client";

import React from "react";
import Link from "next/link";
import { AlertCircle, Clock, ArrowRight, ShieldAlert } from "lucide-react";

interface BannerAbonnementProps {
  statutAbonnement: string;
  joursGraceRestants?: number;
  userRole: string;
}

export default function BannerAbonnement({
  statutAbonnement,
  joursGraceRestants = 0,
  userRole,
}: BannerAbonnementProps) {
  const isPatron = userRole === "patron";

  if (statutAbonnement === "expire") {
    return (
      <div className="bg-[#C1652D] text-white px-6 py-3.5 shadow-sm border-b border-[#A05324]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="p-1.5 bg-white/20 rounded-full shrink-0">
              <ShieldAlert className="w-5 h-5 text-white" />
            </span>
            <div className="text-sm">
              <p className="font-semibold">
                Mode lecture seule — Abonnement djoonoo expiré
              </p>
              <p className="text-white/90 text-xs sm:text-sm">
                Tes données restent consultables, mais les ventes, ajouts et modifications de stock sont bloqués.
              </p>
            </div>
          </div>
          {isPatron ? (
            <Link
              href="/dashboard/abonnements"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#C1652D] font-medium text-xs sm:text-sm rounded-lg hover:bg-[#FAF6F1] transition shadow-sm shrink-0"
            >
              <span>Choisir un forfait & réactiver</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <span className="text-xs text-white/90 italic bg-white/10 px-3 py-1.5 rounded">
              Contacte ton Patron pour renouveler l'abonnement
            </span>
          )}
        </div>
      </div>
    );
  }

  if (statutAbonnement === "impaye") {
    return (
      <div className="bg-[#F59E0B] text-white px-6 py-3.5 shadow-sm border-b border-[#D97706]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="p-1.5 bg-white/20 rounded-full shrink-0">
              <Clock className="w-5 h-5 text-white" />
            </span>
            <div className="text-sm">
              <p className="font-semibold">
                Délai de grâce en cours — Échéance d'abonnement dépassée
              </p>
              <p className="text-white/90 text-xs sm:text-sm">
                {joursGraceRestants > 0
                  ? `Il te reste ${joursGraceRestants} jour(s) de grâce pour régulariser ton abonnement avant le passage en lecture seule.`
                  : "Ton délai de grâce arrive à son terme aujourd'hui. Régularise ton abonnement pour éviter le blocage."}
              </p>
            </div>
          </div>
          {isPatron && (
            <Link
              href="/dashboard/abonnements"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#D97706] font-medium text-xs sm:text-sm rounded-lg hover:bg-amber-50 transition shadow-sm shrink-0"
            >
              <span>Régulariser par MoMo/Carte</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    );
  }

  return null;
}
