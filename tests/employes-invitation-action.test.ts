import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma";
import crypto from "crypto";

describe("Action Invitation Collaborateur & Renvoi", () => {
  let utilisateurTestId: string | null = null;
  const emailTest = `invite-action-${Date.now()}@djoonoo-test.com`;

  afterAll(async () => {
    if (utilisateurTestId) {
      await prisma.utilisateurs.delete({
        where: { id: utilisateurTestId },
      });
    }
  });

  it("doit créer un employé en_attente sans mot de passe et générer son token d'invitation", async () => {
    const compte = await prisma.comptes.findFirst();
    const boutique = await prisma.boutiques.findFirst();
    expect(compte).toBeDefined();
    expect(boutique).toBeDefined();
    if (!compte || !boutique) return;

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const dateExpiration = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const employe = await prisma.$transaction(async (tx) => {
      const user = await tx.utilisateurs.create({
        data: {
          compte_id: compte.id,
          boutique_id: boutique.id,
          role: "gerant",
          nom: "Gérant Test Invitation",
          telephone: "0199001122",
          email: emailTest,
          mot_de_passe_hash: null,
          statut: "en_attente",
          deux_fa_active: false,
        },
      });

      await tx.tokens_invitation.create({
        data: {
          utilisateur_id: user.id,
          token_hash: tokenHash,
          date_expiration: dateExpiration,
        },
      });

      return user;
    });

    utilisateurTestId = employe.id;
    expect(employe.id).toBeDefined();
    expect(employe.statut).toBe("en_attente");
    expect(employe.mot_de_passe_hash).toBeNull();

    const tokenDb = await prisma.tokens_invitation.findUnique({
      where: { utilisateur_id: employe.id },
    });
    expect(tokenDb).not.toBeNull();
    expect(tokenDb?.token_hash).toBe(tokenHash);
    expect(tokenDb?.date_expiration.getTime()).toBeGreaterThan(Date.now() + 47 * 3600 * 1000);
  });

  it("doit permettre de rafraîchir le token lors d'un renvoi d'invitation", async () => {
    if (!utilisateurTestId) return;

    const nouveauRawToken = crypto.randomBytes(32).toString("hex");
    const nouveauTokenHash = crypto.createHash("sha256").update(nouveauRawToken).digest("hex");
    const nouvelleExpiration = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const updated = await prisma.tokens_invitation.update({
      where: { utilisateur_id: utilisateurTestId },
      data: {
        token_hash: nouveauTokenHash,
        date_expiration: nouvelleExpiration,
      },
    });

    expect(updated.token_hash).toBe(nouveauTokenHash);
  });
});
