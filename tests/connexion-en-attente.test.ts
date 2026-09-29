import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma";
import { connexionAction } from "../src/app/actions/auth";

describe("Sécurité connexion — Utilisateur en attente d'activation", () => {
  let testCompteId: string;
  let testUserId: string;
  const testEmail = `pending-test-${Date.now()}@djoonoo.com`;

  beforeAll(async () => {
    // 1. Trouver un forfait actif
    let forfait = await prisma.forfaits.findFirst({ where: { actif: true } });
    if (!forfait) {
      forfait = await prisma.forfaits.create({
        data: {
          nom: "Solo Test",
          prix_mensuel: 5000,
          duree_jours: 30,
        },
      });
    }

    // 2. Créer un compte de test
    const compte = await prisma.comptes.create({
      data: {
        code: `TST${Date.now().toString().slice(-4)}`,
        nom_entreprise: "Entreprise Test Auth",
        email_principal: `patron-${Date.now()}@djoonoo.com`,
        telephone_principal: "+22997000000",
        ville: "Cotonou",
        forfait_id: forfait.id,
        statut_abonnement: "actif",
      },
    });
    testCompteId = compte.id;

    // 3. Créer un utilisateur avec statut "en_attente" et mot_de_passe_hash null
    const user = await prisma.utilisateurs.create({
      data: {
        compte_id: testCompteId,
        nom: "Employé En Attente",
        email: testEmail,
        telephone: "+22998000000",
        role: "vendeur",
        statut: "en_attente",
        mot_de_passe_hash: null,
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    if (testUserId) {
      await prisma.tokens_invitation.deleteMany({ where: { utilisateur_id: testUserId } });
      await prisma.journal_audit.deleteMany({ where: { utilisateur_id: testUserId } });
      await prisma.utilisateurs.delete({ where: { id: testUserId } });
    }
    if (testCompteId) {
      await prisma.comptes.delete({ where: { id: testCompteId } });
    }
  });

  it("devrait refuser la connexion si le compte est en attente d'activation", async () => {
    const formData = new FormData();
    formData.append("email", testEmail);
    formData.append("mot_de_passe", "NimporteQuelMotDePasse123!");

    const res = await connexionAction(null, formData);

    expect(res.error).toBeDefined();
    expect(res.error).toContain("n'est pas encore activé");
    expect(res.success).toBeFalsy();
  });
});
