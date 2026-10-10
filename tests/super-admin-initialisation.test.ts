import { describe, it, expect } from "vitest";
import {
  genererTotpInitialisationSuperAdminAction,
  initialiserPremierSuperAdminAction,
} from "../src/app/actions/super-admin";
import { estPlateformeInitialisee } from "../src/lib/plateforme-config";
import { prisma } from "../src/lib/prisma";

describe("Initialisation Unique & Sécurisée du Super-Admin", () => {
  it("doit vérifier si la plateforme est déjà initialisée", async () => {
    const initialisee = await estPlateformeInitialisee();
    expect(typeof initialisee).toBe("boolean");
  });

  it("doit rejeter une adresse email invalide lors de la génération du secret TOTP", async () => {
    const res = await genererTotpInitialisationSuperAdminAction("pas-un-email");
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
  });

  it("doit sceller l'initialisation si un Super-Admin est déjà présent en base", async () => {
    const adminCount = await prisma.super_admins.count();
    if (adminCount > 0) {
      const formData = new FormData();
      formData.append("email", "tentative_usurpation@example.com");
      formData.append("mot_de_passe", "SuperAdminSecret2026!#");
      formData.append("mot_de_passe_confirmation", "SuperAdminSecret2026!#");
      formData.append("totp_secret", "Y74PATETHLNTQS6BWRRBIPIYOU6CRWED");
      formData.append("code_2fa", "123456");

      const res = await initialiserPremierSuperAdminAction(null, formData);
      expect(res.success).toBe(false);
      expect(res.error).toContain("déjà été initialisée");
    }
  });

  it("doit rejeter toute tentative incomplète ou invalide", async () => {
    const formData = new FormData();
    formData.append("email", "admin@example.com");
    // Champs manquants
    const res = await initialiserPremierSuperAdminAction(null, formData);
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
  });
});
