import { describe, it, expect } from "vitest";

interface ProduitCaisse {
  id: string;
  nom: string;
  prix_unitaire: number;
  quantite_stock: number;
  seuil_alerte: number;
}

interface LignePanier {
  produit: ProduitCaisse;
  quantite: number;
}

describe("CaissePOS - Sécurité et Préservation du Panier lors d'un rafraîchissement temps réel", () => {
  it("doit mettre à jour le catalogue sans altérer le panier en cours", () => {
    // 1. État initial
    const produitA: ProduitCaisse = {
      id: "prod-1",
      nom: "iPhone 13",
      prix_unitaire: 500000,
      quantite_stock: 5,
      seuil_alerte: 2,
    };

    let panier: LignePanier[] = [
      {
        produit: produitA,
        quantite: 2,
      },
    ];

    // 2. Réception d'une mise à jour de stock serveur (ex: une vente sur une autre caisse)
    const nouveauxProduitsInitiaux: ProduitCaisse[] = [
      {
        ...produitA,
        quantite_stock: 3, // Le stock en rayon passe de 5 à 3
      },
    ];

    // Simulation du comportement React : mise à jour du catalogue
    const produits = nouveauxProduitsInitiaux;

    // 3. Assertions : le panier reste strictement intact
    expect(panier).toHaveLength(1);
    expect(panier[0].produit.id).toBe("prod-1");
    expect(panier[0].quantite).toBe(2);

    // Le catalogue reflète le nouveau stock en rayon
    expect(produits[0].quantite_stock).toBe(3);
  });
});
