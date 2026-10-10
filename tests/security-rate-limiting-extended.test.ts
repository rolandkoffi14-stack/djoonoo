import { describe, it, expect } from "vitest";
import { checkRateLimit, resetRateLimit } from "../src/lib/rate-limit";

describe("Sentinelle Sécurité — Limitation de Débit Étendue (Chantier 3)", () => {
  it("doit bloquer le login Super-Admin après 5 tentatives échouées sur 5 minutes", () => {
    const key = "sa:login:admin-test@djoonoo.com";
    resetRateLimit(key);

    for (let i = 0; i < 5; i++) {
      const res = checkRateLimit(key, 5, 300);
      expect(res.allowed).toBe(true);
    }

    const bloque = checkRateLimit(key, 5, 300);
    expect(bloque.allowed).toBe(false);
    expect(bloque.resetInSeconds).toBeGreaterThan(0);
  });

  it("doit bloquer la validation 2FA inscription après 5 tentatives échouées sur 5 minutes", () => {
    const key = "totp-signup:user-test-uuid";
    resetRateLimit(key);

    for (let i = 0; i < 5; i++) {
      const res = checkRateLimit(key, 5, 300);
      expect(res.allowed).toBe(true);
    }

    const bloque = checkRateLimit(key, 5, 300);
    expect(bloque.allowed).toBe(false);
    expect(bloque.resetInSeconds).toBeGreaterThan(0);
  });

  it("doit bloquer le renvoi excessif d'emails d'invitation après 3 envois en 5 minutes", () => {
    const key = "email:invite:emp-test-123";
    resetRateLimit(key);

    expect(checkRateLimit(key, 3, 300).allowed).toBe(true);
    expect(checkRateLimit(key, 3, 300).allowed).toBe(true);
    expect(checkRateLimit(key, 3, 300).allowed).toBe(true);

    const spam = checkRateLimit(key, 3, 300);
    expect(spam.allowed).toBe(false);
  });

  it("doit bloquer les créations répétées de session de paiement FedaPay après 5 appels en 5 minutes", () => {
    const key = "fedapay:tx:compte-test-456";
    resetRateLimit(key);

    for (let i = 0; i < 5; i++) {
      const res = checkRateLimit(key, 5, 300);
      expect(res.allowed).toBe(true);
    }

    const blocked = checkRateLimit(key, 5, 300);
    expect(blocked.allowed).toBe(false);
    expect(blocked.resetInSeconds).toBeGreaterThan(0);
  });
});
