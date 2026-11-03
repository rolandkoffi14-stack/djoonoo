import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "../src/middleware";

describe("Middleware de Sécurité & Contrôle d'Accès (Standalone)", () => {
  it("doit autoriser l'accès aux routes publiques sans cookie", () => {
    const publicPaths = [
      "/",
      "/connexion",
      "/initialisation",
      "/cgu",
      "/confidentialite",
      "/invitation/token123",
      "/verification-email/token123",
    ];

    for (const path of publicPaths) {
      const req = new NextRequest(`http://localhost:3000${path}`);
      const res = middleware(req);
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

  it("doit renvoyer 401 JSON pour les routes API privées sans cookie", () => {
    const req = new NextRequest("http://localhost:3000/api/ventes");
    const res = middleware(req);

    expect(res.status).toBe(401);
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
});
