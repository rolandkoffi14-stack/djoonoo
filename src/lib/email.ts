import { Resend } from "resend";

export interface InvitationEmailPayload {
  destinataire: string;
  nom: string;
  role: "gerant" | "vendeur";
  nomEntreprise: string;
  boutiqueNom: string;
  lienInvitation: string;
}

export interface EnvoiEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  mode?: "resend" | "log";
}

/**
 * Génère le gabarit HTML responsive et brandé djoonoo pour l'invitation d'un collaborateur
 */
export function genererHtmlInvitation(payload: InvitationEmailPayload): string {
  const { nom, role, nomEntreprise, boutiqueNom, lienInvitation } = payload;
  const roleLibelle = role === "gerant" ? "Gérant de boutique" : "Vendeur de boutique";

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation djoonoo</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF6F1; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #2B2119;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FAF6F1; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #FFFFFF; border: 1px solid #E5DACF; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 12px rgba(43, 33, 25, 0.05);">
          <!-- En-tête avec marque -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #FAF6F1; background-color: #FAF6F1;">
              <span style="font-size: 26px; font-weight: 900; letter-spacing: -0.5px; color: #2B2119;">djoo<span style="color: #C1652D;">noo</span></span>
              <div style="font-size: 11px; font-weight: 700; color: #8C7A6B; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px;">Gestion commerciale & Encaissement</div>
            </td>
          </tr>

          <!-- Corps du message -->
          <tr>
            <td style="padding: 32px 32px 24px;">
              <h1 style="font-size: 20px; font-weight: 800; color: #2B2119; margin: 0 0 16px;">
                Bonjour ${nom},
              </h1>
              <p style="font-size: 14px; line-height: 1.6; color: #6D5D52; margin: 0 0 20px;">
                Vous avez été invité(e) par l'entreprise <strong>${nomEntreprise}</strong> à rejoindre leur équipe commerciale sur la plateforme djoonoo.
              </p>

              <!-- Carte récapitulative du poste -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FAF6F1; border: 1px solid #E5DACF; border-radius: 14px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <div style="font-size: 11px; font-weight: 700; color: #8C7A6B; text-transform: uppercase; margin-bottom: 4px;">Rôle attribué</div>
                    <div style="font-size: 14px; font-weight: 800; color: #C1652D;">${roleLibelle}</div>
                    <div style="font-size: 12px; color: #6D5D52; margin-top: 2px;">Boutique : <strong>${boutiqueNom}</strong></div>
                  </td>
                </tr>
              </table>

              ${
                role === "gerant"
                  ? `<div style="padding: 12px 16px; background-color: #EFF6FF; border-left: 4px solid #2563EB; border-radius: 8px; font-size: 12px; color: #1E40AF; margin-bottom: 24px; line-height: 1.5;">
                      <strong>Sécurité 2FA obligatoire :</strong> En tant que Gérant, vous configurerez votre application d'authentification (Google Authenticator ou Authy) lors de la validation de votre invitation.
                    </div>`
                  : ""
              }

              <p style="font-size: 14px; line-height: 1.6; color: #6D5D52; margin: 0 0 24px;">
                Pour activer votre compte et définir votre mot de passe personnel, cliquez sur le bouton ci-dessous :
              </p>

              <!-- Bouton d'action principal -->
              <div style="text-align: center; margin: 28px 0;">
                <a href="${lienInvitation}" target="_blank" style="display: inline-block; background-color: #C1652D; color: #FAF6F1; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 12px; box-shadow: 0 2px 6px rgba(193, 101, 45, 0.25);">
                  Activer mon compte collaborateur
                </a>
              </div>

              <!-- Avertissement expiration -->
              <p style="font-size: 12px; color: #8C7A6B; text-align: center; margin: 0 0 24px;">
                Ce lien d'invitation est strictement personnel et expire dans <strong>48 heures</strong>.
              </p>

              <hr style="border: none; border-top: 1px solid #E5DACF; margin: 24px 0 16px;">

              <p style="font-size: 11px; color: #8C7A6B; line-height: 1.5; margin: 0;">
                Si le bouton ne fonctionne pas, copiez-collez l'adresse suivante dans votre navigateur :<br>
                <a href="${lienInvitation}" style="color: #C1652D; word-break: break-all;">${lienInvitation}</a>
              </p>
            </td>
          </tr>

          <!-- Pied de page -->
          <tr>
            <td style="padding: 20px 32px; background-color: #FAF6F1; text-align: center; border-top: 1px solid #E5DACF; font-size: 11px; color: #8C7A6B;">
              © 2026 djoonoo. Tous droits réservés.<br>
              Plateforme SaaS d'encaissement et de gestion commerciale.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Envoie un email d'invitation via Resend avec repli automatique en mode console/dev
 */
export async function envoyerEmailInvitation(
  payload: InvitationEmailPayload
): Promise<EnvoiEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;

  // Si pas de clé Resend (local/tests/dev) : mode console résilient
  if (!apiKey || apiKey === "test_key") {
    console.info("✉️ [EMAIL LOCAL / DEV] Invitation djoonoo vers :", payload.destinataire);
    console.info("🔗 Lien d'activation généré :", payload.lienInvitation);
    return {
      success: true,
      mode: "log",
    };
  }

  try {
    const resend = new Resend(apiKey);
    const expediteur =
      process.env.EMAIL_FROM ||
      process.env.RESEND_FROM_EMAIL ||
      "djoonoo <notifications@djoonoo.2krdigital.online>";
    const sujet = `Invitation à rejoindre l'équipe de ${payload.nomEntreprise} sur djoonoo`;
    const html = genererHtmlInvitation(payload);

    console.info(`📧 Envoi email invitation vers ${payload.destinataire} depuis ${expediteur}...`);

    const { data, error } = await resend.emails.send({
      from: expediteur,
      to: [payload.destinataire],
      subject: sujet,
      html,
    });

    if (error) {
      console.error("❌ Erreur API Resend :", error);
      return {
        success: false,
        error: error.message || "Échec de l'envoi de l'email d'invitation via Resend.",
      };
    }

    console.info(`✅ Email invitation envoyé avec succès à ${payload.destinataire} (ID: ${data?.id})`);

    return {
      success: true,
      messageId: data?.id,
      mode: "resend",
    };
  } catch (err: any) {
    console.error("❌ Exception envoyerEmailInvitation :", err);
    return {
      success: false,
      error: err.message || "Erreur interne lors de l'envoi de l'email.",
    };
  }
}
