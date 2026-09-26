import React from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCurrentSession } from "@/lib/auth";
import { prisma, getScopedPrisma } from "@/lib/prisma";
import Sidebar from "@/components/dashboard/Sidebar";
import Header from "@/components/dashboard/Header";
import BannerAbonnement from "@/components/BannerAbonnement";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/connexion");
  }

  // Récupération des informations du compte et des boutiques
  const scoped = getScopedPrisma(session.compteId);
  const compte = await prisma.comptes.findUnique({
    where: { id: session.compteId },
    select: {
      code: true,
      nom_entreprise: true,
      statut_abonnement: true,
      date_fin_essai: true,
      factures_abonnement: {
        where: { statut: "en_attente" },
        orderBy: { date_echeance: "asc" },
        take: 1,
      },
    },
  });

  const boutiques = await scoped.boutiques.findMany({
    orderBy: { code: "asc" },
    select: {
      id: true,
      code: true,
      nom: true,
      statut: true,
    },
  });

  // Boutique active (depuis le cookie ou la première boutique)
  const cookieStore = await cookies();
  const activeBoutiqueCookie = cookieStore.get("djoonoo_active_boutique")?.value;
  const activeBoutique =
    boutiques.find((b) => b.id === activeBoutiqueCookie) ||
    boutiques.find((b) => b.id === session.boutiqueId) ||
    boutiques[0];

  // Calcul des jours d'essai restants
  let joursEssaiRestants = 14;
  if (compte?.date_fin_essai) {
    const diffTime = new Date(compte.date_fin_essai).getTime() - Date.now();
    joursEssaiRestants = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  // Calcul des jours de grâce restants en cas d'impayé
  let joursGraceRestants = 0;
  if (compte?.statut_abonnement === "impaye" && compte.factures_abonnement[0]?.date_echeance) {
    const diff = new Date(compte.factures_abonnement[0].date_echeance).getTime() - Date.now();
    joursGraceRestants = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  return (
    <div className="min-h-screen bg-[#FAF6F1] flex">
      {/* Sidebar latérale adaptative */}
      <Sidebar
        userRole={session.role}
        userName={session.nom}
        userEmail={session.email}
        compteCode={compte?.code || "DJO"}
        boutiqueCode={activeBoutique?.code}
      />

      {/* Zone de contenu principale */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          boutiques={boutiques}
          boutiqueActiveId={activeBoutique?.id}
          statutAbonnement={compte?.statut_abonnement || "essai"}
          joursEssaiRestants={joursEssaiRestants}
        />

        <BannerAbonnement
          statutAbonnement={compte?.statut_abonnement || "essai"}
          joursGraceRestants={joursGraceRestants}
          userRole={session.role}
        />

        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
