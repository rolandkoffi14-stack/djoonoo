"use server";

import { getCurrentSession } from "@/lib/auth";
import { prisma, getScopedPrisma } from "@/lib/prisma";
import {
  decrementerStockAtomique,
  genererNumeroFacture,
  enregistrerAudit,
  StockInsuffisantError,
} from "@/lib/business-rules";
import { verifierStatutAbonnementPourEcriture } from "@/lib/subscription-guard";
import { revalidatePath } from "next/cache";
import { ModePaiement, StatutPaiementVente } from "@prisma/client";

export interface LigneVenteInput {
  produit_id: string;
  quantite: number;
  imei1?: string | null;
  imei2?: string | null;
}

export interface EnregistrerVentePayload {
  boutique_id: string;
  client_id?: string | null;
  lignes: LigneVenteInput[];
  remise?: number; // FCFA
  paiement?: {
    montant: number; // FCFA
    mode_paiement: ModePaiement;
  } | null;
  cle_idempotence?: string;
}

export interface RecuVenteData {
  id: string;
  numero_facture: string;
  date_vente: string;
  entreprise: {
    nom: string;
    ifu?: string | null;
    rccm?: string | null;
    telephone_principal: string;
    telephone_secondaire?: string | null;
    adresse_siege?: string | null;
    ville: string;
  };
  boutique: {
    code: string;
    nom: string;
    ville: string;
    adresse: string;
    telephone: string | null;
  };
  vendeur: {
    nom: string;
  };
  client: {
    nom: string;
    telephone: string;
  } | null;
  lignes: {
    produit_nom: string;
    quantite: number;
    prix_unitaire: number;
    total_ligne: number;
    imei1?: string | null;
    imei2?: string | null;
  }[];
  montant_brut: number;
  montant_remise: number;
  montant_total: number;
  montant_paye: number;
  monnaie_rendue: number;
  statut_paiement: StatutPaiementVente;
  mode_paiement?: ModePaiement;
}

export interface VenteActionResult {
  success: boolean;
  error?: string;
  recu?: RecuVenteData;
}

/**
 * Enregistrement transactionnel atomique d'une vente (Section 1.3, Règles 1, 3, 4, 6, 7, 9)
 */
