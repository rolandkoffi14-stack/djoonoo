import { describe, it, expect } from "vitest";
import { verifierStatutAbonnementPourEcriture } from "../src/lib/subscription-guard";

describe("Garde de Mutation Lecture Seule", () => {
  it("doit autoriser les mutations pour un compte actif", () => {
    const res = verifierStatutAbonnementPourEcriture("actif");
    expect(res.autorise).toBe(true);
  });

  it("doit autoriser les mutations pour un compte en essai", () => {
    const res = verifierStatutAbonnementPourEcriture("essai");
    expect(res.autorise).toBe(true);
  });

  it("doit autoriser les mutations pour un compte en impaye (grâce active)", () => {
    const res = verifierStatutAbonnementPourEcriture("impaye");
    expect(res.autorise).toBe(true);
  });

  it("doit BLOQUER les mutations pour un compte expiré", () => {
    const res = verifierStatutAbonnementPourEcriture("expire");
    expect(res.autorise).toBe(false);
    expect(res.erreur).toContain("expiré");
  });

  it("doit BLOQUER les mutations pour un compte suspendu ou résilié", () => {
    const resSuspendu = verifierStatutAbonnementPourEcriture("suspendu");
    expect(resSuspendu.autorise).toBe(false);

    const resResilie = verifierStatutAbonnementPourEcriture("resilie");
    expect(resResilie.autorise).toBe(false);
  });
});
