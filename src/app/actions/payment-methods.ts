"use server";

import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Normalise un numéro Mobile Money (notamment Bénin +229)
 */
export function normaliserTelephone(tel: string): string {
  const nettoye = tel.replace(/[\s\-\.]/g, "");
  if (nettoye.startsWith("+")) {
    return nettoye;
  }
  if (nettoye.startsWith("00229")) {
    return `+229${nettoye.slice(5)}`;
  }
  if (nettoye.startsWith("229") && nettoye.length >= 11) {
    return `+${nettoye}`;
  }
  if (nettoye.startsWith("01") && nettoye.length === 10) {
    return `+229${nettoye.slice(2)}`;
  }
  if (nettoye.length === 8) {
    return `+229${nettoye}`;
  }
  return nettoye.startsWith("+") ? nettoye : `+${nettoye}`;
}

export interface AjouterMethodeInput {
  compteId: string;
  type: string; // "mtn_momo" | "moov_money" | "carte"
  numeroTelephone: string;
  nomTitulaire?: string;
  parDefaut?: boolean;
}

/**
 * Logique métier interne d'ajout (testable sans session HTTP)
 */
export async function ajouterMethodePaiementInterne(input: AjouterMethodeInput) {
  const { compteId, type, numeroTelephone, nomTitulaire } = input;

  if (!numeroTelephone || numeroTelephone.trim().length < 8) {
    return { success: false, error: "Numéro de téléphone invalide." };
  }

  const telNormalise = normaliserTelephone(numeroTelephone);
  const derniersChiffres = telNormalise.slice(-2);

  // Vérifier si le compte a déjà des méthodes
  const countExistants = await prisma.methodes_paiement_compte.count({
    where: { compte_id: compteId },
  });

  const doitEtreParDefaut = input.parDefaut ?? (countExistants === 0);

  return await prisma.$transaction(async (tx) => {
    if (doitEtreParDefaut) {
      await tx.methodes_paiement_compte.updateMany({
        where: { compte_id: compteId },
        data: { par_defaut: false },
      });
    }

    const methode = await tx.methodes_paiement_compte.create({
      data: {
        compte_id: compteId,
        type,
        numero_telephone: telNormalise,
        nom_titulaire: nomTitulaire?.trim() || null,
        derniers_chiffres: derniersChiffres,
        par_defaut: doitEtreParDefaut,
      },
    });

    return { success: true, data: methode };
  });
}

/**
 * Logique métier interne pour basculer la méthode par défaut
 */
export async function definirMethodeParDefautInterne(params: {
  compteId: string;
  methodeId: string;
}) {
  const { compteId, methodeId } = params;

  return await prisma.$transaction(async (tx) => {
    const existante = await tx.methodes_paiement_compte.findFirst({
      where: { id: methodeId, compte_id: compteId },
    });

    if (!existante) {
      return { success: false, error: "Méthode de paiement introuvable pour ce compte." };
    }

    await tx.methodes_paiement_compte.updateMany({
      where: { compte_id: compteId },
      data: { par_defaut: false },
    });

    const maj = await tx.methodes_paiement_compte.update({
      where: { id: methodeId },
      data: { par_defaut: true },
    });

    return { success: true, data: maj };
  });
}

/**
 * Logique métier interne de suppression
 */
export async function supprimerMethodePaiementInterne(params: {
  compteId: string;
  methodeId: string;
}) {
  const { compteId, methodeId } = params;

  return await prisma.$transaction(async (tx) => {
    const cible = await tx.methodes_paiement_compte.findFirst({
      where: { id: methodeId, compte_id: compteId },
    });

    if (!cible) {
      return { success: false, error: "Méthode de paiement introuvable." };
    }

    await tx.methodes_paiement_compte.delete({
      where: { id: methodeId },
    });

    // Si la méthode supprimée était par défaut, réassigner à la plus récente restante
    if (cible.par_defaut) {
      const suivante = await tx.methodes_paiement_compte.findFirst({
        where: { compte_id: compteId },
        orderBy: { date_creation: "desc" },
      });

      if (suivante) {
        await tx.methodes_paiement_compte.update({
          where: { id: suivante.id },
          data: { par_defaut: true },
        });
      }
    }

    return { success: true };
  });
}

/**
 * Liste des méthodes de paiement ordonnées (par défaut d'abord)
 */
export async function listerMethodesPaiementInterne(compteId: string) {
  return await prisma.methodes_paiement_compte.findMany({
    where: { compte_id: compteId },
    orderBy: [{ par_defaut: "desc" }, { date_creation: "desc" }],
  });
}

// -------------------------------------------------------------
// Server Actions protégées par Session Patron
// -------------------------------------------------------------

export async function ajouterMethodePaiementAction(formData: FormData) {
  const session = await getCurrentSession();
  if (!session || session.role !== "patron") {
    return { success: false, error: "Action réservée au Patron du compte." };
  }

  const type = (formData.get("type") as string) || "mtn_momo";
  const numeroTelephone = (formData.get("numero_telephone") as string) || "";
  const nomTitulaire = (formData.get("nom_titulaire") as string) || "";
  const parDefaut = formData.get("par_defaut") === "true";

  const res = await ajouterMethodePaiementInterne({
    compteId: session.compteId,
    type,
    numeroTelephone,
    nomTitulaire,
    parDefaut,
  });

  if (res.success) {
    revalidatePath("/dashboard/abonnement");
  }

  return res;
}

export async function definirMethodeParDefautAction(methodeId: string) {
  const session = await getCurrentSession();
  if (!session || session.role !== "patron") {
    return { success: false, error: "Action réservée au Patron du compte." };
  }

  const res = await definirMethodeParDefautInterne({
    compteId: session.compteId,
    methodeId,
  });

  if (res.success) {
    revalidatePath("/dashboard/abonnement");
  }

  return res;
}

export async function supprimerMethodePaiementAction(methodeId: string) {
  const session = await getCurrentSession();
  if (!session || session.role !== "patron") {
    return { success: false, error: "Action réservée au Patron du compte." };
  }

  const res = await supprimerMethodePaiementInterne({
    compteId: session.compteId,
    methodeId,
  });

  if (res.success) {
    revalidatePath("/dashboard/abonnement");
  }

  return res;
}

export async function listerMethodesPaiementAction() {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Session non authentifiée." };
  }

  const data = await listerMethodesPaiementInterne(session.compteId);
  return { success: true, data };
}
