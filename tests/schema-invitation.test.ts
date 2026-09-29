import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma";
import crypto from "crypto";

describe("Schéma Prisma - Tokens Invitation & Statut en_attente", () => {
  let utilisateurTestId: string | null = null;
  const emailTest = `invite-${Date.now()}@djoonoo-test.com`;

  afterAll(async () => {
    if (utilisateurTestId) {
      await prisma.utilisateurs.delete({
        where: { id: utilisateurTestId },
      });
    }
  });

  it("doit créer un utilisateur en statut 'en_attente' sans mot de passe initial", async () => {
    const compte = await prisma.comptes.findFirst();
    const boutique = await prisma.boutiques.findFirst();
    expect(compte).toBeDefined();
    expect(boutique).toBeDefined();
    if (!compte || !boutique) return;

    const utilisateur = await prisma.utilisateurs.create({
      data: {
        compte_id: compte.id,
        boutique_id: boutique.id,
        role: "vendeur",
        nom: "Collaborateur Invité",
        telephone: "0100000000",
        email: emailTest,
        mot_de_passe_hash: null, // Pas de mot de passe initial
        statut: "en_attente",
      },
    });

    utilisateurTestId = utilisateur.id;
    expect(utilisateur.id).toBeDefined();
    expect(utilisateur.statut).toBe("en_attente");
    expect(utilisateur.mot_de_passe_hash).toBeNull();
  });

  it("doit associer un token d'invitation avec expiration sous 48h", async () => {
    if (!utilisateurTestId) return;

    const tokenBrut = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(tokenBrut).digest("hex");
    const dateExpiration = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const invitation = await prisma.tokens_invitation.create({
      data: {
        utilisateur_id: utilisateurTestId,
        token_hash: tokenHash,
        date_expiration: dateExpiration,
      },
      include: {
        utilisateur: true,
      },
    });

    expect(invitation.id).toBeDefined();
    expect(invitation.token_hash).toBe(tokenHash);
    expect(invitation.utilisateur.email).toBe(emailTest);
    expect(invitation.date_expiration.getTime()).toBeGreaterThan(Date.now());
  });
});
