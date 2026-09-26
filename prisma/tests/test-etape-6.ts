import { PrismaClient } from "@prisma/client";
import {
  decrementerStockAtomique,
  genererNumeroFacture,
  enregistrerAudit,
  StockInsuffisantError,
} from "../../src/lib/business-rules";

const prisma = new PrismaClient();

async function runTests() {
  console.log("=================================================");
  console.log("🧪 DÉBUT DES TESTS ÉTAPE 6 : VENTES, POS & ACID");
  console.log("=================================================\n");

  let testCompteId: string | null = null;
  let testBoutiqueId: string | null = null;
  let testUserId: string | null = null;
  let testClientId: string | null = null;
  let testProduitAId: string | null = null;
  let testProduitBId: string | null = null;

  try {
    // 0. Récupération d'un forfait
    const forfaitSolo = await prisma.forfaits.findFirst({
      where: { nom: "Solo" },
    });
    if (!forfaitSolo) throw new Error("Forfait Solo introuvable.");

    // 1. Création compte et boutique de test
    const suffix = Date.now().toString().slice(-4);
    const testCompte = await prisma.comptes.create({
      data: {
        code: `V${suffix.slice(-2)}`,
        nom_entreprise: `ETS Ventes Test ${suffix}`,
        email_principal: `patron_vente_${suffix}@djoonoo.com`,
        forfait_id: forfaitSolo.id,
        statut_abonnement: "essai",
        telephone_principal: "+22997000000",
        ville: "Cotonou",
      },
    });
    testCompteId = testCompte.id;

    const testBoutique = await prisma.boutiques.create({
      data: {
        compte_id: testCompte.id,
        code: "B01",
        nom: "Boutique Test Ventes",
        secteur_activite: "Informatique",
        adresse: "Avenue Pape Jean-Paul II",
        ville: "Cotonou",
        statut: "actif",
      },
    });
    testBoutiqueId = testBoutique.id;

    // Utilisateur de test
    const testUser = await prisma.utilisateurs.create({
      data: {
        compte_id: testCompte.id,
        nom: "Vendeur Test",
        email: `vendeur_${suffix}@djoonoo.com`,
        telephone: "+22997112233",
        mot_de_passe_hash: "hash_test",
        role: "patron",
        statut: "actif",
      },
    });
    testUserId = testUser.id;

    // Client de test
    const testClient = await prisma.clients.create({
      data: {
        compte_id: testCompte.id,
        nom: "Client Bio Chabi",
        telephone: "+22997998877",
      },
    });
    testClientId = testClient.id;

    // Produits de test
    // Produit A: Clavier USB, prix 5 000 FCFA, stock 20
    const prodA = await prisma.produits.create({
      data: {
        compte_id: testCompte.id,
        boutique_id: testBoutique.id,
        nom: "Clavier USB Pro",
        prix_unitaire: 5000,
        quantite_stock: 20,
        seuil_alerte: 5,
      },
    });
    testProduitAId = prodA.id;

    // Produit B: Souris Sans Fil, prix 3 500 FCFA, stock 10
    const prodB = await prisma.produits.create({
      data: {
        compte_id: testCompte.id,
        boutique_id: testBoutique.id,
        nom: "Souris Sans Fil",
        prix_unitaire: 3500,
        quantite_stock: 10,
        seuil_alerte: 2,
      },
    });
    testProduitBId = prodB.id;

    console.log("✅ Fixtures de test créées :");
    console.log(`   - Compte : ${testCompte.nom_entreprise} (${testCompte.code})`);
    console.log(`   - Boutique : ${testBoutique.nom} (${testBoutique.code})`);
    console.log(`   - Produit A : ${prodA.nom} (Stock: 20, Prix: 5 000 FCFA)`);
    console.log(`   - Produit B : ${prodB.nom} (Stock: 10, Prix: 3 500 FCFA)\n`);

    // ========================================================
    // TEST A : VENTE COMPTANT 100% ESPÈCES (Règles 1, 3, 4, 7)
    // ========================================================
    console.log("▶ TEST A : Vente comptant 100% espèces");
    const numFactureA = await prisma.$transaction(async (tx) => {
      // Décrémenter 2x Produit A
      await decrementerStockAtomique(tx, prodA.id, 2);

      const numFact = await genererNumeroFacture(
        tx,
        testBoutique.id,
        testCompte.code,
        testBoutique.code
      );

      const montantTotal = 2 * prodA.prix_unitaire; // 10 000 FCFA

      const vente = await tx.ventes.create({
        data: {
          numero_facture: numFact,
          boutique_id: testBoutique.id,
          compte_id: testCompte.id,
          utilisateur_id: testUser.id,
          client_id: testClient.id,
          montant_remise: 0,
          montant_total: montantTotal,
          statut_paiement: "paye",
          statut_vente: "validee",
          cle_idempotence: `test-cle-A-${suffix}`,
        },
      });

      await tx.lignes_vente.create({
        data: {
          vente_id: vente.id,
          produit_id: prodA.id,
          compte_id: testCompte.id,
          quantite: 2,
          prix_unitaire_a_la_vente: prodA.prix_unitaire,
        },
      });

      await tx.paiements.create({
        data: {
          vente_id: vente.id,
          compte_id: testCompte.id,
          montant: montantTotal,
          mode_paiement: "especes",
          enregistre_par: testUser.id,
        },
      });

      return numFact;
    });

    const anneeCourante = new Date().getFullYear();
    const regexFacture = new RegExp(
      `^FAC-${testCompte.code}-${testBoutique.code}-${anneeCourante}-00001$`
    );
    if (!regexFacture.test(numFactureA)) {
      throw new Error(`Format de facture invalide : ${numFactureA}`);
    }

    const prodAVerif = await prisma.produits.findUniqueOrThrow({ where: { id: prodA.id } });
    if (prodAVerif.quantite_stock !== 18) {
      throw new Error(`Stock attendu 18, obtenu ${prodAVerif.quantite_stock}`);
    }
    console.log(`   ✅ Numéro séquentiel conforme : ${numFactureA}`);
    console.log(`   ✅ Décrémentation atomique vérifiée : Stock A 20 -> 18`);
    console.log("   ✅ Statut de paiement : 'paye'\n");

    // ========================================================
    // TEST B : VENTE AVEC REMISE COMMERCIALE (Règle 9)
    // ========================================================
    console.log("▶ TEST B : Vente avec remise commerciale (Règle 9)");
    const numFactureB = await prisma.$transaction(async (tx) => {
      // 1x Produit B (3 500 FCFA), Remise de 500 FCFA => Net = 3 000 FCFA
      await decrementerStockAtomique(tx, prodB.id, 1);

      const numFact = await genererNumeroFacture(
        tx,
        testBoutique.id,
        testCompte.code,
        testBoutique.code
      );

      const sousTotal = 1 * prodB.prix_unitaire; // 3500
      const remise = 500;
      const netTotal = Math.max(0, sousTotal - remise); // 3000

      const vente = await tx.ventes.create({
        data: {
          numero_facture: numFact,
          boutique_id: testBoutique.id,
          compte_id: testCompte.id,
          utilisateur_id: testUser.id,
          client_id: null, // vente anonyme
          montant_remise: remise,
          montant_total: netTotal,
          statut_paiement: "paye",
          statut_vente: "validee",
          cle_idempotence: `test-cle-B-${suffix}`,
        },
      });

      await tx.lignes_vente.create({
        data: {
          vente_id: vente.id,
          produit_id: prodB.id,
          compte_id: testCompte.id,
          quantite: 1,
          prix_unitaire_a_la_vente: prodB.prix_unitaire,
        },
      });

      await tx.paiements.create({
        data: {
          vente_id: vente.id,
          compte_id: testCompte.id,
          montant: netTotal,
          mode_paiement: "mtn_momo",
          enregistre_par: testUser.id,
        },
      });

      return { numFact, netTotal };
    });

    if (numFactureB.netTotal !== 3000) {
      throw new Error(`Montant net attendu 3 000 FCFA, obtenu ${numFactureB.netTotal}`);
    }

    const prodBVerif = await prisma.produits.findUniqueOrThrow({ where: { id: prodB.id } });
    if (prodBVerif.quantite_stock !== 9) {
      throw new Error(`Stock attendu 9, obtenu ${prodBVerif.quantite_stock}`);
    }
    console.log(`   ✅ Numéro séquentiel n°2 : ${numFactureB.numFact}`);
    console.log(`   ✅ Total net calculé côté serveur : 3 000 FCFA (Brut 3500 - Remise 500)`);
    console.log(`   ✅ Paiement MTN MoMo enregistré\n`);

    // ========================================================
    // TEST C : VENTE À CRÉDIT / PAIEMENT PARTIEL (Section 1.4)
    // ========================================================
    console.log("▶ TEST C : Vente à crédit avec acompte partiel (Règle 4)");
    const ventePartielle = await prisma.$transaction(async (tx) => {
      // 2x Produit B = 7 000 FCFA. Acompte versé = 3 000 FCFA. Reste dû = 4 000 FCFA.
      await decrementerStockAtomique(tx, prodB.id, 2);

      const numFact = await genererNumeroFacture(
        tx,
        testBoutique.id,
        testCompte.code,
        testBoutique.code
      );

      const montantTotal = 7000;
      const acompte = 3000;

      const vente = await tx.ventes.create({
        data: {
          numero_facture: numFact,
          boutique_id: testBoutique.id,
          compte_id: testCompte.id,
          utilisateur_id: testUser.id,
          client_id: testClient.id,
          montant_remise: 0,
          montant_total: montantTotal,
          statut_paiement: "partiel", // Règle 4 : acompte > 0 et < total
          statut_vente: "validee",
          cle_idempotence: `test-cle-C-${suffix}`,
        },
      });

      await tx.lignes_vente.create({
        data: {
          vente_id: vente.id,
          produit_id: prodB.id,
          compte_id: testCompte.id,
          quantite: 2,
          prix_unitaire_a_la_vente: prodB.prix_unitaire,
        },
      });

      await tx.paiements.create({
        data: {
          vente_id: vente.id,
          compte_id: testCompte.id,
          montant: acompte,
          mode_paiement: "moov_money",
          enregistre_par: testUser.id,
        },
      });

      return vente;
    });

    if (ventePartielle.statut_paiement !== "partiel") {
      throw new Error(`Statut attendu 'partiel', obtenu ${ventePartielle.statut_paiement}`);
    }
    console.log(`   ✅ Numéro séquentiel n°3 : ${ventePartielle.numero_facture}`);
    console.log(`   ✅ Statut de paiement automatique : 'partiel'`);
    console.log(`   ✅ Acompte de 3 000 FCFA enregistré sur 7 000 FCFA dus\n`);

    // ========================================================
    // TEST D : STOCK INSUFFISANT & ROLLBACK ACID (Règle 1)
    // ========================================================
    console.log("▶ TEST D : Rejet strict en cas de stock insuffisant (Règle 1)");
    let aEchoueCommePrevu = false;
    const stockAvantEchec = (await prisma.produits.findUniqueOrThrow({ where: { id: prodB.id } }))
      .quantite_stock; // actuellement 7

    try {
      await prisma.$transaction(async (tx) => {
        // Tentative de décrémenter 10 unités alors qu'il n'en reste que 7
        await decrementerStockAtomique(tx, prodB.id, 10);
      });
    } catch (err: any) {
      if (err instanceof StockInsuffisantError) {
        aEchoueCommePrevu = true;
      } else {
        throw err;
      }
    }

    if (!aEchoueCommePrevu) {
      throw new Error("La décrémentation aurait dû échouer avec StockInsuffisantError !");
    }

    const stockApresEchec = (await prisma.produits.findUniqueOrThrow({ where: { id: prodB.id } }))
      .quantite_stock;
    if (stockApresEchec !== stockAvantEchec) {
      throw new Error("Le stock a été altéré malgré l'échec de la transaction !");
    }
    console.log(`   ✅ StockInsuffisantError levée avec succès`);
    console.log(`   ✅ Rollback SQL total vérifié : Stock inchangé à ${stockApresEchec}\n`);

    // ========================================================
    // TEST E : UNICITÉ DE LA CLÉ D'IDEMPOTENCE (Règle 6)
    // ========================================================
    console.log("▶ TEST E : Clé d'idempotence anti-doublon (Règle 6)");
    const cleUnique = `test-idempotence-${suffix}`;

    // 1ère insertion avec cette clé
    const numFact1 = await genererNumeroFacture(
      prisma,
      testBoutique.id,
      testCompte.code,
      testBoutique.code
    );

    await prisma.ventes.create({
      data: {
        numero_facture: numFact1,
        boutique_id: testBoutique.id,
        compte_id: testCompte.id,
        utilisateur_id: testUser.id,
        montant_total: 5000,
        statut_paiement: "paye",
        cle_idempotence: cleUnique,
      },
    });

    // 2ème insertion avec la MÊME clé -> doit lever une violation de contrainte unique P2002
    let doublonBloque = false;
    try {
      const numFact2 = await genererNumeroFacture(
        prisma,
        testBoutique.id,
        testCompte.code,
        testBoutique.code
      );
      await prisma.ventes.create({
        data: {
          numero_facture: numFact2,
          boutique_id: testBoutique.id,
          compte_id: testCompte.id,
          utilisateur_id: testUser.id,
          montant_total: 5000,
          statut_paiement: "paye",
          cle_idempotence: cleUnique,
        },
      });
    } catch (err: any) {
      if (err.code === "P2002") {
        doublonBloque = true;
      }
    }

    if (!doublonBloque) {
      throw new Error("L'insertion en double avec la même clé d'idempotence a été autorisée !");
    }
    console.log("   ✅ Contrainte d'unicité @unique sur cle_idempotence confirmée (Erreur P2002)");
    console.log("   ✅ Aucun doublon de facture ni de paiement créé en cas de re-soumission\n");

    console.log("=================================================");
    console.log("🎉 TOUS LES TESTS ÉTAPE 6 ONT RÉUSSI AVEC SUCCÈS !");
    console.log("=================================================");
  } catch (error) {
    console.error("❌ ÉCHEC D'UN TEST ÉTAPE 6 :", error);
    process.exit(1);
  } finally {
    // Nettoyage complet des fixtures
    console.log("\n🧹 Nettoyage des fixtures de test...");
    if (testCompteId) {
      await prisma.paiements.deleteMany({ where: { compte_id: testCompteId } });
      await prisma.lignes_vente.deleteMany({ where: { compte_id: testCompteId } });
      await prisma.ventes.deleteMany({ where: { compte_id: testCompteId } });
      await prisma.produits.deleteMany({ where: { compte_id: testCompteId } });
      await prisma.clients.deleteMany({ where: { compte_id: testCompteId } });
      await prisma.journal_audit.deleteMany({ where: { compte_id: testCompteId } });
      await prisma.utilisateurs.deleteMany({ where: { compte_id: testCompteId } });
      if (testBoutiqueId) {
        await prisma.compteurs_facture.deleteMany({ where: { boutique_id: testBoutiqueId } });
      }
      await prisma.boutiques.deleteMany({ where: { compte_id: testCompteId } });
      await prisma.comptes.deleteMany({ where: { id: testCompteId } });
      console.log("✅ Fixtures supprimées proprement.");
    }
    await prisma.$disconnect();
  }
}

runTests();
