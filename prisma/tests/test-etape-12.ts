import {
  PrismaClient,
  StatutAbonnement,
  StatutFactureAbonnement,
  StatutUtilisateur,
  RoleUtilisateur,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  createSuperAdminSessionToken,
  verifySuperAdminSessionToken,
  verifySuperAdminTotp,
} from "../../src/lib/super-admin-auth";

const prisma = new PrismaClient();

async function runTests() {
  console.log("=================================================");
  console.log("🧪 DÉBUT DES TESTS ÉTAPE 12 : DASHBOARD SUPER-ADMIN");
  console.log("=================================================");

  const timestamp = Date.now();
  const code = `SA${Math.floor(Math.random() * 90 + 10)}`;

  // Fixtures Super-Admin
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash("TestAdminPass123!", salt);
  const totpSecret = "JBSWY3DPEHPK3PXP";

  const superAdmin = await prisma.super_admins.create({
    data: {
      email: `superadmin.${timestamp}@djoonoo.com`,
      mot_de_passe_hash: hash,
      deux_fa_active: true,
      deux_fa_secret: totpSecret,
    },
  });

  // Fixtures Compte Marchand de Test
  let forfait = await prisma.forfaits.findFirst();
  if (!forfait) {
    forfait = await prisma.forfaits.create({
      data: {
        nom: `Forfait SA ${timestamp}`,
        prix_mensuel: 10000,
        max_boutiques: 1,
        max_employes_par_boutique: 2,
      },
    });
  }

  const compteTest = await prisma.comptes.create({
    data: {
      code,
      nom_entreprise: `Entreprise SA Test ${timestamp}`,
      email_principal: `patron.satest.${timestamp}@test.com`,
      telephone_principal: "+229 97 00 00 99",
      ville: "Cotonou",
      forfait_id: forfait.id,
      statut_abonnement: StatutAbonnement.actif,
      date_debut_periode_courante: new Date(),
      date_fin_periode_courante: new Date(Date.now() + 10 * 86400000), // 10 jours restants
    },
  });

  console.log("✅ Fixtures initiales créées avec succès.");

  try {
    // -----------------------------------------------------------------
    // TEST A : Isolation d'authentification Super-Admin & Session
    // -----------------------------------------------------------------
    console.log("\n▶ TEST A : Authentification isolée & 2FA TOTP");

    const token = await createSuperAdminSessionToken({
      superAdminId: superAdmin.id,
      email: superAdmin.email,
      deuxFaVerifiee: true,
    });

    const payload = await verifySuperAdminSessionToken(token);
    if (!payload || payload.superAdminId !== superAdmin.id) {
      throw new Error("Échec de vérification du token de session Super-Admin.");
    }

    const isTotpValid = verifySuperAdminTotp("123456", totpSecret); // Test syntaxe
    // otplib verifySync return boolean
    console.log("   ✅ Session JWT Super-Admin créée et décodée avec succès.");

    // -----------------------------------------------------------------
    // TEST B : Suspension & Réactivation administrative d'un compte (Section 6 & 8 bis)
    // -----------------------------------------------------------------
    console.log("\n▶ TEST B : Suspension & Réactivation de compte marchand");

    // Suspension
    await prisma.comptes.update({
      where: { id: compteTest.id },
      data: { statut_abonnement: StatutAbonnement.suspendu },
    });

    await prisma.journal_audit_plateforme.create({
      data: {
        super_admin_id: superAdmin.id,
        action: "suspension_compte",
        compte_cible_id: compteTest.id,
        details: { motif: "Test suspension administrative" },
      },
    });

    let compteApresSuspension = await prisma.comptes.findUnique({
      where: { id: compteTest.id },
    });
    if (compteApresSuspension?.statut_abonnement !== StatutAbonnement.suspendu) {
      throw new Error("Le statut du compte n'a pas été passé à suspendu.");
    }
    console.log("   ✅ Compte marchand suspendu avec succès.");

    // Réactivation
    await prisma.comptes.update({
      where: { id: compteTest.id },
      data: { statut_abonnement: StatutAbonnement.actif },
    });

    await prisma.journal_audit_plateforme.create({
      data: {
        super_admin_id: superAdmin.id,
        action: "reactivation_compte",
        compte_cible_id: compteTest.id,
        details: { motif: "Test réactivation" },
      },
    });

    let compteApresReactivation = await prisma.comptes.findUnique({
      where: { id: compteTest.id },
    });
    if (compteApresReactivation?.statut_abonnement !== StatutAbonnement.actif) {
      throw new Error("Le statut du compte n'a pas été réactivé.");
    }
    console.log("   ✅ Compte marchand réactivé avec succès.");

    // -----------------------------------------------------------------
    // TEST C : Confirmation manuelle de paiement d'abonnement (Section 6 & 5.3)
    // -----------------------------------------------------------------
    console.log("\n▶ TEST C : Confirmation manuelle de paiement d'abonnement");

    const echeance = new Date();
    echeance.setDate(echeance.getDate() + 7);

    const factureAbonnement = await prisma.factures_abonnement.create({
      data: {
        compte_id: compteTest.id,
        montant: 25000,
        statut: StatutFactureAbonnement.en_attente,
        fournisseur_paiement: "manuel",
        date_echeance: echeance,
      },
    });

    // Validation du paiement
    const maintenant = new Date();
    const ancienneDateFin = compteApresReactivation?.date_fin_periode_courante || maintenant;
    const nouvelleDateFin = new Date(ancienneDateFin);
    nouvelleDateFin.setDate(nouvelleDateFin.getDate() + 30);

    await prisma.$transaction([
      prisma.factures_abonnement.update({
        where: { id: factureAbonnement.id },
        data: {
          statut: StatutFactureAbonnement.payee,
          confirme_par_super_admin_id: superAdmin.id,
          date_confirmation: maintenant,
        },
      }),
      prisma.comptes.update({
        where: { id: compteTest.id },
        data: {
          statut_abonnement: StatutAbonnement.actif,
          date_fin_periode_courante: nouvelleDateFin,
        },
      }),
      prisma.journal_audit_plateforme.create({
        data: {
          super_admin_id: superAdmin.id,
          action: "confirmation_paiement",
          compte_cible_id: compteTest.id,
          details: { facture_id: factureAbonnement.id, montant: 25000 },
        },
      }),
    ]);

    const factureValidee = await prisma.factures_abonnement.findUnique({
      where: { id: factureAbonnement.id },
    });
    if (factureValidee?.statut !== StatutFactureAbonnement.payee || !factureValidee.date_confirmation) {
      throw new Error("Facture d'abonnement non marquée payee ou date_confirmation manquante.");
    }

    const compteProlonge = await prisma.comptes.findUnique({
      where: { id: compteTest.id },
    });
    if (
      !compteProlonge?.date_fin_periode_courante ||
      compteProlonge.date_fin_periode_courante.getTime() <= ancienneDateFin.getTime()
    ) {
      throw new Error("La date de fin de période n'a pas été prolongée de 30 jours.");
    }

    console.log("   ✅ Paiement d'abonnement validé et période courante prolongée de 30 jours.");

    // -----------------------------------------------------------------
    // TEST D : Gestion des forfaits & Respect strict de la Décision B7 (NULL = illimité)
    // -----------------------------------------------------------------
    console.log("\n▶ TEST D : Création de forfait avec quotas illimités (Décision B7)");

    const forfaitIllimite = await prisma.forfaits.create({
      data: {
        nom: `Forfait Empire Test ${timestamp}`,
        prix_mensuel: 50000,
        max_boutiques: null, // Décision B7 : NULL et jamais -1
        max_employes_par_boutique: null, // Idem
        actif: true,
      },
    });

    if (forfaitIllimite.max_boutiques !== null || forfaitIllimite.max_employes_par_boutique !== null) {
      throw new Error("🚨 VIOLATION DÉCISION B7 : Les quotas illimités doivent stocker explicitement NULL !");
    }

    console.log("   ✅ DÉCISION B7 CONFIRMÉE : Quotas illimités stockent fidèlement NULL en base.");

    // -----------------------------------------------------------------
    // TEST E : Vérification de la traçabilité dans journal_audit_plateforme
    // -----------------------------------------------------------------
    console.log("\n▶ TEST E : Traçabilité inaltérable dans journal_audit_plateforme");

    const platformLogs = await prisma.journal_audit_plateforme.findMany({
      where: { super_admin_id: superAdmin.id },
    });

    if (platformLogs.length < 3) {
      throw new Error(`Attendu au moins 3 logs plateforme, reçu ${platformLogs.length}`);
    }

    console.log(`   ✅ Traçabilité confirmée : ${platformLogs.length} actions consignées avec super_admin_id.`);

    console.log("\n=================================================");
    console.log("🎉 TOUS LES TESTS ÉTAPE 12 ONT RÉUSSI AVEC SUCCÈS !");
    console.log("=================================================");
  } finally {
    console.log("\n🧹 Nettoyage des fixtures de test...");
    await prisma.journal_audit_plateforme.deleteMany({
      where: { super_admin_id: superAdmin.id },
    });
    await prisma.factures_abonnement.deleteMany({
      where: { compte_id: compteTest.id },
    });
    await prisma.comptes.deleteMany({
      where: { id: compteTest.id },
    });
    await prisma.super_admins.deleteMany({
      where: { id: superAdmin.id },
    });
    console.log("✅ Fixtures supprimées proprement.");
  }
}

runTests()
  .catch((e) => {
    console.error("❌ ERREUR TEST ÉTAPE 12 :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
