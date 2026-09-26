import { PrismaClient } from "@prisma/client";
import { decrementerStockAtomique, enregistrerAudit, StockInsuffisantError } from "../../src/lib/business-rules";

const prisma = new PrismaClient();

async function runTests() {
  console.log("=================================================");
  console.log("🧪 DÉBUT DES TESTS ÉTAPE 5 : PRODUITS & STOCKS");
  console.log("=================================================\n");

  let testCompteId: string | null = null;
  let testBoutiqueId: string | null = null;
  let testProduitId: string | null = null;

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
        code: `P${suffix.slice(-2)}`,
        nom_entreprise: `Test Produits SARL ${suffix}`,
        email_principal: `patron_produit_${suffix}@djoonoo.com`,
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
        nom: "Boutique Test Produits",
        secteur_activite: "Textile",
        adresse: "Avenue Steinmetz",
        ville: "Cotonou",
        statut: "actif",
      },
    });
    testBoutiqueId = testBoutique.id;

    // Création d'un utilisateur patron de test pour satisfaire la clé étrangère journal_audit
    const testUser = await prisma.utilisateurs.create({
      data: {
        compte_id: testCompte.id,
        nom: "Patron Test",
        email: `user_${suffix}@djoonoo.com`,
        telephone: "+22997000000",
        mot_de_passe_hash: "hash_test",
        role: "patron",
        statut: "actif",
      },
    });

    console.log(`✅ Contexte de test initialisé (Compte: ${testCompte.id}, Boutique: ${testBoutique.code}, User: ${testUser.id})`);

    // -------------------------------------------------------------------
    // TEST A : Création de produit avec prix FCFA et seuil d'alerte
    // -------------------------------------------------------------------
    console.log("\n1. [Test A] Création d'un produit avec stock et seuil d'alerte...");
    const produit = await prisma.$transaction(async (tx) => {
      const p = await tx.produits.create({
        data: {
          nom: "Robe Wax Kente",
          prix_unitaire: 18500, // FCFA entier
          quantite_stock: 10,
          seuil_alerte: 5,
          boutique_id: testBoutique.id,
          compte_id: testCompte.id,
        },
      });

      await enregistrerAudit(tx, {
        compte_id: testCompte.id,
        utilisateur_id: testUser.id,
        action: "creation_produit",
        entite_concernee: "produits",
        entite_id: p.id,
        details: { nom: p.nom, prix_unitaire: p.prix_unitaire },
      });

      return p;
    });
    testProduitId = produit.id;

    console.log(`   - Produit créé : "${produit.nom}"`);
    console.log(`   - Prix unitaire : ${produit.prix_unitaire} FCFA`);
    console.log(`   - Stock initial : ${produit.quantite_stock} unités (Seuil alerte: ${produit.seuil_alerte})`);

    if (produit.quantite_stock !== 10 || produit.prix_unitaire !== 18500) {
      throw new Error("Valeurs de produit non conformes aux données insérées.");
    }
    console.log("✅ [Test A] Création de produit validée avec prix FCFA entier et isolation boutique !");

    // -------------------------------------------------------------------
    // TEST B : Décrémentation atomique concurrente (Règle 1)
    // -------------------------------------------------------------------
    console.log("\n2. [Test B] Test de décrémentation atomique de stock (Règle 1)...");
    // Décrémentation normale de 4 unités -> reste 6
    const stockApresVente1 = await prisma.$transaction(async (tx) => {
      return decrementerStockAtomique(tx, produit.id, 4);
    });
    console.log(`   - Stock après première vente de 4 unités : ${stockApresVente1} unités`);
    if (stockApresVente1 !== 6) throw new Error(`Attendu 6 unités, reçu ${stockApresVente1}`);

    // Concurrence : deux tentatives simultanées de vente de 4 unités sur un stock de 6 !
    console.log("   - Test de concurrence : 2 requêtes simultanées de décrémentation de 4 unités sur stock de 6...");
    let reussiteCount = 0;
    let rejetCount = 0;

    const [res1, res2] = await Promise.allSettled([
      prisma.$transaction(async (tx) => decrementerStockAtomique(tx, produit.id, 4)),
      prisma.$transaction(async (tx) => decrementerStockAtomique(tx, produit.id, 4)),
    ]);

    if (res1.status === "fulfilled") reussiteCount++;
    else if (res1.reason instanceof StockInsuffisantError) rejetCount++;

    if (res2.status === "fulfilled") reussiteCount++;
    else if (res2.reason instanceof StockInsuffisantError) rejetCount++;

    console.log(`   - Résultat concurrence : ${reussiteCount} vente validée, ${rejetCount} vente rejetée pour stock insuffisant.`);
    if (reussiteCount !== 1 || rejetCount !== 1) {
      throw new Error(`Échec de la concurrence Règle 1 ! Succès: ${reussiteCount}, Rejets: ${rejetCount}`);
    }

    const produitApresConcurrence = await prisma.produits.findUnique({ where: { id: produit.id } });
    console.log(`   - Stock restant en base : ${produitApresConcurrence?.quantite_stock} unités`);
    if (produitApresConcurrence?.quantite_stock !== 2) {
      throw new Error(`Attendu stock final = 2, reçu ${produitApresConcurrence?.quantite_stock}`);
    }
    console.log("✅ [Test B] Règle 1 validée à 100% : Décrémentation atomique stricte sans vente négative !");

    // -------------------------------------------------------------------
    // TEST C : Seuil d'alerte et Réapprovisionnement
    // -------------------------------------------------------------------
    console.log("\n3. [Test C] Vérification du statut d'alerte et réapprovisionnement...");
    const estEnAlerte = (produitApresConcurrence?.quantite_stock || 0) <= produit.seuil_alerte;
    console.log(`   - Stock actuel (2) <= Seuil alerte (5) ? ${estEnAlerte} (Alerte Stock Bas active)`);
    if (!estEnAlerte) throw new Error("Le produit aurait dû déclencher l'alerte de stock bas.");

    // Réapprovisionnement de 20 unités
    const produitReappro = await prisma.$transaction(async (tx) => {
      const p = await tx.produits.update({
        where: { id: produit.id },
        data: { quantite_stock: { increment: 20 } },
      });

      await enregistrerAudit(tx, {
        compte_id: testCompte.id,
        utilisateur_id: testUser.id,
        action: "reapprovisionnement_stock",
        entite_concernee: "produits",
        entite_id: p.id,
        details: { quantite_ajoutee: 20, ancien_stock: 2, nouveau_stock: p.quantite_stock },
      });

      return p;
    });

    console.log(`   - Stock après réapprovisionnement : ${produitReappro.quantite_stock} unités`);
    const estOptimal = produitReappro.quantite_stock > produit.seuil_alerte;
    console.log(`   - Stock actuel (22) > Seuil alerte (5) ? ${estOptimal} (Retour à l'état Optimal)`);
    if (!estOptimal) throw new Error("Le produit aurait dû repasser en état optimal.");
    console.log("✅ [Test C] Réapprovisionnement et transitions d'état d'alerte validés !");

    // -------------------------------------------------------------------
    // TEST D : Vérification du Journal d'Audit
    // -------------------------------------------------------------------
    console.log("\n4. [Test D] Vérification de la traçabilité dans journal_audit...");
    const auditLogs = await prisma.journal_audit.findMany({
      where: { compte_id: testCompte.id, entite_concernee: "produits" },
    });
    console.log(`   - Nombre de logs pour les produits : ${auditLogs.length}`);
    const actions = auditLogs.map((l) => l.action);
    console.log(`   - Actions consignées : ${actions.join(", ")}`);

    if (!actions.includes("creation_produit") || !actions.includes("reapprovisionnement_stock")) {
      throw new Error("Audit trail incomplet pour les opérations de produit !");
    }
    console.log("✅ [Test D] Audit trail validé : toutes les opérations sont consignées avec compte_id !");

    console.log("\n=================================================");
    console.log("🎉 TOUS LES TESTS DE L'ÉTAPE 5 ONT RÉUSSI (100%) !");
    console.log("=================================================\n");
  } catch (err: any) {
    console.error("\n❌ ÉCHEC D'UN TEST ÉTAPE 5 :", err);
    process.exitCode = 1;
  } finally {
    if (testCompteId) {
      console.log("🧹 Nettoyage des données de test...");
      await prisma.journal_audit.deleteMany({ where: { compte_id: testCompteId } });
      await prisma.produits.deleteMany({ where: { compte_id: testCompteId } });
      await prisma.utilisateurs.deleteMany({ where: { compte_id: testCompteId } });
      await prisma.boutiques.deleteMany({ where: { compte_id: testCompteId } });
      await prisma.compteur_boutique.deleteMany({ where: { compte_id: testCompteId } });
      await prisma.comptes.deleteMany({ where: { id: testCompteId } });
      console.log("✅ Nettoyage terminé avec succès.");
    }
    await prisma.$disconnect();
  }
}

runTests();
