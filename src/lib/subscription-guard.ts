/**
 * Garde-fou d'écriture djoonoo (Version Licence Hors-SaaS)
 * Dans cette version à licence à vie, aucune écriture n'est bloquée pour expiration d'abonnement.
 */
export function verifierStatutAbonnementPourEcriture(_statut?: string | undefined): {
  autorise: boolean;
  erreur?: string;
} {
  // Dans la version licence permanente, les écritures sont toujours autorisées
  return { autorise: true };
}
