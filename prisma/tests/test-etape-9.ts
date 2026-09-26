import { PrismaClient } from "@prisma/client";
import { genererNumeroFacture } from "../../src/lib/business-rules";

const prisma = new PrismaClient();

async function runTests() {
  console.log("=================================================");
  console.log("🧪 DÉBUT DES TESTS ÉTAPE 9 : RAPPORTS & FINANCES");
  console.log("=================================================\n");

  let testCompteId: string | null = null;
  let testBoutique1Id: string | null = null;
  let testBoutique2Id: string | null = null;
  let testPatronId: string | null = null;
  let testVendeurId: string | null = null;

  try {
    const forfaitSolo = await prisma.forfaits.findFirst({ where: { nom: "Solo" } });
    if (!forfaitSolo) throw new Error("Forfait Solo introuvable.");

    const suffix = Date.now().toString().slice(-4);

    // 1. Compte de test
    const testCompte = await prisma.comptes.create({
      data: {
        code: `R${suffix.slice(-2)}`,
        nom_entreprise: `ETS Rapports Test ${suffix}`,
        email_principal: `patron_rapport_${suffix}@djoonoo.com`,
        forfait_id: forfaitSolo.id,
        statut_abonnement: "essai",
        telephone_principal: "+22997000000",
        ville: "Cotonou",
      },
    });
    testCompteId = testCompte.id;

    // 2. Boutiques B01 et B02
    const boutique1 = await prisma.boutiques.create({
      data: {
        compte_id: testCompte.id,
        code: "B01",
        nom: "Boutique Port",
        secteur_activite: "Quincaillerie",
        adresse: "Zone Portuaire",
        ville: "Cotonou",
        statut: "actif",
      },
    });
    testBoutique1Id = boutique1.id;

    const boutique2 = await prisma.boutiques.create({
      data: {
        compte_id: testCompte.id,
        code: "B02",
        nom: "Boutique Aéroport",
        secteur_activite: "Quincaillerie",
        adresse: "Haie Vive",
        ville: "Cotonou",
        statut: "actif",
      },
    });
    testBoutique2Id = boutique2.id;

    // Utilisateurs
    const patron = await prisma.utilisateurs.create({
      data: {
        compte_id: testCompte.id,
        nom: "Patron Rapports",
        email: `patron_r_${suffix}@djoonoo.com`,
        telephone: "+22997001122",
        mot_de_passe_hash: "hash",
        role: "patron",
        statut: "actif",
      },
    });
    testPatronId = patron.id;

    const vendeur = await prisma.utilisateurs.create({
      data: {
        compte_id: testCompte.id,
        boutique_id: boutique1.id,
        nom: "Vendeur Port",
        email: `vendeur_r_${suffix}@djoonoo.com`,
        telephone: "+22997334455",
        mot_de_passe_hash: "hash",
        role: "vendeur",
        statut: "actif",
      },
    });
    testVendeurId = vendeur.id;

    console.log("✅ Fixtures initiales créées avec succès.\n");

    // ========================================================
    // CRÉATION DE VENTES HISTORIQUES MULTI-PÉRIODES & MODES
    // ========================================================
    const now = new Date();
    const ilYa3Jours = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const moisDernier = new Date(now.getFullYear(), now.getMonth() - 1, 15);

    // Vente 1 : Aujourd'hui dans Boutique 1 (10 000 FCFA, 100% Espèces, validée)
    const numFact1 = await genererNumeroFacture(prisma, boutique1.id, testCompte.code, boutique1.code);
    const v1 = await prisma.ventes.create({
      data: {
        numero_facture: numFact1,
        boutique_id: boutique1.id,
        compte_id: testCompte.id,
        utilisateur_id: vendeur.id,
        montant_total: 10000,
        statut_paiement: "paye",
        statut_vente: "validee",
        date_vente: now,
      },
    });
    await prisma.paiements.create({
      data: {
        vente_id: v1.id,
        compte_id: testCompte.id,
        montant: 10000,
        mode_paiement: "especes",
        enregistre_par: vendeur.id,
      },
    });

    // Vente 2 : Il y a 3 jours dans Boutique 2 (20 000 FCFA, 100% MTN MoMo, validée)
    const numFact2 = await genererNumeroFacture(prisma, boutique2.id, testCompte.code, boutique2.code);
    const v2 = await prisma.ventes.create({
      data: {
        numero_facture: numFact2,
        boutique_id: boutique2.id,
        compte_id: testCompte.id,
        utilisateur_id: patron.id,
        montant_total: 20000,
        statut_paiement: "paye",
        statut_vente: "validee",
        date_vente: ilYa3Jours,
      },
    });
    await prisma.paiements.create({
      data: {
        vente_id: v2.id,
        compte_id: testCompte.id,
        montant: 20000,
        mode_paiement: "mtn_momo",
        enregistre_par: patron.id,
      },
    });

    // Vente 3 : Aujourd'hui dans Boutique 1 (15 000 FCFA, 5 000 versés acompte Moov Money, reste 10 000)
    const numFact3 = await genererNumeroFacture(prisma, boutique1.id, testCompte.code, boutique1.code);
    const v3 = await prisma.ventes.create({
      data: {
        numero_facture: numFact3,
        boutique_id: boutique1.id,
        compte_id: testCompte.id,
        utilisateur_id: vendeur.id,
        montant_total: 15000,
        statut_paiement: "partiel",
        statut_vente: "validee",
        date_vente: now,
      },
    });
    await prisma.paiements.create({
      data: {
        vente_id: v3.id,
        compte_id: testCompte.id,
        montant: 5000,
        mode_paiement: "moov_money",
        enregistre_par: vendeur.id,
      },
    });

    // Vente 4 : Aujourd'hui dans Boutique 1 mais ANNULÉE (8 000 FCFA) -> Doit être ignorée !
    const numFact4 = await genererNumeroFacture(prisma, boutique1.id, testCompte.code, boutique1.code);
    await prisma.ventes.create({
      data: {
        numero_facture: numFact4,
        boutique_id: boutique1.id,
        compte_id: testCompte.id,
        utilisateur_id: vendeur.id,
        montant_total: 8000,
        statut_paiement: "impaye",
        statut_vente: "annulee", // Règle 10 : Annulée
        date_vente: now,
      },
    });

    console.log("✅ Ventes multi-périodes insérées :\n");

    // ========================================================
    // TEST A : CALCUL DU CHIFFRE D'AFFAIRES PÉRIODIQUE
    // ========================================================
    console.log("▶ TEST A : Calcul du CA périodique (Jour vs Semaine vs Année)");
    const debutAujourdhui = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const debutSemaine = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    debutSemaine.setHours(0, 0, 0, 0);

    // Ventes valides aujourd'hui (V1: 10 000 + V3: 15 000 = 25 000 FCFA. V4 annulée exclue !)
    const ventesJour = await prisma.ventes.findMany({
      where: {
        compte_id: testCompte.id,
        statut_vente: "validee",
        date_vente: { gte: debutAujourdhui },
      },
    });
    const caJour = ventesJour.reduce((acc, v) => acc + v.montant_total, 0);

    if (caJour !== 25000) {
      throw new Error(`CA Jour attendu 25 000 FCFA, obtenu ${caJour}`);
    }
    console.log(`   ✅ CA Jour conforme : ${caJour.toLocaleString("fr-FR")} FCFA (Vente annulée V4 correctement ignorée)`);

    // Ventes valides cette semaine (V1: 10 000 + V2: 20 000 + V3: 15 000 = 45 000 FCFA)
    const ventesSemaine = await prisma.ventes.findMany({
      where: {
        compte_id: testCompte.id,
        statut_vente: "validee",
        date_vente: { gte: debutSemaine },
      },
    });
    const caSemaine = ventesSemaine.reduce((acc, v) => acc + v.montant_total, 0);

    if (caSemaine !== 45000) {
      throw new Error(`CA Semaine attendu 45 000 FCFA, obtenu ${caSemaine}`);
    }
    console.log(`   ✅ CA Semaine conforme : ${caSemaine.toLocaleString("fr-FR")} FCFA (3 ventes valides)\n`);

    // ========================================================
    // TEST B : CALCUL DU PANIER MOYEN (Règle Métier)
    // ========================================================
    console.log("▶ TEST B : Calcul du Panier Moyen");
    const nbVentesSemaine = ventesSemaine.length; // 3
    const panierMoyen = Math.round(caSemaine / nbVentesSemaine); // 45 000 / 3 = 15 000 FCFA

    if (panierMoyen !== 15000) {
      throw new Error(`Panier moyen attendu 15 000 FCFA, obtenu ${panierMoyen}`);
    }
    console.log(`   ✅ Panier moyen conforme : ${panierMoyen.toLocaleString("fr-FR")} FCFA / transaction\n`);

    // ========================================================
    // TEST C : VUE CONSOLIDÉE VS FILTRAGE PAR BOUTIQUE (Section 1.6 & 2)
    // ========================================================
    console.log("▶ TEST C : Vision consolidée multi-boutiques vs filtrage par boutique");
    // Filtrage Boutique 1 : V1 (10 000) + V3 (15 000) = 25 000 FCFA
    const caBoutique1 = (
      await prisma.ventes.findMany({
        where: {
          compte_id: testCompte.id,
          boutique_id: boutique1.id,
          statut_vente: "validee",
        },
      })
    ).reduce((acc, v) => acc + v.montant_total, 0);

    // Filtrage Boutique 2 : V2 (20 000 FCFA)
    const caBoutique2 = (
      await prisma.ventes.findMany({
        where: {
          compte_id: testCompte.id,
          boutique_id: boutique2.id,
          statut_vente: "validee",
        },
      })
    ).reduce((acc, v) => acc + v.montant_total, 0);

    if (caBoutique1 !== 25000 || caBoutique2 !== 20000) {
      throw new Error(`CA Boutique 1 (${caBoutique1}) ou Boutique 2 (${caBoutique2}) incorrect`);
    }
    console.log(`   ✅ CA Boutique 1 (Port) : ${caBoutique1.toLocaleString("fr-FR")} FCFA`);
    console.log(`   ✅ CA Boutique 2 (Aéroport) : ${caBoutique2.toLocaleString("fr-FR")} FCFA`);
    console.log(`   ✅ Somme consolidée = ${caSemaine.toLocaleString("fr-FR")} FCFA (Vision Patron vérifiée)\n`);

    // ========================================================
    // TEST D : VENTILATION PAR MODE DE PAIEMENT
    // ========================================================
    console.log("▶ TEST D : Répartition des encaissements par moyen de règlement");
    const paiements = await prisma.paiements.findMany({
      where: { compte_id: testCompte.id },
    });

    const totalEspeces = paiements.filter((p) => p.mode_paiement === "especes").reduce((acc, p) => acc + p.montant, 0);
    const totalMtnMomo = paiements.filter((p) => p.mode_paiement === "mtn_momo").reduce((acc, p) => acc + p.montant, 0);
    const totalMoovMoney = paiements.filter((p) => p.mode_paiement === "moov_money").reduce((acc, p) => acc + p.montant, 0);
    const totalEncaisse = totalEspeces + totalMtnMomo + totalMoovMoney;

    if (totalEspeces !== 10000 || totalMtnMomo !== 20000 || totalMoovMoney !== 5000) {
      throw new Error("Ventilation des modes de paiement incorrecte !");
    }
    console.log(`   ✅ Espèces : ${totalEspeces.toLocaleString("fr-FR")} FCFA (${Math.round((totalEspeces / totalEncaisse) * 100)}%)`);
    console.log(`   ✅ MTN MoMo : ${totalMtnMomo.toLocaleString("fr-FR")} FCFA (${Math.round((totalMtnMomo / totalEncaisse) * 100)}%)`);
    console.log(`   ✅ Moov Money : ${totalMoovMoney.toLocaleString("fr-FR")} FCFA (${Math.round((totalMoovMoney / totalEncaisse) * 100)}%)`);
    console.log(`   ✅ Total Encaissé : ${totalEncaisse.toLocaleString("fr-FR")} FCFA / 45 000 FCFA net (Créance = 10 000 FCFA)\n`);

    console.log("=================================================");
    console.log("🎉 TOUS LES TESTS ÉTAPE 9 ONT RÉUSSI AVEC SUCCÈS !");
    console.log("=================================================");
  } catch (error) {
    console.error("❌ ÉCHEC DU TEST ÉTAPE 9 :", error);
    process.exit(1);
  } finally {
    console.log("\n🧹 Nettoyage des fixtures de test...");
    if (testCompteId) {
      await prisma.paiements.deleteMany({ where: { compte_id: testCompteId } });
      await prisma.ventes.deleteMany({ where: { compte_id: testCompteId } });
      await prisma.utilisateurs.deleteMany({ where: { compte_id: testCompteId } });
      if (testBoutique1Id) {
        await prisma.compteurs_facture.deleteMany({ where: { boutique_id: testBoutique1Id } });
      }
      if (testBoutique2Id) {
        await prisma.compteurs_facture.deleteMany({ where: { boutique_id: testBoutique2Id } });
      }
      await prisma.boutiques.deleteMany({ where: { compte_id: testCompteId } });
      await prisma.comptes.deleteMany({ where: { id: testCompteId } });
    }
    console.log("✅ Fixtures supprimées proprement.");
    await prisma.$disconnect();
  }
}

runTests();
