import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateEnv, getJwtSecret, getSuperAdminJwtSecret, getCronSecret } from "../src/lib/env";

describe("Validation d'Environnement & Sécurité des Secrets (Phase 1)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  it("doit valider avec succès un environnement complet et conforme", () => {
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db";
    process.env.AUTH_SECRET = "12345678901234567890123456789012"; // 32 chars
    process.env.SUPERADMIN_AUTH_SECRET = "superadmin-secret-at-least-32-chars-long";
    process.env.CRON_SECRET = "cron-secret-at-least-32-characters-long";
    process.env.FEDAPAY_SECRET_KEY = "sk_sandbox_12345";
    process.env.FEDAPAY_WEBHOOK_SECRET = "wh_sandbox_12345";

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

  it("doit lever une exception si CRON_SECRET est manquant", () => {
    delete process.env.CRON_SECRET;

    expect(() => getCronSecret()).toThrow(/CRON_SECRET/);
  });

  it("ne doit JAMAIS renvoyer de fallback statique vulnérable par défaut", () => {
    delete process.env.AUTH_SECRET;
    delete process.env.NEXTAUTH_SECRET;

    expect(() => getJwtSecret()).toThrow();
  });
});
