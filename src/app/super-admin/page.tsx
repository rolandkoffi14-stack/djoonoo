import { redirect } from "next/navigation";
import { getSuperAdminSession } from "@/lib/super-admin-auth";
import { prisma } from "@/lib/prisma";
import ComptesManager, { CompteAdminItem } from "@/components/super-admin/ComptesManager";
import { StatutAbonnement } from "@prisma/client";

export const metadata = {
  title: "Comptes Marchands — Super-Admin djoonoo",
  description: "Supervision globale des comptes et abonnements",
};

export default async function SuperAdminComptesPage() {
  const session = await getSuperAdminSession();
  if (!session) {
    redirect("/super-admin/connexion");
  }

  const [comptes, totalComptes, comptesActifs, comptesEssai, comptesSuspendus, totalBoutiques] =
    await Promise.all([
      prisma.comptes.findMany({
        include: {
          forfait: {
            select: {
              id: true,
              nom: true,
              prix_mensuel: true,
              max_boutiques: true,
            },
          },
          _count: {
            select: {
              boutiques: true,
              utilisateurs: true,
            },
          },
        },
        orderBy: { date_creation: "desc" },
      }),
      prisma.comptes.count(),
      prisma.comptes.count({ where: { statut_abonnement: StatutAbonnement.actif } }),
      prisma.comptes.count({ where: { statut_abonnement: StatutAbonnement.essai } }),
      prisma.comptes.count({
        where: {
          statut_abonnement: { in: [StatutAbonnement.suspendu, StatutAbonnement.impaye] },
        },
      }),
      prisma.boutiques.count(),
    ]);

  const comptesFormates: CompteAdminItem[] = comptes.map((c) => ({
    id: c.id,
    code: c.code,
    nom_entreprise: c.nom_entreprise,
    email_principal: c.email_principal,
    telephone_principal: c.telephone_principal,
    ville: c.ville,
    statut_abonnement: c.statut_abonnement,
    date_fin_essai: c.date_fin_essai ? c.date_fin_essai.toISOString() : null,
    date_fin_periode_courante: c.date_fin_periode_courante
      ? c.date_fin_periode_courante.toISOString()
      : null,
    date_creation: c.date_creation.toISOString(),
    forfait: c.forfait,
    _count: c._count,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ComptesManager
        initialComptes={comptesFormates}
        stats={{
          totalComptes,
          comptesActifs,
          comptesEssai,
          comptesSuspendus,
          totalBoutiques,
        }}
      />
    </div>
  );
}
