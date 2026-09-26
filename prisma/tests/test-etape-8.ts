import { PrismaClient } from "@prisma/client";
import { genererNumeroFacture } from "../../src/lib/business-rules";

const prisma = new PrismaClient();

async function runTests() {
  console.log("=================================================");
  console.log("🧪 DÉBUT DES TESTS ÉTAPE 8 : RÉPERTOIRE CLIENTS & C11");
  console.log("=================================================\n");

  let testCompte1Id: string | null = null;
  let testCompte2Id: string | null = null;
  let testBoutique1Id: string | null = null;
  let testBoutique2Id: string | null = null;
  let testUserId: string | null = null;
  let testClientId: string | null = null;

  try {
    const forfaitSolo = await prisma.forfaits.findFirst({ where: { nom: "Solo" } });
    if (!forfaitSolo) throw new Error("Forfait Solo introuvable.");

    const suffix = Date.now().toString().slice(-4);

    // 1. Création Compte 1
    const compte1 = await prisma.comptes.create({
      data: {
        code: `C${suffix.slice(-2)}`,
        nom_entreprise: `ETS Client Test 1 ${suffix}`,
        email_principal: `patron_c1_${suffix}@djoonoo.com`,
        forfait_id: forfaitSolo.id,
        statut_abonnement: "essai",
        telephone_principal: "+22997000000",
        ville: "Cotonou",
      },
    });
    testCompte1Id = compte1.id;

    // Boutique 1 & Boutique 2 sur le MÊME compte (Section 1.5)
    const boutique1 = await prisma.boutiques.create({
      data: {
        compte_id: compte1.id,
        code: "B01",
        nom: "Boutique Centre-Ville",
        secteur_activite: "Mode",
        adresse: "Rue du Commerce",
        ville: "Cotonou",
        statut: "actif",
      },
    });
    testBoutique1Id = boutique1.id;

    const boutique2 = await prisma.boutiques.create({
      data: {
        compte_id: compte1.id,
        code: "B02",
        nom: "Boutique Littoral",
        secteur_activite: "Mode",
        adresse: "Boulevard de la Marina",
        ville: "Cotonou",
        statut: "actif",
      },
    });
    testBoutique2Id = boutique2.id;

    // Utilisateur de test
    const user = await prisma.utilisateurs.create({
      data: {
        compte_id: compte1.id,
        nom: "Responsable Vente",
        email: `resp_${suffix}@djoonoo.com`,
        telephone: "+22997112233",
        mot_de_passe_hash: "hash",
        role: "patron",
        statut: "actif",
      },
    });
    testUserId = user.id;

    // Compte 2 (pour test d'isolation tenant)
    const compte2 = await prisma.comptes.create({
      data: {
        code: `X${suffix.slice(-2)}`,
        nom_entreprise: `Autre Entreprise ${suffix}`,
        email_principal: `patron_c2_${suffix}@djoonoo.com`,
        forfait_id: forfaitSolo.id,
        statut_abonnement: "essai",
        telephone_principal: "+22997999999",
        ville: "Porto-Novo",
      },
    });
    testCompte2Id = compte2.id;

    console.log("✅ Fixtures initiales créées avec succès.\n");

    // ========================================================
    // TEST A : CRÉATION D'UN CLIENT RATTACHÉ AU COMPTE (Section 1.5)
    // ========================================================
    console.log("▶ TEST A : Création d'un client rattaché au compte entreprise");
    const client = await prisma.clients.create({
      data: {
        compte_id: compte1.id,
        nom: "Bio Chabi",
        telephone: "+22997123456",
      },
    });
    testClientId = client.id;

    if (!client.id || client.compte_id !== compte1.id) {
      throw new Error("Client non rattaché au compte !");
    }
    console.log(`   ✅ Client créé : ${client.nom} (${client.telephone}) rattaché au compte ${compte1.code}\n`);

    // ========================================================
    // TEST B : RAPPROCHEMENT TÉLÉPHONIQUE (Décision C11)
    // ========================================================
    console.log("▶ TEST B : Recherche de rapprochement par numéro de téléphone (Index C11)");
    const resultatsRecherche = await prisma.clients.findMany({
      where: {
        compte_id: compte1.id,
        telephone: {
          contains: "123456",
        },
      },
    });

    if (resultatsRecherche.length === 0 || resultatsRecherche[0].id !== client.id) {
      throw new Error("Le client n'a pas été retrouvé via son numéro de téléphone !");
    }
    console.log(`   ✅ Rapprochement réussi : trouvé "${resultatsRecherche[0].nom}" pour la recherche '123456'`);

    // Vérification Décision C11 : possibilité d'enregistrer un 2ème client avec le même numéro (numéro partagé)
    const clientPartage = await prisma.clients.create({
      data: {
        compte_id: compte1.id,
        nom: "Frère de Bio Chabi",
        telephone: "+22997123456", // même numéro
      },
    });
    if (!clientPartage.id) throw new Error("Échec création client numéro partagé");
    console.log("   ✅ Décision C11 validée : absence de contrainte @unique bloquante sur le téléphone\n");

    // ========================================================
    // TEST C : HISTORIQUE D'ACHATS CONSOLIDÉ MULTI-BOUTIQUES (Section 1.5)
    // ========================================================
    console.log("▶ TEST C : Ventes sur 2 boutiques différentes consolidées sur la même fiche client");
    const numFactB01 = await genererNumeroFacture(prisma, boutique1.id, compte1.code, boutique1.code);
    const numFactB02 = await genererNumeroFacture(prisma, boutique2.id, compte1.code, boutique2.code);

    // Vente 1 dans Boutique 1 (10 000 FCFA, payée)
    const v1 = await prisma.ventes.create({
      data: {
        numero_facture: numFactB01,
        boutique_id: boutique1.id,
        compte_id: compte1.id,
        utilisateur_id: user.id,
        client_id: client.id,
        montant_total: 10000,
        statut_paiement: "paye",
        statut_vente: "validee",
      },
    });

    await prisma.paiements.create({
      data: {
        vente_id: v1.id,
        compte_id: compte1.id,
        montant: 10000,
        mode_paiement: "especes",
        enregistre_par: user.id,
      },
    });

    // Vente 2 dans Boutique 2 (15 000 FCFA, impayée / à crédit)
    const v2 = await prisma.ventes.create({
      data: {
        numero_facture: numFactB02,
        boutique_id: boutique2.id,
        compte_id: compte1.id,
        utilisateur_id: user.id,
        client_id: client.id,
        montant_total: 15000,
        statut_paiement: "impaye",
        statut_vente: "validee",
      },
    });

    // Lecture consolidée de la fiche client
    const clientConsolide = await prisma.clients.findUniqueOrThrow({
      where: { id: client.id },
      include: {
        ventes: {
          include: {
            boutique: true,
            paiements: true,
          },
        },
      },
    });

    if (clientConsolide.ventes.length !== 2) {
      throw new Error(`2 ventes attendues, obtenu ${clientConsolide.ventes.length}`);
    }

    const boutiquesVentes = new Set(clientConsolide.ventes.map((v) => v.boutique.code));
    if (!boutiquesVentes.has("B01") || !boutiquesVentes.has("B02")) {
      throw new Error("L'historique multi-boutiques n'inclut pas les deux boutiques distinctes !");
    }

    const volumeTotal = clientConsolide.ventes.reduce((acc, v) => acc + v.montant_total, 0);
    if (volumeTotal !== 25000) {
      throw new Error(`Volume total attendu 25 000 FCFA, obtenu ${volumeTotal}`);
    }
    console.log(`   ✅ Vente 1 : ${numFactB01} (Boutique B01 - 10 000 FCFA)`);
    console.log(`   ✅ Vente 2 : ${numFactB02} (Boutique B02 - 15 000 FCFA)`);
    console.log(`   ✅ Historique consolidé validé : 2 achats multi-boutiques pour 25 000 FCFA\n`);

    // ========================================================
    // TEST D : CALCUL CONSOLIDÉ DES CRÉANCES DUES
    // ========================================================
    console.log("▶ TEST D : Calcul du reste dû pour le client");
    let totalResteDu = 0;
    clientConsolide.ventes.forEach((v) => {
      const paye = v.paiements.reduce((acc, p) => acc + p.montant, 0);
      if (v.montant_total > paye) {
        totalResteDu += v.montant_total - paye;
      }
    });

    if (totalResteDu !== 15000) {
      throw new Error(`Reste dû attendu 15 000 FCFA, obtenu ${totalResteDu}`);
    }
    console.log(`   ✅ Reste dû client correctement calculé : 15 000 FCFA (vente crédit B02)\n`);

    // ========================================================
    // TEST E : ISOLATION STRICTE ENTRE COMPTES (Règle 5)
    // ========================================================
    console.log("▶ TEST E : Isolation stricte multi-tenant par compte_id (Règle 5)");
    const clientsCompte2 = await prisma.clients.findMany({
      where: { compte_id: compte2.id },
    });

    if (clientsCompte2.length !== 0) {
      throw new Error("Fuite de données multi-tenant : le compte 2 voit les clients du compte 1 !");
    }
    console.log("   ✅ Isolation confirmée : 0 client visible depuis un autre compte tenant\n");

    console.log("=================================================");
    console.log("🎉 TOUS LES TESTS ÉTAPE 8 ONT RÉUSSI AVEC SUCCÈS !");
    console.log("=================================================");
  } catch (error) {
    console.error("❌ ÉCHEC DU TEST ÉTAPE 8 :", error);
    process.exit(1);
  } finally {
    console.log("\n🧹 Nettoyage des fixtures de test...");
    if (testCompte1Id) {
      await prisma.paiements.deleteMany({ where: { compte_id: testCompte1Id } });
      await prisma.ventes.deleteMany({ where: { compte_id: testCompte1Id } });
      await prisma.clients.deleteMany({ where: { compte_id: testCompte1Id } });
      await prisma.utilisateurs.deleteMany({ where: { compte_id: testCompte1Id } });
      if (testBoutique1Id) {
        await prisma.compteurs_facture.deleteMany({ where: { boutique_id: testBoutique1Id } });
      }
      if (testBoutique2Id) {
        await prisma.compteurs_facture.deleteMany({ where: { boutique_id: testBoutique2Id } });
      }
      await prisma.boutiques.deleteMany({ where: { compte_id: testCompte1Id } });
      await prisma.comptes.deleteMany({ where: { id: testCompte1Id } });
    }
    if (testCompte2Id) {
      await prisma.comptes.deleteMany({ where: { id: testCompte2Id } });
    }
    console.log("✅ Fixtures supprimées proprement.");
    await prisma.$disconnect();
  }
}

runTests();