export async function enregistrerVenteAction(
  payload: EnregistrerVentePayload
): Promise<VenteActionResult> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Session expirée. Veuillez vous reconnecter." };
  }

  const guard = verifierStatutAbonnementPourEcriture(session.statutAbonnement);
  if (!guard.autorise) {
    return { success: false, error: guard.erreur };
  }

  const { boutique_id, client_id, lignes, remise = 0, paiement, cle_idempotence } = payload;

  if (!boutique_id || !lignes || lignes.length === 0) {
    return { success: false, error: "Le panier est vide ou la boutique n'est pas spécifiée." };
  }

  // Contrôle de permission sur la boutique :
  // Le gérant et le vendeur sont strictement verrouillés sur leur boutique affectée
  if (session.role !== "patron" && session.boutiqueId !== boutique_id) {
    return { success: false, error: "Action non autorisée pour cette boutique." };
  }

  try {
    const scoped = getScopedPrisma(session.compteId);

    // 1. Récupération des informations de l'entreprise
    const compte = await prisma.comptes.findUnique({
      where: { id: session.compteId },
      select: {
        code: true,
        nom_entreprise: true,
        ifu: true,
        rccm: true,
        telephone_principal: true,
        telephone_secondaire: true,
        adresse_siege: true,
        ville: true,
      },
    });

    if (!compte) {
      return { success: false, error: "Compte entreprise introuvable." };
    }

    // 2. Règle 6 : Idempotence — Si la clé existe déjà, retourner la vente existante
    if (cle_idempotence) {
      const venteExistante = await scoped.ventes.findUnique({
        where: { cle_idempotence },
        include: {
          boutique: true,
          utilisateur: true,
          client: true,
          lignes_vente: { include: { produit: true } },
          paiements: true,
        },
      });

      if (venteExistante) {
        const montantPayeExistant = venteExistante.paiements.reduce(
          (acc, p) => acc + p.montant,
          0
        );

        return {
          success: true,
          recu: {
            id: venteExistante.id,
            numero_facture: venteExistante.numero_facture,
            date_vente: venteExistante.date_vente.toISOString(),
            entreprise: {
              nom: compte.nom_entreprise,
              ifu: compte.ifu,
              rccm: compte.rccm,
              telephone_principal: compte.telephone_principal,
              telephone_secondaire: compte.telephone_secondaire,
              adresse_siege: compte.adresse_siege,
              ville: compte.ville,
            },
            boutique: {
              code: venteExistante.boutique.code,
              nom: venteExistante.boutique.nom,
              ville: venteExistante.boutique.ville,
              adresse: venteExistante.boutique.adresse,
              telephone: venteExistante.boutique.telephone,
            },
            vendeur: { nom: venteExistante.utilisateur.nom },
            client: venteExistante.client
              ? { nom: venteExistante.client.nom, telephone: venteExistante.client.telephone }
              : null,
            lignes: venteExistante.lignes_vente.map((l) => ({
              produit_nom: l.produit.nom,
              quantite: l.quantite,
              prix_unitaire: l.prix_unitaire_a_la_vente,
              total_ligne: l.quantite * l.prix_unitaire_a_la_vente,
              imei1: l.imei1,
              imei2: l.imei2,
            })),
            montant_brut: venteExistante.montant_total + venteExistante.montant_remise,
            montant_remise: venteExistante.montant_remise,
            montant_total: venteExistante.montant_total,
            montant_paye: montantPayeExistant,
            monnaie_rendue: 0,
            statut_paiement: venteExistante.statut_paiement,
            mode_paiement: venteExistante.paiements[0]?.mode_paiement,
          },
        };
      }
    }

    const boutique = await scoped.boutiques.findFirst({
      where: { id: boutique_id, compte_id: session.compteId },
    });

    if (!boutique) {
      return { success: false, error: "Boutique introuvable." };
    }

    // Règle 8 bis : Boutique inactive -> Aucune vente possible
    if (boutique.statut === "inactif") {
      return {
        success: false,
        error: "Cette boutique est désactivée. Aucune nouvelle vente ne peut y être enregistrée (Section 8 bis).",
      };
    }

    // 3. Validation et récupération des articles
    const produitsIds = lignes.map((l) => l.produit_id);
    const produitsDb = await scoped.produits.findMany({
      where: {
        id: { in: produitsIds },
        boutique_id: boutique_id,
        compte_id: session.compteId,
      },
    });

    if (produitsDb.length !== produitsIds.length) {
      return { success: false, error: "Certains articles sélectionnés sont introuvables." };
    }

    const produitsMap = new Map(produitsDb.map((p) => [p.id, p]));

    // Vérification préalable des stocks et quantités
    for (const ligne of lignes) {
      if (ligne.quantite <= 0) {
        return { success: false, error: "La quantité de chaque article doit être au moins de 1." };
      }
      const prod = produitsMap.get(ligne.produit_id)!;
      if (prod.quantite_stock < ligne.quantite) {
        return {
          success: false,
          error: `Stock insuffisant pour "${prod.nom}" : ${prod.quantite_stock} restant(s), ${ligne.quantite} demandé(s).`,
        };
      }
    }

    // 4. Calcul serveur strict du montant total (Règle 9)
    const sousTotal = lignes.reduce((acc, l) => {
      const p = produitsMap.get(l.produit_id)!;
      return acc + p.prix_unitaire * l.quantite;
    }, 0);

    const remiseAppliquee = Math.max(0, remise);
    const montantTotal = Math.max(0, sousTotal - remiseAppliquee);

    // Calcul du versement et de la monnaie rendue
    const montantVerse = paiement?.montant ? Math.max(0, paiement.montant) : 0;
    const montantCouvrantVente = Math.min(montantVerse, montantTotal);
    const monnaieRendue =
      paiement?.mode_paiement === "especes" && montantVerse > montantTotal
        ? montantVerse - montantTotal
        : 0;

    // Détermination automatique du statut de paiement (Règle 4)
    let statutPaiement: StatutPaiementVente = "impaye";
    if (montantCouvrantVente >= montantTotal && montantTotal > 0) {
      statutPaiement = "paye";
    } else if (montantCouvrantVente > 0) {
      statutPaiement = "partiel";
    } else if (montantTotal === 0) {
      statutPaiement = "paye"; // 100% remise
    }

    // 5. Transaction atomique ACID Prisma (Règles 1, 2, 3, 7)
    const resultat = await prisma.$transaction(async (tx) => {
      // A. Règle 1 : Décrémentation atomique de stock
      for (const ligne of lignes) {
        await decrementerStockAtomique(tx, ligne.produit_id, ligne.quantite);
      }

      // B. Règle 7 : Numérotation séquentielle de facture
      const numeroFacture = await genererNumeroFacture(
        tx,
        boutique.id,
        compte.code,
        boutique.code
      );

      // C. Création de la vente
      const vente = await tx.ventes.create({
        data: {
          numero_facture: numeroFacture,
          boutique_id: boutique.id,
          compte_id: session.compteId,
          utilisateur_id: session.userId,
          client_id: client_id || null,
          montant_remise: remiseAppliquee,
          montant_total: montantTotal,
          statut_paiement: statutPaiement,
          statut_vente: "validee",
          cle_idempotence: cle_idempotence || undefined,
        },
        include: {
          client: true,
        },
      });

      // D. Règle 3 : Création des lignes de vente avec prix unitaire figé
      await tx.lignes_vente.createMany({
        data: lignes.map((l) => ({
          vente_id: vente.id,
          produit_id: l.produit_id,
          compte_id: session.compteId,
          quantite: l.quantite,
          prix_unitaire_a_la_vente: produitsMap.get(l.produit_id)!.prix_unitaire,
          imei1: l.imei1?.trim() || null,
          imei2: l.imei2?.trim() || null,
        })),
      });

      // E. Création du paiement si versement > 0
      if (montantCouvrantVente > 0 && paiement) {
        await tx.paiements.create({
          data: {
            vente_id: vente.id,
            compte_id: session.compteId,
            montant: montantCouvrantVente,
            mode_paiement: paiement.mode_paiement,
            enregistre_par: session.userId,
          },
        });
      }

      // F. Journal d'audit
      await enregistrerAudit(tx, {
        compte_id: session.compteId,
        utilisateur_id: session.userId,
        action: "enregistrement_vente",
        entite_concernee: "ventes",
        entite_id: vente.id,
        details: {
          numero_facture: vente.numero_facture,
          montant_total: vente.montant_total,
          statut_paiement: vente.statut_paiement,
          nb_lignes: lignes.length,
          montant_verse: montantVerse,
          mode_paiement: paiement?.mode_paiement,
        },
      });

      return vente;
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/caisse");
    revalidatePath("/dashboard/produits");
    revalidatePath("/dashboard/ventes");

    const recuData: RecuVenteData = {
      id: resultat.id,
      numero_facture: resultat.numero_facture,
      date_vente: resultat.date_vente.toISOString(),
      entreprise: {
        nom: compte.nom_entreprise,
        ifu: compte.ifu,
        rccm: compte.rccm,
        telephone_principal: compte.telephone_principal,
        telephone_secondaire: compte.telephone_secondaire,
        adresse_siege: compte.adresse_siege,
        ville: compte.ville,
      },
      boutique: {
        code: boutique.code,
        nom: boutique.nom,
        ville: boutique.ville,
        adresse: boutique.adresse,
        telephone: boutique.telephone,
      },
      vendeur: {
        nom: session.nom,
      },
      client: resultat.client
        ? { nom: resultat.client.nom, telephone: resultat.client.telephone }
        : null,
      lignes: lignes.map((l) => {
        const prod = produitsMap.get(l.produit_id)!;
        return {
          produit_nom: prod.nom,
          quantite: l.quantite,
          prix_unitaire: prod.prix_unitaire,
          total_ligne: prod.prix_unitaire * l.quantite,
          imei1: l.imei1?.trim() || null,
          imei2: l.imei2?.trim() || null,
        };
      }),
      montant_brut: sousTotal,
      montant_remise: remiseAppliquee,
      montant_total: montantTotal,
      montant_paye: montantCouvrantVente,
      monnaie_rendue: monnaieRendue,
      statut_paiement: statutPaiement,
      mode_paiement: paiement?.mode_paiement,
    };

    return {
      success: true,
      recu: recuData,
    };
  } catch (err: any) {
    console.error("Erreur enregistrement vente :", err);
    if (err instanceof StockInsuffisantError) {
      return { success: false, error: "Stock insuffisant lors de la validation. La vente a été annulée." };
    }
    return { success: false, error: "Erreur serveur : " + (err.message || "Impossible de finaliser la vente.") };
  }
}

/**
 * Récupère les données complètes d'un reçu de vente pour réimpression
 */
export async function getRecuVenteAction(venteId: string): Promise<VenteActionResult> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Session expirée." };
  }

  try {
    const scoped = getScopedPrisma(session.compteId);
    const vente = await scoped.ventes.findFirst({
      where: { id: venteId, compte_id: session.compteId },
      include: {
        boutique: {
          include: {
            compte: true,
          },
        },
        utilisateur: true,
        client: true,
        lignes_vente: { include: { produit: true } },
        paiements: true,
      },
    });

    if (!vente) {
      return { success: false, error: "Facture introuvable." };
    }

    const montantPaye = vente.paiements.reduce((acc, p) => acc + p.montant, 0);

    return {
      success: true,
      recu: {
        id: vente.id,
        numero_facture: vente.numero_facture,
        date_vente: vente.date_vente.toISOString(),
        entreprise: {
          nom: vente.boutique.compte.nom_entreprise,
          ifu: vente.boutique.compte.ifu,
          rccm: vente.boutique.compte.rccm,
          telephone_principal: vente.boutique.compte.telephone_principal,
          telephone_secondaire: vente.boutique.compte.telephone_secondaire,
          adresse_siege: vente.boutique.compte.adresse_siege,
          ville: vente.boutique.compte.ville,
        },
        boutique: {
          code: vente.boutique.code,
          nom: vente.boutique.nom,
          ville: vente.boutique.ville,
          adresse: vente.boutique.adresse,
          telephone: vente.boutique.telephone,
        },
        vendeur: { nom: vente.utilisateur.nom },
        client: vente.client
          ? { nom: vente.client.nom, telephone: vente.client.telephone }
          : null,
        lignes: vente.lignes_vente.map((l) => ({
          produit_nom: l.produit.nom,
          quantite: l.quantite,
          prix_unitaire: l.prix_unitaire_a_la_vente,
          total_ligne: l.quantite * l.prix_unitaire_a_la_vente,
          imei1: l.imei1,
          imei2: l.imei2,
        })),
        montant_brut: vente.montant_total + vente.montant_remise,
        montant_remise: vente.montant_remise,
        montant_total: vente.montant_total,
        montant_paye: montantPaye,
        monnaie_rendue: 0,
        statut_paiement: vente.statut_paiement,
        mode_paiement: vente.paiements[0]?.mode_paiement,
      },
    };
  } catch (err: any) {
    console.error("Erreur getRecuVenteAction :", err);
    return { success: false, error: "Impossible de charger la facture." };
  }
}

