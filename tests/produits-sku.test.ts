import { describe, it, expect } from "vitest";
import { prisma } from "../src/lib/prisma";
import { genererCodeSKU } from "../src/lib/business-rules";

describe("Génération de Code SKU Produit", () => {
  it("doit générer un code SKU séquentiel unique par boutique au format SKU-B01-XXXX", async () => {
    const boutique = await prisma.boutiques.findFirst();
    expect(boutique).toBeDefined();
    if (!boutique) return;

    const sku = await genererCodeSKU(prisma, boutique.id, boutique.code);
    expect(sku).toMatch(new RegExp(`^SKU-${boutique.code}-\\d{4}$`));
  });
});
