export function verifierStatutAbonnementPourEcriture(statut: string | undefined): {
  autorise: boolean;
  erreur?: string;
} {
  if (statut === "expire") {
    return {
      autorise: false,
      erreur:
        "Action impossible : ton abonnement djoonoo a expiré. Ton compte est en mode consultation. Choisis un forfait et effectue ton règlement pour reprendre tes ventes et la gestion de tes stocks.",
    };
  }
  if (statut === "suspendu") {
    return {
      autorise: false,
      erreur: "Action refusée : ton compte djoonoo est suspendu pour motif administratif.",
    };
  }
  if (statut === "resilie") {
    return {
      autorise: false,
      erreur: "Ton compte a été résilié. Contacte le support pour le réactiver.",
    };
  }
  return { autorise: true };
}
