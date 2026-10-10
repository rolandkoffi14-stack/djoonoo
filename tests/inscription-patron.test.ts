import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { inscrirePatronAction } from "../src/app/actions/auth";
import { prisma } from "../src/lib/prisma";

describe("Inscription du Patron (Étape 1 & Validations)", () => {
  const testEmail = `patron-test-${Date.now()}@test-djoonoo.com`;

  afterEach(async () => {
    // Nettoyage éventuel
    const user = await prisma.utilisateurs.findUnique({
      where: { email: testEmail },
      include: { compte: true },
    });
    if (user) {
      await prisma.journal_audit.deleteMany({ where: { compte_id: user.compte_id } });
      await prisma.utilisateurs.deleteMany({ where: { compte_id: user.compte_id } });
      await prisma.produits.deleteMany({ where: { compte_id: user.compte_id } });
      await prisma.boutiques.deleteMany({ where: { compte_id: user.compte_id } });
      await prisma.compteur_boutique.deleteMany({ where: { compte_id: user.compte_id } });
      await prisma.comptes.deleteMany({ where: { id: user.compte_id } });
    }
  });

  it("doit refuser l'inscription et renvoyer un message d'erreur explicite si des champs sont manquants", async () => {
    const formData = new FormData();
    formData.append("nom_entreprise", "Mon Entreprise Test");
    // Manque nom_patron, telephone, email, mot_de_passe

    const res = await inscrirePatronAction(null, formData);
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
    expect(res.fieldErrors).toBeDefined();
    expect(res.fieldErrors?.nom_patron).toBe("Indique ton nom complet.");
    expect(res.fieldErrors?.email).toBe("Indique une adresse email valide.");
    expect(res.fieldErrors?.telephone_patron).toBe("Indique ton numéro de téléphone.");
  });

  it("doit rejeter l'inscription si les mots de passe ne correspondent pas", async () => {
    const formData = new FormData();
    formData.append("nom_entreprise", "Boutique Mode");
    formData.append("nom_patron", "Roland Test");
    formData.append("email", "mismatch@test.com");
    formData.append("telephone_patron", "+22901998877");
    formData.append("ville", "Cotonou");
    formData.append("mot_de_passe", "SuperSecret123!");
    formData.append("mot_de_passe_confirmation", "DifferentSecret123!");

    const res = await inscrirePatronAction(null, formData);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Les mots de passe ne correspondent pas/);
    expect(res.fieldErrors?.mot_de_passe_confirmation).toBe("Les mots de passe ne correspondent pas.");
  });

  it("doit enregistrer le compte avec succès en utilisant nom_patron et telephone_patron", async () => {
    const formData = new FormData();
    formData.append("nom_entreprise", "Établissement Pro Test");
    formData.append("nom_boutique", "Boutique Centrale");
    formData.append("nom_patron", "Cédric Testeur");
    formData.append("email", testEmail);
    formData.append("telephone_patron", "+229 01 62 16 91");
    formData.append("ville", "Abomey-Calavi");
    formData.append("adresse_boutique", "Marché Saint-Michel");
    formData.append("mot_de_passe", "MotDePasseFort2026!");
    formData.append("mot_de_passe_confirmation", "MotDePasseFort2026!");
    formData.append("forfait_nom", "Solo");

    const res = await inscrirePatronAction(null, formData);

    expect(res.success).toBe(true);
    expect(res.step).toBe("deux_fa");
    expect(res.data).toBeDefined();
    expect(res.data?.email).toBe(testEmail);
    expect(res.data?.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
    expect(res.data?.secret).toBeDefined();
    expect(res.data?.codeCompte).toBeDefined();
    expect(res.data?.codeBoutique).toBe("B01");
  });
});
