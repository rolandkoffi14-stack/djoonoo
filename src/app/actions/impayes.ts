"use server";

import { getCurrentSession } from "@/lib/auth";
import { prisma, getScopedPrisma } from "@/lib/prisma";
import { enregistrerAudit } from "@/lib/business-rules";
import { revalidatePath } from "next/cache";
import { ModePaiement, StatutPaiementVente } from "@prisma/client";

export interface ReglementImpayePayload {
  vente_id: string;
  montant: number; // FCFA
  mode_paiement: ModePaiement;
}

export interface ReglementResult {
  success: boolean;
  error?: string;
  nouveauStatut?: StatutPaiementVente;
  resteDu?: number;
}

/**
 * Enregistrement transactionnel atomique d'un règlement sur une créance (Règle 4, Section 1.4 & Décision D13)
 * Ouvert au Vendeur, Gérant et Patron
 */
export async function enregistrerReglementImpayeAction(
  payload: ReglementImpayePayload
): Promise<ReglementResult> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Session expirée. Veuillez vous reconnecter." };
  }

  const { vente_id, montant, mode_paiement } = payload;

  if (!vente_id || !montant || montant <= 0) {
    return { success: false, error: "Montant invalide ou facture non spécifiée." };
  }

  try {
    const scoped = getScopedPrisma(session.compteId);

    // 1. Récupération de la vente et vérification des droits
    const vente = await scoped.ventes.findFirst({
      where: {
        id: vente_id,
        compte_id: session.compteId,
      },
      include: {
        paiements: true,
        boutique: true,
      },
    });

    if (!vente) {
      return { success: false, error: "Facture introuvable." };
    }

    if (vente.statut_vente === "annulee") {
      return { success: false, error: "Cette facture a été annulée. Aucun paiement ne peut y être affecté." };
    }

    // Le Gérant et le Vendeur sont restreints à leur boutique
    if (session.role !== "patron" && session.boutiqueId !== vente.boutique_id) {
      return { success: false, error: "Action non autorisée pour cette boutique." };
    }

    // 2. Calcul du reste dû
    const totalDejaPaye = vente.paiements.reduce((acc, p) => acc + p.montant, 0);
    const resteDu = Math.max(0, vente.montant_total - totalDejaPaye);

    if (resteDu <= 0 || vente.statut_paiement === "paye") {
      return { success: false, error: "Cette facture est déjà intégralement soldée." };
    }

    // Contrôle strict anti-surpaiement
    if (montant > resteDu) {
      return {
        success: false,
        error: `Le montant versé (${montant.toLocaleString("fr-FR")} FCFA) dépasse le solde restant dû (${resteDu.toLocaleString("fr-FR")} FCFA).`,
      };
    }

    // 3. Transaction atomique ACID Prisma (Règle 4)
    const nouveauResteDu = resteDu - montant;
    const nouveauStatut: StatutPaiementVente = nouveauResteDu === 0 ? "paye" : "partiel";

    await prisma.$transaction(async (tx) => {
      // A. Insertion du nouveau paiement
      await tx.paiements.create({
        data: {
          vente_id: vente.id,
          compte_id: session.compteId,
          montant: montant,
          mode_paiement: mode_paiement,
          enregistre_par: session.userId,
        },
      });

      // B. Recalcul et mise à jour automatique du statut de paiement
      await tx.ventes.update({
        where: { id: vente.id },
        data: {
          statut_paiement: nouveauStatut,
        },
      });

      // C. Journal d'audit
      await enregistrerAudit(tx, {
        compte_id: session.compteId,
        utilisateur_id: session.userId,
        action: "reglement_impaye",
        entite_concernee: "ventes",
        entite_id: vente.id,
        details: {
          numero_facture: vente.numero_facture,
          montant_verse: montant,
          ancien_reste: resteDu,
          nouveau_reste: nouveauResteDu,
          nouveau_statut: nouveauStatut,
          mode_paiement: mode_paiement,
        },
      });
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/ventes");
    revalidatePath("/dashboard/ventes/impayes");

    return {
      success: true,
      nouveauStatut,
      resteDu: nouveauResteDu,
    };
  } catch (err: any) {
    console.error("Erreur enregistrement règlement :", err);
    return { success: false, error: "Erreur serveur : " + (err.message || "Impossible d'enregistrer le règlement.") };
  }
}

/**
 * Annulation d'une vente non payée avec restauration atomique des stocks (Règle 10 & Section 1 bis)
 * Réservé au Gérant et au Patron (interdit au Vendeur)
 */
export async function annulerVenteImpayeeAction(
  venteId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Session expirée. Veuillez vous reconnecter." };
  }

  // Contrôle de permission : Patron ou Gérant uniquement (Section 2)
  if (session.role === "vendeur") {
    return {
      success: false,
      error: "Permission insuffisante : seuls les Patrons et les Gérants sont autorisés à annuler une vente (Section 2).",
    };
  }

  try {
    const scoped = getScopedPrisma(session.compteId);

    const vente = await scoped.ventes.findFirst({
      where: {
        id: venteId,
        compte_id: session.compteId,
      },
      include: {
        lignes_vente: true,
        paiements: true,
      },
    });

    if (!vente) {
      return { success: false, error: "Facture introuvable." };
    }

    if (vente.statut_vente === "annulee") {
      return { success: false, error: "Cette vente a déjà été annulée." };
    }

    if (session.role === "gerant" && session.boutiqueId !== vente.boutique_id) {
      return { success: false, error: "Tu n'as pas accès aux ventes de cette boutique." };
    }

    // RÈGLE 10 & SECTION 1 BIS : Vérification stricte que la vente est 100% impayée
    // Une vente ayant déjà reçu au moins un paiement ne peut pas être annulée en MVP
    if (vente.statut_paiement !== "impaye" || vente.paiements.length > 0) {
      return {
        success: false,
        error:
          "Cette vente a déjà reçu un ou plusieurs règlements. Conformément aux règles de djoonoo (Règle 10 & Section 1 bis), les remboursements monétaires ne sont pas pris en charge au MVP.",
      };
    }

    // Transaction atomique Prisma ACID (Règle 10)
    await prisma.$transaction(async (tx) => {
      // 1. Restauration atomique du stock pour chaque ligne de vente
      for (const ligne of vente.lignes_vente) {
        await tx.$queryRaw`
          UPDATE produits
          SET quantite_stock = quantite_stock + ${ligne.quantite}
          WHERE id = ${ligne.produit_id}
        `;
      }

      // 2. Marquage de la vente comme annulée
      await tx.ventes.update({
        where: { id: vente.id },
        data: {
          statut_vente: "annulee",
          annulee_par: session.userId,
          date_annulation: new Date(),
        },
      });

      // 3. Traçabilité dans le journal d'audit
      await enregistrerAudit(tx, {
        compte_id: session.compteId,
        utilisateur_id: session.userId,
        action: "annulation_vente",
        entite_concernee: "ventes",
        entite_id: vente.id,
        details: {
          numero_facture: vente.numero_facture,
          motif: "Annulation vente impayée",
          nb_lignes_restaurees: vente.lignes_vente.length,
        },
      });
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/caisse");
    revalidatePath("/dashboard/produits");
    revalidatePath("/dashboard/ventes");
    revalidatePath("/dashboard/ventes/impayes");

    return { success: true };
  } catch (err: any) {
    console.error("Erreur annulation vente :", err);
    return { success: false, error: "Erreur serveur : " + (err.message || "Impossible d'annuler la vente.") };
  }
}
