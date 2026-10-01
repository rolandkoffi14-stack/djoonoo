import { describe, it, expect } from "vitest";
import {
  evaluerCompatibiliteForfait,
  determinerBoutonActionPrincipal,
  determinerAffichageCarteModale,
} from "../src/lib/subscription-quotas";

describe("Moteur Quotas & Libellés Dynamiques d'Abonnement", () => {
  describe("Dilemme 1 : Bouton d'action principal de la ligne de forfait", () => {
    it("doit retourner 'Choisir mon forfait' pour un compte en essai", () => {
      const res = determinerBoutonActionPrincipal({ statutAbonnement: "essai" });
      expect(res.boutonPrincipal).toBe("Choisir mon forfait");
      expect(res.boutonRenouvelerSecondaire).toBe(false);
    });

    it("doit retourner 'Changer de formule' pour un compte actif avec échéance lointaine (> 7j)", () => {
      const dans15Jours = new Date(Date.now() + 15 * 86400000).toISOString();
      const res = determinerBoutonActionPrincipal({
        statutAbonnement: "actif",
        dateFinPeriode: dans15Jours,
      });
      expect(res.boutonPrincipal).toBe("Changer de formule");
      expect(res.boutonRenouvelerSecondaire).toBe(false);
    });

    it("doit proposer 'Renouveler' en complément si compte actif et échéance < 7j", () => {
      const dans3Jours = new Date(Date.now() + 3 * 86400000).toISOString();
      const res = determinerBoutonActionPrincipal({
        statutAbonnement: "actif",
        dateFinPeriode: dans3Jours,
      });
      expect(res.boutonPrincipal).toBe("Changer de formule");
      expect(res.boutonRenouvelerSecondaire).toBe(true);
    });

    it("doit retourner 'Renouveler maintenant' pour un compte en impayé", () => {
      const res = determinerBoutonActionPrincipal({ statutAbonnement: "impaye" });
      expect(res.boutonPrincipal).toBe("Renouveler maintenant");
      expect(res.boutonRenouvelerSecondaire).toBe(false);
    });

    it("doit retourner 'Réactiver mon compte' pour un compte expiré", () => {
      const res = determinerBoutonActionPrincipal({ statutAbonnement: "expire" });
      expect(res.boutonPrincipal).toBe("Réactiver mon compte");
      expect(res.boutonRenouvelerSecondaire).toBe(false);
    });
  });

  describe("Contrôle Universel des Quotas", () => {
    it("doit autoriser un forfait si nbBoutiquesActives <= max_boutiques", () => {
      const evalRes = evaluerCompatibiliteForfait({
        nbBoutiquesActives: 1,
        forfaitMaxBoutiques: 1,
      });
      expect(evalRes.compatible).toBe(true);
      expect(evalRes.surcroit).toBe(0);
    });

    it("doit BLOQUER un forfait si nbBoutiquesActives > max_boutiques avec consigne claire", () => {
      const evalRes = evaluerCompatibiliteForfait({
        nbBoutiquesActives: 3,
        forfaitMaxBoutiques: 1,
      });
      expect(evalRes.compatible).toBe(false);
      expect(evalRes.surcroit).toBe(2);
      expect(evalRes.message).toContain("Désactive 2 boutique(s)");
    });

    it("doit toujours autoriser un forfait avec max_boutiques = null (illimité)", () => {
      const evalRes = evaluerCompatibiliteForfait({
        nbBoutiquesActives: 10,
        forfaitMaxBoutiques: null,
      });
      expect(evalRes.compatible).toBe(true);
    });
  });

  describe("Dilemme 2 : Cartes et libellés dans la modale", () => {
    it("en essai : affiche 'Activer ce forfait' et badge 'Forfait actuel' sur le forfait d'inscription", () => {
      const carte = determinerAffichageCarteModale({
        statutAbonnement: "essai",
        isForfaitCompte: true,
        forfaitNom: "Solo",
        compatible: true,
      });
      expect(carte.badge).toBe("Forfait actuel");
      expect(carte.boutonLabel).toBe("Activer ce forfait");
      expect(carte.estDesactive).toBe(false);
    });

    it("en essai sur forfait recommandé : badge 'Recommandé' et bouton 'Activer ce forfait'", () => {
      const carte = determinerAffichageCarteModale({
        statutAbonnement: "essai",
        isForfaitCompte: false,
        isRecommande: true,
        forfaitNom: "Réseau",
        compatible: true,
      });
      expect(carte.badge).toBe("Recommandé");
      expect(carte.boutonLabel).toBe("Activer ce forfait");
      expect(carte.estDesactive).toBe(false);
    });

    it("en actif sur son forfait : badge 'Forfait actuel' et bouton 'Prolonger'", () => {
      const carte = determinerAffichageCarteModale({
        statutAbonnement: "actif",
        isForfaitCompte: true,
        forfaitNom: "Réseau",
        compatible: true,
      });
      expect(carte.badge).toBe("Forfait actuel");
      expect(carte.boutonLabel).toBe("Prolonger");
    });

    it("en actif sur forfait supérieur : bouton 'Passer à Empire'", () => {
      const carte = determinerAffichageCarteModale({
        statutAbonnement: "actif",
        isForfaitCompte: false,
        isSuperieur: true,
        forfaitNom: "Empire",
        compatible: true,
      });
      expect(carte.badge).toBeNull();
      expect(carte.boutonLabel).toBe("Passer à Empire");
    });

    it("en actif sur forfait inférieur compatible : bouton 'Revenir à Solo'", () => {
      const carte = determinerAffichageCarteModale({
        statutAbonnement: "actif",
        isForfaitCompte: false,
        isInferieur: true,
        forfaitNom: "Solo",
        compatible: true,
      });
      expect(carte.badge).toBeNull();
      expect(carte.boutonLabel).toBe("Revenir à Solo");
      expect(carte.estDesactive).toBe(false);
    });

    it("en impayé : badge 'Forfait impayé' et bouton 'Régulariser'", () => {
      const carte = determinerAffichageCarteModale({
        statutAbonnement: "impaye",
        isForfaitCompte: true,
        forfaitNom: "Réseau",
        compatible: true,
      });
      expect(carte.badge).toBe("Forfait impayé");
      expect(carte.boutonLabel).toBe("Régulariser");
    });

    it("en expiré : badge 'Forfait expiré' et bouton 'Réactiver'", () => {
      const carte = determinerAffichageCarteModale({
        statutAbonnement: "expire",
        isForfaitCompte: true,
        forfaitNom: "Solo",
        compatible: true,
      });
      expect(carte.badge).toBe("Forfait expiré");
      expect(carte.boutonLabel).toBe("Réactiver");
    });

    it("si incompatible par quota : bouton désactivé avec message", () => {
      const carte = determinerAffichageCarteModale({
        statutAbonnement: "actif",
        isForfaitCompte: false,
        isInferieur: true,
        forfaitNom: "Solo",
        compatible: false,
        messageIncompatibilite: "Désactive 1 boutique(s)",
      });
      expect(carte.estDesactive).toBe(true);
      expect(carte.messageIncompatibilite).toBe("Désactive 1 boutique(s)");
    });
  });
});
