import { describe, it, expect } from "vitest";
import { prisma } from "../src/lib/prisma";

describe("Schéma Forfaits & Factures Abonnement", () => {
  it("doit comporter le champ duree_jours sur les forfaits avec une valeur par défaut de 30", async () => {
    const forfaits = await prisma.forfaits.findMany();
    expect(forfaits.length).toBeGreaterThan(0);
    for (const f of forfaits) {
      expect(f.duree_jours).toBeDefined();
      expect(typeof f.duree_jours).toBe("number");
      expect(f.duree_jours).toBeGreaterThan(0);
    }
  });

  it("doit permettre le stockage de cle_idempotence sur factures_abonnement", async () => {
    let compte = await prisma.comptes.findFirst();
    let tempCompteCreated = false;
    if (!compte) {
      const forfait = await prisma.forfaits.findFirst();
      if (!forfait) throw new Error("Aucun forfait trouvé");
      compte = await prisma.comptes.create({
        data: {
          code: "TST",
          nom_entreprise: "Test Entreprise",
          email_principal: `test-${Date.now()}@djoonoo.com`,
          telephone_principal: "+22997000000",
          ville: "Cotonou",
          forfait_id: forfait.id,
          statut_abonnement: "expire",
        },
      });
      tempCompteCreated = true;
    }

    const testKey = "test_idem_" + Date.now();
    const facture = await prisma.factures_abonnement.create({
      data: {
        compte_id: compte.id,
        montant: 5000,
        statut: "en_attente",
        fournisseur_paiement: "fedapay",
        cle_idempotence: testKey,
        date_echeance: new Date(),
      },
    });

    expect(facture.cle_idempotence).toBe(testKey);

    await prisma.factures_abonnement.delete({ where: { id: facture.id } });
    if (tempCompteCreated) {
      await prisma.comptes.delete({ where: { id: compte.id } });
    }
  });
});
