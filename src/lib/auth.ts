import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { generateSecret, generateURI, verifySync, generateSync } from "otplib";
import QRCode from "qrcode";
import { RoleUtilisateur, StatutAbonnement } from "@prisma/client";

const AUTH_SECRET = process.env.AUTH_SECRET || "djoonoo-production-secret-must-be-configured-securely-32chars";
const KEY = new TextEncoder().encode(AUTH_SECRET);
const COOKIE_NAME = "djoonoo_session";

export interface SessionPayload {
  userId: string;
  email: string;
  role: RoleUtilisateur;
  compteId: string;
  boutiqueId: string | null;
  nom: string;
  statutAbonnement: StatutAbonnement;
  deuxFaVerifiee: boolean;
}

/**
 * Hachage sécurisé de mot de passe (bcrypt)
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Vérification de mot de passe
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Création d'un token de session JWT sécurisé
 */
export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(KEY);
}

/**
 * Décodage et vérification d'un token JWT
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, KEY, {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Définit le cookie de session HttpOnly
 */
export async function setSessionCookie(payload: SessionPayload) {
  const token = await createSessionToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 jours
  });
}

/**
 * Supprime le cookie de session (déconnexion)
 */
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Récupère la session courante depuis les cookies
 */
export async function getCurrentSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

// ==========================================
// 2FA TOTP (otplib + qrcode) — Section 7 & 16.3
// ==========================================

/**
 * Génère une clé secrète TOTP et l'URL OTPAuth associée
 */
export function generateTotpSecret(email: string) {
  const secret = generateSecret();
  const otpauth = generateURI({
    issuer: "djoonoo",
    label: email,
    secret,
  });
  return { secret, otpauth };
}

/**
 * Génère un QR Code en Data URL Base64 pour l'enrôlement 2FA dans Google Authenticator/Authy
 */
export async function generateTotpQrCode(otpauthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl, {
    margin: 2,
    color: {
      dark: "#2B2119", // Couleur texte djoonoo
      light: "#FAF6F1", // Fond chaud djoonoo
    },
    width: 260,
  });
}

/**
 * Vérifie un code TOTP à 6 chiffres
 */
export function verifyTotpCode(token: string, secret: string): boolean {
  try {
    const result = verifySync({
      token: token.trim(),
      secret: secret.trim(),
      epochTolerance: 300, // Tolérance étendue à ±5 minutes pour laisser amplement le temps de copier-coller
    });
    return result.valid;
  } catch {
    return false;
  }
}

/**
 * Génère le code TOTP actuel à 6 chiffres pour un secret donné
 */
export function generateTotpCode(secret: string): string {
  return generateSync({ secret: secret.trim() });
}
