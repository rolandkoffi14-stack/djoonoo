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
  }>;
}

export default async function ClientsPage(props: ClientsPageProps) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/connexion");
  }

  const searchParams = props.searchParams ? await props.searchParams : {};
  const { page, limit, skip } = parsePaginationParams(searchParams, 25);
  const q = searchParams.q?.trim() || "";

  const scoped = getScopedPrisma(session.compteId);

  const whereCondition: any = { compte_id: session.compteId };
  if (q) {
    whereCondition.OR = [
      { nom: { contains: q, mode: "insensitive" } },
      { telephone: { contains: q } },
    ];
  }

  // 1. Récupération paginée des clients et comptage total
  const [totalCount, clientsDb, totalClientsGlobal] = await Promise.all([
    scoped.clients.count({ where: whereCondition }),
    scoped.clients.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { nom: "asc" },
      include: {
        ventes: {
          where: { statut_vente: "validee" },
          select: {
            montant_total: true,
            paiements: { select: { montant: true } },
          },
        },
      },
    }),
    scoped.clients.count({ where: { compte_id: session.compteId } }),
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

  return (
    <ClientsManager
      clientsInitiaux={clients}
      userRole={session.role}
      page={page}
      limit={limit}
      totalPages={totalPages}
      totalElements={totalCount}
      initialSearch={q}
      totalClientsGlobal={totalClientsGlobal}
    />
  );
}
