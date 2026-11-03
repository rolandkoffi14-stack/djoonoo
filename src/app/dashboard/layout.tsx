import React from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCurrentSession } from "@/lib/auth";
import { prisma, getScopedPrisma } from "@/lib/prisma";
import Sidebar from "@/components/dashboard/Sidebar";
import Header from "@/components/dashboard/Header";
import RealtimeListener from "@/components/realtime/RealtimeListener";

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
    },
  });

  // 1. Récupération des boutiques accessibles selon le rôle
  let boutiques: { id: string; code: string; nom: string; statut: string }[] = [];

  if (session.role === "patron") {
    boutiques = await scoped.boutiques.findMany({
      orderBy: { code: "asc" },
      select: {
        id: true,
        code: true,
        nom: true,
        statut: true,
      },
    });
  } else if (session.boutiqueId) {
    const b = await scoped.boutiques.findUnique({
      where: { id: session.boutiqueId },
      select: {
        id: true,
        code: true,
        nom: true,
        statut: true,
      },
    });
    if (b) boutiques = [b];
  }

  // 2. Détermination stricte de la boutique active :
  // Le Patron peut naviguer librement via le cookie ; le Gérant et le Vendeur sont verrouillés sur leur boutique
  const cookieStore = await cookies();
  const activeBoutiqueCookie = cookieStore.get("djoonoo_active_boutique")?.value;
  const activeBoutique =
    session.role === "patron"
      ? (boutiques.find((b) => b.id === activeBoutiqueCookie) || boutiques[0])
      : (boutiques.find((b) => b.id === session.boutiqueId) || boutiques[0]);

  return (
    <div className="min-h-screen bg-[#FAF6F1] flex">
      <RealtimeListener />
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
          statutAbonnement={compte?.statut_abonnement || "actif"}
          userRole={session.role}
        />

        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
