import React from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCurrentSession } from "@/lib/auth";
import { prisma, getScopedPrisma } from "@/lib/prisma";
import ProduitsManager, { ProduitItem, BoutiqueOption } from "@/components/dashboard/ProduitsManager";

export const metadata = {
  title: "djoonoo — Produits & Gestion des Stocks",
  description: "Suivi du stock en temps réel et alertes de réapprovisionnement",
};

export default async function ProduitsPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/connexion");
  }

  const scoped = getScopedPrisma(session.compteId);

  // 1. Récupération des boutiques accessibles
  let boutiquesData: { id: string; code: string; nom: string; statut: string }[] = [];

  if (session.role === "patron") {
    boutiquesData = await scoped.boutiques.findMany({
      where: { compte_id: session.compteId },
      orderBy: { code: "asc" },
      select: { id: true, code: true, nom: true, statut: true },
    });
  } else if (session.boutiqueId) {
    const b = await scoped.boutiques.findUnique({
      where: { id: session.boutiqueId },
      select: { id: true, code: true, nom: true, statut: true },
    });
    if (b) boutiquesData = [b];
  }

  if (boutiquesData.length === 0) {
    redirect("/dashboard/boutiques");
  }

  // 2. Détermination de la boutique active
  const cookieStore = await cookies();
  const activeBoutiqueCookie = cookieStore.get("djoonoo_active_boutique")?.value;

  let activeBoutique =
    boutiquesData.find((b) => b.id === activeBoutiqueCookie) ||
    boutiquesData.find((b) => b.id === session.boutiqueId) ||
    boutiquesData[0];

  // Le Gérant et le Vendeur sont strictement verrouillés sur leur boutique
  if (session.role !== "patron" && session.boutiqueId) {
    activeBoutique = boutiquesData[0];
  }

  // 3. Récupération des produits pour la boutique active
  const produitsData = await scoped.produits.findMany({
    where: {
      compte_id: session.compteId,
      boutique_id: activeBoutique.id,
    },
    orderBy: { date_creation: "desc" },
    include: {
      boutique: {
        select: { id: true, code: true, nom: true },
      },
    },
  });

  const formattedProduits: ProduitItem[] = produitsData.map((p) => ({
    id: p.id,
    nom: p.nom,
    prix_unitaire: p.prix_unitaire,
    quantite_stock: p.quantite_stock,
    seuil_alerte: p.seuil_alerte,
    date_creation: p.date_creation.toISOString(),
    boutique: p.boutique,
  }));

  const formattedBoutiques: BoutiqueOption[] = boutiquesData.map((b) => ({
    id: b.id,
    code: b.code,
    nom: b.nom,
    statut: b.statut,
  }));

  return (
    <div className="max-w-6xl mx-auto">
      <ProduitsManager
        produits={formattedProduits}
        boutiques={formattedBoutiques}
        boutiqueActiveId={activeBoutique.id}
        userRole={session.role}
      />
    </div>
  );
}
