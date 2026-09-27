import { describe, it, expect } from "vitest";
import { parsePaginationParams, genererTranchesPagination } from "../src/lib/pagination";

describe("Utilitaires de Pagination", () => {
  it("doit attribuer les valeurs par défaut page=1 et limit=25 si absent ou invalide", () => {
    const p1 = parsePaginationParams({});
    expect(p1.page).toBe(1);
    expect(p1.limit).toBe(25);
    expect(p1.skip).toBe(0);

    const p2 = parsePaginationParams({ page: "-5", limit: "abc" });
    expect(p2.page).toBe(1);
    expect(p2.limit).toBe(25);
    expect(p2.skip).toBe(0);
  });

  it("doit borner le limit entre 10 et 100 pour éviter la saturation mémoire", () => {
    const p1 = parsePaginationParams({ limit: "5" });
    expect(p1.limit).toBe(10);

    const p2 = parsePaginationParams({ limit: "5000" });
    expect(p2.limit).toBe(100);

    const p3 = parsePaginationParams({ page: "3", limit: "50" });
    expect(p3.page).toBe(3);
    expect(p3.limit).toBe(50);
    expect(p3.skip).toBe(100);
  });

  it("doit générer correctement les numéros de page avec ellipses", () => {
    // 10 pages au total, page courante = 1 -> [1, 2, 3, 4, "...", 10]
    const tranches1 = genererTranchesPagination(1, 10);
    expect(tranches1).toEqual([1, 2, 3, 4, "...", 10]);

    // 10 pages, page courante = 5 -> [1, "...", 4, 5, 6, "...", 10]
    const tranches2 = genererTranchesPagination(5, 10);
    expect(tranches2).toEqual([1, "...", 4, 5, 6, "...", 10]);

    // 5 pages, page courante = 3 -> [1, 2, 3, 4, 5] (pas d'ellipse nécessaire)
    const tranches3 = genererTranchesPagination(3, 5);
    expect(tranches3).toEqual([1, 2, 3, 4, 5]);
  });
});
