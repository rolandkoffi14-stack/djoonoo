import { describe, it, expect } from "vitest";
import { MotDePasseFortSchema } from "../src/lib/validations/index";
import { inscrirePatronAction } from "../src/app/actions/auth";

describe("Sentinelle Sécurité — Politique de Robustesse des Mots de Passe (Point 19)", () => {
  it("doit rejeter un mot de passe trop court (< 8 caractères)", () => {
    const res = MotDePasseFortSchema.safeParse("Ab1!xyz");
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0].message).toContain("8 caractères");
    }
  });

  it("doit rejeter un mot de passe sans lettre majuscule", () => {
    const res = MotDePasseFortSchema.safeParse("motdepasse123!");
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0].message).toContain("majuscule");
    }
  });

  it("doit rejeter un mot de passe sans chiffre", () => {
    const res = MotDePasseFortSchema.safeParse("MotDePasseFort!");
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0].message).toContain("chiffre");
    }
  });

  it("doit rejeter un mot de passe sans caractère spécial", () => {
    const res = MotDePasseFortSchema.safeParse("MotDePasseFort123");
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0].message).toContain("caractère spécial");
    }
  });

  it("doit valider un mot de passe conforme avec majuscule, chiffre et symbole", () => {
    const res = MotDePasseFortSchema.safeParse("MotDePasseFort2026!");
    expect(res.success).toBe(true);
  });

  it("doit rejeter l'inscription d'un Patron avec un mot de passe faible", async () => {
    const formData = new FormData();
    formData.append("nom_entreprise", "Entreprise Test Faible");
    formData.append("nom_patron", "Patron Faible");
    formData.append("email", "faible@test-djoonoo.com");
    formData.append("telephone_patron", "+22901223344");
    formData.append("ville", "Cotonou");
    formData.append("mot_de_passe", "faible123"); // Pas de majuscule, pas de symbole
    formData.append("mot_de_passe_confirmation", "faible123");

    const res = await inscrirePatronAction(null, formData);
    expect(res.success).toBe(false);
    expect(res.fieldErrors?.mot_de_passe).toBeDefined();
  });
});
