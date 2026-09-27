import { describe, it, expect } from "vitest";
import { prisma } from "../src/lib/prisma";
import { executerCycleAbonnements } from "../src/lib/subscriptions-cron";
import { StatutAbonnement } from "@prisma/client";

describe("Moteur du Cycle de Vie des Abonnements", { timeout: 60000 }, () => {
  it("doit passer DIRECTEMENT un compte d'essai expiré en EXPIRE sans lui accorder de délai de grâce", async () => {
    const forfait = await prisma.forfaits.findFirst();
    const codeTest = "TST" + Math.floor(Math.random() * 899 + 100);

    const hier = new Date();
    hier.setDate(hier.getDate() - 1);

    // Création d'un compte avec essai expiré hier
    const compteTest = await prisma.comptes.create({
      data: {
        code: codeTest,
        nom_entreprise: "Test Essai Expiré",
        email_principal: `test-${codeTest}@test.com`,
        forfait_id: forfait!.id,
        statut_abonnement: StatutAbonnement.essai,
        telephone_principal: "+22901000000",
        ville: "Cotonou",
        date_fin_essai: hier,
      },
    });

    // Exécution du cron
    const rapport = await executerCycleAbonnements();
    expect(rapport.success).toBe(true);

    // Vérification : le compte doit être 'expire' et NON 'impaye' ni 'suspendu'
    const compteApres = await prisma.comptes.findUnique({
      where: { id: compteTest.id },
    });
    expect(compteApres?.statut_abonnement).toBe(StatutAbonnement.expire);

    // Nettoyage
    await prisma.factures_abonnement.deleteMany({ where: { compte_id: compteTest.id } });
    await prisma.journal_audit_plateforme.deleteMany({ where: { compte_cible_id: compteTest.id } });
    await prisma.comptes.delete({ where: { id: compteTest.id } });
  });

  it("doit passer un compte ACTIF dont la période est échue en IMPAYE avec un délai de grâce", async () => {
    const forfait = await prisma.forfaits.findFirst();
    const codeTest = "ACT" + Math.floor(Math.random() * 899 + 100);

    const hier = new Date();
    hier.setDate(hier.getDate() - 1);

    const compteTest = await prisma.comptes.create({
      data: {
        code: codeTest,
        nom_entreprise: "Test Actif Expiré",
        email_principal: `test-${codeTest}@test.com`,
        forfait_id: forfait!.id,
        statut_abonnement: StatutAbonnement.actif,
        telephone_principal: "+22901000001",
        ville: "Cotonou",
        date_fin_periode_courante: hier,
      },
    });

    const rapport = await executerCycleAbonnements();
    expect(rapport.success).toBe(true);

    const compteApres = await prisma.comptes.findUnique({
      where: { id: compteTest.id },
    });
    expect(compteApres?.statut_abonnement).toBe(StatutAbonnement.impaye);

    // Nettoyage
    await prisma.factures_abonnement.deleteMany({ where: { compte_id: compteTest.id } });
    await prisma.journal_audit_plateforme.deleteMany({ where: { compte_cible_id: compteTest.id } });
    await prisma.comptes.delete({ where: { id: compteTest.id } });
  });

  it("doit passer un compte IMPAYE dont le délai de grâce est dépassé en EXPIRE (et non suspendu)", async () => {
    const forfait = await prisma.forfaits.findFirst();
    const codeTest = "IMP" + Math.floor(Math.random() * 899 + 100);

    const hier = new Date();
    hier.setDate(hier.getDate() - 1);

    const compteTest = await prisma.comptes.create({
      data: {
        code: codeTest,
        nom_entreprise: "Test Impayé Grâce Dépassée",
        email_principal: `test-${codeTest}@test.com`,
        forfait_id: forfait!.id,
        statut_abonnement: StatutAbonnement.impaye,
        telephone_principal: "+22901000002",
        ville: "Cotonou",
        factures_abonnement: {
          create: {
            montant: forfait!.prix_mensuel,
            statut: "en_attente",
            fournisseur_paiement: "fedapay",
            date_echeance: hier, // Échéance de grâce dépassée
          },
        },
      },
    });

    const rapport = await executerCycleAbonnements();
    expect(rapport.success).toBe(true);

    const compteApres = await prisma.comptes.findUnique({
      where: { id: compteTest.id },
    });
    expect(compteApres?.statut_abonnement).toBe(StatutAbonnement.expire);

    // Nettoyage
    await prisma.factures_abonnement.deleteMany({ where: { compte_id: compteTest.id } });
    await prisma.journal_audit_plateforme.deleteMany({ where: { compte_cible_id: compteTest.id } });
    await prisma.comptes.delete({ where: { id: compteTest.id } });
  });
});
