import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "../src/middleware";

describe("Sentinelle Sécurité — Middleware en Refus par Défaut / Liste Blanche (Chantier A)", () => {
  it("doit refuser et rediriger vers /connexion toute route inconnue ou non listée sans cookie de session", () => {
    const unlistedRoutes = [
      "/stocks-confidentiels",
      "/comptabilite",
      "/parametres-avances",
      "/administration-interne",
      "/nouveau-module",
    ];

    for (const route of unlistedRoutes) {
      const req = new NextRequest(`http://localhost:3000${route}`);
      const res = middleware(req);

      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe("http://localhost:3000/connexion");
    }
  });

  it("doit autoriser les routes non listées dès lors que le cookie de session est présent", () => {
    const req = new NextRequest("http://localhost:3000/nouveau-module", {
      headers: {
        cookie: "djoonoo_session=token_valide",
      },
    });
    const res = middleware(req);
    expect(res.headers.get("location")).toBeNull();
  });

  it("doit autoriser sans cookie toutes les routes de la liste blanche publique", () => {
    const whiteList = [
      "/",
      "/tarifs",
      "/connexion",
      "/inscription",
      "/cgu",
      "/confidentialite",
      "/invitation/tok123456",
      "/api/webhooks/fedapay",
      "/api/cron/abonnements",
    ];

    for (const path of whiteList) {
      const req = new NextRequest(`http://localhost:3000${path}`);
      const res = middleware(req);
      expect(res.headers.get("location")).toBeNull();
    }
  });
});
