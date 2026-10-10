import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma";
import crypto from "crypto";
import { verifierEmailPatronAction } from "../src/app/actions/auth";
import { envoyerEmailVerificationPatron, genererHtmlVerificationEmail } from "../src/lib/email";

describe("Sentinelle Sécurité — Vérification de l'Adresse Email Patron (Point 13)", () => {
  let userId: string;
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const testEmail = `patron-verif-${Date.now()}@djoonoo-test.com`;

  afterAll(async () => {
    if (userId) {
      await prisma.tokens_invitation.deleteMany({ where: { utilisateur_id: userId } });
      await prisma.journal_audit.deleteMany({ where: { utilisateur_id: userId } });
      const user = await prisma.utilisateurs.findUnique({ where: { id: userId } });
      if (user) {
        await prisma.utilisateurs.delete({ where: { id: userId } });
        await prisma.comptes.delete({ where: { id: user.compte_id } });
      }
    }
  });

  it("doit générer un gabarit HTML d'email contenant le lien de vérification", () => {
    const html = genererHtmlVerificationEmail({
      destinataire: testEmail,
      nom: "Patron Test",
      lienVerification: "https://djoonoo.com/verification-email/abc123token",
    });

    expect(html).toContain("https://djoonoo.com/verification-email/abc123token");
    expect(html).toContain("Patron Test");
    expect(html).toContain("Confirmer mon adresse email");
  });

  it("doit envoyer l'email de vérification en mode fallback ou Resend", async () => {
    const res = await envoyerEmailVerificationPatron({
      destinataire: testEmail,
      nom: "Patron Test",
      lienVerification: "https://djoonoo.com/verification-email/test-token",
    });

    expect(res.success).toBe(true);
  });

  it("doit valider le token et confirmer l'adresse email", async () => {
    // 1. Créer un compte et utilisateur de test
    const forfait = await prisma.forfaits.findFirst();
    if (!forfait) return;

    const compte = await prisma.comptes.create({
      data: {
        code: `EV${Date.now().toString().slice(-4)}`,
        nom_entreprise: "Entreprise Verif Email",
        email_principal: testEmail,
        telephone_principal: "+22901998877",
        ville: "Cotonou",
        forfait_id: forfait.id,
        statut_abonnement: "essai",
      },
    });

    const user = await prisma.utilisateurs.create({
      data: {
        compte_id: compte.id,
        nom: "Patron Verif",
        telephone: "+22901998877",
        email: testEmail,
        role: "patron",
        statut: "actif",
        deux_fa_active: true,
      },
    });
    userId = user.id;

    // 2. Créer le token
    await prisma.tokens_invitation.create({
      data: {
        utilisateur_id: user.id,
        token_hash: tokenHash,
        date_expiration: new Date(Date.now() + 24 * 3600 * 1000),
      },
    });

    // 3. Valider le token
    const res = await verifierEmailPatronAction(rawToken);
    expect(res.success).toBe(true);
    expect(res.email).toBe(testEmail);

    // 4. Vérifier que le token a été consommé
    const tokenApres = await prisma.tokens_invitation.findUnique({
      where: { token_hash: tokenHash },
    });
    expect(tokenApres).toBeNull();
  });

  it("doit rejeter un token invalide ou expiré", async () => {
    const res = await verifierEmailPatronAction("token-totalement-invalide");
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
  });
});
