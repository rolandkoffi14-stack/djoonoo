import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";

const SUPERADMIN_AUTH_SECRET =
  process.env.SUPERADMIN_AUTH_SECRET ||
  process.env.AUTH_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  "djoonoo-superadmin-secret-must-be-configured-securely-32chars";
const KEY = new TextEncoder().encode(SUPERADMIN_AUTH_SECRET);
export const SUPERADMIN_COOKIE_NAME = "djoonoo_superadmin_session";

export interface SuperAdminSessionPayload {
  superAdminId: string;
  email: string;
  deuxFaVerifiee: boolean;
}

/**
 * Hachage de mot de passe Super-Admin
 */
export async function hashSuperAdminPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Vérification de mot de passe Super-Admin
 */
export async function verifySuperAdminPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Création d'un token JWT Super-Admin hermétique
 */
export async function createSuperAdminSessionToken(payload: SuperAdminSessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("2d") // Session plus courte pour la sécurité plateforme
    .sign(KEY);
}

/**
 * Vérification du token JWT Super-Admin
 */
export async function verifySuperAdminSessionToken(token: string): Promise<SuperAdminSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, KEY, {
      algorithms: ["HS256"],
    });
    return payload as unknown as SuperAdminSessionPayload;
  } catch {
    return null;
  }
}

/**
 * Dépose le cookie de session Super-Admin
 */
export async function setSuperAdminSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SUPERADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 2, // 2 jours
  });
}

/**
 * Récupère la session Super-Admin active
 */
export async function getSuperAdminSession(): Promise<SuperAdminSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SUPERADMIN_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySuperAdminSessionToken(token);
}

/**
 * Supprime la session Super-Admin active
 */
export async function destroySuperAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SUPERADMIN_COOKIE_NAME);
}

/**
 * Génère le secret TOTP pour le Super-Admin
 */
export function generateSuperAdminTotpSecret(): string {
  return generateSecret();
}

/**
 * Génère le QR code TOTP pour application d'authentification (Google Auth / Authy)
 */
export async function generateSuperAdminTotpQrCode(secret: string, email: string): Promise<string> {
  const otpauth = generateURI({
    issuer: "djoonoo Super-Admin",
    label: email,
    secret,
  });
  return QRCode.toDataURL(otpauth);
}

/**
 * Vérifie le code TOTP à 6 chiffres
 */
export function verifySuperAdminTotp(code: string, secret: string): boolean {
  try {
    const result = verifySync({
      token: code.trim(),
      secret: secret.trim(),
      epochTolerance: 300,
    });
    return result.valid;
  } catch {
    return false;
  }
}
