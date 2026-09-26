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
    comptesExpires: number;
  };
  details: {
    essaisExpires: { compteId: string; nomEntreprise: string }[];
    periodesExpirees: { compteId: string; nomEntreprise: string }[];
    suspensions: { compteId: string; nomEntreprise: string; dateEcheance: Date }[];
    expirations: { compteId: string; nomEntreprise: string; dateEcheance: Date }[];
  };
}

/**
 * Moteur d'exécution quotidien du cycle de vie des abonnements (Section 5.2, 5.4, 8 bis, Décisions H22 & H23)
 * - Transitions :
 *   1. essai expiré -> expire DIRECT (mode lecture seule, zéro grâce indue sur l'essai gratuit)
 *   2. actif échu -> impaye (facture générée avec délai de grâce de 7 jours)
 *   3. impaye avec grâce dépassée -> expire (mode lecture seule)
 *   Le statut suspendu est sanctuarisé pour les décisions administratives manuelles du Super-Admin.
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
      comptesExpires: 0,
    },
    details: {
      essaisExpires: [],
      periodesExpirees: [],
      suspensions: [],
      expirations: [],
    },
  };

  // Récupération d'un id super admin pour l'audit automatique système
  const superAdminSysteme = await prisma.super_admins.findFirst({
    select: { id: true },
  });
  const adminId = superAdminSysteme?.id || "systeme";

  // =====================================================================
  // PHASE 1 : Périodes d'essai expirées (essai -> expire direct, mode lecture seule)
  // Résolution H22 & H23 : zéro délai de grâce sur l'essai gratuit
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
    // Les comptes en essai dont la date_fin_essai est dépassée passent directement en EXPIRE (Décisions H22 & H23)
    await prisma.comptes.update({
      where: { id: compte.id },
      data: {
        statut_abonnement: StatutAbonnement.expire,
      },
    });

    if (superAdminSysteme) {
      await prisma.journal_audit_plateforme.create({
        data: {
          super_admin_id: adminId,
          action: "expiration_fin_essai",
          compte_cible_id: compte.id,
          details: {
            nom_entreprise: compte.nom_entreprise,
            date_fin_essai: compte.date_fin_essai?.toISOString(),
            motif: "Fin des 14 jours d'essai sans souscription — passage en lecture seule",
          },
        },
      });
    }

    rapport.stats.comptesExpires++;
    rapport.details.expirations.push({
      compteId: compte.id,
      nomEntreprise: compte.nom_entreprise,
      dateEcheance: compte.date_fin_essai || maintenant,
    });
    rapport.details.essaisExpires.push({
      compteId: compte.id,
      nomEntreprise: compte.nom_entreprise,
    });
  }

  // =====================================================================
  // PHASE 2 : Périodes payées échues (actif -> impaye avec 7 jours de grâce)
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
          fournisseur_paiement: "fedapay",
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
  // PHASE 3 : Dépassement du délai de grâce (impaye -> expire en lecture seule)
  // Résolution H22 & H23 : le compte passe en EXPIRE (lecture seule, connexion permise).
  // Le statut SUSPENDU est sanctuarisé pour les décisions administratives du Super-Admin.
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

    // Vérifier si le délai de grâce est dépassé soit par la facture en attente, soit par la fin de période + 7 jours
    const graceDepasseeParFacture = facturePlusAncienne ? facturePlusAncienne.date_echeance < maintenant : false;
    const dateFinPlusGrace = compte.date_fin_periode_courante
      ? new Date(compte.date_fin_periode_courante.getTime() + delaiGraceJours * 24 * 60 * 60 * 1000)
      : null;
    const graceDepasseeParDateFin = dateFinPlusGrace ? dateFinPlusGrace < maintenant : false;

    if (graceDepasseeParFacture || graceDepasseeParDateFin) {
      await prisma.comptes.update({
        where: { id: compte.id },
        data: {
          statut_abonnement: StatutAbonnement.expire,
        },
      });

      if (superAdminSysteme) {
        await prisma.journal_audit_plateforme.create({
          data: {
            super_admin_id: adminId,
            action: "expiration_grace_depassee",
            compte_cible_id: compte.id,
            details: {
              nom_entreprise: compte.nom_entreprise,
              facture_id: facturePlusAncienne.id,
              date_echeance: facturePlusAncienne.date_echeance.toISOString(),
              delai_grace_jours: delaiGraceJours,
              motif: "Délai de grâce dépassé après impayé — passage en lecture seule",
            },
          },
        });
      }

      rapport.stats.comptesExpires++;
      rapport.details.expirations.push({
        compteId: compte.id,
        nomEntreprise: compte.nom_entreprise,
        dateEcheance: facturePlusAncienne.date_echeance,
      });
    }
  }

  return rapport;
}
