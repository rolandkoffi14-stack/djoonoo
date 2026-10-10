import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "../src/app/api/cron/abonnements/route";

describe("Sécurité Route Cron Abonnements (Phase 3 - Item 4.4)", () => {
  it("doit refuser toute tentative d'exécution via la méthode HTTP GET (405)", async () => {
    const req = new NextRequest("http://localhost:3000/api/cron/abonnements", {
      method: "GET",
    });

    const res = await GET(req);
    expect(res.status).toBe(405);
    const body = await res.json();
    expect(body.error).toMatch(/Méthode non autorisée/);
  });

  it("doit rejeter un POST sans en-tête d'autorisation (401)", async () => {
    const req = new NextRequest("http://localhost:3000/api/cron/abonnements", {
      method: "POST",
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("doit ignorer le secret passé dans l'URL ?key=... pour prévenir les fuites de logs (401)", async () => {
    process.env.CRON_SECRET = "super-secret-cron-token-production-32chars";
    const req = new NextRequest(
      `http://localhost:3000/api/cron/abonnements?key=${process.env.CRON_SECRET}`,
      {
        method: "POST",
      }
    );

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("doit rejeter un token Bearer invalide (401)", async () => {
    process.env.CRON_SECRET = "super-secret-cron-token-production-32chars";
    const req = new NextRequest("http://localhost:3000/api/cron/abonnements", {
      method: "POST",
      headers: {
        authorization: "Bearer mauvais-token",
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});
