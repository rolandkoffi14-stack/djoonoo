import React from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCurrentSession } from "@/lib/auth";
import { getScopedPrisma } from "@/lib/prisma";
import VentesManager, { VenteListItem } from "@/components/dashboard/VentesManager";

export const metadata = {
  title: "djoonoo — Ventes & Factures",
  description: "Historique des ventes enregistrées, statuts de paiement et reçus",
};

export default async function VentesPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/connexion");
  }

  const scoped = getScopedPrisma(session.compteId);

  // 1. Boutiques accessibles
  let boutiques: { id: string; code: string; nom: string }[] = [];

  if (session.role === "patron") {
    boutiques = await scoped.boutiques.findMany({
      where: { compte_id: session.compteId },
      orderBy: { code: "asc" },
      select: { id: true, code: true, nom: true },
    });
  } else if (session.boutiqueId) {
    const b = await scoped.boutiques.findUnique({
      where: { id: session.boutiqueId },
      select: { id: true, code: true, nom: true },
    });
    if (b) boutiques = [b];
  }

  if (boutiques.length === 0) {
    redirect("/dashboard/boutiques");
  }

  // 2. Boutique active
  const cookieStore = await cookies();
  const activeBoutiqueCookie = cookieStore.get("djoonoo_active_boutique")?.value;

  let activeBoutique =
    boutiques.find((b) => b.id === activeBoutiqueCookie) ||
    boutiques.find((b) => b.id === session.boutiqueId) ||
    boutiques[0];

  if (session.role !== "patron" && session.boutiqueId) {
    activeBoutique = boutiques[0];
  }

  // 3. Condition de filtre selon le rôle (Section 2) :
  // Le Vendeur ne voit que ses propres ventes ; le Patron et le Gérant voient toute la boutique
  const whereCondition: any = {
    compte_id: session.compteId,
    boutique_id: activeBoutique.id,
  };

  if (session.role === "vendeur") {
    whereCondition.utilisateur_id = session.userId;
  }

  // 4. Récupération des ventes
  const ventesDb = await scoped.ventes.findMany({
    where: whereCondition,
    orderBy: { date_vente: "desc" },
    include: {
      boutique: { select: { id: true, code: true, nom: true } },
      utilisateur: { select: { id: true, nom: true } },
      client: { select: { id: true, nom: true, telephone: true } },
      paiements: {
        select: { id: true, montant: true, mode_paiement: true },
        orderBy: { date_paiement: "asc" },
      },
    },
  });

  const ventes: VenteListItem[] = ventesDb.map((v) => ({
    id: v.id,
    numero_facture: v.numero_facture,
    date_vente: v.date_vente.toISOString(),
    montant_total: v.montant_total,
    montant_remise: v.montant_remise,
    statut_paiement: v.statut_paiement,
    statut_vente: v.statut_vente,
    boutique: v.boutique,
    utilisateur: v.utilisateur,
    client: v.client,
    paiements: v.paiements,
  }));

  return (
    <VentesManager
      ventes={ventes}
      boutiqueNom={activeBoutique.nom}
      boutiqueCode={activeBoutique.code}
      userRole={session.role}
    />
  );
}
