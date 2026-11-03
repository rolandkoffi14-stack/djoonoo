import { describe, it, expect } from "vitest";
import { verifierStatutAbonnementPourEcriture } from "../src/lib/subscription-guard";

describe("Garde de Mutation (Version Licence Permanente)", () => {
  it("doit autoriser les écritures pour un compte avec licence permanente", () => {
    const res = verifierStatutAbonnementPourEcriture("actif");
    expect(res.autorise).toBe(true);
  });
});
