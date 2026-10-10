import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "../src/middleware";

describe("Middleware de Sécurité & Contrôle d'Accès (Phase 2 - Items 3.1 & 3.2)", () => {
  it("doit autoriser l'accès aux routes publiques sans cookie", () => {
    const publicPaths = [
      "/",
      "/connexion",
      "/inscription",
      "/super-admin/connexion",
      "/super-admin/initialisation",
      "/cgu",
      "/confidentialite",
      "/invitation/token123",
      "/verification-email/token123",
      "/api/webhooks/fedapay",
      "/api/cron/abonnements",
    ];

    for (const path of publicPaths) {
      const req = new NextRequest(`http://localhost:3000${path}`);
      const res = middleware(req);
      // Pour les routes publiques autorisées, middleware renvoie NextResponse.next()
      expect(res.headers.get("location")).toBeNull();
    }
  });

  it("doit rediriger vers /connexion si un utilisateur non authentifié tente d'accéder au dashboard", () => {
    const req = new NextRequest("http://localhost:3000/dashboard");
    const res = middleware(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/connexion");
  });

  it("doit rediriger vers /connexion si un utilisateur non authentifié tente d'accéder aux sous-pages dashboard", () => {
    const req = new NextRequest("http://localhost:3000/dashboard/ventes");
    const res = middleware(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/connexion");
  });

  it("doit rediriger vers /super-admin/connexion si un accès non autorisé tente d'accéder à la console super-admin", () => {
    const req = new NextRequest("http://localhost:3000/super-admin");
    const res = middleware(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/super-admin/connexion");
  });

  it("doit laisser passer si le cookie djoonoo_session est présent sur /dashboard", () => {
    const req = new NextRequest("http://localhost:3000/dashboard", {
      headers: {
        cookie: "djoonoo_session=valeur_token_jwt",
      },
    });
    const res = middleware(req);

    expect(res.headers.get("location")).toBeNull();
  });

  it("doit laisser passer si le cookie djoonoo_superadmin_session est présent sur /super-admin", () => {
    const req = new NextRequest("http://localhost:3000/super-admin", {
      headers: {
        cookie: "djoonoo_superadmin_session=valeur_token_superadmin_jwt",
      },
    });
    const res = middleware(req);

    expect(res.headers.get("location")).toBeNull();
  });
});
