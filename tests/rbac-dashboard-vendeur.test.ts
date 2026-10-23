import { describe, it, expect } from "vitest";
import { RoleUtilisateur } from "@prisma/client";
import {
  construireFiltreVentesParRole,
  construireFiltreImpayesParRole,
} from "../src/lib/business-rules";

describe("RBAC Dashboard & Ventes — Isolation Vendeur / Gérant / Patron (Phase 1)", () => {
  const sessionVendeur = {
    userId: "vendeur-123",
    role: "vendeur" as RoleUtilisateur,
    boutiqueId: "boutique-A",
  };

  const sessionGerant = {
    userId: "gerant-456",
    role: "gerant" as RoleUtilisateur,
    boutiqueId: "boutique-A",
  };

  const sessionPatron = {
    userId: "patron-789",
    role: "patron" as RoleUtilisateur,
    boutiqueId: null,
  };

  describe("construireFiltreVentesParRole", () => {
    it("doit restreindre le Vendeur à sa boutique ET à ses propres ventes (utilisateur_id)", () => {
      const filtre = construireFiltreVentesParRole(sessionVendeur, "boutique-A");
      expect(filtre.boutique_id).toBe("boutique-A");
      expect(filtre.utilisateur_id).toBe("vendeur-123");
    });

    it("ne doit JAMAIS restreindre le Gérant par utilisateur_id, mais verrouiller sa boutique", () => {
      const filtre = construireFiltreVentesParRole(sessionGerant, "boutique-A");
      expect(filtre.boutique_id).toBe("boutique-A");
      expect(filtre.utilisateur_id).toBeUndefined();
    });

    it("doit permettre au Patron de cibler la boutique active sans restriction par utilisateur_id", () => {
      const filtre = construireFiltreVentesParRole(sessionPatron, "boutique-B");
      expect(filtre.boutique_id).toBe("boutique-B");
      expect(filtre.utilisateur_id).toBeUndefined();
    });
  });

  describe("construireFiltreImpayesParRole", () => {
    it("doit restreindre les créances du Vendeur à ses propres ventes impayées", () => {
      const filtre = construireFiltreImpayesParRole(sessionVendeur, "boutique-A");
      expect(filtre.boutique_id).toBe("boutique-A");
      expect(filtre.utilisateur_id).toBe("vendeur-123");
      expect(filtre.statut_paiement).toEqual({ in: ["impaye", "partiel"] });
      expect(filtre.statut_vente).toBe("validee");
    });

    it("doit exposer toutes les créances de la boutique pour le Gérant", () => {
      const filtre = construireFiltreImpayesParRole(sessionGerant, "boutique-A");
      expect(filtre.boutique_id).toBe("boutique-A");
      expect(filtre.utilisateur_id).toBeUndefined();
      expect(filtre.statut_paiement).toEqual({ in: ["impaye", "partiel"] });
      expect(filtre.statut_vente).toBe("validee");
    });
  });
});
