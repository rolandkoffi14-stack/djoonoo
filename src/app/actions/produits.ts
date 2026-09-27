"use server";

import { getCurrentSession } from "@/lib/auth";
import { prisma, getScopedPrisma } from "@/lib/prisma";
import { enregistrerAudit, genererCodeSKU } from "@/lib/business-rules";
import { verifierStatutAbonnementPourEcriture } from "@/lib/subscription-guard";
import { revalidatePath } from "next/cache";

export interface ProduitActionResult {
  success: boolean;
  error?: string;
  produit?: {
    id: string;
    nom: string;
    prix_unitaire: number;
    quantite_stock: number;
    seuil_alerte: number;
    boutique_id: string;
    code_barre?: string | null;
  };
}

/**
 * Création d'un produit (Section 1.2, Règle 5 & Section 8 bis)
 * Accessible au Patron et au Gérant (pour sa boutique)
 */
export async function creerProduitAction(
  prevState: any,
  formData: FormData
): Promise<ProduitActionResult> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Session expirée. Veuillez vous reconnecter." };
  }

  const guard = verifierStatutAbonnementPourEcriture(session.statutAbonnement);
  if (!guard.autorise) {
    return { success: false, error: guard.erreur };
  }

  // Seuls le Patron et le Gérant ont le droit d'ajouter des produits (Section 2)
  if (session.role === "vendeur") {
    return {
      success: false,
      error: "Action non autorisée. Les vendeurs peuvent uniquement consulter le stock disponible.",
    };
  }

  const nom = (formData.get("nom") as string)?.trim();
  const prixUnitaireRaw = formData.get("prix_unitaire") as string;
  const quantiteInitialeRaw = formData.get("quantite_initiale") as string;
  const seuilAlerteRaw = formData.get("seuil_alerte") as string;
  const codeBarreSaisi = (formData.get("code_barre") as string)?.trim() || null;
  let boutiqueId = (formData.get("boutique_id") as string)?.trim();

  // Le Gérant est strictement limité à sa propre boutique
  if (session.role === "gerant") {
    if (!session.boutiqueId) {
      return { success: false, error: "Boutique d'affectation du gérant introuvable." };
    }
    boutiqueId = session.boutiqueId;
  }

  if (!nom || !prixUnitaireRaw || !boutiqueId) {
    return { success: false, error: "Indique le nom, le prix unitaire et la boutique." };
  }

  const prixUnitaire = parseInt(prixUnitaireRaw, 10);
  const quantiteStock = quantiteInitialeRaw ? Math.max(0, parseInt(quantiteInitialeRaw, 10)) : 0;
  const seuilAlerte = seuilAlerteRaw ? Math.max(0, parseInt(seuilAlerteRaw, 10)) : 5;

  if (isNaN(prixUnitaire) || prixUnitaire <= 0) {
    return { success: false, error: "Le prix unitaire doit être un montant entier strictement positif en FCFA." };
  }

  try {
    const scoped = getScopedPrisma(session.compteId);

    // 1. Vérification que la boutique cible existe et est active (Section 8 bis)
    const boutique = await scoped.boutiques.findFirst({
      where: { id: boutiqueId, compte_id: session.compteId },
    });

    if (!boutique) {
      return { success: false, error: "Boutique introuvable dans ton entreprise." };
    }

    if (boutique.statut === "inactif") {
      return {
        success: false,
        error: "Cette boutique est inactive. Impossible d'ajouter de nouveaux produits (Section 8 bis).",
      };
    }

    // Vérification d'unicité du code SKU si saisi manuellement
    if (codeBarreSaisi) {
      const codeExistant = await scoped.produits.findFirst({
        where: { boutique_id: boutiqueId, code_barre: codeBarreSaisi },
      });
      if (codeExistant) {
        return {
          success: false,
          error: `Le code SKU / code-barres "${codeBarreSaisi}" est déjà attribué au produit "${codeExistant.nom}".`,
        };
      }
    }

    // 2. Création transactionnelle avec génération de SKU si non renseigné
    const nouveauProduit = await prisma.$transaction(async (tx) => {
      const codeBarreFinal = codeBarreSaisi || (await genererCodeSKU(tx, boutique.id, boutique.code));

      const produit = await tx.produits.create({
        data: {
          nom,
          prix_unitaire: prixUnitaire,
          quantite_stock: quantiteStock,
          seuil_alerte: seuilAlerte,
          code_barre: codeBarreFinal,
          boutique_id: boutiqueId,
          compte_id: session.compteId, // dénormalisé et figé à la création
        },
      });

      await enregistrerAudit(tx, {
        compte_id: session.compteId,
        utilisateur_id: session.userId,
        action: "creation_produit",
        entite_concernee: "produits",
        entite_id: produit.id,
        details: {
          nom: produit.nom,
          prix_unitaire: produit.prix_unitaire,
          quantite_stock: produit.quantite_stock,
          seuil_alerte: produit.seuil_alerte,
          code_barre: produit.code_barre,
          boutique_id: boutique.id,
          boutique_code: boutique.code,
        },
      });

      return produit;
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/produits");

    return {
      success: true,
      produit: {
        id: nouveauProduit.id,
        nom: nouveauProduit.nom,
        prix_unitaire: nouveauProduit.prix_unitaire,
        quantite_stock: nouveauProduit.quantite_stock,
        seuil_alerte: nouveauProduit.seuil_alerte,
        boutique_id: nouveauProduit.boutique_id,
        code_barre: nouveauProduit.code_barre,
      },
    };
  } catch (err: any) {
    console.error("Erreur création produit :", err);
    return { success: false, error: "Erreur serveur lors de la création : " + (err.message || "") };
  }
}

/**
 * Modification d'un produit (Nom, Prix, Seuil d'alerte)
 */
export async function modifierProduitAction(
  prevState: any,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentSession();
  if (!session || session.role === "vendeur") {
    return { success: false, error: "Action non autorisée." };
  }

  const guard = verifierStatutAbonnementPourEcriture(session.statutAbonnement);
  if (!guard.autorise) {
    return { success: false, error: guard.erreur };
  }

  const produitId = (formData.get("produit_id") as string)?.trim();
  const nom = (formData.get("nom") as string)?.trim();
  const prixUnitaireRaw = formData.get("prix_unitaire") as string;
  const seuilAlerteRaw = formData.get("seuil_alerte") as string;
  const codeBarreSaisi = (formData.get("code_barre") as string)?.trim() || null;

  if (!produitId || !nom || !prixUnitaireRaw) {
    return { success: false, error: "Tous les champs obligatoires doivent être renseignés." };
  }

  const prixUnitaire = parseInt(prixUnitaireRaw, 10);
  const seuilAlerte = seuilAlerteRaw ? Math.max(0, parseInt(seuilAlerteRaw, 10)) : 5;

  if (isNaN(prixUnitaire) || prixUnitaire <= 0) {
    return { success: false, error: "Le prix unitaire doit être un montant entier strictement positif en FCFA." };
  }

  try {
    const scoped = getScopedPrisma(session.compteId);
    const produit = await scoped.produits.findFirst({
      where: { id: produitId, compte_id: session.compteId },
      include: { boutique: true },
    });

    if (!produit) {
      return { success: false, error: "Produit introuvable." };
    }

    if (session.role === "gerant" && produit.boutique_id !== session.boutiqueId) {
      return { success: false, error: "Tu ne peux modifier que les produits de ta propre boutique." };
    }

    if (produit.boutique.statut === "inactif") {
      return { success: false, error: "Cette boutique est inactive. Modification impossible." };
    }

    if (codeBarreSaisi && codeBarreSaisi !== produit.code_barre) {
      const codeExistant = await scoped.produits.findFirst({
        where: {
          boutique_id: produit.boutique_id,
          code_barre: codeBarreSaisi,
          id: { not: produitId },
        },
      });
      if (codeExistant) {
        return {
          success: false,
          error: `Le code SKU / code-barres "${codeBarreSaisi}" est déjà attribué au produit "${codeExistant.nom}".`,
        };
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.produits.update({
        where: { id: produitId },
        data: {
          nom,
          prix_unitaire: prixUnitaire,
          seuil_alerte: seuilAlerte,
          code_barre: codeBarreSaisi || produit.code_barre,
        },
      });

      await enregistrerAudit(tx, {
        compte_id: session.compteId,
        utilisateur_id: session.userId,
        action: "modification_produit",
        entite_concernee: "produits",
        entite_id: produitId,
        details: {
          ancien_nom: produit.nom,
          nouveau_nom: nom,
          ancien_prix: produit.prix_unitaire,
          nouveau_prix: prixUnitaire,
          ancien_seuil: produit.seuil_alerte,
          nouveau_seuil: seuilAlerte,
        },
      });
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/produits");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Réapprovisionnement de stock (Section 1.2 & Traçabilité Section 7)
 */
export async function reapprovisionnerStockAction(
  prevState: any,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentSession();
  if (!session || session.role === "vendeur") {
    return { success: false, error: "Action non autorisée. Seuls le Patron et le Gérant peuvent réapprovisionner le stock." };
  }

  const guard = verifierStatutAbonnementPourEcriture(session.statutAbonnement);
  if (!guard.autorise) {
    return { success: false, error: guard.erreur };
  }

  const produitId = (formData.get("produit_id") as string)?.trim();
  const quantiteAjouteeRaw = formData.get("quantite_ajoutee") as string;
  const motif = (formData.get("motif") as string)?.trim() || "Livraison fournisseur";

  if (!produitId || !quantiteAjouteeRaw) {
    return { success: false, error: "Indique le produit et la quantité à ajouter." };
  }

  const quantiteAjoutee = parseInt(quantiteAjouteeRaw, 10);
  if (isNaN(quantiteAjoutee) || quantiteAjoutee <= 0) {
    return { success: false, error: "La quantité ajoutée doit être un entier supérieur à zéro." };
  }

  try {
    const scoped = getScopedPrisma(session.compteId);
    const produit = await scoped.produits.findFirst({
      where: { id: produitId, compte_id: session.compteId },
      include: { boutique: true },
    });

    if (!produit) {
      return { success: false, error: "Produit introuvable." };
    }

    if (session.role === "gerant" && produit.boutique_id !== session.boutiqueId) {
      return { success: false, error: "Tu ne peux réapprovisionner que les produits de ta propre boutique." };
    }

    if (produit.boutique.statut === "inactif") {
      return { success: false, error: "Cette boutique est inactive. Réapprovisionnement impossible (Section 8 bis)." };
    }

    await prisma.$transaction(async (tx) => {
      const produitMisAJour = await tx.produits.update({
        where: { id: produitId },
        data: {
          quantite_stock: { increment: quantiteAjoutee },
        },
      });

      await enregistrerAudit(tx, {
        compte_id: session.compteId,
        utilisateur_id: session.userId,
        action: "reapprovisionnement_stock",
        entite_concernee: "produits",
        entite_id: produitId,
        details: {
          produit_nom: produit.nom,
          quantite_ajoutee: quantiteAjoutee,
          ancien_stock: produit.quantite_stock,
          nouveau_stock: produitMisAJour.quantite_stock,
          motif,
        },
      });
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/produits");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Suppression d'un produit (Interdite si des ventes lui sont rattachées)
 */
export async function supprimerProduitAction(
  produitId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentSession();
  if (!session || (session.role !== "patron" && session.role !== "gerant")) {
    return { success: false, error: "Action non autorisée." };
  }

  const guard = verifierStatutAbonnementPourEcriture(session.statutAbonnement);
  if (!guard.autorise) {
    return { success: false, error: guard.erreur };
  }

  try {
    const scoped = getScopedPrisma(session.compteId);
    const produit = await scoped.produits.findFirst({
      where: { id: produitId, compte_id: session.compteId },
      include: {
        _count: {
          select: { lignes_vente: true },
        },
      },
    });

    if (!produit) {
      return { success: false, error: "Produit introuvable." };
    }

    if (session.role === "gerant" && produit.boutique_id !== session.boutiqueId) {
      return { success: false, error: "Action réservée pour ta propre boutique." };
    }

    // Intégrité comptable : Si le produit a déjà été vendu, refus de suppression définitive
    if (produit._count.lignes_vente > 0) {
      return {
        success: false,
        error: "Ce produit figure déjà dans des factures de vente enregistrées. Pour préserver l'historique comptable et la conformité, il ne peut pas être supprimé. Tu peux ajuster son stock à 0.",
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.produits.delete({
        where: { id: produitId },
      });

      await enregistrerAudit(tx, {
        compte_id: session.compteId,
        utilisateur_id: session.userId,
        action: "suppression_produit",
        entite_concernee: "produits",
        entite_id: produitId,
        details: {
          nom: produit.nom,
          dernier_prix: produit.prix_unitaire,
        },
      });
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/produits");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
