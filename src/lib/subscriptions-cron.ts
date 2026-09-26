import { prisma } from "./prisma";
import { StatutAbonnement, StatutFactureAbonnement } from "@prisma/client";

export interface RapportCycleAbonnements {
  success: boolean;
  dateExecution: Date;
  parametres: {
    delaiGraceJours: number;
    dureeEssaiJours: number;
  };
  stats: {
    comptesPassesEnImpaye: number;
    facturesGenerees: number;
    comptesSuspendus: number;
  };
  details: {
    essaisExpires: { compteId: string; nomEntreprise: string }[];
    periodesExpirees: { compteId: string; nomEntreprise: string }[];
    suspensions: { compteId: string; nomEntreprise: string; dateEcheance: Date }[];
  };
}

/**
 * Moteur d'exécution quotidien du cycle de vie des abonnements (Section 5.2, 5.4, 8 bis)
 * - Transitions : essai -> impaye -> suspendu
 * - Génération idempotente des factures d'abonnement
 * - Suspension automatique dès dépassement du délai de grâce
 */
export async function executerCycleAbonnements(): Promise<RapportCycleAbonnements> {
  const maintenant = new Date();

  // 1. Récupération des paramètres plateforme clé-valeur
  const [paramDelaiGrace, paramDureeEssai] = await Promise.all([
    prisma.parametres_plateforme.findUnique({ where: { cle: "delai_grace_jours" } }),
    prisma.parametres_plateforme.findUnique({ where: { cle: "duree_essai_jours" } }),
  ]);

  const delaiGraceJours = parseInt(paramDelaiGrace?.valeur || "7", 10);
  const dureeEssaiJours = parseInt(paramDureeEssai?.valeur || "14", 10);

  const rapport: RapportCycleAbonnements = {
    success: true,
    dateExecution: maintenant,
    parametres: { delaiGraceJours, dureeEssaiJours },
    stats: {
      comptesPassesEnImpaye: 0,
      facturesGenerees: 0,
      comptesSuspendus: 0,
    },
    details: {
      essaisExpires: [],
      periodesExpirees: [],
      suspensions: [],
    },
  };

  // Récupération d'un id super admin pour l'audit automatique système
  const superAdminSysteme = await prisma.super_admins.findFirst({
    select: { id: true },
  });
  const adminId = superAdminSysteme?.id || "systeme";

  // =====================================================================
  // PHASE 1 : Périodes d'essai expirées (essai -> impaye)
  // =====================================================================
  const comptesEssaiExpires = await prisma.comptes.findMany({
    where: {
      statut_abonnement: StatutAbonnement.essai,
      date_fin_essai: {
        lt: maintenant,
      },
    },
    include: {
      forfait: true,
    },
  });

  for (const compte of comptesEssaiExpires) {
    const echeance = new Date(maintenant);
    echeance.setDate(echeance.getDate() + delaiGraceJours);

    // Vérification d'idempotence : aucune facture en attente existante
    const factureExistante = await prisma.factures_abonnement.findFirst({
      where: {
        compte_id: compte.id,
        statut: StatutFactureAbonnement.en_attente,
      },
    });

    if (!factureExistante) {
      await prisma.factures_abonnement.create({
        data: {
          compte_id: compte.id,
          montant: compte.forfait.prix_mensuel,
          statut: StatutFactureAbonnement.en_attente,
          fournisseur_paiement: "manuel",
          date_echeance: echeance,
        },
      });
      rapport.stats.facturesGenerees++;
    }

    // Progression du compte en impaye
    await prisma.comptes.update({
      where: { id: compte.id },
      data: {
        statut_abonnement: StatutAbonnement.impaye,
      },
    });

    // Audit plateforme
    if (superAdminSysteme) {
      await prisma.journal_audit_plateforme.create({
        data: {
          super_admin_id: adminId,
          action: "passage_impaye_fin_essai",
          compte_cible_id: compte.id,
          details: {
            nom_entreprise: compte.nom_entreprise,
            date_fin_essai: compte.date_fin_essai?.toISOString(),
            delai_grace_accorde_jours: delaiGraceJours,
          },
        },
      });
    }

    rapport.stats.comptesPassesEnImpaye++;
    rapport.details.essaisExpires.push({
      compteId: compte.id,
      nomEntreprise: compte.nom_entreprise,
    });
  }

  // =====================================================================
  // PHASE 2 : Périodes payées échues (actif -> impaye)
  // =====================================================================
  const comptesActifsExpires = await prisma.comptes.findMany({
    where: {
      statut_abonnement: StatutAbonnement.actif,
      date_fin_periode_courante: {
        lt: maintenant,
      },
    },
    include: {
      forfait: true,
    },
  });

  for (const compte of comptesActifsExpires) {
    const echeance = new Date(maintenant);
    echeance.setDate(echeance.getDate() + delaiGraceJours);

    // Vérification d'idempotence
    const factureExistante = await prisma.factures_abonnement.findFirst({
      where: {
        compte_id: compte.id,
        statut: StatutFactureAbonnement.en_attente,
      },
    });

    if (!factureExistante) {
      await prisma.factures_abonnement.create({
        data: {
          compte_id: compte.id,
          montant: compte.forfait.prix_mensuel,
          statut: StatutFactureAbonnement.en_attente,
          fournisseur_paiement: "manuel",
          date_echeance: echeance,
        },
      });
      rapport.stats.facturesGenerees++;
    }

    await prisma.comptes.update({
      where: { id: compte.id },
      data: {
        statut_abonnement: StatutAbonnement.impaye,
      },
    });

    if (superAdminSysteme) {
      await prisma.journal_audit_plateforme.create({
        data: {
          super_admin_id: adminId,
          action: "passage_impaye_fin_periode",
          compte_cible_id: compte.id,
          details: {
            nom_entreprise: compte.nom_entreprise,
            date_fin_periode_courante: compte.date_fin_periode_courante?.toISOString(),
            delai_grace_accorde_jours: delaiGraceJours,
          },
        },
      });
    }

    rapport.stats.comptesPassesEnImpaye++;
    rapport.details.periodesExpirees.push({
      compteId: compte.id,
      nomEntreprise: compte.nom_entreprise,
    });
  }

  // =====================================================================
  // PHASE 3 : Dépassement du délai de grâce (impaye -> suspendu)
  // Section 8 bis : blocage total de connexion
  // =====================================================================
  const comptesImpayes = await prisma.comptes.findMany({
    where: {
      statut_abonnement: StatutAbonnement.impaye,
    },
    include: {
      factures_abonnement: {
        where: { statut: StatutFactureAbonnement.en_attente },
        orderBy: { date_echeance: "asc" },
      },
    },
  });

  for (const compte of comptesImpayes) {
    const facturePlusAncienne = compte.factures_abonnement[0];

    // Si la facture en attente a dépassé sa date d'échéance (incluant la grâce)
    if (facturePlusAncienne && facturePlusAncienne.date_echeance < maintenant) {
      await prisma.comptes.update({
        where: { id: compte.id },
        data: {
          statut_abonnement: StatutAbonnement.suspendu,
        },
      });

      if (superAdminSysteme) {
        await prisma.journal_audit_plateforme.create({
          data: {
            super_admin_id: adminId,
            action: "suspension_grace_depassee",
            compte_cible_id: compte.id,
            details: {
              nom_entreprise: compte.nom_entreprise,
              facture_id: facturePlusAncienne.id,
              date_echeance: facturePlusAncienne.date_echeance.toISOString(),
              delai_grace_jours: delaiGraceJours,
            },
          },
        });
      }

      rapport.stats.comptesSuspendus++;
      rapport.details.suspensions.push({
        compteId: compte.id,
        nomEntreprise: compte.nom_entreprise,
        dateEcheance: facturePlusAncienne.date_echeance,
      });
    }
  }

  return rapport;
}
