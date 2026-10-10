import { redirect } from "next/navigation";
import { getSuperAdminSession } from "@/lib/super-admin-auth";
import { prisma } from "@/lib/prisma";
import PaiementsAbonnementManager, {
  FactureAbonnementItem,
} from "@/components/super-admin/PaiementsAbonnementManager";
import { StatutFactureAbonnement } from "@prisma/client";
import { parsePaginationParams } from "@/lib/pagination";

export const metadata = {
  title: "Paiements d'Abonnement — Super-Admin djoonoo",
  description: "Validation et suivi des paiements d'abonnement",
};

interface SuperAdminAbonnementsPageProps {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    q?: string;
    statut?: string;
  }>;
}

export default async function SuperAdminAbonnementsPage(props: SuperAdminAbonnementsPageProps) {
  const session = await getSuperAdminSession();
  if (!session) {
    redirect("/super-admin/connexion");
  }

  const searchParams = props.searchParams ? await props.searchParams : {};
  const { page, limit, skip } = parsePaginationParams(searchParams, 25);
  const q = searchParams.q?.trim() || "";
  const statut = searchParams.statut || "tous";

  const whereCondition: any = {};
  if (statut && statut !== "tous") {
    whereCondition.statut = statut as StatutFactureAbonnement;
  }
  if (q) {
    whereCondition.OR = [
      { compte: { nom_entreprise: { contains: q, mode: "insensitive" } } },
      { compte: { code: { contains: q, mode: "insensitive" } } },
      { compte: { email_principal: { contains: q, mode: "insensitive" } } },
      { reference_externe: { contains: q, mode: "insensitive" } },
    ];
  }

  const [
    factures,
    totalFacturesFiltrees,
    totalEnAttente,
    totalPayeesFedaPay,
    sommePayees,
  ] = await Promise.all([
    prisma.factures_abonnement.findMany({
      where: whereCondition,
      skip,
      take: limit,
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
                duree_jours: true,
              },
            },
          },
        },
      },
      orderBy: { date_echeance: "desc" },
    }),
    prisma.factures_abonnement.count({ where: whereCondition }),
    prisma.factures_abonnement.count({
      where: { statut: StatutFactureAbonnement.en_attente },
    }),
    prisma.factures_abonnement.count({
      where: { statut: StatutFactureAbonnement.payee, fournisseur_paiement: "fedapay" },
    }),
    prisma.factures_abonnement.aggregate({
      where: { statut: StatutFactureAbonnement.payee },
      _sum: { montant: true },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalFacturesFiltrees / limit));

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
      <PaiementsAbonnementManager
        initialFactures={facturesFormatees}
        page={page}
        limit={limit}
        totalPages={totalPages}
        totalElements={totalFacturesFiltrees}
        initialSearch={q}
        initialStatut={statut}
        statsGlobales={{
          totalEnAttente,
          totalPayeesFedaPay,
          montantTotalEncaisse: sommePayees._sum.montant || 0,
        }}
      />
    </div>
  );
}
