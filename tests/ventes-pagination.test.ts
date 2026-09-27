import { describe, it, expect } from "vitest";
import { prisma } from "../src/lib/prisma";
import { parsePaginationParams } from "../src/lib/pagination";

describe("Pagination Serveur des Ventes", () => {
  it("doit renvoyer un nombre de ventes strictement borné par limit et un compte total", async () => {
    const compte = await prisma.comptes.findFirst({
      include: { boutiques: true },
    });
    if (!compte || compte.boutiques.length === 0) return;

    const { page, limit, skip } = parsePaginationParams({ page: "1", limit: "10" });

    const [total, ventes] = await Promise.all([
      prisma.ventes.count({
        where: { compte_id: compte.id, boutique_id: compte.boutiques[0].id },
      }),
      prisma.ventes.findMany({
        where: { compte_id: compte.id, boutique_id: compte.boutiques[0].id },
        skip,
        take: limit,
        orderBy: { date_vente: "desc" },
      }),
    ]);

    expect(ventes.length).toBeLessThanOrEqual(10);
    expect(total).toBeGreaterThanOrEqual(ventes.length);
  });
});
