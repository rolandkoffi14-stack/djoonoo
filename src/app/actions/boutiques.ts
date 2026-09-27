"use server";

import { getCurrentSession } from "@/lib/auth";
import { prisma, getScopedPrisma } from "@/lib/prisma";
import { genererCodeBoutique, enregistrerAudit } from "@/lib/business-rules";
import { verifierStatutAbonnementPourEcriture } from "@/lib/subscription-guard";
import { revalidatePath } from "next/cache";
import { StatutBoutique } from "@prisma/client";

export interface BoutiqueActionResult {
  success: boolean;
  error?: string;
  boutique?: {
    id: string;
    code: string;
    nom: string;
    ville: string;
    statut: StatutBoutique;
  };
}

/**
 * Création d'une nouvelle boutique par le Patron (Règle 8 bis & Section 5.5)
 */
export async function creerBoutiqueAction(
  prevState: any,
  formData: FormData
): Promise<BoutiqueActionResult> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Session expirée. Veuillez vous reconnecter." };
  }

  const guard = verifierStatutAbonnementPourEcriture(session.statutAbonnement);
  if (!guard.autorise) {
    return { success: false, error: guard.erreur };
  }

  // Seul le Patron a le droit de créer une boutique (Section 2)
  if (session.role !== "patron") {
    return { success: false, error: "Action non autorisée. Seul le Patron peut créer une boutique." };
  }

  const nom = (formData.get("nom") as string)?.trim();
  const ville = (formData.get("ville") as string)?.trim();
  const adresse = (formData.get("adresse") as string)?.trim();
  const secteurActivite = (formData.get("secteur_activite") as string)?.trim() || "Commerce général";
  const telephone = (formData.get("telephone") as string)?.trim() || null;

  if (!nom || !ville || !adresse) {
    return { success: false, error: "Indique le nom, la ville et l'adresse de la boutique." };
  }

  try {
    // 1. Vérification stricte des plafonds du forfait (Section 5.5 & Décision B7)
    const compte = await prisma.comptes.findUnique({
      where: { id: session.compteId },
      include: {
        forfait: true,
        _count: { select: { boutiques: true } },
      },
    });

    if (!compte) {
      return { success: false, error: "Compte introuvable." };
    }

    const { forfait, _count } = compte;
    // Si max_boutiques !== null, vérifier le plafond (NULL = illimité)
    if (forfait.max_boutiques !== null && _count.boutiques >= forfait.max_boutiques) {
      return {
        success: false,
        error: `Limite de ton forfait atteinte : Ton forfait ${forfait.nom} autorise un maximum de ${forfait.max_boutiques} boutique(s). Passe au forfait supérieur pour ouvrir un nouveau point de vente.`,
      };
    }

    // 2. Transaction atomique avec génération séquentielle Règle 8 bis
    const nouvelleBoutique = await prisma.$transaction(async (tx) => {
      // Génération atomique de B02, B03...
      const codeBoutique = await genererCodeBoutique(tx, session.compteId);

      const boutique = await tx.boutiques.create({
        data: {
          compte_id: session.compteId,
          code: codeBoutique,
          nom,
          secteur_activite: secteurActivite,
          adresse,
          ville,
          telephone,
          statut: "actif",
        },
      });

      // Journal d'audit
      await enregistrerAudit(tx, {
        compte_id: session.compteId,
        utilisateur_id: session.userId,
        action: "creation_boutique",
        entite_concernee: "boutiques",
        entite_id: boutique.id,
        details: {
          code: boutique.code,
          nom: boutique.nom,
          ville: boutique.ville,
        },
      });

      return boutique;
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/boutiques");

    return {
      success: true,
      boutique: {
        id: nouvelleBoutique.id,
        code: nouvelleBoutique.code,
        nom: nouvelleBoutique.nom,
        ville: nouvelleBoutique.ville,
        statut: nouvelleBoutique.statut,
      },
    };
  } catch (err: any) {
    console.error("Erreur création boutique :", err);
    return { success: false, error: "Erreur lors de la création : " + (err.message || "Erreur base de données") };
  }
}

/**
 * Changement de statut d'une boutique (actif / inactif — Section 8 bis)
 */
export async function changerStatutBoutiqueAction(
  boutiqueId: string,
  nouveauStatut: StatutBoutique
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentSession();
  if (!session || session.role !== "patron") {
    return { success: false, error: "Action réservée au Patron." };
  }

  const guard = verifierStatutAbonnementPourEcriture(session.statutAbonnement);
  if (!guard.autorise) {
    return { success: false, error: guard.erreur };
  }

  try {
    const scoped = getScopedPrisma(session.compteId);
    const boutique = await scoped.boutiques.findFirst({
      where: { id: boutiqueId },
    });

    if (!boutique) {
      return { success: false, error: "Boutique introuvable." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.boutiques.update({
        where: { id: boutiqueId },
        data: { statut: nouveauStatut },
      });

      await enregistrerAudit(tx, {
        compte_id: session.compteId,
        utilisateur_id: session.userId,
        action: nouveauStatut === "actif" ? "reactivation_boutique" : "desactivation_boutique",
        entite_concernee: "boutiques",
        entite_id: boutiqueId,
        details: {
          code: boutique.code,
          ancien_statut: boutique.statut,
          nouveau_statut: nouveauStatut,
        },
      });
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/boutiques");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export interface ModifierBoutiquePayload {
  nom: string;
  ville: string;
  adresse: string;
  secteur_activite?: string;
  telephone?: string | null;
}

/**
 * Modification des coordonnées d'une boutique par le Patron
 * Le code interne (B01, B02...) reste strictement immuable (Règle 8).
 */
export async function modifierBoutiqueAction(
  boutiqueId: string,
  payload: ModifierBoutiquePayload
): Promise<BoutiqueActionResult> {
  const session = await getCurrentSession();
  if (!session || session.role !== "patron") {
    return { success: false, error: "Action non autorisée. Seul le Patron peut modifier une boutique." };
  }

  const guard = verifierStatutAbonnementPourEcriture(session.statutAbonnement);
  if (!guard.autorise) {
    return { success: false, error: guard.erreur };
  }

  const nom = payload.nom.trim();
  const ville = payload.ville.trim();
  const adresse = payload.adresse.trim();
  const secteurActivite = payload.secteur_activite?.trim() || "Commerce général";
  const telephone = payload.telephone?.trim() || null;

  if (!nom || !ville || !adresse) {
    return { success: false, error: "Le nom, la ville et l'adresse sont obligatoires." };
  }

  try {
    const scoped = getScopedPrisma(session.compteId);
    const boutiqueExistante = await scoped.boutiques.findFirst({
      where: { id: boutiqueId },
    });

    if (!boutiqueExistante) {
      return { success: false, error: "Boutique introuvable." };
    }

    const boutiqueMaj = await prisma.$transaction(async (tx) => {
      const maj = await tx.boutiques.update({
        where: { id: boutiqueId },
        data: {
          nom,
          ville,
          adresse,
          secteur_activite: secteurActivite,
          telephone,
        },
      });

      await enregistrerAudit(tx, {
        compte_id: session.compteId,
        utilisateur_id: session.userId,
        action: "modification_boutique",
        entite_concernee: "boutiques",
        entite_id: boutiqueId,
        details: {
          code: maj.code,
          ancien_nom: boutiqueExistante.nom,
          nouveau_nom: nom,
          ancienne_ville: boutiqueExistante.ville,
          nouvelle_ville: ville,
        },
      });

      return maj;
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/boutiques");

    return {
      success: true,
      boutique: {
        id: boutiqueMaj.id,
        code: boutiqueMaj.code,
        nom: boutiqueMaj.nom,
        ville: boutiqueMaj.ville,
        statut: boutiqueMaj.statut,
      },
    };
  } catch (err: any) {
    console.error("Erreur modifierBoutiqueAction :", err);
    return { success: false, error: err.message || "Erreur lors de la mise à jour de la boutique." };
  }
}

