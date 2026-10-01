import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../src/lib/prisma";
import { evaluerCompatibiliteForfait } from "../src/lib/subscription-quotas";

describe("Garde-Fou Quotas Serveur du Checkout", () => {
  it("rejette immédiatement un paiement si le compte dépasse le quota de boutiques du forfait visé", async () => {
    // Cas : 3 boutiques actives, tentative de passer à un forfait limité à 1 (Solo)
    const evalRes = evaluerCompatibiliteForfait({
      nbBoutiquesActives: 3,
      forfaitMaxBoutiques: 1,
    });

    expect(evalRes.compatible).toBe(false);
    expect(evalRes.surcroit).toBe(2);
    expect(evalRes.message).toContain("Désactive 2 boutique(s)");
  });

  it("autorise le paiement si le nombre de boutiques est strictement inférieur ou égal au quota", () => {
    const evalRes = evaluerCompatibiliteForfait({
      nbBoutiquesActives: 1,
      forfaitMaxBoutiques: 1,
    });

    expect(evalRes.compatible).toBe(true);
  });
});
