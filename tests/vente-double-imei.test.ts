import { describe, it, expect } from "vitest";
import { prisma } from "../src/lib/prisma";

describe("Enregistrement de Vente avec Double IMEI", () => {
  it("doit enregistrer une ligne de vente comportant un imei1 et un imei2", async () => {
    const vente = await prisma.ventes.findFirst({
      include: { boutique: true, utilisateur: true },
    });
    const produit = await prisma.produits.findFirst();
    if (!vente || !produit) return;

    const imei1Test = "354892110293847";
    const imei2Test = "354892110293848";

    const ligne = await prisma.lignes_vente.create({
      data: {
        vente_id: vente.id,
        produit_id: produit.id,
        compte_id: vente.compte_id,
        quantite: 1,
        prix_unitaire_a_la_vente: produit.prix_unitaire,
        imei1: imei1Test,
        imei2: imei2Test,
      },
    });

    expect(ligne.imei1).toBe(imei1Test);
    expect(ligne.imei2).toBe(imei2Test);

    await prisma.lignes_vente.delete({ where: { id: ligne.id } });
  });
});
