import React from "react";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import CheckoutClient from "./CheckoutClient";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ forfaitId?: string; action?: string }>;
}) {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/connexion");
  }

  const { forfaitId } = await searchParams;

  const compte = await prisma.comptes.findUnique({
    where: { id: session.compteId },
    include: { forfait: true },
  });

  if (!compte) {
    redirect("/connexion");
  }

  const cibleId = forfaitId || compte.forfait_id;

  const [forfaitCible, methodesPaiement, nbBoutiquesActives] = await Promise.all([
    prisma.forfaits.findUnique({
      where: { id: cibleId, actif: true },
    }),
    prisma.methodes_paiement_compte.findMany({
      where: { compte_id: session.compteId },
      orderBy: [{ par_defaut: "desc" }, { date_creation: "desc" }],
    }),
    prisma.boutiques.count({
      where: { compte_id: session.compteId, statut: "actif" },
    }),
  ]);

  if (!forfaitCible) {
    redirect("/dashboard/abonnement");
  }

  // Garde serveur : si quota dépassé, retour avec alerte
  if (forfaitCible.max_boutiques !== null && nbBoutiquesActives > forfaitCible.max_boutiques) {
    redirect("/dashboard/abonnement?erreur=quota");
  }

  return (
    <CheckoutClient
      forfait={forfaitCible}
      compte={{
        id: compte.id,
        nomEntreprise: compte.nom_entreprise,
        email: session.email,
        telephone: compte.telephone_principal,
      }}
      methodesPaiement={methodesPaiement.map((m) => ({
        id: m.id,
        type: m.type,
        numero_telephone: m.numero_telephone,
        nom_titulaire: m.nom_titulaire,
        derniers_chiffres: m.derniers_chiffres,
        par_defaut: m.par_defaut,
      }))}
    />
  );
}
