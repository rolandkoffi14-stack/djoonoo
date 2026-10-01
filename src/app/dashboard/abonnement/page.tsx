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

  const [compte, forfaits, factures, nbBoutiquesActives, nbEmployes, methodesPaiement] = await Promise.all([
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
    }),
    prisma.boutiques.count({
      where: { compte_id: session.compteId, statut: "actif" },
    }),
    prisma.utilisateurs.count({
      where: {
        compte_id: session.compteId,
        role: { in: ["gerant", "vendeur"] },
        statut: "actif",
      },
    }),
    prisma.methodes_paiement_compte.findMany({
      where: { compte_id: session.compteId },
      orderBy: [{ par_defaut: "desc" }, { date_creation: "desc" }],
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
        compteForfaitNom={compte.forfait?.nom || "Solo"}
        forfaitPrixMensuel={compte.forfait?.prix_mensuel || 5000}
        forfaitDureeJours={compte.forfait?.duree_jours || 30}
        maxBoutiquesForfait={compte.forfait?.max_boutiques ?? null}
        maxEmployesForfait={compte.forfait?.max_employes_par_boutique ?? null}
        statutAbonnement={compte.statut_abonnement}
        dateFinPeriode={compte.date_fin_periode_courante?.toISOString() || null}
        dateFinEssai={compte.date_fin_essai?.toISOString() || null}
        isPatron={session.role === "patron"}
        nbBoutiquesActives={nbBoutiquesActives}
        nbEmployes={nbEmployes}
        methodesPaiementInitiales={methodesPaiement.map((m) => ({
          id: m.id,
          type: m.type,
          numero_telephone: m.numero_telephone,
          nom_titulaire: m.nom_titulaire,
          derniers_chiffres: m.derniers_chiffres,
          par_defaut: m.par_defaut,
        }))}
        factures={factures.map((fc) => ({
          id: fc.id,
          montant: fc.montant,
          statut: fc.statut,
          fournisseur_paiement: fc.fournisseur_paiement,
          reference_externe: fc.reference_externe,
          date_echeance: fc.date_echeance.toISOString(),
          date_confirmation: fc.date_confirmation?.toISOString() || null,
        }))}
        statusQuery={status}
      />
    </div>
  );
}
