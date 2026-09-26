"use server";

import { getCurrentSession } from "@/lib/auth";
import { prisma, getScopedPrisma } from "@/lib/prisma";
import { enregistrerAudit } from "@/lib/business-rules";
import { revalidatePath } from "next/cache";

export interface ClientSearchResult {
  id: string;
  nom: string;
  telephone: string;
  nbVentes: number;
}

export interface ClientDetailPayload {
  id: string;
  nom: string;
  telephone: string;
  date_creation: string;
  stats: {
    totalDepense: number;
    totalPaye: number;
    totalResteDu: number;
    nbAchats: number;
  };
  ventes: {
    id: string;
    numero_facture: string;
    date_vente: string;
    boutique_nom: string;
    boutique_code: string;
    montant_total: number;
    montant_paye: number;
    reste_du: number;
    statut_paiement: string;
    statut_vente: string;
    lignes: {
      produit_nom: string;
      quantite: number;
      prix_unitaire: number;
      total: number;
    }[];
  }[];
}

/**
 * Recherche instantanée par numéro de téléphone pour rapprochement préalable (Décision C11)
 */
export async function rechercherClientsParTelephoneAction(
  telephone: string
): Promise<{ success: boolean; clients?: ClientSearchResult[]; error?: string }> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Session expirée." };
  }

  const cleanTel = telephone.trim();
  if (!cleanTel || cleanTel.length < 3) {
    return { success: true, clients: [] };
  }

  try {
    const scoped = getScopedPrisma(session.compteId);

    // Recherche s'appuyant sur l'index @@index([compte_id, telephone])
    const resultats = await scoped.clients.findMany({
      where: {
        compte_id: session.compteId,
        telephone: {
          contains: cleanTel,
        },
      },
      take: 5,
      include: {
        _count: {
          select: { ventes: true },
        },
      },
      orderBy: { nom: "asc" },
    });

    return {
      success: true,
      clients: resultats.map((c) => ({
        id: c.id,
        nom: c.nom,
        telephone: c.telephone,
        nbVentes: c._count.ventes,
      })),
    };
  } catch (err: any) {
    console.error("Erreur rechercherClientsParTelephoneAction :", err);
    return { success: false, error: "Impossible d'effectuer la recherche." };
  }
}

/**
 * Création d'un client rattaché au compte Patron (Section 1.5)
 */
export async function creerClientAction(payload: {
  nom: string;
  telephone: string;
}): Promise<{ success: boolean; client?: { id: string; nom: string; telephone: string }; error?: string }> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Session expirée." };
  }

  const cleanNom = payload.nom.trim();
  const cleanTel = payload.telephone.trim();

  if (!cleanNom || !cleanTel) {
    return { success: false, error: "Le nom et le numéro de téléphone sont obligatoires." };
  }

  try {
    const scoped = getScopedPrisma(session.compteId);

    const client = await scoped.clients.create({
      data: {
        compte_id: session.compteId,
        nom: cleanNom,
        telephone: cleanTel,
      },
    });

    await enregistrerAudit(prisma, {
      compte_id: session.compteId,
      utilisateur_id: session.userId,
      action: "creation_client",
      entite_concernee: "clients",
      entite_id: client.id,
      details: { nom: client.nom, telephone: client.telephone },
    });

    revalidatePath("/dashboard/clients");
    revalidatePath("/dashboard/caisse");

    return {
      success: true,
      client: {
        id: client.id,
        nom: client.nom,
        telephone: client.telephone,
      },
    };
  } catch (err: any) {
    console.error("Erreur creerClientAction :", err);
    return { success: false, error: "Erreur serveur : " + (err.message || "Impossible de créer le client.") };
  }
}

/**
 * Modification d'une fiche client (Patron et Gérant)
 */
