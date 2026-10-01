/**
 * Moteur Métier : Évaluation des Quotas et Libellés Dynamiques pour l'Espace Abonnement
 * djoonoo - Cycle de vie SaaS & conformité des forfaits
 */

export interface BoutonPrincipalResult {
  boutonPrincipal: string;
  boutonRenouvelerSecondaire: boolean;
}

/**
 * Détermine le libellé exact du bouton principal d'action pour la ligne de forfait actif (Dilemme 1)
 */
export function determinerBoutonActionPrincipal(params: {
  statutAbonnement: string;
  dateFinPeriode?: string | null;
}): BoutonPrincipalResult {
  const { statutAbonnement, dateFinPeriode } = params;

  if (statutAbonnement === "essai") {
    return {
      boutonPrincipal: "Choisir mon forfait",
      boutonRenouvelerSecondaire: false,
    };
  }

  if (statutAbonnement === "impaye") {
    return {
      boutonPrincipal: "Renouveler maintenant",
      boutonRenouvelerSecondaire: false,
    };
  }

  if (statutAbonnement === "expire") {
    return {
      boutonPrincipal: "Réactiver mon compte",
      boutonRenouvelerSecondaire: false,
    };
  }

  // Statut actif
  let peutRenouveler = false;
  if (dateFinPeriode) {
    const diffJours = (new Date(dateFinPeriode).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (diffJours <= 7) {
      peutRenouveler = true;
    }
  }

  return {
    boutonPrincipal: "Changer de formule",
    boutonRenouvelerSecondaire: peutRenouveler,
  };
}

export interface CompatibiliteForfaitResult {
  compatible: boolean;
  surcroit: number;
  message?: string;
}

/**
 * Contrôle universel des quotas de boutiques actives
 * Règle stricte : si nbBoutiquesActives > forfaitMaxBoutiques, le forfait est incompatible.
 */
export function evaluerCompatibiliteForfait(params: {
  nbBoutiquesActives: number;
  forfaitMaxBoutiques: number | null;
}): CompatibiliteForfaitResult {
  const { nbBoutiquesActives, forfaitMaxBoutiques } = params;

  if (forfaitMaxBoutiques === null) {
    return { compatible: true, surcroit: 0 };
  }

  if (nbBoutiquesActives > forfaitMaxBoutiques) {
    const surcroit = nbBoutiquesActives - forfaitMaxBoutiques;
    return {
      compatible: false,
      surcroit,
      message: `Tu as ${nbBoutiquesActives} boutiques actives. Désactive ${surcroit} boutique(s) dans le menu Boutiques pour pouvoir choisir cette formule.`,
    };
  }

  return { compatible: true, surcroit: 0 };
}

export interface AffichageCarteModaleResult {
  badge: string | null;
  boutonLabel: string;
  estDesactive: boolean;
  messageIncompatibilite?: string;
}

/**
 * Détermine les badges et libellés de boutons pour les cartes de la modale de forfaits (Dilemme 2)
 */
export function determinerAffichageCarteModale(params: {
  statutAbonnement: string;
  isForfaitCompte: boolean;
  isSuperieur?: boolean;
  isInferieur?: boolean;
  isRecommande?: boolean;
  forfaitNom: string;
  compatible: boolean;
  messageIncompatibilite?: string;
}): AffichageCarteModaleResult {
  const {
    statutAbonnement,
    isForfaitCompte,
    isSuperieur,
    isInferieur,
    isRecommande,
    forfaitNom,
    compatible,
    messageIncompatibilite,
  } = params;

  if (!compatible) {
    return {
      badge: null,
      boutonLabel: isInferieur ? `Revenir à ${forfaitNom}` : `Passer à ${forfaitNom}`,
      estDesactive: true,
      messageIncompatibilite,
    };
  }

  if (statutAbonnement === "essai") {
    let badge: string | null = null;
    if (isForfaitCompte) {
      badge = "Forfait actuel";
    } else if (isRecommande) {
      badge = "Recommandé";
    }

    return {
      badge,
      boutonLabel: "Activer ce forfait",
      estDesactive: false,
    };
  }

  if (statutAbonnement === "actif") {
    if (isForfaitCompte) {
      return {
        badge: "Forfait actuel",
        boutonLabel: "Prolonger",
        estDesactive: false,
      };
    }
    if (isSuperieur) {
      return {
        badge: null,
        boutonLabel: `Passer à ${forfaitNom}`,
        estDesactive: false,
      };
    }
    return {
      badge: null,
      boutonLabel: `Revenir à ${forfaitNom}`,
      estDesactive: false,
    };
  }

  if (statutAbonnement === "impaye") {
    if (isForfaitCompte) {
      return {
        badge: "Forfait impayé",
        boutonLabel: "Régulariser",
        estDesactive: false,
      };
    }
    return {
      badge: null,
      boutonLabel: `Passer à ${forfaitNom}`,
      estDesactive: false,
    };
  }

  if (statutAbonnement === "expire") {
    if (isForfaitCompte) {
      return {
        badge: "Forfait expiré",
        boutonLabel: "Réactiver",
        estDesactive: false,
      };
    }
    return {
      badge: null,
      boutonLabel: `Passer à ${forfaitNom}`,
      estDesactive: false,
    };
  }

  return {
    badge: null,
    boutonLabel: `Choisir ${forfaitNom}`,
    estDesactive: false,
  };
}
