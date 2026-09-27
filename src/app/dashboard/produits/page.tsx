import React from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCurrentSession } from "@/lib/auth";
import { getScopedPrisma } from "@/lib/prisma";
import ProduitsManager, { ProduitItem, BoutiqueOption } from "@/components/dashboard/ProduitsManager";
import { parsePaginationParams } from "@/lib/pagination";

export const metadata = {
  title: "djoonoo — Produits & Gestion des Stocks",
  description: "Suivi du stock en temps réel et alertes de réapprovisionnement",
};

interface ProduitsPageProps {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    q?: string;
    filtreStock?: string;
  }>;
}

export default async function ProduitsPage(props: ProduitsPageProps) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/connexion");
  }

  const searchParams = props.searchParams ? await props.searchParams : {};
  const { page, limit, skip } = parsePaginationParams(searchParams, 25);
  const q = searchParams.q?.trim() || "";
  const filtreStock = searchParams.filtreStock || "tous";

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

  // 3. Condition de filtre Prisma
  const whereCondition: any = {
    compte_id: session.compteId,
    boutique_id: activeBoutique.id,
  };

  if (q) {
    whereCondition.OR = [
      { nom: { contains: q, mode: "insensitive" } },
      { code_barre: { contains: q, mode: "insensitive" } },
    ];
  }

  if (filtreStock === "rupture") {
    whereCondition.quantite_stock = 0;
  } else if (filtreStock === "en_stock") {
    whereCondition.quantite_stock = { gt: 0 };
  }

  // 4. Double requête atomique avec pagination et calcul de stock
  const [totalCount, produitsData, totalProduitsBoutique, alertesCount] = await Promise.all([
    scoped.produits.count({ where: whereCondition }),
    scoped.produits.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { nom: "asc" },
      include: {
        boutique: {
          select: { id: true, code: true, nom: true },
        },
      },
    }),
    scoped.produits.count({
      where: { compte_id: session.compteId, boutique_id: activeBoutique.id },
    }),
    scoped.produits.count({
      where: {
        compte_id: session.compteId,
        boutique_id: activeBoutique.id,
        quantite_stock: { lte: 5 }, // seuil représentatif
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  const formattedProduits: ProduitItem[] = produitsData.map((p) => ({
    id: p.id,
    nom: p.nom,
    prix_unitaire: p.prix_unitaire,
    quantite_stock: p.quantite_stock,
    seuil_alerte: p.seuil_alerte,
    code_barre: p.code_barre,
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
        page={page}
        limit={limit}
        totalPages={totalPages}
        totalElements={totalCount}
        initialSearch={q}
        totalProduitsGlobal={totalProduitsBoutique}
      />
    </div>
  );
}
