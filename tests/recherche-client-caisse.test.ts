import { describe, it, expect } from "vitest";
import { prisma } from "../src/lib/prisma";
import { rechercherClientsAction } from "../src/app/actions/clients";

describe("Recherche Dynamique Client Caisse", () => {
  it("doit trouver un client par nom ou par numéro de téléphone", async () => {
    const client = await prisma.clients.findFirst();
    expect(client).toBeDefined();
    if (!client) return;

    // Recherche par fragment de nom
    const resNom = await prisma.clients.findMany({
      where: {
        compte_id: client.compte_id,
        nom: { contains: client.nom.slice(0, 3), mode: "insensitive" },
      },
      take: 10,
    });
    expect(resNom.length).toBeGreaterThan(0);

    // Recherche par fragment de téléphone
    const resTel = await prisma.clients.findMany({
      where: {
        compte_id: client.compte_id,
        telephone: { contains: client.telephone.slice(-4) },
      },
      take: 10,
    });
    expect(resTel.length).toBeGreaterThan(0);
  });
});
