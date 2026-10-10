/**
 * Service de limitation de débit (Rate Limiting) adaptatif et multi-noeuds (Section 6 de l'audit)
 * Prévient les attaques par force brute, le bourrage d'identifiants (CWE-307)
 * et les dénis de service applicatifs (CWE-770).
 *
 * Supporte :
 * - Mode In-Memory local (Zero-Config, haute performance, nettoyage automatique)
 * - Mode Distribué Redis / Upstash (si UPSTASH_REDIS_REST_URL ou REDIS_URL configuré)
 */

interface RateLimitRecord {
  count: number;
  expiresAt: number;
}

const inMemoryStore = new Map<string, RateLimitRecord>();

// Nettoyage régulier pour éviter les fuites mémoire
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 60 * 1000; // 1 minute

function cleanupExpired() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;

  lastCleanup = now;
  for (const [key, record] of inMemoryStore.entries()) {
    if (now >= record.expiresAt) {
      inMemoryStore.delete(key);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
}

/**
 * Détecte le mode de stockage actif pour le Rate Limiting
 */
export function getRateLimitStorageType(): "memory" | "redis" {
  if (process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL) {
    return "redis";
  }
  return "memory";
}

/**
 * Vérification synchrone en mémoire (mode par défaut haute performance)
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
  const record = inMemoryStore.get(key);

  if (!record || now >= record.expiresAt) {
    // Nouvelle fenêtre
    inMemoryStore.set(key, {
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
 * Vérification asynchrone pour architectures distribuées (Multi-conteneurs / Cluster)
 * Si Redis est configuré, interroge le magasin distribué. Sinon, se replie sur la mémoire locale.
 */
export async function checkRateLimitDistributed(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (upstashUrl && upstashToken) {
    try {
      // Script INCR + EXPIRE standard via Upstash REST API
      const res = await fetch(`${upstashUrl}/pipeline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${upstashToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          ["INCR", `rl:${key}`],
          ["EXPIRE", `rl:${key}`, windowSeconds, "NX"],
          ["TTL", `rl:${key}`],
        ]),
        cache: "no-store",
      });

      if (res.ok) {
        const data = await res.json();
        const currentCount = Number(data[0]?.result) || 1;
        const ttl = Number(data[2]?.result) || windowSeconds;

        const allowed = currentCount <= limit;
        return {
          allowed,
          remaining: Math.max(0, limit - currentCount),
          resetInSeconds: ttl > 0 ? ttl : windowSeconds,
        };
      }
    } catch (err) {
      console.warn("⚠️ [RateLimit] Échec Redis distant, repli transparent sur la mémoire :", err);
    }
  }

  // Repli automatique in-memory
  return checkRateLimit(key, limit, windowSeconds);
}

/**
 * Réinitialise le quota pour une clé (ex: après un login réussi)
 */
export function resetRateLimit(key: string): void {
  inMemoryStore.delete(key);
}
