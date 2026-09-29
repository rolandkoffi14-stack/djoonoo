import { describe, it, expect } from "vitest";
import { genererHtmlInvitation, envoyerEmailInvitation } from "../src/lib/email";

describe("Service Emailing Resend - Gabarit & Envoi", () => {
  const payloadTest = {
    destinataire: "invite@example.com",
    nom: "Amadou Diallo",
    role: "gerant" as const,
    nomEntreprise: "Maison du Tissu",
    boutiqueNom: "Boutique Cadjehoun",
    lienInvitation: "https://djoonoo.com/invitation/abc123token456",
  };

  it("doit générer un gabarit HTML contenant les informations clés et la mention 48h", () => {
    const html = genererHtmlInvitation(payloadTest);

    expect(html).toContain("Amadou Diallo");
    expect(html).toContain("Maison du Tissu");
    expect(html).toContain("Boutique Cadjehoun");
    expect(html).toContain("Gérant de boutique");
    expect(html).toContain("48 heures");
    expect(html).toContain("https://djoonoo.com/invitation/abc123token456");
    expect(html).toContain("Sécurité 2FA obligatoire");
  });

  it("doit fonctionner en mode fallback log si aucune clé API Resend n'est fournie", async () => {
    delete process.env.RESEND_API_KEY;

    const res = await envoyerEmailInvitation(payloadTest);
    expect(res.success).toBe(true);
    expect(res.mode).toBe("log");
  });
});
