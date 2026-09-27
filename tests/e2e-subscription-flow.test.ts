import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "../src/lib/prisma";
import { executerCycleAbonnements } from "../src/lib/subscriptions-cron";
import { traiterWebhookFedaPay } from "../src/lib/fedapay";
import { verifierStatutAbonnementPourEcriture } from "../src/lib/subscription-guard";
import { StatutAbonnement, StatutFactureAbonnement } from "@prisma/client";

describe("Test d'Intégration Bout-en-Bout : Cycle de Vie Complet SaaS & FedaPay", () => {
  it("doit dérouler l'intégralité du cycle de vie SaaS sans faille", { timeout: 90000 }, async () => {
    // 0. Récupération des forfaits
    const forfaits = await prisma.forfaits.findMany({ where: { actif: true } });
    expect(forfaits.length).toBeGreaterThan(0);
    const forfaitReseau = forfaits.find((f) => f.nom === "Réseau") || forfaits[0];

    const randomSuffix = Math.floor(Math.random() * 89999 + 10000);
    const codeEntreprise = "E2E" + String(randomSuffix).substring(0, 3);
    const emailPatron = `patron-e2e-${randomSuffix}@djoonoo-test.com`;

    // 1. Simulation Onboarding / Inscription : Création du compte avec forfait choisi
    const dateCreation = new Date();
    const dateFinEssaiTheorique = new Date(dateCreation);
    dateFinEssaiTheorique.setDate(dateFinEssaiTheorique.getDate() + 14);

    const compte = await prisma.comptes.create({
      data: {
        code: codeEntreprise,
        nom_entreprise: `Boutique E2E ${randomSuffix}`,
        email_principal: emailPatron,
        forfait_id: forfaitReseau.id,
        statut_abonnement: StatutAbonnement.essai,
        telephone_principal: "+22901998877",
        ville: "Cotonou",
        date_fin_essai: dateFinEssaiTheorique,
      },
      include: { forfait: true },
    });

    expect(compte.statut_abonnement).toBe(StatutAbonnement.essai);
    expect(compte.forfait_id).toBe(forfaitReseau.id);
    // Vérification que les mutations sont autorisées pendant l'essai
    expect(verifierStatutAbonnementPourEcriture(compte.statut_abonnement).autorise).toBe(true);

    try {
      // 2. Échéance de l'essai gratuit (14 jours stricts, SANS délai de grâce — Décision H22)
      const hier = new Date();
      hier.setDate(hier.getDate() - 1);

      await prisma.comptes.update({
        where: { id: compte.id },
        data: { date_fin_essai: hier },
      });

      // Déclenchement du cron automatique
      const rapportCron1 = await executerCycleAbonnements();
      expect(rapportCron1.success).toBe(true);

      const compteApresEssai = await prisma.comptes.findUnique({
        where: { id: compte.id },
      });
      // Doit basculer DIRECTEMENT en 'expire' (lecture seule) et NON en 'impaye' ni 'suspendu'
      expect(compteApresEssai?.statut_abonnement).toBe(StatutAbonnement.expire);

      // 3. Vérification du Mode Lecture Seule
      const gardeLectureSeule = verifierStatutAbonnementPourEcriture(compteApresEssai?.statut_abonnement);
      expect(gardeLectureSeule.autorise).toBe(false);
      expect(gardeLectureSeule.erreur).toContain("expiré");

      // 4. Souscription & Paiement en Ligne FedaPay (Décision H21)
      const factureAbo = await prisma.factures_abonnement.create({
        data: {
          compte_id: compte.id,
          montant: forfaitReseau.prix_mensuel,
          statut: StatutFactureAbonnement.en_attente,
          fournisseur_paiement: "fedapay",
          date_echeance: new Date(),
        },
      });

      const fedaPayTxId = `tx_e2e_${randomSuffix}`;
      const payloadWebhook = {
        name: "transaction.approved",
        entity: {
          id: fedaPayTxId,
          amount: forfaitReseau.prix_mensuel,
          status: "approved",
          custom_metadata: {
            facture_id: factureAbo.id,
            compte_id: compte.id,
            forfait_id: forfaitReseau.id,
          },
        },
      };

      // Traitement du webhook FedaPay
      const resWebhook = await traiterWebhookFedaPay(payloadWebhook);
      expect(resWebhook.success).toBe(true);

      // Vérification que le compte est devenu ACTIF pour la durée du forfait
      const compteApresPaiement = await prisma.comptes.findUnique({
        where: { id: compte.id },
      });
      expect(compteApresPaiement?.statut_abonnement).toBe(StatutAbonnement.actif);
      expect(compteApresPaiement?.date_fin_periode_courante).toBeDefined();

      const diffJoursActif = Math.round(
        (compteApresPaiement!.date_fin_periode_courante!.getTime() -
          compteApresPaiement!.date_debut_periode_courante!.getTime()) /
          (1000 * 60 * 60 * 24)
      );
      expect(diffJoursActif).toBe(forfaitReseau.duree_jours);

      // Vérification que les mutations sont de nouveau pleinement autorisées
      expect(verifierStatutAbonnementPourEcriture(compteApresPaiement?.statut_abonnement).autorise).toBe(true);

      // Vérification de l'idempotence stricte FedaPay
      const resWebhookIdempotent = await traiterWebhookFedaPay(payloadWebhook);
      expect(resWebhookIdempotent.success).toBe(true);
      expect(resWebhookIdempotent.message).toContain("déjà validée");

      // 5. Expiration de la période payée -> Bascule en IMPAYE avec Grâce de 7 jours (Décision H22)
      await prisma.comptes.update({
        where: { id: compte.id },
        data: { date_fin_periode_courante: hier },
      });

      const rapportCron2 = await executerCycleAbonnements();
      expect(rapportCron2.success).toBe(true);

      const compteEnGrace = await prisma.comptes.findUnique({
        where: { id: compte.id },
      });
      expect(compteEnGrace?.statut_abonnement).toBe(StatutAbonnement.impaye);
      // Pendant la grâce de 7 jours d'un abonnement payé, l'accès en écriture reste ouvert
      expect(verifierStatutAbonnementPourEcriture(compteEnGrace?.statut_abonnement).autorise).toBe(true);

      // 6. Fin de la période de grâce (7 jours dépassés) -> Bascule en EXPIRE (lecture seule)
      const huitJoursAvant = new Date();
      huitJoursAvant.setDate(huitJoursAvant.getDate() - 8);

      await prisma.comptes.update({
        where: { id: compte.id },
        data: { date_fin_periode_courante: huitJoursAvant },
      });

      const rapportCron3 = await executerCycleAbonnements();
      expect(rapportCron3.success).toBe(true);

      const compteFinal = await prisma.comptes.findUnique({
        where: { id: compte.id },
      });
      expect(compteFinal?.statut_abonnement).toBe(StatutAbonnement.expire);
      expect(verifierStatutAbonnementPourEcriture(compteFinal?.statut_abonnement).autorise).toBe(false);

      // 7. Sanctuarisation du statut SUSPENDU (Décision H23)
      await prisma.comptes.update({
        where: { id: compte.id },
        data: { statut_abonnement: StatutAbonnement.suspendu },
      });

      // Le cron ne doit jamais altérer un compte suspendu
      await executerCycleAbonnements();
      const compteSuspendu = await prisma.comptes.findUnique({
        where: { id: compte.id },
      });
      expect(compteSuspendu?.statut_abonnement).toBe(StatutAbonnement.suspendu);
      expect(verifierStatutAbonnementPourEcriture(compteSuspendu?.statut_abonnement).autorise).toBe(false);
    } finally {
      // Nettoyage complet
      await prisma.journal_audit.deleteMany({
        where: { compte_id: compte.id },
      });
      await prisma.factures_abonnement.deleteMany({
        where: { compte_id: compte.id },
      });
      await prisma.comptes.delete({
        where: { id: compte.id },
      });
    }
  });
});
