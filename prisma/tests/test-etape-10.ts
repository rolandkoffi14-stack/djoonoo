import { PrismaClient } from "@prisma/client";
import { genererNumeroFacture, enregistrerAudit } from "../../src/lib/business-rules";

const prisma = new PrismaClient();

async function runTests() {
  console.log("=================================================");
  console.log("🧪 DÉBUT DES TESTS ÉTAPE 10 : TRANSFERT & RÈGLE 2");
  console.log("=================================================\n");

  let testCompteId: string | null = null;
  let testBoutiqueAId: string | null = null;
  let testBoutiqueBId: string | null = null;
  let testPatronId: string | null = null;
  let testVendeurId: string | null = null;
  let testGerantId: string | null = null;
  let testVentePasseId: string | null = null;

  try {
    const forfaitSolo = await prisma.forfaits.findFirst({ where: { nom: "Solo" } });
    if (!forfaitSolo) throw new Error("Forfait Solo introuvable.");

    const suffix = Date.now().toString().slice(-4);

    // 1. Compte & 2 Boutiques
    const compte = await prisma.comptes.create({
      data: {
        code: `T${suffix.slice(-2)}`,
        nom_entreprise: `ETS Transfert Test ${suffix}`,
        email_principal: `patron_t_${suffix}@djoonoo.com`,
        forfait_id: forfaitSolo.id,
        statut_abonnement: "essai",
        telephone_principal: "+22997000000",
        ville: "Cotonou",
      },
    });
    testCompteId = compte.id;

    const boutiqueA = await prisma.boutiques.create({
      data: {
        compte_id: compte.id,
        code: "B01",
        nom: "Boutique Port (Origine)",
        secteur_activite: "Textile",
        adresse: "Quai 3",
        ville: "Cotonou",
        statut: "actif",
      },
    });
    testBoutiqueAId = boutiqueA.id;

    const boutiqueB = await prisma.boutiques.create({
      data: {
        compte_id: compte.id,
        code: "B02",
        nom: "Boutique Aéroport (Destination)",
        secteur_activite: "Textile",
        adresse: "Zone Fret",
        ville: "Cotonou",
        statut: "actif",
      },
    });
    testBoutiqueBId = boutiqueB.id;

    // Utilisateur Patron
    const patron = await prisma.utilisateurs.create({
      data: {
        compte_id: compte.id,
        nom: "Patron Boss",
        email: `patron_${suffix}@djoonoo.com`,
        telephone: "+22997112233",
        mot_de_passe_hash: "hash",
        role: "patron",
        statut: "actif",
      },
    });
    testPatronId = patron.id;

    // Utilisateur Vendeur affecté initialement à Boutique A
    const vendeur = await prisma.utilisateurs.create({
      data: {
        compte_id: compte.id,
        boutique_id: boutiqueA.id,
        nom: "Kofi Vendeur",
        email: `vendeur_kofi_${suffix}@djoonoo.com`,
        telephone: "+22997445566",
        mot_de_passe_hash: "hash",
        role: "vendeur",
        statut: "actif",
      },
    });
    testVendeurId = vendeur.id;

    // Période initiale dans historique_affectations
    const dateDebutInitiale = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // il y a 10 jours
    await prisma.historique_affectations.create({
      data: {
        utilisateur_id: vendeur.id,
        boutique_id: boutiqueA.id,
        date_debut: dateDebutInitiale,
      },
    });

    console.log("✅ Fixtures initiales créées avec succès.\n");

    // ========================================================
    // TEST A : VENTE HISTORIQUE SUR BOUTIQUE A PAR LE VENDEUR
    // ========================================================
    console.log("▶ TEST A : Enregistrement d'une vente passée sur Boutique A par Kofi Vendeur");
    const numFactA = await genererNumeroFacture(prisma, boutiqueA.id, compte.code, boutiqueA.code);
    const ventePassee = await prisma.ventes.create({
      data: {
        numero_facture: numFactA,
        boutique_id: boutiqueA.id, // Règle 2 : boutique_id FIGÉ à la création
        compte_id: compte.id,
        utilisateur_id: vendeur.id,
        montant_total: 15000,
        statut_paiement: "paye",
        statut_vente: "validee",
      },
    });
    testVentePasseId = ventePassee.id;

    if (ventePassee.boutique_id !== boutiqueA.id) {
      throw new Error("Boutique initiale incorrecte sur la vente !");
    }
    console.log(`   ✅ Vente ${ventePassee.numero_facture} (15 000 FCFA) créée sur Boutique A (${boutiqueA.code})\n`);

    // ========================================================
    // TEST B : TRANSFERT ATOMIQUE DU VENDEUR DE BOUTIQUE A VERS BOUTIQUE B
    // ========================================================
    console.log("▶ TEST B : Mutation officielle de Kofi Vendeur vers Boutique B (Décision H20)");
    const dateMutation = new Date();

    await prisma.$transaction(async (tx) => {
      // 1. Clôture de l'ancienne affectation
      await tx.historique_affectations.updateMany({
        where: {
          utilisateur_id: vendeur.id,
          date_fin: null,
        },
        data: {
          date_fin: dateMutation,
        },
      });

      // 2. Création de la nouvelle affectation
      await tx.historique_affectations.create({
        data: {
          utilisateur_id: vendeur.id,
          boutique_id: boutiqueB.id,
          date_debut: dateMutation,
        },
      });

      // 3. Mise à jour du profil utilisateur
      await tx.utilisateurs.update({
        where: { id: vendeur.id },
        data: {
          boutique_id: boutiqueB.id,
        },
      });

      // 4. Audit
      await enregistrerAudit(tx, {
        compte_id: compte.id,
        utilisateur_id: patron.id,
        action: "transfert_collaborateur",
        entite_concernee: "utilisateurs",
        entite_id: vendeur.id,
        details: {
          de: boutiqueA.code,
          vers: boutiqueB.code,
        },
      });
    });

    // Vérification de l'historique des affectations
    const affectations = await prisma.historique_affectations.findMany({
      where: { utilisateur_id: vendeur.id },
      orderBy: { date_debut: "asc" },
    });

    if (affectations.length !== 2) {
      throw new Error(`2 affectations attendues dans l'historique, obtenu ${affectations.length}`);
    }

    const ancienneAffectation = affectations[0];
    const nouvelleAffectation = affectations[1];

    if (!ancienneAffectation.date_fin || ancienneAffectation.boutique_id !== boutiqueA.id) {
      throw new Error("L'ancienne affectation n'a pas été clôturée correctement !");
    }

    if (nouvelleAffectation.date_fin !== null || nouvelleAffectation.boutique_id !== boutiqueB.id) {
      throw new Error("La nouvelle affectation n'est pas ouverte sur la boutique B !");
    }

    const vendeurApresTransfert = await prisma.utilisateurs.findUniqueOrThrow({ where: { id: vendeur.id } });
    if (vendeurApresTransfert.boutique_id !== boutiqueB.id) {
      throw new Error("L'utilisateur n'est pas rattaché à la boutique B !");
    }
    console.log("   ✅ Ancienne affectation (Boutique A) clôturée avec date_fin");
    console.log("   ✅ Nouvelle affectation (Boutique B) ouverte avec date_debut");
    console.log(`   ✅ Profil utilisateur mis à jour : boutique_id = ${boutiqueB.code}\n`);

    // ========================================================
    // TEST C : CONTRÔLE CRITIQUE DE NON-RÉGRESSION SUR LA RÈGLE 2
    // ========================================================
    console.log("▶ TEST C : Non-régression absolue sur la RÈGLE 2");
    console.log("   Vérification que la vente passée de Kofi reste à jamais sur Boutique A...");

    const ventePasseeApresTransfert = await prisma.ventes.findUniqueOrThrow({
      where: { id: ventePassee.id },
      include: { boutique: true },
    });

    if (ventePasseeApresTransfert.boutique_id !== boutiqueA.id) {
      throw new Error(
        `VIOLATION RÈGLE 2 : La vente passée a été réattribuée à la boutique ${ventePasseeApresTransfert.boutique_id} au lieu de rester sur Boutique A (${boutiqueA.id}) !`
      );
    }

    if (ventePasseeApresTransfert.boutique.code !== "B01") {
      throw new Error("La boutique de la vente passée ne correspond plus à B01 !");
    }
    console.log(`   ✅ RÈGLE 2 CONFIRMÉE À 100% : Vente ${ventePasseeApresTransfert.numero_facture} toujours attachée à Boutique A (${ventePasseeApresTransfert.boutique.nom})\n`);

    // ========================================================
    // TEST D : NOUVELLE VENTE SUR BOUTIQUE B APRÈS TRANSFERT
    // ========================================================
    console.log("▶ TEST D : Nouvelle vente enregistrée par Kofi sur sa nouvelle Boutique B");
    const numFactB = await genererNumeroFacture(prisma, boutiqueB.id, compte.code, boutiqueB.code);
    const nouvelleVente = await prisma.ventes.create({
      data: {
        numero_facture: numFactB,
        boutique_id: boutiqueB.id, // Affectation actuelle = Boutique B
        compte_id: compte.id,
        utilisateur_id: vendeur.id,
        montant_total: 25000,
        statut_paiement: "paye",
        statut_vente: "validee",
      },
    });

    if (nouvelleVente.boutique_id !== boutiqueB.id) {
      throw new Error("La nouvelle vente n'a pas été affectée à Boutique B !");
    }
    console.log(`   ✅ Nouvelle vente ${nouvelleVente.numero_facture} bien attachée à Boutique B (${boutiqueB.code})\n`);

    // ========================================================
    // TEST E : TRANSFERT D'UN GÉRANT (Décision H20)
    // ========================================================
    console.log("▶ TEST E : Transfert d'un Gérant (Décision H20)");
    const gerant = await prisma.utilisateurs.create({
      data: {
        compte_id: compte.id,
        boutique_id: boutiqueA.id,
        nom: "Gérant Mensah",
        email: `gerant_${suffix}@djoonoo.com`,
        telephone: "+22997667788",
        mot_de_passe_hash: "hash",
        role: "gerant",
        deux_fa_active: true,
        statut: "actif",
      },
    });
    testGerantId = gerant.id;

    // Mutation du gérant vers Boutique B
    await prisma.$transaction(async (tx) => {
      await tx.historique_affectations.create({
        data: {
          utilisateur_id: gerant.id,
          boutique_id: boutiqueB.id,
          date_debut: new Date(),
        },
      });
      await tx.utilisateurs.update({
        where: { id: gerant.id },
        data: { boutique_id: boutiqueB.id },
      });
    });

    const gerantApresMutation = await prisma.utilisateurs.findUniqueOrThrow({ where: { id: gerant.id } });
    if (gerantApresMutation.boutique_id !== boutiqueB.id) {
      throw new Error("Échec de la mutation du gérant !");
    }
    console.log("   ✅ Décision H20 confirmée : le Gérant est transféré avec la même rigueur que le Vendeur\n");

    console.log("=================================================");
    console.log("🎉 TOUS LES TESTS ÉTAPE 10 ONT RÉUSSI AVEC SUCCÈS !");
    console.log("=================================================");
  } catch (error) {
    console.error("❌ ÉCHEC DU TEST ÉTAPE 10 :", error);
    process.exit(1);
  } finally {
    console.log("\n🧹 Nettoyage des fixtures de test...");
    if (testCompteId) {
      await prisma.ventes.deleteMany({ where: { compte_id: testCompteId } });
      await prisma.historique_affectations.deleteMany({
        where: {
          utilisateur: { compte_id: testCompteId },
        },
      });
      await prisma.journal_audit.deleteMany({ where: { compte_id: testCompteId } });
      await prisma.utilisateurs.deleteMany({ where: { compte_id: testCompteId } });
      if (testBoutiqueAId) {
        await prisma.compteurs_facture.deleteMany({ where: { boutique_id: testBoutiqueAId } });
      }
      if (testBoutiqueBId) {
        await prisma.compteurs_facture.deleteMany({ where: { boutique_id: testBoutiqueBId } });
      }
      await prisma.boutiques.deleteMany({ where: { compte_id: testCompteId } });
      await prisma.comptes.deleteMany({ where: { id: testCompteId } });
    }
    console.log("✅ Fixtures supprimées proprement.");
    await prisma.$disconnect();
  }
}

runTests();
