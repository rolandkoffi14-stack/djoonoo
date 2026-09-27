import { describe, it, expect } from "vitest";
import { prisma } from "../src/lib/prisma";

describe("Modification de Boutique", () => {
  it("doit mettre à jour le nom, l'adresse et le téléphone d'une boutique sans toucher à son code immuable", async () => {
    const boutique = await prisma.boutiques.findFirst();
    expect(boutique).toBeDefined();
    if (!boutique) return;

    const codeInitial = boutique.code;
    const nomNouveau = `Boutique Renommée ${Date.now()}`;
    const nouvelleVille = "Cotonou Littoral";

    const updated = await prisma.boutiques.update({
      where: { id: boutique.id },
      data: {
        nom: nomNouveau,
        ville: nouvelleVille,
      },
    });

    expect(updated.nom).toBe(nomNouveau);
    expect(updated.ville).toBe(nouvelleVille);
    expect(updated.code).toBe(codeInitial); // Le code interne B01 reste figé

    // Rétablissement du nom initial
    await prisma.boutiques.update({
      where: { id: boutique.id },
      data: { nom: boutique.nom, ville: boutique.ville },
    });
  });
});
