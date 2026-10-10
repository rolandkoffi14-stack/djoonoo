import { describe, it, expect, beforeEach, afterEach } from "vitest";

describe("Sentinelle Sécurité — Boot Fail-Fast Next.js (instrumentation.ts)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.NEXT_RUNTIME = "nodejs";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("doit refuser de démarrer (fail-fast) si AUTH_SECRET est manquant", async () => {
    delete process.env.AUTH_SECRET;
    delete process.env.NEXTAUTH_SECRET;

    const { register } = await import("../src/instrumentation");
    await expect(register()).rejects.toThrow(/AUTH_SECRET/);
  });

  it("doit valider avec succès le démarrage si tous les secrets requis sont conformes", async () => {
    process.env.AUTH_SECRET = "12345678901234567890123456789012"; // 32 chars
    process.env.CRON_SECRET = "1234567890123456"; // 16 chars
    process.env.DATABASE_URL = "postgresql://mock:mock@localhost:5432/mock";

    const { register } = await import("../src/instrumentation");
    await expect(register()).resolves.not.toThrow();
  });
});
