/**
 * Utilitaire d'assainissement des erreurs serveur (Phase 6 - Items 1.4 & 4.5 de l'audit)
 * Intercepte et filtre les erreurs pour ne jamais exposer de traces SQL,
 * d'adresses d'hôtes de bases de données ou de structures internes aux utilisateurs.
 */

export function formatSafeError(
  error: unknown,
  fallbackMessage = "Une erreur est survenue lors du traitement."
): string {
  if (!error) return fallbackMessage;

  const rawMessage =
    typeof error === "string"
      ? error
      : error instanceof Error
      ? error.message
      : String(error);

  // Détection des erreurs de contrainte d'unicité Prisma (P2002)
  if (
    rawMessage.includes("Unique constraint") ||
    rawMessage.includes("P2002") ||
    rawMessage.includes("duplicate key")
  ) {
    return "Cet enregistrement existe déjà dans la base de données.";
  }

  // Détection des pannes de connexion / infrastructure (Supabase, Postgres, PgBouncer)
  if (
    rawMessage.includes("Can't reach database") ||
    rawMessage.includes("Connection refused") ||
    rawMessage.includes("pooler.supabase") ||
    rawMessage.includes("ECONNREFUSED") ||
    rawMessage.includes("ETIMEDOUT") ||
    rawMessage.includes("timeout")
  ) {
    return "Service temporairement indisponible. Veuillez réessayer plus tard.";
  }

  // Détection des requêtes SQL brutes ou invocations Prisma
  if (
    rawMessage.includes("prisma.") ||
    rawMessage.includes("SELECT ") ||
    rawMessage.includes("INSERT ") ||
    rawMessage.includes("UPDATE ") ||
    rawMessage.includes("DELETE ") ||
    rawMessage.includes("Syntax error") ||
    rawMessage.includes("Foreign key")
  ) {
    return fallbackMessage;
  }

  // Message fonctionnel considéré comme sûr
  return rawMessage || fallbackMessage;
}
