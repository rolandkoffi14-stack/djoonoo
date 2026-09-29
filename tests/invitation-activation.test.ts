import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma";
import crypto from "crypto";
import {
  verifierTokenInvitationAction,
  finaliserActivationCompteAction,
} from "../src/app/actions/invitation";
import { generateTotpCode } from "../src/lib/auth";

describe("Cycle d'Activation d'Invitation & 2FA Gérant", () => {
  let utilisateurId: string | null = null;
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const emailTest = `gerant-onboarding-${Date.now()}@djoonoo-test.com`;
  let totpSecretGere: string | undefined;

  afterAll(async () => {
    if (utilisateurId) {
      await prisma.journal_audit.deleteMany({
        where: { utilisateur_id: utilisateurId },
      });
      await prisma.tokens_invitation.deleteMany({
        where: { utilisateur_id: utilisateurId },
      });
      await prisma.utilisateurs.delete({
        where: { id: utilisateurId },
      });
    }
  });

  it("doit créer un compte Gérant en attente avec token d'invitation", async () => {
    const compte = await prisma.comptes.findFirst();
    const boutique = await prisma.boutiques.findFirst();
    expect(compte).toBeDefined();
    expect(boutique).toBeDefined();
    if (!compte || !boutique) return;

    const user = await prisma.utilisateurs.create({
      data: {
        compte_id: compte.id,
        boutique_id: boutique.id,
        role: "gerant",
        nom: "Gérant Onboarding",
        telephone: "0199887766",
        email: emailTest,
        mot_de_passe_hash: null,
        statut: "en_attente",
        deux_fa_active: false,
      },
    });
    utilisateurId = user.id;

    await prisma.tokens_invitation.create({
      data: {
        utilisateur_id: user.id,
        token_hash: tokenHash,
        date_expiration: new Date(Date.now() + 48 * 3600 * 1000),
      },
    });

    expect(user.id).toBeDefined();
  });

  it("doit vérifier le token et générer les informations 2FA pour le Gérant", async () => {
    const res = await verifierTokenInvitationAction(rawToken);
    expect(res.success).toBe(true);
    expect(res.invitation?.email).toBe(emailTest);
    expect(res.invitation?.role).toBe("gerant");
    expect(res.totp).toBeDefined();
    expect(res.totp?.secret).toBeDefined();
    expect(res.totp?.qrCode).toContain("data:image/png;base64");

    totpSecretGere = res.totp?.secret;
  });

  it("doit rejeter l'activation si le mot de passe est inférieur à 8 caractères", async () => {
    const res = await finaliserActivationCompteAction({
      token: rawToken,
      motDePasse: "court",
      codeTotp: "123456",
      totpSecret: totpSecretGere,
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain("8 caractères");
  });

  it("doit rejeter l'activation du Gérant si le code TOTP est erroné", async () => {
    const res = await finaliserActivationCompteAction({
      token: rawToken,
      motDePasse: "SuperSecret2026!",
      codeTotp: "000000", // Code invalide
      totpSecret: totpSecretGere,
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain("Code d'authentification 2FA invalide");
  });

  it("doit activer le compte du Gérant avec succès lorsque le code TOTP est valide", async () => {
    expect(totpSecretGere).toBeDefined();
    if (!totpSecretGere) return;

    const codeValide = generateTotpCode(totpSecretGere);

    const res = await finaliserActivationCompteAction({
      token: rawToken,
      motDePasse: "MotDePasseSecurise2026!",
      codeTotp: codeValide,
      totpSecret: totpSecretGere,
    });

    expect(res.success).toBe(true);

    // Vérifier l'état de l'utilisateur en base
    const userDb = await prisma.utilisateurs.findUnique({
      where: { id: utilisateurId! },
    });

    expect(userDb?.statut).toBe("actif");
    expect(userDb?.mot_de_passe_hash).not.toBeNull();
    expect(userDb?.deux_fa_active).toBe(true);
    expect(userDb?.deux_fa_secret).toBe(totpSecretGere);

    // Vérifier que le token a bien été révoqué
    const tokenDb = await prisma.tokens_invitation.findUnique({
      where: { token_hash: tokenHash },
    });
    expect(tokenDb).toBeNull();
  });
});
