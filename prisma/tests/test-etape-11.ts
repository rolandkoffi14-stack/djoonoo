import { PrismaClient, StatutAbonnement, StatutUtilisateur, RoleUtilisateur, StatutBoutique } from "@prisma/client";

const prisma = new PrismaClient();

async function runTests() {
  console.log("=================================================");
  console.log("🧪 DÉBUT DES TESTS ÉTAPE 11 : JOURNAL D'AUDIT CLIENT");
  console.log("=================================================");

  const timestamp = Date.now();
  const codeAlpha = `A${Math.floor(Math.random() * 90 + 10)}`;
  const codeBeta = `B${Math.floor(Math.random() * 90 + 10)}`;

  let forfait = await prisma.forfaits.findFirst();
  if (!forfait) {
    forfait = await prisma.forfaits.create({
      data: {
        nom: `Forfait Audit ${timestamp}`,
        prix_mensuel: 10000,
        max_boutiques: null,
        max_employes_par_boutique: null,
      },
    });
  }

  // 1. Création de deux comptes distincts pour tester l'isolation Multi-Tenant (Règle 5)
  const compteAlpha = await prisma.comptes.create({
    data: {
      code: codeAlpha,
      nom_entreprise: `Entreprise Alpha ${timestamp}`,
      email_principal: `patron.alpha.${timestamp}@test.com`,
      telephone_principal: "+229 97 11 11 11",
      ville: "Cotonou",
      forfait_id: forfait.id,
      statut_abonnement: StatutAbonnement.actif,
    },
  });

  const compteBeta = await prisma.comptes.create({
    data: {
      code: codeBeta,
      nom_entreprise: `Entreprise Beta ${timestamp}`,
      email_principal: `patron.beta.${timestamp}@test.com`,
      telephone_principal: "+229 97 22 22 22",
      ville: "Porto-Novo",
      forfait_id: forfait.id,
      statut_abonnement: StatutAbonnement.actif,
    },
  });

  const patronAlpha = await prisma.utilisateurs.create({
    data: {
      compte_id: compteAlpha.id,
      role: RoleUtilisateur.patron,
      nom: "Patron Alpha",
      telephone: "+229 97 11 11 11",
      email: `patron.alpha.${timestamp}@test.com`,
      mot_de_passe_hash: "hash_test",
      deux_fa_active: true,
      statut: StatutUtilisateur.actif,
    },
  });

  const patronBeta = await prisma.utilisateurs.create({
    data: {
      compte_id: compteBeta.id,
      role: RoleUtilisateur.patron,
      nom: "Patron Beta",
      telephone: "+229 97 22 22 22",
      email: `patron.beta.${timestamp}@test.com`,
      mot_de_passe_hash: "hash_test",
      deux_fa_active: true,
      statut: StatutUtilisateur.actif,
    },
  });

  console.log("✅ Fixtures initiales créées (Compte Alpha et Compte Beta).");

  try {
    // -----------------------------------------------------------------
    // TEST A : Génération de logs d'audit sur Compte Alpha
    // -----------------------------------------------------------------
    console.log("\n▶ TEST A : Génération d'événements d'audit structurés (Compte Alpha)");

    const log1 = await prisma.journal_audit.create({
      data: {
        compte_id: compteAlpha.id,
        utilisateur_id: patronAlpha.id,
        action: "creation_produit",
        entite_concernee: "produits",
        entite_id: "prod-alpha-001",
        details: {
          nom: "Savon Moringa",
          prix: 1500,
          stock_initial: 50,
        },
      },
    });

    const log2 = await prisma.journal_audit.create({
      data: {
        compte_id: compteAlpha.id,
        utilisateur_id: patronAlpha.id,
        action: "transfert_employe",
        entite_concernee: "utilisateurs",
        entite_id: "emp-alpha-001",
        details: {
          employe_nom: "Kofi Vendeur",
          ancienne_boutique: "B01 (Siège)",
          nouvelle_boutique: "B02 (Cadjèhoun)",
          regle_2_appliquee: true,
        },
      },
    });

    const log3 = await prisma.journal_audit.create({
      data: {
        compte_id: compteAlpha.id,
        utilisateur_id: patronAlpha.id,
        action: "annulation_vente",
        entite_concernee: "ventes",
        entite_id: "FAC-T28-B01-2026-00001",
        details: {
          motif: "Erreur de saisie client",
          stock_restitue: true,
          montant_annule: 15000,
        },
      },
    });

    console.log("   ✅ 3 logs créés sur Compte Alpha (création produit, transfert employé, annulation vente).");

    // -----------------------------------------------------------------
    // TEST B : Génération d'événements sur Compte Beta
    // -----------------------------------------------------------------
    console.log("\n▶ TEST B : Génération d'événements d'audit sur Compte Beta");

    const logBeta = await prisma.journal_audit.create({
      data: {
        compte_id: compteBeta.id,
        utilisateur_id: patronBeta.id,
        action: "creation_boutique",
        entite_concernee: "boutiques",
        entite_id: "B01",
        details: {
          nom: "Boutique Beta Porto-Novo",
        },
      },
    });

    console.log("   ✅ 1 log créé sur Compte Beta.");

    // -----------------------------------------------------------------
    // TEST C : Vérification de l'isolation Multi-Tenant STRICTE (Règle 5)
    // -----------------------------------------------------------------
    console.log("\n▶ TEST C : Contrôle de l'isolation Multi-Tenant (Règle 5)");

    const logsAlpha = await prisma.journal_audit.findMany({
      where: { compte_id: compteAlpha.id },
    });

    const logsBeta = await prisma.journal_audit.findMany({
      where: { compte_id: compteBeta.id },
    });

    if (logsAlpha.some((l) => l.compte_id === compteBeta.id)) {
      throw new Error("🚨 VIOLATION RÈGLE 5 : Compte Alpha contient un log de Compte Beta !");
    }

    if (logsBeta.some((l) => l.compte_id === compteAlpha.id)) {
      throw new Error("🚨 VIOLATION RÈGLE 5 : Compte Beta contient un log de Compte Alpha !");
    }

    if (logsAlpha.length !== 3) {
      throw new Error(`Attendu 3 logs pour Alpha, reçu ${logsAlpha.length}`);
    }

    if (logsBeta.length !== 1) {
      throw new Error(`Attendu 1 log pour Beta, reçu ${logsBeta.length}`);
    }

    console.log("   ✅ RÈGLE 5 CONFIRMÉE : Isolation 100% étanche entre les deux comptes.");

    // -----------------------------------------------------------------
    // TEST D : Intégrité du Payload JSON (Details inaltérables)
    // -----------------------------------------------------------------
    console.log("\n▶ TEST D : Intégrité des métadonnées JSON");

    const transfertLog = logsAlpha.find((l) => l.action === "transfert_employe");
    if (!transfertLog || !transfertLog.details) {
      throw new Error("Log de transfert ou details manquant");
    }

    const payload = transfertLog.details as any;
    if (payload.ancienne_boutique !== "B01 (Siège)" || payload.nouvelle_boutique !== "B02 (Cadjèhoun)") {
      throw new Error("Payload de transfert altéré ou incorrect");
    }

    console.log("   ✅ Métadonnées JSON conformes et complètes (avant/après traçable).");

    // -----------------------------------------------------------------
    // TEST E : Filtrage par type d'action et utilisateur
    // -----------------------------------------------------------------
    console.log("\n▶ TEST E : Filtrage ciblé par action");

    const annulations = await prisma.journal_audit.findMany({
      where: {
        compte_id: compteAlpha.id,
        action: "annulation_vente",
      },
    });

    if (annulations.length !== 1 || annulations[0].entite_id !== "FAC-T28-B01-2026-00001") {
      throw new Error("Échec du filtre par action annulation_vente");
    }

    console.log("   ✅ Filtre par action opérationnel et exact.");

    console.log("\n=================================================");
    console.log("🎉 TOUS LES TESTS ÉTAPE 11 ONT RÉUSSI AVEC SUCCÈS !");
    console.log("=================================================");
  } finally {
    console.log("\n🧹 Nettoyage des fixtures de test...");
    await prisma.journal_audit.deleteMany({
      where: { compte_id: { in: [compteAlpha.id, compteBeta.id] } },
    });
    await prisma.utilisateurs.deleteMany({
      where: { compte_id: { in: [compteAlpha.id, compteBeta.id] } },
    });
    await prisma.comptes.deleteMany({
      where: { id: { in: [compteAlpha.id, compteBeta.id] } },
    });
    console.log("✅ Fixtures supprimées proprement.");
  }
}

runTests()
  .catch((e) => {
    console.error("❌ ERREUR TEST ÉTAPE 11 :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
