import { describe, it, expect } from "vitest";
import {
  AuthLoginSchema,
  Auth2FASchema,
  BoutiqueInputSchema,
} from "../src/lib/validations/index";
import { creerBoutiqueAction } from "../src/app/actions/boutiques";

describe("Sentinelle Sécurité — Validation Déclarative Zod (Chantier 6)", () => {
  describe("AuthLoginSchema", () => {
    it("doit rejeter un email invalide", () => {
      const res = AuthLoginSchema.safeParse({
        email: "pas-un-email",
        mot_de_passe: "motdepasse123",
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("email");
      }
    });

    it("doit rejeter un mot de passe de moins de 6 caractères", () => {
      const res = AuthLoginSchema.safeParse({
        email: "test@djoonoo.com",
        mot_de_passe: "12345",
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("6 caractères");
      }
    });

    it("doit accepter des identifiants valides", () => {
      const res = AuthLoginSchema.safeParse({
        email: "test@djoonoo.com",
        mot_de_passe: "123456",
      });
      expect(res.success).toBe(true);
    });
  });

  describe("Auth2FASchema", () => {
    it("doit rejeter les codes non conformes (moins ou plus de 6 chiffres, lettres)", () => {
      expect(Auth2FASchema.safeParse({ code: "12345" }).success).toBe(false);
      expect(Auth2FASchema.safeParse({ code: "1234567" }).success).toBe(false);
      expect(Auth2FASchema.safeParse({ code: "abcdef" }).success).toBe(false);
      expect(Auth2FASchema.safeParse({ code: "1234a6" }).success).toBe(false);
    });

    it("doit valider un code TOTP à 6 chiffres", () => {
      expect(Auth2FASchema.safeParse({ code: "123456" }).success).toBe(true);
    });
  });

  describe("BoutiqueInputSchema", () => {
    it("doit rejeter une boutique avec des données manquantes ou trop courtes", () => {
      const res = BoutiqueInputSchema.safeParse({
        nom: "A",
        ville: "",
        adresse: "Rue",
        secteur_activite: "Commerce",
      });
      expect(res.success).toBe(false);
    });

    it("doit accepter une boutique bien formée", () => {
      const res = BoutiqueInputSchema.safeParse({
        nom: "Boutique Centrale",
        ville: "Cotonou",
        adresse: "Avenue Steinmetz",
        secteur_activite: "Prêt-à-porter",
        telephone: "+22990000000",
      });
      expect(res.success).toBe(true);
    });
  });
});
