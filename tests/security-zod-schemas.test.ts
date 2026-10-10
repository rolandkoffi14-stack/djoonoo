import { describe, it, expect } from "vitest";
import {
  VenteInputSchema,
  ProduitInputSchema,
  BoutiqueInputSchema,
  AuthLoginSchema,
  Auth2FASchema,
} from "../src/lib/validations";

describe("Validation Déclarative Zod (Phase 5 - Item 4.1 de l'audit)", () => {
  describe("VenteInputSchema", () => {
    it("doit valider une vente conforme", () => {
      const valid = {
        boutique_id: "c46fd99b-5777-49f3-8b7c-c76dc92d6e4f",
        montant_remise: 500,
        mode_paiement: "especes",
        lignes: [
          {
            produit_id: "p1-uuid",
            quantite: 2,
            prix_unitaire: 1500,
          },
        ],
      };
      expect(() => VenteInputSchema.parse(valid)).not.toThrow();
    });

    it("doit rejeter une remise négative (anti-fraude de caisse)", () => {
      const invalid = {
        boutique_id: "c46fd99b-5777-49f3-8b7c-c76dc92d6e4f",
        montant_remise: -1000,
        lignes: [{ produit_id: "p1", quantite: 1, prix_unitaire: 2000 }],
      };
      expect(() => VenteInputSchema.parse(invalid)).toThrow(/remise/i);
    });

    it("doit rejeter une quantité nulle ou négative", () => {
      const invalid = {
        boutique_id: "c46fd99b-5777-49f3-8b7c-c76dc92d6e4f",
        montant_remise: 0,
        lignes: [{ produit_id: "p1", quantite: 0, prix_unitaire: 2000 }],
      };
      expect(() => VenteInputSchema.parse(invalid)).toThrow(/quantité/i);
    });
  });

  describe("ProduitInputSchema", () => {
    it("doit rejeter un prix unitaire négatif ou égal à zéro", () => {
      const invalid = {
        nom: "Smartphone",
        boutique_id: "b1",
        prix_unitaire: 0,
        quantite_stock: 10,
        seuil_alerte: 2,
      };
      expect(() => ProduitInputSchema.parse(invalid)).toThrow(/prix/i);
    });

    it("doit rejeter un stock négatif", () => {
      const invalid = {
        nom: "Smartphone",
        boutique_id: "b1",
        prix_unitaire: 50000,
        quantite_stock: -5,
        seuil_alerte: 2,
      };
      expect(() => ProduitInputSchema.parse(invalid)).toThrow(/stock/i);
    });
  });

  describe("Auth2FASchema", () => {
    it("doit valider un code 2FA exactement composé de 6 chiffres", () => {
      expect(() => Auth2FASchema.parse({ code: "123456" })).not.toThrow();
    });

    it("doit rejeter les lettres ou les codes à mauvaise longueur", () => {
      expect(() => Auth2FASchema.parse({ code: "12345" })).toThrow();
      expect(() => Auth2FASchema.parse({ code: "1234567" })).toThrow();
      expect(() => Auth2FASchema.parse({ code: "abcdef" })).toThrow();
    });
  });
});