/**
 * Création rapide d'un client au comptoir de vente (Décision C11)
 */
export async function creerClientRapideAction(
  nom: string,
  telephone: string
): Promise<{ success: boolean; client?: { id: string; nom: string; telephone: string }; error?: string }> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Session expirée." };
  }

  const guard = verifierStatutAbonnementPourEcriture(session.statutAbonnement);
  if (!guard.autorise) {
    return { success: false, error: guard.erreur };
  }

  const cleanNom = nom.trim();
  const cleanTel = telephone.trim();

  if (!cleanNom || !cleanTel) {
    return { success: false, error: "Le nom et le numéro de téléphone sont requis." };
  }

  try {
    const scoped = getScopedPrisma(session.compteId);

    // Rapprochement préalable (décision C11) : si un client avec ce numéro existe déjà dans le compte, on le réutilise
    const clientExistant = await scoped.clients.findFirst({
      where: {
        compte_id: session.compteId,
        telephone: cleanTel,
      },
    });

    if (clientExistant) {
      return {
        success: true,
        client: {
          id: clientExistant.id,
          nom: clientExistant.nom,
          telephone: clientExistant.telephone,
        },
      };
    }

    const nouveauClient = await scoped.clients.create({
      data: {
        compte_id: session.compteId,
        nom: cleanNom,
        telephone: cleanTel,
      },
    });

    return {
      success: true,
      client: {
        id: nouveauClient.id,
        nom: nouveauClient.nom,
        telephone: nouveauClient.telephone,
      },
    };
  } catch (err: any) {
    console.error("Erreur creerClientRapideAction :", err);
    return { success: false, error: "Impossible d'enregistrer le client." };
  }
}
