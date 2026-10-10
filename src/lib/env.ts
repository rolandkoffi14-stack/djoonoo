/**
 * Validation centralisée des variables d'environnement au démarrage (Fail-Fast)
 * et gestionnaires sécurisés de secrets sans repli codé en dur (anti CWE-798).
 */

export function getJwtSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error(
      "[SÉCURITÉ CRITIQUE] AUTH_SECRET (ou NEXTAUTH_SECRET) est manquant. L'application refuse de démarrer avec un secret vide ou par défaut."
    );
  }
  if (secret.length < 32) {
    throw new Error(
      `[SÉCURITÉ CRITIQUE] AUTH_SECRET doit comporter au moins 32 caractères pour garantir une sécurité cryptographique suffisante (actuel: ${secret.length} car.).`
    );
  }
  return new TextEncoder().encode(secret);
}

export function getSuperAdminJwtSecret(): Uint8Array {
  const secret =
    process.env.SUPERADMIN_AUTH_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET;

  if (!secret) {
    throw new Error(
      "[SÉCURITÉ CRITIQUE] SUPERADMIN_AUTH_SECRET (ou AUTH_SECRET) est manquant. Impossible de sécuriser la console Super-Admin."
    );
  }
  if (secret.length < 32) {
    throw new Error(
      `[SÉCURITÉ CRITIQUE] SUPERADMIN_AUTH_SECRET doit comporter au moins 32 caractères (actuel: ${secret.length} car.).`
    );
  }
  return new TextEncoder().encode(secret);
}

export function getCronSecret(): string {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    throw new Error(
      "[SÉCURITÉ CRITIQUE] CRON_SECRET est manquant dans l'environnement. Impossible d'autoriser les déclenchements de tâches planifiées."
    );
  }
  if (secret.length < 16) {
    throw new Error(
      `[SÉCURITÉ CRITIQUE] CRON_SECRET doit comporter au moins 16 caractères (actuel: ${secret.length} car.).`
    );
  }
  return secret;
}

export function validateEnv() {
  const isTest = process.env.NODE_ENV === "test";

  // En test, si DATABASE_URL est déjà configuré, on valide les secrets clés
  const requiredVars = [
    "DATABASE_URL",
    "AUTH_SECRET",
    "CRON_SECRET",
  ];

  for (const varName of requiredVars) {
    const val = process.env[varName];
    if (!val && !isTest) {
      throw new Error(`[SÉCURITÉ CRITIQUE] Variable d'environnement requise manquante : ${varName}`);
    }
  }

  // Vérifier la conformité des secrets
  getJwtSecret();
  if (process.env.SUPERADMIN_AUTH_SECRET) {
    getSuperAdminJwtSecret();
  }
  getCronSecret();
}
