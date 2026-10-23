import React from "react";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { getScopedPrisma } from "@/lib/prisma";
import ClientsManager, { ClientItem } from "@/components/dashboard/ClientsManager";
import { parsePaginationParams } from "@/lib/pagination";

export const metadata = {
  title: "djoonoo — Répertoire Clients & Historique",
  description: "Suivi des clients, historique multi-boutiques et gestion des créances",
};

interface ClientsPageProps {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    q?: string;
    statut?: string;
  }>;
}

export default async function ClientsPage(props: ClientsPageProps) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/connexion");
  }

  // Section 2 : Vendeur strictement interdit d'accès au répertoire clients global
  if (session.role === "vendeur") {
    redirect("/dashboard/caisse");
  }

  const searchParams = props.searchParams ? await props.searchParams : {};
  const { page, limit, skip } = parsePaginationParams(searchParams, 25);
  const q = searchParams.q?.trim() || "";
  const statut = (searchParams.statut as "tous" | "debiteurs" | "actifs") || "tous";

  const scoped = getScopedPrisma(session.compteId);
  const targetBoutiqueId = session.role === "gerant" && session.boutiqueId ? session.boutiqueId : undefined;

  const whereCondition: any = { compte_id: session.compteId };
  if (q) {
    whereCondition.OR = [
      { nom: { contains: q, mode: "insensitive" } },
      { telephone: { contains: q } },
    ];
  }

  if (targetBoutiqueId) {
    if (statut === "debiteurs") {
      whereCondition.ventes = {
        some: {
          boutique_id: targetBoutiqueId,
          statut_vente: "validee",
          statut_paiement: { in: ["impaye", "partiel"] },
        },
      };
    } else if (statut === "actifs") {
      whereCondition.ventes = {
        some: {
          boutique_id: targetBoutiqueId,
          statut_vente: "validee",
        },
      };
    } else {
      whereCondition.ventes = {
        some: {
          boutique_id: targetBoutiqueId,
        },
      };
    }
  } else {
    if (statut === "debiteurs") {
      whereCondition.ventes = {
        some: {
          statut_vente: "validee",
          statut_paiement: { in: ["impaye", "partiel"] },
        },
      };
    } else if (statut === "actifs") {
      whereCondition.ventes = {
        some: {
          statut_vente: "validee",
        },
      };
    }
  }

  // 1. Récupération paginée des clients, comptage total et métriques globales
  const [
    totalCount,
    clientsDb,
    totalClientsGlobal,
    statsVentesClients,
    statsPaiementsClients,
    nbDebiteursGlobal,
  ] = await Promise.all([
    scoped.clients.count({ where: whereCondition }),
    scoped.clients.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { nom: "asc" },
      include: {
        ventes: {
          where: {
            statut_vente: "validee",
            ...(targetBoutiqueId ? { boutique_id: targetBoutiqueId } : {}),
          },
          select: {
            montant_total: true,
            paiements: { select: { montant: true } },
          },
        },
      },
    }),
    scoped.clients.count({
      where: {
        compte_id: session.compteId,
        ...(targetBoutiqueId ? { ventes: { some: { boutique_id: targetBoutiqueId } } } : {}),
      },
    }),
    scoped.ventes.aggregate({
      where: {
        compte_id: session.compteId,
        statut_vente: "validee",
        client_id: { not: null },
        ...(targetBoutiqueId ? { boutique_id: targetBoutiqueId } : {}),
      },
      _sum: { montant_total: true },
    }),
    scoped.paiements.aggregate({
      where: {
        compte_id: session.compteId,
        vente: {
          statut_vente: "validee",
          client_id: { not: null },
          ...(targetBoutiqueId ? { boutique_id: targetBoutiqueId } : {}),
        },
      },
      _sum: { montant: true },
    }),
    scoped.clients.count({
      where: {
        compte_id: session.compteId,
        ventes: {
          some: {
            statut_vente: "validee",
            statut_paiement: { in: ["impaye", "partiel"] },
            ...(targetBoutiqueId ? { boutique_id: targetBoutiqueId } : {}),
          },
        },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  // Calcul des métriques pour les clients de la page courante
  const clients: ClientItem[] = clientsDb.map((c) => {
    let totalDepense = 0;
    let totalPaye = 0;
    let resteDu = 0;

    c.ventes.forEach((v) => {
      totalDepense += v.montant_total;
      const paye = v.paiements.reduce((acc, p) => acc + p.montant, 0);
      totalPaye += paye;
      if (v.montant_total > paye) {
        resteDu += v.montant_total - paye;
      }
    });

    return {
      id: c.id,
      nom: c.nom,
      telephone: c.telephone,
      date_creation: c.date_creation.toISOString(),
      nbVentes: c.ventes.length,
      totalDepense,
      totalPaye,
      resteDu,
    };
  });

  const caCumuleGlobal = statsVentesClients._sum.montant_total || 0;
  const payeCumuleGlobal = statsPaiementsClients._sum.montant || 0;
  const creancesTotalesGlobal = Math.max(0, caCumuleGlobal - payeCumuleGlobal);

  const statsGlobales = {
    nbClients: totalClientsGlobal,
    caCumule: caCumuleGlobal,
    creancesTotales: creancesTotalesGlobal,
    nbDebiteurs: nbDebiteursGlobal,
  };

  return (
    <ClientsManager
      clientsInitiaux={clients}
      userRole={session.role}
      page={page}
      limit={limit}
      totalPages={totalPages}
      totalElements={totalCount}
      initialSearch={q}
      initialStatut={statut}
      totalClientsGlobal={totalClientsGlobal}
      statsGlobales={statsGlobales}
    />
  );
}
