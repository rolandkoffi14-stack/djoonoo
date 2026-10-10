import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, resetRateLimit } from "../src/lib/rate-limit";

describe("Limitation de Débit / Rate Limiting (Phase 4 - Items 6.1, 6.2 & 6.3)", () => {
  const testKey = "test-user-ip-123";

  beforeEach(() => {
    resetRateLimit(testKey);
  });

  it("doit autoriser les requêtes sous le seuil configuré", () => {
    const res1 = checkRateLimit(testKey, 3, 60);
    expect(res1.allowed).toBe(true);
    expect(res1.remaining).toBe(2);

    const res2 = checkRateLimit(testKey, 3, 60);
    expect(res2.allowed).toBe(true);
    expect(res2.remaining).toBe(1);

    const res3 = checkRateLimit(testKey, 3, 60);
    expect(res3.allowed).toBe(true);
    expect(res3.remaining).toBe(0);
  });

  it("doit bloquer les requêtes qui dépassent le quota autorisé", () => {
    // 3 requêtes autorisées
    checkRateLimit(testKey, 3, 60);
    checkRateLimit(testKey, 3, 60);
    checkRateLimit(testKey, 3, 60);

    // 4ème requête : bloquée
    const res4 = checkRateLimit(testKey, 3, 60);
    expect(res4.allowed).toBe(false);
    expect(res4.remaining).toBe(0);
    expect(res4.resetInSeconds).toBeGreaterThan(0);
  });

  it("doit isoler strictement les compteurs entre clés différentes", () => {
    const keyA = "cle-A";
    const keyB = "cle-B";

    checkRateLimit(keyA, 1, 60);
    const blockedA = checkRateLimit(keyA, 1, 60);
    expect(blockedA.allowed).toBe(false);

    // keyB doit toujours être autorisée
    const allowedB = checkRateLimit(keyB, 1, 60);
    expect(allowedB.allowed).toBe(true);
  });

  it("doit réinitialiser le compteur lorsque resetRateLimit est appelé", () => {
    checkRateLimit(testKey, 1, 60);
    expect(checkRateLimit(testKey, 1, 60).allowed).toBe(false);

    resetRateLimit(testKey);
    expect(checkRateLimit(testKey, 1, 60).allowed).toBe(true);
  });
});
