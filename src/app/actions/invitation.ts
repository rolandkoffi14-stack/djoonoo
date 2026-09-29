"use server";

import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword, generateTotpSecret, generateTotpQrCode, verifyTotpCode } from "@/lib/auth";
import { enregistrerAudit } from "@/lib/business-rules";
import { RoleUtilisateur } from "@prisma/client";

export interface InfoInvitation {
  nom: string;
  email: string;
  role: RoleUtilisateur;
  nomEntreprise: string;
  boutiqueNom: string;
}

export interface VerificationTokenResult {
  success: boolean;
  error?: string;
  dejaActif?: boolean;
  invitation?: InfoInvitation;
  totp?: {
    secret: string;
    qrCode: string;
  };
}

export interface FinalisationActivationPayload {
  token: string;
  motDePasse: string;
  codeTotp?: string;
  totpSecret?: string;
}

export interface FinalisationActivationResult {
  success: boolean;
  error?: string;
}

/**
 * Vérifie la validité d'un token d'invitation (existence, expiration sous 48h, statut)
 * et prépare les éléments 2FA si le rôle est Gérant.
 */
export async function verifierTokenInvitationAction(
  rawToken: string
): Promise<VerificationTokenResult> {
  const cleanToken = rawToken?.trim();
  if (!cleanToken) {
    return { success: false, error: "Jeton d'invitation manquant." };
  }

  try {
    const tokenHash = crypto.createHash("sha256").update(cleanToken).digest("hex");

    const record = await prisma.tokens_invitation.findUnique({
      where: { token_hash: tokenHash },
      include: {
        utilisateur: {
          include: {
            compte: true,
            boutique: true,
          },
        },
      },
    });

    if (!record) {
      return {
        success: false,
        error: "Ce lien d'invitation est invalide ou n'existe plus.",
      };
    }

    const { utilisateur, date_expiration } = record;

    if (utilisateur.statut === "actif") {
      return {
        success: false,
        dejaActif: true,
        error: "Ce compte collaborateur est déjà activé. Vous pouvez vous connecter directement.",
      };
    }

    if (date_expiration.getTime() < Date.now()) {
      return {
        success: false,
        error: "Ce lien d'invitation a expiré (durée de validité : 48 heures). Veuillez contacter votre responsable afin de recevoir un nouveau lien.",
      };
    }

    const info: InfoInvitation = {
      nom: utilisateur.nom,
      email: utilisateur.email,
      role: utilisateur.role,
      nomEntreprise: utilisateur.compte.nom_entreprise,
      boutiqueNom: utilisateur.boutique?.nom || "Boutique",
    };

    // Si Gérant : générer le secret TOTP et le QR code pour la configuration 2FA autonome
    if (utilisateur.role === "gerant") {
      const totpData = generateTotpSecret(utilisateur.email);
      const qrCode = await generateTotpQrCode(totpData.otpauth);
      return {
        success: true,
        invitation: info,
        totp: {
          secret: totpData.secret,
          qrCode,
        },
      };
    }

    return {
      success: true,
      invitation: info,
    };
  } catch (err: any) {
    console.error("Erreur verifierTokenInvitationAction :", err);
    return { success: false, error: "Erreur lors de la vérification de l'invitation." };
  }
}

/**
 * Finalise l'activation du compte : validation mot de passe, vérification TOTP si gérant,
 * mise à jour du statut en 'actif' et révocation du token d'invitation.
 */
export async function finaliserActivationCompteAction(
  payload: FinalisationActivationPayload
): Promise<FinalisationActivationResult> {
  const { token, motDePasse, codeTotp, totpSecret } = payload;
  const cleanToken = token?.trim();
  const cleanMdp = motDePasse?.trim();

  if (!cleanToken) {
    return { success: false, error: "Jeton d'invitation invalide." };
  }

  if (!cleanMdp || cleanMdp.length < 8) {
    return { success: false, error: "Le mot de passe doit comporter au moins 8 caractères." };
  }

  try {
    const tokenHash = crypto.createHash("sha256").update(cleanToken).digest("hex");

    const record = await prisma.tokens_invitation.findUnique({
      where: { token_hash: tokenHash },
      include: {
        utilisateur: true,
      },
    });

    if (!record) {
      return { success: false, error: "Lien d'invitation introuvable ou déjà consommé." };
    }

    const { utilisateur, date_expiration } = record;

    if (date_expiration.getTime() < Date.now()) {
      return { success: false, error: "Ce lien a expiré. Demandez à votre responsable un renvoi d'invitation." };
    }

    // Sécurité 2FA stricte pour le rôle Gérant (Section 2 & 7)
    if (utilisateur.role === "gerant") {
      if (!codeTotp || !totpSecret) {
        return { success: false, error: "La configuration et la vérification du code 2FA sont obligatoires pour un Gérant." };
      }

      const totpValide = verifyTotpCode(codeTotp, totpSecret);
      if (!totpValide) {
        return {
          success: false,
          error: "Code d'authentification 2FA invalide. Vérifiez l'heure de votre téléphone dans Google Authenticator et réessayez.",
        };
      }
    }

    const mdpHash = await hashPassword(cleanMdp);

    await prisma.$transaction(async (tx) => {
      // 1. Mise à jour de l'utilisateur : actif avec son mot de passe
      await tx.utilisateurs.update({
        where: { id: utilisateur.id },
        data: {
          mot_de_passe_hash: mdpHash,
          statut: "actif",
          deux_fa_active: utilisateur.role === "gerant",
          deux_fa_secret: utilisateur.role === "gerant" ? totpSecret : null,
        },
      });

      // 2. Révocation du token d'invitation
      await tx.tokens_invitation.delete({
        where: { id: record.id },
      });

      // 3. Journal d'audit
      await enregistrerAudit(tx, {
        compte_id: utilisateur.compte_id,
        utilisateur_id: utilisateur.id,
        action: "activation_compte_collaborateur",
        entite_concernee: "utilisateurs",
        entite_id: utilisateur.id,
        details: {
          role: utilisateur.role,
          email: utilisateur.email,
          deux_fa_active: utilisateur.role === "gerant",
        },
      });
    });

    return { success: true };
  } catch (err: any) {
    console.error("Erreur finaliserActivationCompteAction :", err);
    return { success: false, error: "Une erreur est survenue lors de l'activation du compte." };
  }
}
