import { redirect } from "next/navigation";
import { getSuperAdminSession } from "@/lib/super-admin-auth";
import { prisma } from "@/lib/prisma";
import PaiementsAbonnementManager, {
  FactureAbonnementItem,
} from "@/components/super-admin/PaiementsAbonnementManager";

export const metadata = {
  title: "Paiements d'Abonnement — Super-Admin djoonoo",
  description: "Validation et suivi des paiements d'abonnement",
};

export default async function SuperAdminAbonnementsPage() {
  const session = await getSuperAdminSession();
  if (!session) {
    redirect("/super-admin/connexion");
  }

  const factures = await prisma.factures_abonnement.findMany({
    include: {
      compte: {
        select: {
          id: true,
          nom_entreprise: true,
          code: true,
          email_principal: true,
          statut_abonnement: true,
          forfait: {
            select: {
              nom: true,
              prix_mensuel: true,
            },
          },
        },
      },
    },
    orderBy: { date_echeance: "desc" },
  });

  const facturesFormatees: FactureAbonnementItem[] = factures.map((f) => ({
    id: f.id,
    compte_id: f.compte_id,
    montant: f.montant,
    statut: f.statut,
    fournisseur_paiement: f.fournisseur_paiement,
    reference_externe: f.reference_externe,
    confirme_par_super_admin_id: f.confirme_par_super_admin_id,
    date_echeance: f.date_echeance.toISOString(),
    date_confirmation: f.date_confirmation ? f.date_confirmation.toISOString() : null,
    compte: f.compte,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PaiementsAbonnementManager initialFactures={facturesFormatees} />
    </div>
  );
}
