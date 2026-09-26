"use server";

import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { creerTransactionFedaPay } from "@/lib/fedapay";

export async function initierPaiementAbonnementAction(forfaitId: string) {
  const session = await getCurrentSession();
  if (!session || session.role !== "patron") {
    return { success: false, error: "Action réservée au Patron du compte." };
  }

  const compte = await prisma.comptes.findUnique({
    where: { id: session.compteId },
    include: { forfait: true },
  });
  if (!compte) {
    return { success: false, error: "Compte introuvable." };
  }

  const forfaitCible = await prisma.forfaits.findUnique({
    where: { id: forfaitId, actif: true },
  });
  if (!forfaitCible) {
    return { success: false, error: "Forfait sélectionné non disponible." };
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const callbackUrl = `${appUrl}/dashboard/abonnement?status=verif`;

    const res = await creerTransactionFedaPay({
      compteId: compte.id,
      forfaitId: forfaitCible.id,
      montant: forfaitCible.prix_mensuel,
      email: session.email,
      nom: session.nom || compte.nom_entreprise,
      telephone: compte.telephone_principal,
      callbackUrl,
    });

    return { success: true, urlPaiement: res.urlPaiement };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Erreur lors de l'initialisation du paiement.",
    };
  }
}