export async function modifierClientAction(
  clientId: string,
  payload: { nom: string; telephone: string }
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Session expirée." };
  }

  if (session.role === "vendeur") {
    return { success: false, error: "Permission insuffisante : la modification d'un profil client est réservée aux Gérants et Patrons." };
  }

  const cleanNom = payload.nom.trim();
  const cleanTel = payload.telephone.trim();

  if (!cleanNom || !cleanTel) {
    return { success: false, error: "Le nom et le numéro de téléphone sont obligatoires." };
  }

  try {
    const scoped = getScopedPrisma(session.compteId);

    const clientExistant = await scoped.clients.findFirst({
      where: { id: clientId, compte_id: session.compteId },
    });

    if (!clientExistant) {
      return { success: false, error: "Client introuvable." };
    }

    await scoped.clients.update({
      where: { id: clientId },
      data: {
        nom: cleanNom,
        telephone: cleanTel,
      },
    });

    await enregistrerAudit(prisma, {
      compte_id: session.compteId,
      utilisateur_id: session.userId,
      action: "modification_client",
      entite_concernee: "clients",
      entite_id: clientId,
      details: {
        ancien_nom: clientExistant.nom,
        nouveau_nom: cleanNom,
        ancien_tel: clientExistant.telephone,
        nouveau_tel: cleanTel,
      },
    });

    revalidatePath("/dashboard/clients");
    revalidatePath("/dashboard/caisse");

    return { success: true };
  } catch (err: any) {
    console.error("Erreur modifierClientAction :", err);
    return { success: false, error: "Impossible de mettre à jour le client." };
  }
}

/**
 * Récupération de la fiche client détaillée et de son historique multi-boutiques consolidé (Section 1.5)
 */
export async function getFicheClientDetailleeAction(
  clientId: string
): Promise<{ success: boolean; client?: ClientDetailPayload; error?: string }> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Session expirée." };
  }

  try {
    const scoped = getScopedPrisma(session.compteId);

    const client = await scoped.clients.findFirst({
      where: { id: clientId, compte_id: session.compteId },
      include: {
        ventes: {
          orderBy: { date_vente: "desc" },
          include: {
            boutique: { select: { nom: true, code: true } },
            paiements: { select: { montant: true } },
            lignes_vente: {
              include: {
                produit: { select: { nom: true } },
              },
            },
          },
        },
      },
    });

    if (!client) {
      return { success: false, error: "Client introuvable." };
    }

    let totalDepense = 0;
    let totalPaye = 0;
    let totalResteDu = 0;

    const ventesFormatees = client.ventes.map((v) => {
      const montantPaye = v.paiements.reduce((acc, p) => acc + p.montant, 0);
      const resteDu = Math.max(0, v.montant_total - montantPaye);

      if (v.statut_vente === "validee") {
        totalDepense += v.montant_total;
        totalPaye += montantPaye;
        totalResteDu += resteDu;
      }

      return {
        id: v.id,
        numero_facture: v.numero_facture,
        date_vente: v.date_vente.toISOString(),
        boutique_nom: v.boutique.nom,
        boutique_code: v.boutique.code,
        montant_total: v.montant_total,
        montant_paye: montantPaye,
        reste_du: resteDu,
        statut_paiement: v.statut_paiement,
        statut_vente: v.statut_vente,
        lignes: v.lignes_vente.map((l) => ({
          produit_nom: l.produit.nom,
          quantite: l.quantite,
          prix_unitaire: l.prix_unitaire_a_la_vente,
          total: l.quantite * l.prix_unitaire_a_la_vente,
        })),
      };
    });

    return {
      success: true,
      client: {
        id: client.id,
        nom: client.nom,
        telephone: client.telephone,
        date_creation: client.date_creation.toISOString(),
        stats: {
          totalDepense,
          totalPaye,
          totalResteDu,
          nbAchats: client.ventes.filter((v) => v.statut_vente === "validee").length,
        },
        ventes: ventesFormatees,
      },
    };
  } catch (err: any) {
    console.error("Erreur getFicheClientDetailleeAction :", err);
    return { success: false, error: "Impossible de charger la fiche client." };
  }
}
