import { describe, it, expect, vi } from "vitest";
import { initialiserEntrepriseAction } from "../src/app/actions/auth";
import { genererCleLicence } from "../src/lib/license";
import { prisma } from "../src/lib/prisma";

describe("Flux d'Initialisation & Activation Licence à Vie", () => {
  const secretTest = process.env.DJOONOO_LICENSE_SECRET || "djoonoo_editeur_master_secret_2krdigital_2026_licence_a_vie";

  it("doit refuser l'initialisation si l'instance est déjà initialisée", async () => {
    // Si la base contient déjà un compte
    const formData = new FormData();
    formData.set("nom_entreprise", "Autre Entreprise");

    const res = await initialiserEntrepriseAction(null, formData);
    expect(res.success).toBe(false);
    expect(res.error).toContain("déjà initialisée");
  });

  it("doit refuser l'initialisation si la clé de licence est absente (lorsque base vide)", async () => {
    vi.spyOn(prisma.comptes, "findFirst").mockResolvedValueOnce(null);

    const formData = new FormData();
    formData.set("nom_entreprise", "Établissement Test Initial");
    formData.set("nom_patron", "Patron Test");
    formData.set("email", "patron@test-init.com");
    formData.set("mot_de_passe", "Pass@123456");
    formData.set("telephone_patron", "+22901000000");
    formData.set("ville", "Cotonou");

    const res = await initialiserEntrepriseAction(null, formData);
    expect(res.success).toBe(false);
    expect(res.error).toContain("clé de licence officielle djoonoo est obligatoire");

    vi.restoreAllMocks();
  });

  it("doit refuser l'initialisation si la clé de licence ne correspond pas au nom de l'entreprise", async () => {
    vi.spyOn(prisma.comptes, "findFirst").mockResolvedValueOnce(null);

    const cle = genererCleLicence(
      {
        nomEntreprise: "AUTRE COMMERCE",
        type: "lifetime",
        maxBoutiques: 1,
        dateAchat: "2026-11-03",
      },
      secretTest
    );

    const formData = new FormData();
    formData.set("cle_licence", cle);
    formData.set("nom_entreprise", "Mon Vrai Commerce");
    formData.set("nom_patron", "Patron Test");
    formData.set("email", "patron@test-init2.com");
    formData.set("mot_de_passe", "Pass@123456");
    formData.set("telephone_patron", "+22901000000");
    formData.set("ville", "Cotonou");

    const res = await initialiserEntrepriseAction(null, formData);
    expect(res.success).toBe(false);
    expect(res.error).toContain("ne correspond pas");

    vi.restoreAllMocks();
  });
});
