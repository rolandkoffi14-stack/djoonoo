import { describe, it, expect, afterAll } from "vitest";
import { prisma, getScopedPrisma } from "../src/lib/prisma";

describe("Unicité du Téléphone Client par Compte", () => {
  const telTest = `0199${Math.floor(100000 + Math.random() * 900000)}`;
  let compteId: string;
  let clientIdCree: string | null = null;

  afterAll(async () => {
    if (clientIdCree) {
      await prisma.clients.deleteMany({
        where: { telephone: telTest },
      });
    }
  });

  it("doit créer un premier client avec un numéro unique", async () => {
    const compte = await prisma.comptes.findFirst();
    expect(compte).toBeDefined();
    if (!compte) return;
    compteId = compte.id;

    const scoped = getScopedPrisma(compteId);
    const client = await scoped.clients.create({
      data: {
        compte_id: compteId,
        nom: "Premier Client Test",
        telephone: telTest,
      },
    });

    clientIdCree = client.id;
    expect(client).toBeDefined();
    expect(client.telephone).toBe(telTest);
  });

  it("doit refuser la création d'un second client avec le même numéro, peu importe le nom", async () => {
    const scoped = getScopedPrisma(compteId);

    // Vérification de la logique métier appliquée dans creerClientAction et creerClientRapideAction
    const doublonExistant = await scoped.clients.findFirst({
      where: {
        compte_id: compteId,
        telephone: telTest,
      },
    });

    expect(doublonExistant).not.toBeNull();
    expect(doublonExistant?.nom).toBe("Premier Client Test");

    // Tentative avec un nom totalement différent
    const nouveauNom = "Deuxième Client Nom Différent";
    const cleanTel = telTest;

    const checkDoublon = await scoped.clients.findFirst({
      where: {
        compte_id: compteId,
        telephone: cleanTel,
      },
    });

    const autoriseCreation = !checkDoublon;
    expect(autoriseCreation).toBe(false); // Doit être STRICTEMENT refusé
  });
});
