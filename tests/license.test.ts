import { describe, it, expect } from "vitest";
import { genererCleLicence, verifierCleLicence, LicensePayload } from "@/lib/license";

describe("Module de Licence djoonoo (Standalone / Hors-SaaS)", () => {
  const secretTest = "secret_editeur_test_123456789";

  const payloadMono: LicensePayload = {
    nomEntreprise: "BOUTIQUE DU PROGRÈS",
    type: "lifetime",
    maxBoutiques: 1,
    dateAchat: "2026-11-03",
  };

  const payloadIllimite: LicensePayload = {
    nomEntreprise: "ETS ALAFIA & FILS",
    type: "lifetime",
    maxBoutiques: null, // illimité
    dateAchat: "2026-11-03",
  };

  it("doit générer une clé de licence valide et la vérifier correctement", () => {
    const cle = genererCleLicence(payloadMono, secretTest);
    expect(cle.startsWith("DJN-LFT.")).toBe(true);

    const res = verifierCleLicence(cle, "BOUTIQUE DU PROGRÈS", secretTest);
    expect(res.valide).toBe(true);
    expect(res.payload?.nomEntreprise).toBe("BOUTIQUE DU PROGRÈS");
    expect(res.payload?.maxBoutiques).toBe(1);
    expect(res.payload?.type).toBe("lifetime");
  });

  it("doit accepter une licence illimitée", () => {
    const cle = genererCleLicence(payloadIllimite, secretTest);
    const res = verifierCleLicence(cle, "Ets Alafia & Fils", secretTest);
    expect(res.valide).toBe(true);
    expect(res.payload?.maxBoutiques).toBeNull();
  });

  it("doit rejeter une clé si le nom d'entreprise ne correspond pas", () => {
    const cle = genererCleLicence(payloadMono, secretTest);
    const res = verifierCleLicence(cle, "AUTRE ENTREPRISE SARL", secretTest);
    expect(res.valide).toBe(false);
    expect(res.erreur).toContain("ne correspond pas");
  });

  it("doit rejeter une clé dont la signature est altérée", () => {
    const cle = genererCleLicence(payloadMono, secretTest);
    const alteree = cle.slice(0, -4) + "abcd";
    const res = verifierCleLicence(alteree, "BOUTIQUE DU PROGRÈS", secretTest);
    expect(res.valide).toBe(false);
  });

  it("doit rejeter une clé avec un format invalide", () => {
    const res = verifierCleLicence("CLE-INVALIDE-1234", "BOUTIQUE DU PROGRÈS", secretTest);
    expect(res.valide).toBe(false);
    expect(res.erreur).toContain("Format de clé de licence djoonoo invalide");
  });
});

