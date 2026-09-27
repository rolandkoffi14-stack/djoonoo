import { describe, it, expect } from "vitest";
import { prisma } from "../src/lib/prisma";

describe("Schéma Prisma - SKU et Double IMEI", () => {
  it("doit accepter un code_barre sur un produit et les champs imei1 / imei2 sur une ligne de vente", async () => {
    const boutique = await prisma.boutiques.findFirst();
    expect(boutique).toBeDefined();
    if (!boutique) return;

    const testSku = `SKU-TEST-${Date.now()}`;

    // 1. Création d'un produit avec code_barre
    const produit = await (prisma.produits as any).create({
      data: {
        compte_id: boutique.compte_id,
        boutique_id: boutique.id,
        nom: "Produit Test SKU",
        prix_unitaire: 15000,
        quantite_stock: 5,
        seuil_alerte: 1,
        code_barre: testSku,
      },
    });

    // 2. Relecture depuis la base
    const produitEnBase = await (prisma.produits as any).findUnique({
      where: { id: produit.id },
    });
    expect(produitEnBase.code_barre).toBe(testSku);

    // 3. Test de ligne de vente avec imei1 et imei2
    const vente = await prisma.ventes.findFirst({
      where: { compte_id: boutique.compte_id, boutique_id: boutique.id },
    });
    if (vente) {
      const ligne = await (prisma.lignes_vente as any).create({
        data: {
          vente_id: vente.id,
          produit_id: produit.id,
          compte_id: boutique.compte_id,
          quantite: 1,
          prix_unitaire_a_la_vente: 15000,
          imei1: "354892110293847",
          imei2: "354892110293848",
        },
      });
      expect(ligne.imei1).toBe("354892110293847");
      expect(ligne.imei2).toBe("354892110293848");
      await prisma.lignes_vente.delete({ where: { id: ligne.id } });
    }

    // 4. Nettoyage du produit de test
    await prisma.produits.delete({ where: { id: produit.id } });
  });
});
