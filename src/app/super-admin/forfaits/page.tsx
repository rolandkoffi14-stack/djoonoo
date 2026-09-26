import { redirect } from "next/navigation";
import { getSuperAdminSession } from "@/lib/super-admin-auth";
import { prisma } from "@/lib/prisma";
import ForfaitsManager, { ForfaitItem } from "@/components/super-admin/ForfaitsManager";

export const metadata = {
  title: "Forfaits & Quotas — Super-Admin djoonoo",
  description: "Gestion des forfaits d'abonnement et des limites applicatives",
};

export default async function SuperAdminForfaitsPage() {
  const session = await getSuperAdminSession();
  if (!session) {
    redirect("/super-admin/connexion");
  }

  const forfaits = await prisma.forfaits.findMany({
    include: {
      _count: {
        select: {
          comptes: true,
        },
      },
    },
    orderBy: { prix_mensuel: "asc" },
  });

  const forfaitsFormates: ForfaitItem[] = forfaits.map((f) => ({
    id: f.id,
    nom: f.nom,
    max_boutiques: f.max_boutiques,
    max_employes_par_boutique: f.max_employes_par_boutique,
    prix_mensuel: f.prix_mensuel,
    duree_jours: f.duree_jours,
    actif: f.actif,
    _count: f._count,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ForfaitsManager initialForfaits={forfaitsFormates} />
    </div>
  );
}
