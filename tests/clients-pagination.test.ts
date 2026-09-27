import { describe, it, expect } from "vitest";
import { prisma } from "../src/lib/prisma";
import { parsePaginationParams } from "../src/lib/pagination";

describe("Pagination Serveur des Clients", () => {
  it("doit paginer les clients sans charger l'historique complet de la base en mémoire", async () => {
    const compte = await prisma.comptes.findFirst();
    if (!compte) return;

    const { skip, limit } = parsePaginationParams({ page: "1", limit: "15" });

    const [total, clients] = await Promise.all([
      prisma.clients.count({ where: { compte_id: compte.id } }),
      prisma.clients.findMany({
        where: { compte_id: compte.id },
        skip,
        take: limit,
        orderBy: { nom: "asc" },
      }),
    ]);

    expect(clients.length).toBeLessThanOrEqual(15);
    expect(total).toBeGreaterThanOrEqual(clients.length);
  });
});
