import React from "react";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { getScopedPrisma } from "@/lib/prisma";
import ClientsManager, { ClientItem } from "@/components/dashboard/ClientsManager";

export const metadata = {
  title: "djoonoo — Répertoire Clients & Historique",
  description: "Suivi des clients, historique multi-boutiques et gestion des créances",
};

export default async function ClientsPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/connexion");
  }

  const scoped = getScopedPrisma(session.compteId);

  // Récupération de tous les clients du compte (Section 1.5 : rattachés au compte)
  const clientsDb = await scoped.clients.findMany({
    where: { compte_id: session.compteId },
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
  });

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
    />
  );
}
