import crypto from "crypto";
import { prisma } from "./prisma";

export interface LicensePayload {
  nomEntreprise: string;
  type: "lifetime";
  maxBoutiques: number | null; // null = illimité, 1 = mono-boutique, 3 = réseau, etc.
  dateAchat: string; // ISO ou YYYY-MM-DD
  codeClient?: string;
}

export interface VerificationLicenceResult {
  valide: boolean;
  payload?: LicensePayload;
  erreur?: string;
}

const DEFAULT_MASTER_SECRET =
  process.env.DJOONOO_LICENSE_SECRET ||
  "djoonoo_editeur_master_secret_2krdigital_2026_licence_a_vie";

/**
 * Génère une clé de licence officielle djoonoo (utilisé par l'éditeur lors de la vente cash)
 */
export function genererCleLicence(
  payload: LicensePayload,
  masterSecret: string = DEFAULT_MASTER_SECRET
): string {
  const payloadStr = JSON.stringify({
    ...payload,
    nomEntreprise: payload.nomEntreprise.trim().toUpperCase(),
  });
  const payloadBase64 = Buffer.from(payloadStr, "utf-8").toString("base64url");
  const signature = crypto
    .createHmac("sha256", masterSecret)
    .update(payloadBase64)
    .digest("hex");

  return `DJN-LFT.${payloadBase64}.${signature}`;
}

/**
 * Vérifie l'authenticité et la validité d'une clé de licence djoonoo
 */
export function verifierCleLicence(
  cleLicence: string,
  nomEntrepriseAttendue?: string,
  masterSecret: string = DEFAULT_MASTER_SECRET
): VerificationLicenceResult {
  if (!cleLicence || typeof cleLicence !== "string") {
    return { valide: false, erreur: "Clé de licence absente ou invalide." };
  }

  const parts = cleLicence.trim().split(".");
  if (parts.length !== 3 || parts[0] !== "DJN-LFT") {
    return { valide: false, erreur: "Format de clé de licence djoonoo invalide." };
  }

  const [, payloadBase64, signatureRecue] = parts;

  // 1. Vérification de la signature HMAC SHA-256
  const signatureCalculee = crypto
    .createHmac("sha256", masterSecret)
    .update(payloadBase64)
    .digest("hex");

  if (signatureRecue.length !== signatureCalculee.length) {
    return { valide: false, erreur: "Signature cryptographique de licence corrompue." };
  }

  const estValide = crypto.timingSafeEqual(
    Buffer.from(signatureRecue, "hex"),
    Buffer.from(signatureCalculee, "hex")
  );

  if (!estValide) {
    return { valide: false, erreur: "Clé de licence contrefaite ou signature invalide." };
  }

  // 2. Décodage du contenu
  try {
    const payloadStr = Buffer.from(payloadBase64, "base64url").toString("utf-8");
    const payload: LicensePayload = JSON.parse(payloadStr);

    if (payload.type !== "lifetime") {
      return { valide: false, erreur: "Type de licence non conforme." };
    }

    // 3. Vérification de correspondance avec le nom de l'entreprise
    if (nomEntrepriseAttendue) {
      const normaliser = (s: string) => s.trim().toUpperCase().replace(/\s+/g, " ");
      if (normaliser(payload.nomEntreprise) !== normaliser(nomEntrepriseAttendue)) {
        return {
          valide: false,
          erreur: `Cette clé de licence a été émise pour l'entreprise "${payload.nomEntreprise}" et ne correspond pas à "${nomEntrepriseAttendue}".`,
        };
      }
    }

    return { valide: true, payload };
  } catch {
    return { valide: false, erreur: "Impossible de décoder les paramètres de la licence." };
  }
}

/**
 * Récupère les informations de licence active du compte
 */
export async function getLicenceActive(): Promise<{
  active: boolean;
  nomEntreprise?: string;
  maxBoutiques: number | null;
  cle?: string;
  erreur?: string;
}> {
  try {
    // 1. Chercher dans les paramètres de plateforme ou dans la variable d'environnement
    const param = await prisma.parametres_plateforme.findUnique({
      where: { cle: "cle_licence" },
    });
    const cle = param?.valeur || process.env.LICENSE_KEY;

    if (!cle) {
      return {
        active: false,
        maxBoutiques: 1,
        erreur: "Aucune clé de licence enregistrée sur cette instance.",
      };
    }

    // Récupérer le compte unique
    const compte = await prisma.comptes.findFirst({
      select: { nom_entreprise: true },
    });

    const res = verifierCleLicence(cle, compte?.nom_entreprise);
    if (!res.valide || !res.payload) {
      return {
        active: false,
        maxBoutiques: 1,
        cle,
        erreur: res.erreur,
      };
    }

    return {
      active: true,
      nomEntreprise: res.payload.nomEntreprise,
      maxBoutiques: res.payload.maxBoutiques,
      cle,
    };
  } catch (err: any) {
    return {
      active: false,
      maxBoutiques: 1,
      erreur: err?.message || "Erreur lors de la lecture de la licence.",
    };
  }
}

