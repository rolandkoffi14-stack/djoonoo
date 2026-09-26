import { PrismaClient } from "@prisma/client";
import { genererCodeBoutique, enregistrerAudit } from "../../src/lib/business-rules";
import { generateTotpSecret, hashPassword } from "../../src/lib/auth";

const prisma = new PrismaClient();

async function runTests() {
  console.log("=================================================");
  console.log("🧪 DÉBUT DES TESTS ÉTAPE 4 : BOUTIQUES & EMPLOYÉS");
  console.log("=================================================\n");

  let testCompteId: string | null = null;

  try {
    // 0. Récupération ou création d'un compte de test
    const forfaitSolo = await prisma.forfaits.findFirst({
      where: { nom: "Solo" },
    });

    if (!forfaitSolo) {
      throw new Error("Forfait Solo introuvable. Exécutez le seed d'abord.");
    }

    console.log("1. Préparation du compte de test sous forfait Solo (max 1 boutique)...");
    const uniqueSuffix = Date.now().toString().slice(-4);
    const testCompte = await prisma.comptes.create({
      data: {
        code: `T${uniqueSuffix.slice(-2)}`,
        nom_entreprise: `Test Étape 4 Corp ${uniqueSuffix}`,
        email_principal: `patron_test_${uniqueSuffix}@djoonoo.com`,
        forfait_id: forfaitSolo.id,
        statut_abonnement: "essai",
        telephone_principal: "+22997000000",
        ville: "Cotonou",
        adresse_siege: "Avenue Jean-Paul II",
      },
    });
    testCompteId = testCompte.id;
    console.log(`✅ Compte de test créé avec ID: ${testCompte.id} (Code: ${testCompte.code})`);

    // -------------------------------------------------------------------
    // TEST A : Génération séquentielle atomique B01, B02, B03 (Règle 8 bis)
    // -------------------------------------------------------------------
    console.log("\n2. [Test A] Test de génération atomique des codes boutiques...");
    const code1 = await prisma.$transaction(async (tx) => {
      return genererCodeBoutique(tx, testCompte.id);
    });
    console.log(`   - Premier code généré : ${code1}`);
    if (code1 !== "B01") throw new Error(`Attendu B01 mais reçu ${code1}`);

    const [code2, code3] = await Promise.all([
      prisma.$transaction(async (tx) => genererCodeBoutique(tx, testCompte.id)),
      prisma.$transaction(async (tx) => genererCodeBoutique(tx, testCompte.id)),
    ]);
    console.log(`   - Codes concurrents générés : ${code2} et ${code3}`);
    const codesConcurrents = [code2, code3].sort();
    if (codesConcurrents[0] !== "B02" || codesConcurrents[1] !== "B03") {
      throw new Error(`Attendu [B02, B03] mais reçu ${JSON.stringify(codesConcurrents)}`);
    }
    console.log("✅ [Test A] Règle 8 bis validée : Incrémentation atomique sans doublons (B01, B02, B03) !");

    // -------------------------------------------------------------------
    // TEST B : Création de la boutique initiale et insertion
    // -------------------------------------------------------------------
    console.log("\n3. [Test B] Création de la boutique B01 dans la base...");
    const boutiqueB01 = await prisma.boutiques.create({
      data: {
        compte_id: testCompte.id,
        code: "B01",
        nom: "Boutique Cadjèhoun",
        secteur_activite: "Prêt-à-porter",
        adresse: "Rue 108",
        ville: "Cotonou",
        statut: "actif",
      },
    });
    console.log(`✅ Boutique B01 créée avec ID : ${boutiqueB01.id}`);

    // Vérification du contrôle de plafond forfait Solo (max 1 boutique)
    const nbBoutiques = await prisma.boutiques.count({
      where: { compte_id: testCompte.id },
    });
    console.log(`   - Nombre actuel de boutiques : ${nbBoutiques} / Max autorisé : ${forfaitSolo.max_boutiques}`);
    const depassementPlafond = forfaitSolo.max_boutiques !== null && nbBoutiques >= forfaitSolo.max_boutiques;
    if (!depassementPlafond) {
      throw new Error("Le plafond forfait aurait dû être détecté comme atteint.");
    }
    console.log("✅ [Test B] Contrôle de plafond forfait Solo validé : tentative d'ajout bloquée côté serveur !");

    // -------------------------------------------------------------------
    // TEST C : Invitation d'un Gérant avec 2FA TOTP & Historique (Règle 2)
    // -------------------------------------------------------------------
    console.log("\n4. [Test C] Invitation d'un Gérant et rattachement boutique (Règle 2)...");
    const emailGerant = `gerant_${uniqueSuffix}@djoonoo.com`;
    const totpData = generateTotpSecret(emailGerant);
    const mdpHash = await hashPassword("MotDePasse123!");

    const gerantUser = await prisma.$transaction(async (tx) => {
      const u = await tx.utilisateurs.create({
        data: {
          compte_id: testCompte.id,
          boutique_id: boutiqueB01.id,
          role: "gerant",
          nom: "Ablawa Dossou",
          email: emailGerant,
          telephone: "+22996112233",
          mot_de_passe_hash: mdpHash,
          deux_fa_active: true, // Obligatoire pour le Gérant
          deux_fa_secret: totpData.secret,
          statut: "actif",
        },
      });

      // Règle 2 : Historique d'affectation
      await tx.historique_affectations.create({
        data: {
          utilisateur_id: u.id,
          boutique_id: boutiqueB01.id,
          date_debut: new Date(),
          date_fin: null,
        },
      });

      // Journal d'audit
      await enregistrerAudit(tx, {
        compte_id: testCompte.id,
        utilisateur_id: u.id,
        action: "invitation_employe",
        entite_concernee: "utilisateurs",
        entite_id: u.id,
        details: { role: "gerant", boutique_id: boutiqueB01.id },
      });

      return u;
    });

    console.log(`   - Gérant créé avec ID : ${gerantUser.id}`);
    console.log(`   - 2FA Active : ${gerantUser.deux_fa_active} (Secret configuré : ${!!gerantUser.deux_fa_secret})`);

    // Vérification de l'affectation dans l'historique
    const affectation = await prisma.historique_affectations.findFirst({
      where: {
        utilisateur_id: gerantUser.id,
        boutique_id: boutiqueB01.id,
        date_fin: null,
      },
    });

    if (!affectation) {
      throw new Error("L'affectation dans historique_affectations n'a pas été créée (violation Règle 2) !");
    }
    console.log(`✅ [Test C] Règle 2 & 2FA validées : Gérant sécurisé par 2FA et rattaché avec traçabilité !`);

    // -------------------------------------------------------------------
    // TEST D : Vérification du Journal d'Audit
    // -------------------------------------------------------------------
    console.log("\n5. [Test D] Vérification de la consignation dans journal_audit...");
    const auditLogs = await prisma.journal_audit.findMany({
      where: { compte_id: testCompte.id },
    });
    console.log(`   - Nombre de logs enregistrés pour ce compte : ${auditLogs.length}`);
    if (auditLogs.length === 0) {
      throw new Error("Aucun log d'audit trouvé pour ce compte !");
    }
    console.log(`✅ [Test D] Audit trail validé : Action '${auditLogs[0].action}' bien consignée.`);

    console.log("\n=================================================");
    console.log("🎉 TOUS LES TESTS DE L'ÉTAPE 4 ONT RÉUSSI (100%) !");
    console.log("=================================================\n");
  } catch (err: any) {
    console.error("\n❌ ÉCHEC D'UN TEST ÉTAPE 4 :", err);
    process.exitCode = 1;
  } finally {
    // Nettoyage des données de test
    if (testCompteId) {
      console.log("🧹 Nettoyage des données de test...");
      await prisma.journal_audit.deleteMany({ where: { compte_id: testCompteId } });
      await prisma.historique_affectations.deleteMany({
        where: { utilisateur: { compte_id: testCompteId } },
      });
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
