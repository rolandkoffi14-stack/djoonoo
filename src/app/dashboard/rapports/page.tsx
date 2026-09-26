import React from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCurrentSession } from "@/lib/auth";
import { getScopedPrisma } from "@/lib/prisma";
import RapportsManager, { BoutiqueOption } from "@/components/dashboard/RapportsManager";
import { getRapportFinancierAction } from "@/app/actions/rapports";

export const metadata = {
  title: "djoonoo — Rapports & Finances",
  description: "Analyse du chiffre d'affaires, panier moyen et suivi des encaissements",
};

export default async function RapportsPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/connexion");
  }

  // Section 2 : Vendeur strictement interdit d'accès aux rapports financiers globaux
  if (session.role === "vendeur") {
    redirect("/dashboard/ventes");
  }

  const scoped = getScopedPrisma(session.compteId);

  // 1. Boutiques accessibles
  let boutiques: BoutiqueOption[] = [];

  if (session.role === "patron") {
    const bList = await scoped.boutiques.findMany({
      where: { compte_id: session.compteId },
      orderBy: { code: "asc" },
      select: { id: true, code: true, nom: true },
    });
    boutiques = bList;
  } else if (session.boutiqueId) {
    const b = await scoped.boutiques.findUnique({
      where: { id: session.boutiqueId },
      select: { id: true, code: true, nom: true },
    });
    if (b) boutiques = [b];
  }

  // Boutique active par défaut
  const cookieStore = await cookies();
  const activeBoutiqueCookie = cookieStore.get("djoonoo_active_boutique")?.value;

  const activeBoutiqueId =
    session.role === "gerant"
      ? session.boutiqueId || undefined
      : activeBoutiqueCookie || "tous";

  // 2. Récupération des données du rapport (par défaut pour le mois en cours)
  const rapportResult = await getRapportFinancierAction({
    periode: "mois",
    boutiqueId: activeBoutiqueId,
  });

  if (!rapportResult.success || !rapportResult.data) {
    throw new Error(rapportResult.error || "Impossible de charger les données financières.");
  }

  return (
    <RapportsManager
      initialData={rapportResult.data}
      boutiques={boutiques}
      userRole={session.role}
      activeBoutiqueId={activeBoutiqueId}
    />
  );
}
