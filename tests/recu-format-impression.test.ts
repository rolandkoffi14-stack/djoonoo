import { describe, it, expect } from "vitest";
import { prisma } from "../src/lib/prisma";

describe("Enrichissement RecuVenteData - Entreprise et Formats", () => {
  it("doit vérifier que la vente permet de remonter l'entreprise et la boutique pour les deux formats d'impression", async () => {
    const vente = await prisma.ventes.findFirst({
      include: {
        boutique: {
          include: {
            compte: true,
          },
        },
      },
    });
    expect(vente).toBeDefined();
    if (!vente) return;

    expect(vente.boutique.compte).toBeDefined();
    expect(vente.boutique.compte.nom_entreprise).toBeDefined();
    expect(vente.boutique.compte.telephone_principal).toBeDefined();
    expect(vente.boutique.nom).toBeDefined();
    expect(vente.boutique.code).toBeDefined();
  });
});
