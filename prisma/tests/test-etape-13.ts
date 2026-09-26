import {
  PrismaClient,
  StatutAbonnement,
  StatutFactureAbonnement,
} from "@prisma/client";
import { executerCycleAbonnements } from "../../src/lib/subscriptions-cron";

const prisma = new PrismaClient();

async function runTests() {
  console.log("=================================================");
  console.log("🧪 DÉBUT DES TESTS ÉTAPE 13 : CRON & CYCLE ABONNEMENTS");
  console.log("=================================================");

  const timestamp = Date.now();
  const code1 = `E1${Math.floor(Math.random() * 90 + 10)}`;
  const code2 = `E2${Math.floor(Math.random() * 90 + 10)}`;
  const code3 = `E3${Math.floor(Math.random() * 90 + 10)}`;

  let forfait = await prisma.forfaits.findFirst();
  if (!forfait) {
    forfait = await prisma.forfaits.create({
      data: {
        nom: `Forfait Cron ${timestamp}`,
        prix_mensuel: 15000,
        max_boutiques: 1,
        max_employes_par_boutique: 2,
      },
    });
  }

  // 1. Compte 1 : Période d'essai expirée (date_fin_essai dans le passé)
  const compteEssaiExpire = await prisma.comptes.create({
    data: {
      code: code1,
      nom_entreprise: `Entreprise Essai Échu ${timestamp}`,
      email_principal: `essai.echu.${timestamp}@test.com`,
      telephone_principal: "+229 97 10 10 10",
      ville: "Cotonou",
      forfait_id: forfait.id,
      statut_abonnement: StatutAbonnement.essai,
      date_fin_essai: new Date(Date.now() - 2 * 86400000), // Expiré il y a 2 jours
    },
  });

  // 2. Compte 2 : Compte Actif dont la période payée est expirée
  const compteActifExpire = await prisma.comptes.create({
    data: {
      code: code2,
      nom_entreprise: `Entreprise Actif Échu ${timestamp}`,
      email_principal: `actif.echu.${timestamp}@test.com`,
      telephone_principal: "+229 97 20 20 20",
      ville: "Cotonou",
      forfait_id: forfait.id,
      statut_abonnement: StatutAbonnement.actif,
      date_debut_periode_courante: new Date(Date.now() - 35 * 86400000),
      date_fin_periode_courante: new Date(Date.now() - 2 * 86400000), // Période terminée il y a 2 jours
    },
  });

  // 3. Compte 3 : Compte Impayé dont le délai de grâce est dépassé
  const compteGraceDepassee = await prisma.comptes.create({
    data: {
      code: code3,
      nom_entreprise: `Entreprise Grâce Dépassée ${timestamp}`,
      email_principal: `grace.echu.${timestamp}@test.com`,
      telephone_principal: "+229 97 30 30 30",
      ville: "Porto-Novo",
      forfait_id: forfait.id,
      statut_abonnement: StatutAbonnement.impaye,
    },
  });

  // Création de la facture expirée (échéance passée il y a 1 jour)
  await prisma.factures_abonnement.create({
    data: {
      compte_id: compteGraceDepassee.id,
      montant: forfait.prix_mensuel,
      statut: StatutFactureAbonnement.en_attente,
      fournisseur_paiement: "manuel",
      date_echeance: new Date(Date.now() - 86400000), // Échéance hier
    },
  });

  console.log("✅ Fixtures initiales créées avec succès.");

  try {
    // -----------------------------------------------------------------
    // TEST A : Exécution du Cron - Phase 1 & 2 (essai -> impaye & actif -> impaye)
    // -----------------------------------------------------------------
    console.log("\n▶ TEST A : Exécution du moteur de cycle de vie (1ère passe)");

    const rapport1 = await executerCycleAbonnements();
    console.log(`   Stats rapport : ${rapport1.stats.comptesPassesEnImpaye} impayés, ${rapport1.stats.facturesGenerees} factures, ${rapport1.stats.comptesSuspendus} suspendus`);

    // Vérification Compte 1
    const c1Apres = await prisma.comptes.findUnique({
      where: { id: compteEssaiExpire.id },
      include: { factures_abonnement: true },
    });
    if (c1Apres?.statut_abonnement !== StatutAbonnement.impaye) {
      throw new Error("Compte 1 n'est pas passé en statut impaye.");
    }
    if (c1Apres.factures_abonnement.length !== 1) {
      throw new Error(`Attendu 1 facture pour Compte 1, trouvé ${c1Apres.factures_abonnement.length}`);
    }
    console.log("   ✅ Compte 1 : Passage en 'impaye' et facture générée avec grâce de 7 jours.");

    // Vérification Compte 2
    const c2Apres = await prisma.comptes.findUnique({
      where: { id: compteActifExpire.id },
      include: { factures_abonnement: true },
    });
    if (c2Apres?.statut_abonnement !== StatutAbonnement.impaye) {
      throw new Error("Compte 2 n'est pas passé en statut impaye.");
    }
    if (c2Apres.factures_abonnement.length !== 1) {
      throw new Error(`Attendu 1 facture pour Compte 2, trouvé ${c2Apres.factures_abonnement.length}`);
    }
    console.log("   ✅ Compte 2 : Renouvellement détecté, passage en 'impaye' et facture créée.");

    // -----------------------------------------------------------------
    // TEST B : Idempotence stricte (ne jamais créer de doublon)
    // -----------------------------------------------------------------
    console.log("\n▶ TEST B : Vérification de l'idempotence stricte (2ème passe immédiate)");

    const rapport2 = await executerCycleAbonnements();

    const c1Recheck = await prisma.comptes.findUnique({
      where: { id: compteEssaiExpire.id },
      include: { factures_abonnement: true },
    });
    if (c1Recheck?.factures_abonnement.length !== 1) {
      throw new Error("🚨 VIOLATION D'IDEMPOTENCE : Facture doublon créée sur Compte 1 !");
    }

    const c2Recheck = await prisma.comptes.findUnique({
      where: { id: compteActifExpire.id },
      include: { factures_abonnement: true },
    });
    if (c2Recheck?.factures_abonnement.length !== 1) {
      throw new Error("🚨 VIOLATION D'IDEMPOTENCE : Facture doublon créée sur Compte 2 !");
    }

    console.log("   ✅ IDEMPOTENCE CONFIRMÉE : Aucune facture redondante générée.");

    // -----------------------------------------------------------------
    // TEST C : Suspension après dépassement du délai de grâce (Section 8 bis)
    // -----------------------------------------------------------------
    console.log("\n▶ TEST C : Suspension automatique après dépassement du délai de grâce");

    const c3Apres = await prisma.comptes.findUnique({
      where: { id: compteGraceDepassee.id },
    });
    if (c3Apres?.statut_abonnement !== StatutAbonnement.suspendu) {
      throw new Error(`Compte 3 attendu suspendu, trouvé ${c3Apres?.statut_abonnement}`);
    }

    console.log("   ✅ Compte 3 : Passé automatiquement en statut 'suspendu' (Section 8 bis confirmée).");

    // -----------------------------------------------------------------
    // TEST D : Traçabilité plateforme
    // -----------------------------------------------------------------
    console.log("\n▶ TEST D : Vérification des logs d'audit plateforme");

    const logsPlateforme = await prisma.journal_audit_plateforme.findMany({
      where: {
        compte_cible_id: {
          in: [compteEssaiExpire.id, compteActifExpire.id, compteGraceDepassee.id],
        },
      },
    });

    if (logsPlateforme.length < 3) {
      throw new Error(`Attendu au moins 3 logs d'audit plateforme, trouvé ${logsPlateforme.length}`);
    }

    console.log(`   ✅ Traçabilité confirmée : ${logsPlateforme.length} événements enregistrés dans journal_audit_plateforme.`);

    console.log("\n=================================================");
    console.log("🎉 TOUS LES TESTS ÉTAPE 13 ONT RÉUSSI AVEC SUCCÈS !");
    console.log("=================================================");
  } finally {
    console.log("\n🧹 Nettoyage des fixtures de test...");
    await prisma.journal_audit_plateforme.deleteMany({
      where: {
        compte_cible_id: {
          in: [compteEssaiExpire.id, compteActifExpire.id, compteGraceDepassee.id],
        },
      },
    });
    await prisma.factures_abonnement.deleteMany({
      where: {
        compte_id: {
          in: [compteEssaiExpire.id, compteActifExpire.id, compteGraceDepassee.id],
        },
      },
    });
    await prisma.comptes.deleteMany({
      where: {
        id: {
          in: [compteEssaiExpire.id, compteActifExpire.id, compteGraceDepassee.id],
        },
      },
    });
    console.log("✅ Fixtures supprimées proprement.");
  }
}

runTests()
  .catch((e) => {
    console.error("❌ ERREUR TEST ÉTAPE 13 :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
