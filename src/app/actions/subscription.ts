"use server";

import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { creerTransactionFedaPay } from "@/lib/fedapay";
import { ajouterMethodePaiementInterne } from "./payment-methods";

export interface InitierPaiementParams {
  forfaitId: string;
  telephonePaiement?: string;
  enregistrerParDefaut?: boolean;
  methodeType?: string;
}

export async function initierPaiementAbonnementAction(
  paramsOrForfaitId: string | InitierPaiementParams
) {
  const session = await getCurrentSession();
  if (!session || session.role !== "patron") {
    return { success: false, error: "Action réservée au Patron du compte." };
  }

  const params: InitierPaiementParams =
    typeof paramsOrForfaitId === "string"
      ? { forfaitId: paramsOrForfaitId }
      : paramsOrForfaitId;

  const { forfaitId, telephonePaiement, enregistrerParDefaut, methodeType } = params;

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

  // 1. Contrôle universel des quotas de boutiques
  const nbBoutiques = await prisma.boutiques.count({
    where: { compte_id: session.compteId, statut: "actif" },
  });

  if (forfaitCible.max_boutiques !== null && nbBoutiques > forfaitCible.max_boutiques) {
    const surcroit = nbBoutiques - forfaitCible.max_boutiques;
    return {
      success: false,
      error: `Quotas dépassés : tu as ${nbBoutiques} boutiques actives. Désactive ${surcroit} boutique(s) dans le menu Boutiques pour pouvoir choisir le forfait ${forfaitCible.nom}.`,
    };
  }

  // 2. Si le commerçant a demandé d'enregistrer le moyen de paiement par défaut
  if (telephonePaiement && enregistrerParDefaut) {
    try {
      await ajouterMethodePaiementInterne({
        compteId: session.compteId,
        type: methodeType || "mtn_momo",
        numeroTelephone: telephonePaiement,
        nomTitulaire: session.nom || compte.nom_entreprise,
        parDefaut: true,
      });
    } catch {
      // Tolérance silencieuse si déjà enregistré
    }
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const callbackUrl = `${appUrl}/dashboard/abonnement?status=verif`;

    const telFinal = telephonePaiement || compte.telephone_principal;

    const res = await creerTransactionFedaPay({
      compteId: compte.id,
      forfaitId: forfaitCible.id,
      montant: forfaitCible.prix_mensuel,
      email: session.email,
      nom: session.nom || compte.nom_entreprise,
      telephone: telFinal,
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
