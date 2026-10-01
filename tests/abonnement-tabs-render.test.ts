import { describe, it, expect } from "vitest";
import { determinerBoutonActionPrincipal, evaluerCompatibiliteForfait } from "../src/lib/subscription-quotas";

describe("Logique de Rendu des Onglets et Boutons de l'Espace Abonnement", () => {
  it("génère les libellés de boutons standards attendus pour chaque statut sans divergence", () => {
    // Essai
    expect(determinerBoutonActionPrincipal({ statutAbonnement: "essai" }).boutonPrincipal).toBe("Choisir mon forfait");

    // Actif
    expect(determinerBoutonActionPrincipal({ statutAbonnement: "actif" }).boutonPrincipal).toBe("Changer de formule");

    // Impayé
    expect(determinerBoutonActionPrincipal({ statutAbonnement: "impaye" }).boutonPrincipal).toBe("Renouveler maintenant");

    // Expiré
    expect(determinerBoutonActionPrincipal({ statutAbonnement: "expire" }).boutonPrincipal).toBe("Réactiver mon compte");
  });

  it("vérifie que le bouton de renouvellement complémentaire apparaît uniquement si échéance < 7 jours", () => {
    const dans4Jours = new Date(Date.now() + 4 * 86400000).toISOString();
    const resUrgent = determinerBoutonActionPrincipal({
      statutAbonnement: "actif",
      dateFinPeriode: dans4Jours,
    });
    expect(resUrgent.boutonRenouvelerSecondaire).toBe(true);

    const dans20Jours = new Date(Date.now() + 20 * 86400000).toISOString();
    const resLointain = determinerBoutonActionPrincipal({
      statutAbonnement: "actif",
      dateFinPeriode: dans20Jours,
    });
    expect(resLointain.boutonRenouvelerSecondaire).toBe(false);
  });

  it("garantit le blocage de quota universel sur les forfaits inférieurs", () => {
    const res = evaluerCompatibiliteForfait({
      nbBoutiquesActives: 2,
      forfaitMaxBoutiques: 1, // Solo
    });
    expect(res.compatible).toBe(false);
    expect(res.surcroit).toBe(1);
  });
});
