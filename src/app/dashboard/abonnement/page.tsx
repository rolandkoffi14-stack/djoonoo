import React from "react";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AbonnementClient from "@/components/dashboard/AbonnementClient";

export const dynamic = "force-dynamic";

export default async function AbonnementPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/connexion");
  }

  const { status } = await searchParams;

  const [compte, forfaits, factures] = await Promise.all([
    prisma.comptes.findUnique({
      where: { id: session.compteId },
      include: { forfait: true },
    }),
    prisma.forfaits.findMany({
      where: { actif: true },
      orderBy: { prix_mensuel: "asc" },
    }),
    prisma.factures_abonnement.findMany({
      where: { compte_id: session.compteId },
      orderBy: { date_echeance: "desc" },
      take: 5,
    }),
  ]);

  if (!compte) {
    redirect("/connexion");
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2B2119]">
          Mon Abonnement
        </h1>
        <p className="text-sm text-neutral-600 mt-1">
          Suis la validité de ton accès djoonoo et choisis le forfait adapté à la croissance de ton commerce.
        </p>
      </div>

      <AbonnementClient
        forfaits={forfaits}
        compteForfaitId={compte.forfait_id}
        statutAbonnement={compte.statut_abonnement}
        dateFinPeriode={compte.date_fin_periode_courante?.toISOString() || null}
        dateFinEssai={compte.date_fin_essai?.toISOString() || null}
        isPatron={session.role === "patron"}
        factures={factures.map((fc) => ({
          id: fc.id,
          montant: fc.montant,
          statut: fc.statut,
          fournisseur_paiement: fc.fournisseur_paiement,
          date_echeance: fc.date_echeance.toISOString(),
          date_confirmation: fc.date_confirmation?.toISOString() || null,
        }))}
        statusQuery={status}
      />
    </div>
  );
}
