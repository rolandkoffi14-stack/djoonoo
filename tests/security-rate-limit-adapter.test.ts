import { describe, it, expect, beforeEach } from "vitest";
import {
  checkRateLimit,
  resetRateLimit,
  checkRateLimitDistributed,
  getRateLimitStorageType,
} from "../src/lib/rate-limit";

describe("Sentinelle Sécurité — Adaptateur de Rate Limiting Multi-Noeuds (Chantier C)", () => {
  beforeEach(() => {
    resetRateLimit("test-adapter-key");
  });

  it("doit rapporter le mode 'memory' par défaut sans configuration externe", () => {
    expect(getRateLimitStorageType()).toBe("memory");
  });

  it("doit appliquer la limitation de débit synchrone en mémoire", () => {
    const key = "test-adapter-key";
    for (let i = 0; i < 3; i++) {
      const res = checkRateLimit(key, 3, 60);
      expect(res.allowed).toBe(true);
    }
    const blocked = checkRateLimit(key, 3, 60);
    expect(blocked.allowed).toBe(false);
  });

  it("doit supporter la variante distribuée asynchrone avec repli mémoire transparent", async () => {
    const key = "test-adapter-async-key";
    resetRateLimit(key);

    const res1 = await checkRateLimitDistributed(key, 2, 60);
    expect(res1.allowed).toBe(true);
    expect(res1.remaining).toBe(1);

    const res2 = await checkRateLimitDistributed(key, 2, 60);
    expect(res2.allowed).toBe(true);
    expect(res2.remaining).toBe(0);

    const res3 = await checkRateLimitDistributed(key, 2, 60);
    expect(res3.allowed).toBe(false);
  });
});
