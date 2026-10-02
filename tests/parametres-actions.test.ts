import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  modifierProfilAction,
  modifierMotDePasseAction,
  modifierEntrepriseAction,
  basculer2FAVendeurAction,
  modifierParametresBoutiqueAction,
} from "../src/app/actions/parametres";
import { prisma } from "../src/lib/prisma";
import * as auth from "../src/lib/auth";
import bcrypt from "bcryptjs";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Server Actions - Paramètres", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("modifierProfilAction", () => {
    it("doit refuser la mise à jour si la session est absente", async () => {
      vi.spyOn(auth, "getCurrentSession").mockResolvedValue(null);

      const formData = new FormData();
      formData.append("nom", "Nouveau Nom");

      const res = await modifierProfilAction(formData);
      expect(res.success).toBe(false);
      expect(res.error).toContain("Non authentifié");
    });

    it("doit refuser si le nom ou le téléphone est trop court", async () => {
      vi.spyOn(auth, "getCurrentSession").mockResolvedValue({
        userId: "user-1",
        compteId: "compte-1",
        role: "patron",
        email: "patron@test.com",
      } as any);

      const formData = new FormData();
      formData.append("nom", "A");
      formData.append("telephone", "12");

      const res = await modifierProfilAction(formData);
      expect(res.success).toBe(false);
      expect(res.error).toContain("nom doit comporter au moins 2 caractères");
    });

    it("doit mettre à jour le nom et téléphone du profil sans altérer l'email", async () => {
      vi.spyOn(auth, "getCurrentSession").mockResolvedValue({
        userId: "user-1",
        compteId: "compte-1",
        role: "patron",
        email: "fixe@test.com",
      } as any);

      const updateUtilisateurSpy = vi.spyOn(prisma.utilisateurs, "update").mockResolvedValue({} as any);

      const formData = new FormData();
      formData.append("nom", "Patron Nouveau");
      formData.append("telephone", "97000000");

      const res = await modifierProfilAction(formData);
      expect(res.success).toBe(true);
      expect(updateUtilisateurSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user-1" },
          data: {
            nom: "Patron Nouveau",
            telephone: "97000000",
          },
        })
      );
    });
  });

  describe("modifierMotDePasseAction", () => {
    it("doit refuser si le nouveau mot de passe fait moins de 8 caractères", async () => {
      vi.spyOn(auth, "getCurrentSession").mockResolvedValue({
        userId: "user-1",
        compteId: "compte-1",
      } as any);

      const formData = new FormData();
      formData.append("ancienMotDePasse", "ancienSecret123");
      formData.append("nouveauMotDePasse", "court");
      formData.append("confirmationMotDePasse", "court");

      const res = await modifierMotDePasseAction(formData);
      expect(res.success).toBe(false);
      expect(res.error).toContain("8 caractères");
    });

    it("doit refuser si l'ancien mot de passe est incorrect", async () => {
      vi.spyOn(auth, "getCurrentSession").mockResolvedValue({
        userId: "user-1",
        compteId: "compte-1",
      } as any);

      const hashCorrect = await bcrypt.hash("vraiAncienSecret123", 10);
      vi.spyOn(prisma.utilisateurs, "findUnique").mockResolvedValue({
        id: "user-1",
        mot_de_passe_hash: hashCorrect,
      } as any);

      const formData = new FormData();
      formData.append("ancienMotDePasse", "fauxAncienMotDePasse");
      formData.append("nouveauMotDePasse", "nouveauSecretSecurise123");
      formData.append("confirmationMotDePasse", "nouveauSecretSecurise123");

      const res = await modifierMotDePasseAction(formData);
      expect(res.success).toBe(false);
      expect(res.error).toContain("Ancien mot de passe incorrect");
    });

    it("doit mettre à jour le hash quand les mots de passe sont valides", async () => {
      vi.spyOn(auth, "getCurrentSession").mockResolvedValue({
        userId: "user-1",
        compteId: "compte-1",
      } as any);

      const hashAncien = await bcrypt.hash("bonAncienSecret123", 10);
      vi.spyOn(prisma.utilisateurs, "findUnique").mockResolvedValue({
        id: "user-1",
        mot_de_passe_hash: hashAncien,
      } as any);

      const updateSpy = vi.spyOn(prisma.utilisateurs, "update").mockResolvedValue({} as any);

      const formData = new FormData();
      formData.append("ancienMotDePasse", "bonAncienSecret123");
      formData.append("nouveauMotDePasse", "superNouveauSecret999");
      formData.append("confirmationMotDePasse", "superNouveauSecret999");

      const res = await modifierMotDePasseAction(formData);
      expect(res.success).toBe(true);
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user-1" },
        })
      );
    });
  });

  describe("modifierEntrepriseAction", () => {
    it("doit interdire l'action à un rôle non-patron", async () => {
      vi.spyOn(auth, "getCurrentSession").mockResolvedValue({
        userId: "user-gerant",
        compteId: "compte-1",
        role: "gerant",
      } as any);

      const formData = new FormData();
      formData.append("nom_entreprise", "Piratage SARL");

      const res = await modifierEntrepriseAction(formData);
      expect(res.success).toBe(false);
      expect(res.error).toContain("Patron");
    });

    it("doit mettre à jour les coordonnées de l'entreprise si patron", async () => {
      vi.spyOn(auth, "getCurrentSession").mockResolvedValue({
        userId: "user-patron",
        compteId: "compte-1",
        role: "patron",
      } as any);

      const updateCompteSpy = vi.spyOn(prisma.comptes, "update").mockResolvedValue({} as any);
      vi.spyOn(prisma.journal_audit, "create").mockResolvedValue({} as any);

      const formData = new FormData();
      formData.append("nom_entreprise", "Djoonoo Fashion");
      formData.append("forme_juridique", "SARL");
      formData.append("ifu", "0202112345678");
      formData.append("rccm", "RB/COT/21 B 12345");
      formData.append("telephone_principal", "+229 97 00 11 22");
      formData.append("telephone_secondaire", "+229 95 00 11 22");
      formData.append("ville", "Cotonou");
      formData.append("adresse_siege", "Haie Vive, Rue 300");

      const res = await modifierEntrepriseAction(formData);
      expect(res.success).toBe(true);
      expect(updateCompteSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "compte-1" },
          data: expect.objectContaining({
            nom_entreprise: "Djoonoo Fashion",
            forme_juridique: "SARL",
            ifu: "0202112345678",
            rccm: "RB/COT/21 B 12345",
            telephone_principal: "+229 97 00 11 22",
            ville: "Cotonou",
            adresse_siege: "Haie Vive, Rue 300",
          }),
        })
      );
    });
  });

  describe("basculer2FAVendeurAction", () => {
    it("doit refuser la désactivation pour un Patron ou un Gérant (2FA obligatoire)", async () => {
      vi.spyOn(auth, "getCurrentSession").mockResolvedValue({
        userId: "user-gerant",
        compteId: "compte-1",
        role: "gerant",
      } as any);

      const formData = new FormData();
      formData.append("active", "false");

      const res = await basculer2FAVendeurAction(formData);
      expect(res.success).toBe(false);
      expect(res.error).toContain("obligatoire");
    });
  });

  describe("modifierParametresBoutiqueAction", () => {
    it("doit refuser l'action si le rôle n'est pas Patron (ex: Gérant ou Vendeur)", async () => {
      vi.spyOn(auth, "getCurrentSession").mockResolvedValue({
        userId: "user-gerant",
        compteId: "compte-1",
        role: "gerant",
        boutiqueId: "b-1",
      } as any);

      const formData = new FormData();
      formData.append("boutiqueId", "b-1");
      formData.append("nom", "Tentative Boutique");
      formData.append("ville", "Cotonou");
      formData.append("adresse", "Rue 100");

      const res = await modifierParametresBoutiqueAction(formData);
      expect(res.success).toBe(false);
      expect(res.error).toContain("Seul le Patron a l'autorisation");
    });

    it("doit permettre la mise à jour des coordonnées si l'utilisateur est Patron", async () => {
      vi.spyOn(auth, "getCurrentSession").mockResolvedValue({
        userId: "user-patron",
        compteId: "compte-1",
        role: "patron",
      } as any);

      vi.spyOn(prisma.boutiques, "findFirst").mockResolvedValue({
        id: "b-1",
        compte_id: "compte-1",
      } as any);

      const updateBoutiqueSpy = vi.spyOn(prisma.boutiques, "update").mockResolvedValue({} as any);

      const formData = new FormData();
      formData.append("boutiqueId", "b-1");
      formData.append("nom", "Boutique Prestige");
      formData.append("ville", "Porto-Novo");
      formData.append("adresse", "Place Jean Bayol");
      formData.append("telephone", "97001122");
      formData.append("secteurActivite", "Mode & Luxe");

      const res = await modifierParametresBoutiqueAction(formData);
      expect(res.success).toBe(true);
      expect(updateBoutiqueSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "b-1" },
          data: {
            nom: "Boutique Prestige",
            ville: "Porto-Novo",
            adresse: "Place Jean Bayol",
            telephone: "97001122",
            secteur_activite: "Mode & Luxe",
          },
        })
      );
    });
  });
});
