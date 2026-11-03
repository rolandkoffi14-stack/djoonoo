import { describe, it, expect, beforeEach } from "vitest";
import { validateEnv, getJwtSecret } from "../src/lib/env";

describe("Validation d'Environnement & Sécurité des Secrets (Standalone)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  it("doit valider avec succès un environnement complet et conforme", () => {
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db";
    process.env.AUTH_SECRET = "12345678901234567890123456789012"; // 32 chars

    expect(() => validateEnv()).not.toThrow();
  });

  it("doit lever une exception bloquante si AUTH_SECRET est manquant", () => {
    delete process.env.AUTH_SECRET;
    delete process.env.NEXTAUTH_SECRET;

    expect(() => validateEnv()).toThrow(/AUTH_SECRET/);
  });

  it("doit lever une exception si AUTH_SECRET a une longueur inférieure à 32 caractères", () => {
    process.env.AUTH_SECRET = "trop-court";

    expect(() => validateEnv()).toThrow(/32 caractères/);
  });

  it("ne doit JAMAIS renvoyer de fallback statique vulnérable par défaut", () => {
    delete process.env.AUTH_SECRET;
    delete process.env.NEXTAUTH_SECRET;

    expect(() => getJwtSecret()).toThrow();
  });
});
