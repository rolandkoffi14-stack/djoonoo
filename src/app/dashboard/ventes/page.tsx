import React from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCurrentSession } from "@/lib/auth";
import { getScopedPrisma } from "@/lib/prisma";
import VentesManager, { VenteListItem } from "@/components/dashboard/VentesManager";
import { parsePaginationParams } from "@/lib/pagination";
import { StatutPaiementVente } from "@prisma/client";

export const metadata = {
  title: "djoonoo — Ventes & Factures",
  description: "Historique des ventes enregistrées, statuts de paiement et reçus",
};

interface VentesPageProps {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    q?: string;
    statut?: string;
  }>;
}

export default async function VentesPage(props: VentesPageProps) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/connexion");
  }

  const searchParams = props.searchParams ? await props.searchParams : {};
  const { page, limit, skip } = parsePaginationParams(searchParams, 25);
  const q = searchParams.q?.trim() || "";
  const statut = searchParams.statut || "tous";

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

  // 3. Condition de filtre selon le rôle et les critères de recherche
  const whereCondition: any = {
    compte_id: session.compteId,
    boutique_id: activeBoutique.id,
  };

  if (session.role === "vendeur") {
    whereCondition.utilisateur_id = session.userId;
  }

  if (statut && statut !== "tous") {
    whereCondition.statut_paiement = statut as StatutPaiementVente;
  }

  if (q) {
    whereCondition.OR = [
      { numero_facture: { contains: q, mode: "insensitive" } },
      { client: { nom: { contains: q, mode: "insensitive" } } },
      { client: { telephone: { contains: q } } },
      { utilisateur: { nom: { contains: q, mode: "insensitive" } } },
    ];
  }

  // 4. Double requête atomique avec pagination et agrégation SQL native
  const [totalCount, ventesDb, statsVentes, statsPaiements] = await Promise.all([
    scoped.ventes.count({ where: whereCondition }),
    scoped.ventes.findMany({
      where: whereCondition,
      skip,
      take: limit,
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
    }),
    scoped.ventes.aggregate({
      where: {
        compte_id: session.compteId,
        boutique_id: activeBoutique.id,
        statut_vente: "validee",
      },
      _sum: { montant_total: true },
      _count: true,
    }),
    scoped.paiements.aggregate({
      where: {
        compte_id: session.compteId,
        vente: {
          boutique_id: activeBoutique.id,
          statut_vente: "validee",
        },
      },
      _sum: { montant: true },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const caTotal = statsVentes._sum.montant_total || 0;
  const totalEncaisse = statsPaiements._sum.montant || 0;
  const totalImpayes = Math.max(0, caTotal - totalEncaisse);

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
      page={page}
      limit={limit}
      totalPages={totalPages}
      totalElements={totalCount}
      initialSearch={q}
      initialStatut={statut}
      statsGlobales={{
        nombreVentes: statsVentes._count || 0,
        caTotal,
        totalEncaisse,
        totalImpayes,
      }}
    />
  );
}
