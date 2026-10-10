/**
 * Hook d'instrumentation Next.js (Boot Fail-Fast)
 * Exécuté une seule fois côté serveur au démarrage de Next.js pour valider
 * immédiatement les variables d'environnement critiques et les secrets cryptographiques.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnv } = await import("@/lib/env");
    validateEnv();
  }
}
