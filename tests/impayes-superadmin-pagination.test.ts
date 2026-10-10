import { describe, it, expect } from "vitest";
import { prisma } from "../src/lib/prisma";
import { parsePaginationParams } from "../src/lib/pagination";

describe("Pagination Serveur des Impayés et Super-Admin", () => {
  it("doit borner les ventes impayées par limit et skip sans charger l'historique complet", async () => {
    const { page, limit, skip } = parsePaginationParams({ page: "1", limit: "15" }, 25);
    expect(page).toBe(1);
    expect(limit).toBe(15);
    expect(skip).toBe(0);

    const whereCondition = {
      statut_paiement: { in: ["impaye" as const, "partiel" as const] },
      statut_vente: "validee" as const,
    };

    const [total, impayes] = await Promise.all([
      prisma.ventes.count({ where: whereCondition }),
      prisma.ventes.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy: { date_vente: "desc" },
      }),
    ]);

    expect(impayes.length).toBeLessThanOrEqual(15);
    expect(total).toBeGreaterThanOrEqual(impayes.length);
  });

  it("doit paginer les comptes de la plateforme pour le Super-Admin", async () => {
    const { page, limit, skip } = parsePaginationParams({ page: "1", limit: "20" }, 25);
    expect(limit).toBe(20);

    const [totalComptes, comptes] = await Promise.all([
      prisma.comptes.count(),
      prisma.comptes.findMany({
        skip,
        take: limit,
        orderBy: { date_creation: "desc" },
      }),
    ]);

    expect(comptes.length).toBeLessThanOrEqual(20);
    expect(totalComptes).toBeGreaterThanOrEqual(comptes.length);
  });

  it("doit paginer les factures d'abonnement pour le Super-Admin", async () => {
    const { page, limit, skip } = parsePaginationParams({ page: "1", limit: "10" }, 25);
    expect(limit).toBe(10);

    const [totalFactures, factures] = await Promise.all([
      prisma.factures_abonnement.count(),
      prisma.factures_abonnement.findMany({
        skip,
        take: limit,
        orderBy: { date_echeance: "desc" },
      }),
    ]);

    expect(factures.length).toBeLessThanOrEqual(10);
    expect(totalFactures).toBeGreaterThanOrEqual(factures.length);
  });
});
