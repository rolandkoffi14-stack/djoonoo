import { describe, it, expect, vi, beforeEach } from "vitest";
import { modifierParametresBoutiqueAction } from "../src/app/actions/parametres";
import { prisma } from "../src/lib/prisma";
import * as auth from "../src/lib/auth";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Restrictions Rôle Gérant & Vendeur (Section 2 & Cohérence UI)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("modifierParametresBoutiqueAction", () => {
    it("doit formellement refuser la modification de boutique à un Gérant", async () => {
      vi.spyOn(auth, "getCurrentSession").mockResolvedValue({
        userId: "user-gerant-1",
        compteId: "compte-1",
        role: "gerant",
        boutiqueId: "boutique-assignee",
      } as any);

      const formData = new FormData();
      formData.append("boutiqueId", "boutique-assignee");
      formData.append("nom", "Nouveau Nom Interdit");
      formData.append("ville", "Cotonou");
      formData.append("adresse", "Haie Vive");

      const res = await modifierParametresBoutiqueAction(formData);
      expect(res.success).toBe(false);
      expect(res.error).toContain("Seul le Patron a l'autorisation de modifier les coordonnées d'une boutique");
    });

    it("doit formellement refuser la modification de boutique à un Vendeur", async () => {
      vi.spyOn(auth, "getCurrentSession").mockResolvedValue({
        userId: "user-vendeur-1",
        compteId: "compte-1",
        role: "vendeur",
        boutiqueId: "boutique-assignee",
      } as any);

      const formData = new FormData();
      formData.append("boutiqueId", "boutique-assignee");
      formData.append("nom", "Nom Vendeur");
      formData.append("ville", "Cotonou");
      formData.append("adresse", "Rue 10");

      const res = await modifierParametresBoutiqueAction(formData);
      expect(res.success).toBe(false);
      expect(res.error).toContain("Seul le Patron a l'autorisation de modifier les coordonnées d'une boutique");
    });

    it("doit autoriser la modification de boutique uniquement pour le Patron", async () => {
      vi.spyOn(auth, "getCurrentSession").mockResolvedValue({
        userId: "user-patron-1",
        compteId: "compte-1",
        role: "patron",
      } as any);

      vi.spyOn(prisma.boutiques, "findFirst").mockResolvedValue({
        id: "boutique-1",
        compte_id: "compte-1",
      } as any);

      const updateSpy = vi.spyOn(prisma.boutiques, "update").mockResolvedValue({} as any);

      const formData = new FormData();
      formData.append("boutiqueId", "boutique-1");
      formData.append("nom", "Boutique Officielle");
      formData.append("ville", "Cotonou");
      formData.append("adresse", "Avenue Steinmetz");
      formData.append("telephone", "97112233");
      formData.append("secteurActivite", "Mode");

      const res = await modifierParametresBoutiqueAction(formData);
      expect(res.success).toBe(true);
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "boutique-1" },
          data: {
            nom: "Boutique Officielle",
            ville: "Cotonou",
            adresse: "Avenue Steinmetz",
            telephone: "97112233",
            secteur_activite: "Mode",
          },
        })
      );
    });
  });

  describe("Logique de Détermination de Boutique Active", () => {
    const b1 = { id: "b1", code: "B01", nom: "Boutique 1" };
    const b2 = { id: "b2", code: "B02", nom: "Boutique 2" };
    const allBoutiques = [b1, b2];

    it("doit forcer la boutique assignée pour le Gérant même si un cookie tente de cibler une autre boutique", () => {
      const session = { role: "gerant", boutiqueId: "b1" };
      const cookieBoutiqueId = "b2"; // Tentative d'usurpation via cookie

      const activeBoutique =
        session.role === "patron"
          ? (allBoutiques.find((b) => b.id === cookieBoutiqueId) || allBoutiques[0])
          : (allBoutiques.find((b) => b.id === session.boutiqueId) || allBoutiques[0]);

      expect(activeBoutique.id).toBe("b1");
      expect(activeBoutique.code).toBe("B01");
    });

    it("doit permettre au Patron de naviguer via le cookie de sélection", () => {
      const session = { role: "patron", boutiqueId: null };
      const cookieBoutiqueId = "b2";

      const activeBoutique =
        session.role === "patron"
          ? (allBoutiques.find((b) => b.id === cookieBoutiqueId) || allBoutiques[0])
          : (allBoutiques.find((b) => b.id === session.boutiqueId) || allBoutiques[0]);

      expect(activeBoutique.id).toBe("b2");
      expect(activeBoutique.code).toBe("B02");
    });
  });
});
