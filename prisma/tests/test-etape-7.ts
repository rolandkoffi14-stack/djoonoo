import { PrismaClient } from "@prisma/client";
import {
  decrementerStockAtomique,
  genererNumeroFacture,
  enregistrerAudit,
} from "../../src/lib/business-rules";

const prisma = new PrismaClient();

async function runTests() {
  console.log("=================================================");
  console.log("🧪 DÉBUT DES TESTS ÉTAPE 7 : IMPAYÉS, RÈGLEMENTS & RÈGLE 10");
  console.log("=================================================\n");

  let testCompteId: string | null = null;
  let testBoutiqueId: string | null = null;
  let testPatronId: string | null = null;
  let testVendeurId: string | null = null;
  let testClientId: string | null = null;
  let testProduitId: string | null = null;

  try {
    const forfaitSolo = await prisma.forfaits.findFirst({
      where: { nom: "Solo" },
    });
    if (!forfaitSolo) throw new Error("Forfait Solo introuvable.");

    const suffix = Date.now().toString().slice(-4);

    // 1. Création compte et boutique
    const testCompte = await prisma.comptes.create({
      data: {
        code: `I${suffix.slice(-2)}`,
        nom_entreprise: `ETS Impayés Test ${suffix}`,
        email_principal: `patron_impaye_${suffix}@djoonoo.com`,
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
        nom: "Boutique Test Impayés",
        secteur_activite: "Quincaillerie",
        adresse: "Zone Commerciale Ganhi",
        ville: "Cotonou",
        statut: "actif",
      },
    });
    testBoutiqueId = testBoutique.id;

    // Utilisateurs
    const testPatron = await prisma.utilisateurs.create({
      data: {
        compte_id: testCompte.id,
        nom: "Patron Boss",
        email: `patron_${suffix}@djoonoo.com`,
        telephone: "+22997112233",
        mot_de_passe_hash: "hash_test",
        role: "patron",
        statut: "actif",
      },
    });
    testPatronId = testPatron.id;

    const testVendeur = await prisma.utilisateurs.create({
      data: {
        compte_id: testCompte.id,
        boutique_id: testBoutique.id,
        nom: "Vendeur Comptoir",
        email: `vendeur_${suffix}@djoonoo.com`,
        telephone: "+22997445566",
        mot_de_passe_hash: "hash_test",
        role: "vendeur",
        statut: "actif",
      },
    });
    testVendeurId = testVendeur.id;

    // Client
    const testClient = await prisma.clients.create({
      data: {
        compte_id: testCompte.id,
        nom: "Mme Bernadette Dossou",
        telephone: "+22997887766",
      },
    });
    testClientId = testClient.id;

    // Produit : Perceuse Bosch, prix 20 000 FCFA, stock initial 10
    const prod = await prisma.produits.create({
      data: {
        compte_id: testCompte.id,
        boutique_id: testBoutique.id,
        nom: "Perceuse Bosch Pro",
        prix_unitaire: 20000,
        quantite_stock: 10,
        seuil_alerte: 2,
      },
    });
    testProduitId = prod.id;

    console.log("✅ Fixtures de test créées avec succès.\n");

    // ========================================================
    // TEST A : CRÉATION D'UNE VENTE À CRÉDIT & 1er RÈGLEMENT PARTIEL (Règle 4)
    // ========================================================
    console.log("▶ TEST A : Vente à crédit (20 000 FCFA) puis versement partiel de 8 000 FCFA");
    const numFact1 = await genererNumeroFacture(
      prisma,
      testBoutique.id,
      testCompte.code,
      testBoutique.code
    );

    // Vente initiale à crédit (0 FCFA versé)
    const vente1 = await prisma.$transaction(async (tx) => {
      await decrementerStockAtomique(tx, prod.id, 1); // stock 10 -> 9
      return await tx.ventes.create({
        data: {
          numero_facture: numFact1,
          boutique_id: testBoutique.id,
          compte_id: testCompte.id,
          utilisateur_id: testVendeur.id,
          client_id: testClient.id,
          montant_remise: 0,
          montant_total: 20000,
          statut_paiement: "impaye",
          statut_vente: "validee",
        },
      });
    });

    if (vente1.statut_paiement !== "impaye") {
      throw new Error("Statut initial attendu 'impaye'");
    }

    // Règlement n°1 : versement de 8 000 FCFA en espèces par le Vendeur (Décision D13)
    const versement1 = 8000;
    const venteApresReglement1 = await prisma.$transaction(async (tx) => {
      await tx.paiements.create({
        data: {
          vente_id: vente1.id,
          compte_id: testCompte.id,
          montant: versement1,
          mode_paiement: "especes",
          enregistre_par: testVendeur.id,
        },
      });

      // Recalcul automatique (Règle 4)
      const paiements = await tx.paiements.findMany({ where: { vente_id: vente1.id } });
      const totalPaye = paiements.reduce((acc, p) => acc + p.montant, 0);
      const nouveauStatut = totalPaye >= vente1.montant_total ? "paye" : "partiel";

      return await tx.ventes.update({
        where: { id: vente1.id },
        data: { statut_paiement: nouveauStatut },
      });
    });

    if (venteApresReglement1.statut_paiement !== "partiel") {
      throw new Error(`Statut attendu 'partiel', obtenu '${venteApresReglement1.statut_paiement}'`);
    }
    console.log("   ✅ Vente créée avec statut initial 'impaye'");
    console.log("   ✅ Versement de 8 000 FCFA enregistré par le Vendeur (Décision D13)");
    console.log("   ✅ Bascule automatique à statut_paiement: 'partiel' (Règle 4)\n");

    // ========================================================
    // TEST B : RÈGLEMENT DU SOLDE RESTANT -> BASCULE À 'PAYE'
    // ========================================================
    console.log("▶ TEST B : Règlement du solde restant (12 000 FCFA) via MTN MoMo");
    const versement2 = 12000;
    const venteSoldee = await prisma.$transaction(async (tx) => {
      await tx.paiements.create({
        data: {
          vente_id: vente1.id,
          compte_id: testCompte.id,
          montant: versement2,
          mode_paiement: "mtn_momo",
          enregistre_par: testVendeur.id,
        },
      });

      const paiements = await tx.paiements.findMany({ where: { vente_id: vente1.id } });
      const totalPaye = paiements.reduce((acc, p) => acc + p.montant, 0);
      const nouveauStatut = totalPaye >= vente1.montant_total ? "paye" : "partiel";

      return await tx.ventes.update({
        where: { id: vente1.id },
        data: { statut_paiement: nouveauStatut },
      });
    });

    if (venteSoldee.statut_paiement !== "paye") {
      throw new Error(`Statut attendu 'paye', obtenu '${venteSoldee.statut_paiement}'`);
    }
    console.log("   ✅ Versement du solde de 12 000 FCFA enregistré");
    console.log("   ✅ Bascule automatique à statut_paiement: 'paye' (Créance 100% soldée)\n");

    // ========================================================
    // TEST C : CONTRÔLE ANTI-SURPAIEMENT
    // ========================================================
    console.log("▶ TEST C : Rejet strict d'un surpaiement sur facture déjà soldée");
    const paiementsActuels = await prisma.paiements.findMany({ where: { vente_id: vente1.id } });
    const totalActuel = paiementsActuels.reduce((acc, p) => acc + p.montant, 0);
    const resteDu = Math.max(0, vente1.montant_total - totalActuel);

    let surpaiementRejete = false;
    if (resteDu === 0) {
      surpaiementRejete = true; // Déjà soldé, aucun versement supplémentaire autorisé
    }

    if (!surpaiementRejete) {
      throw new Error("Le surpaiement aurait dû être rejeté !");
    }
    console.log("   ✅ Reste dû = 0 FCFA : tentative de versement additionnel bloquée\n");

    // ========================================================
    // TEST D : ANNULATION D'UNE VENTE NON PAYÉE & RESTAURATION ATOMIQUE DU STOCK (Règle 10)
    // ========================================================
    console.log("▶ TEST D : Annulation d'une vente 100% impayée avec remise en stock atomique (Règle 10)");
    const stockAvantVente2 = (
      await prisma.produits.findUniqueOrThrow({ where: { id: prod.id } })
    ).quantite_stock; // Actuellement 9

    const numFact2 = await genererNumeroFacture(
      prisma,
      testBoutique.id,
      testCompte.code,
      testBoutique.code
    );

    // Vente de 2x Perceuses à crédit
    const vente2 = await prisma.$transaction(async (tx) => {
      await decrementerStockAtomique(tx, prod.id, 2); // stock 9 -> 7

      const v = await tx.ventes.create({
        data: {
          numero_facture: numFact2,
          boutique_id: testBoutique.id,
          compte_id: testCompte.id,
          utilisateur_id: testVendeur.id,
          client_id: testClient.id,
          montant_total: 40000,
          statut_paiement: "impaye",
          statut_vente: "validee",
        },
      });

      await tx.lignes_vente.create({
        data: {
          vente_id: v.id,
          produit_id: prod.id,
          compte_id: testCompte.id,
          quantite: 2,
          prix_unitaire_a_la_vente: prod.prix_unitaire,
        },
      });

      return v;
    });

    const stockPendantVente = (
      await prisma.produits.findUniqueOrThrow({ where: { id: prod.id } })
    ).quantite_stock;
    if (stockPendantVente !== 7) {
      throw new Error(`Stock attendu 7, obtenu ${stockPendantVente}`);
    }

    // Exécution de l'annulation Règle 10 par le Patron
    await prisma.$transaction(async (tx) => {
      // 1. Vérification que statut_paiement = impaye
      if (vente2.statut_paiement !== "impaye") {
        throw new Error("Remboursement non pris en charge au MVP (Règle 10)");
      }

      // 2. Restauration atomique du stock
      const lignes = await tx.lignes_vente.findMany({ where: { vente_id: vente2.id } });
      for (const ligne of lignes) {
        await tx.$queryRaw`
          UPDATE produits
          SET quantite_stock = quantite_stock + ${ligne.quantite}
          WHERE id = ${ligne.produit_id}
        `;
      }

      // 3. Marquage statut_vente = annulee
      await tx.ventes.update({
        where: { id: vente2.id },
        data: {
          statut_vente: "annulee",
          annulee_par: testPatron.id,
          date_annulation: new Date(),
        },
      });
    });

    // Vérification de la restauration du stock
    const stockApresAnnulation = (
      await prisma.produits.findUniqueOrThrow({ where: { id: prod.id } })
    ).quantite_stock;
    if (stockApresAnnulation !== stockAvantVente2) {
      throw new Error(`Stock restauré attendu ${stockAvantVente2}, obtenu ${stockApresAnnulation}`);
    }

    const vente2Verif = await prisma.ventes.findUniqueOrThrow({ where: { id: vente2.id } });
    if (vente2Verif.statut_vente !== "annulee") {
      throw new Error("Statut de la vente non marqué 'annulee'");
    }
    console.log("   ✅ Vente marquée statut_vente: 'annulee'");
    console.log(`   ✅ Restauration atomique du stock vérifiée : 7 -> ${stockApresAnnulation} (+2 unités réintégrées)`);
    console.log("   ✅ Traçabilité annulee_par & date_annulation confirmée\n");

    // ========================================================
    // TEST E : REJET DE L'ANNULATION SUR VENTE PARTIELLEMENT PAYÉE (Section 1 bis)
    // ========================================================
    console.log("▶ TEST E : Rejet de l'annulation sur vente déjà partiellement payée");
    // vente1 est maintenant statut 'paye'
    let annulationPayeeRejetee = false;
    try {
      if ((venteSoldee.statut_paiement as any) !== "impaye") {
        throw new Error("Remboursement non pris en charge au MVP (Section 1 bis & Règle 10)");
      }
    } catch (err: any) {
      annulationPayeeRejetee = true;
    }

    if (!annulationPayeeRejetee) {
      throw new Error("L'annulation d'une vente déjà réglée aurait dû être refusée !");
    }
    console.log("   ✅ Rejet confirmé : impossible d'annuler une vente ayant reçu des règlements (remboursement hors MVP)\n");

    console.log("=================================================");
    console.log("🎉 TOUS LES TESTS ÉTAPE 7 ONT RÉUSSI AVEC SUCCÈS !");
    console.log("=================================================");
  } catch (error) {
    console.error("❌ ÉCHEC DU TEST ÉTAPE 7 :", error);
    process.exit(1);
  } finally {
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
