/**
 * Service de limitation de débit (Rate Limiting) côté serveur (Section 6 de l'audit)
 * Prévient les attaques par force brute, le bourrage d'identifiants (CWE-307)
 * et les dénis de service applicatifs (CWE-770).
 */

interface RateLimitRecord {
  count: number;
  expiresAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Nettoyage régulier pour éviter les fuites mémoire
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 60 * 1000; // 1 minute

function cleanupExpired() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;

  lastCleanup = now;
  for (const [key, record] of rateLimitStore.entries()) {
    if (now >= record.expiresAt) {
      rateLimitStore.delete(key);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
}

/**
 * Vérifie et incrémente le compteur de requêtes pour une clé donnée.
 *
 * @param key Identifiant de limitation (ex: `login:ip`, `totp:userId`, `pdf:compteId`)
 * @param limit Nombre maximal de requêtes autorisées sur la période
 * @param windowSeconds Durée de la fenêtre en secondes
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): RateLimitResult {
  cleanupExpired();

  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const record = rateLimitStore.get(key);

  if (!record || now >= record.expiresAt) {
    // Nouvelle fenêtre
    rateLimitStore.set(key, {
      count: 1,
      expiresAt: now + windowMs,
    });
    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      resetInSeconds: windowSeconds,
    };
  }

  // Fenêtre en cours
  if (record.count >= limit) {
    const remainingSeconds = Math.max(1, Math.ceil((record.expiresAt - now) / 1000));
    return {
      allowed: false,
      remaining: 0,
      resetInSeconds: remainingSeconds,
    };
  }

  record.count += 1;
  const remainingSeconds = Math.max(1, Math.ceil((record.expiresAt - now) / 1000));

  return {
    allowed: true,
    remaining: Math.max(0, limit - record.count),
    resetInSeconds: remainingSeconds,
  };
}

/**
 * Réinitialise manuellement le quota pour une clé (ex: après un login réussi)
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}
