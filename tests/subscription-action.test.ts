import { describe, it, expect } from "vitest";
import { initierPaiementAbonnementAction } from "../src/app/actions/subscription";

describe("Action d'Initiation de Paiement d'Abonnement", () => {
  it("doit refuser l'action si aucune session n'est active", async () => {
    const res = await initierPaiementAbonnementAction("non-existent-forfait-id");
    expect(res.success).toBe(false);
    expect(res.error).toContain("réservée au Patron");
  });
});
