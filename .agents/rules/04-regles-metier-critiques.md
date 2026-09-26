## 4. Règles métier critiques — traduction en instructions de code exactes

10 règles désormais (8 d'origine + 2 nouvelles suite à l'audit).

### Règle 1 — Décrémentation de stock atomique
Inchangée depuis la v1 :
```typescript
const result = await tx.$queryRaw<{ quantite_stock: number }[]>`
  UPDATE produits
  SET quantite_stock = quantite_stock - ${quantiteVendue}
  WHERE id = ${produitId} AND quantite_stock >= ${quantiteVendue}
  RETURNING quantite_stock
`;
if (result.length === 0) throw new StockInsuffisantError(produitId);
```

### Règle 2 — `boutique_id` figé sur `ventes`
Inchangée. Jamais recalculé depuis l'affectation courante du vendeur, y compris après transfert.

### Règle 3 — `prix_unitaire_a_la_vente` figé sur `lignes_vente`
Inchangée. Toute page d'historique lit `lignes_vente.prix_unitaire_a_la_vente`, jamais `produits.prix_unitaire`.

### Règle 4 — `statut_paiement` calculé automatiquement
**Tranché : transaction applicative, pas de trigger PostgreSQL** (résolution section 16, point 1) — par cohérence avec les règles 1, 7, 9 et 10, déjà toutes en transactions Prisma côté TypeScript. Une seule fonction de service `enregistrerPaiement()` : dans la même transaction, insertion du paiement puis recalcul de `SUM(paiements.montant)` pour la vente et mise à jour de `statut_paiement`. Aucun accès direct à la base hors Prisma n'existe dans cette architecture (accès Prisma exclusif, section 7) — l'argument principal en faveur d'un trigger (protéger contre un contournement applicatif) ne s'applique donc pas ici.

### Règle 5 — Isolation systématique par `compte_id`
Extension/middleware Prisma centralisé. **Simplifiée par la résolution section 16 (ex-point 2)** : `compte_id` étant désormais dénormalisé directement sur `ventes`, `produits`, `lignes_vente` et `paiements` (schéma section 3), le middleware applique un **filtre unique et uniforme** (`where: { compte_id: compteIdSession }`) sur tous ces modèles — plus de cas particulier nécessitant une jointure via `boutique_id` pour certains modèles seulement, ce qui supprime le risque d'oubli propre à une règle non uniforme.

### Règle 6 — Idempotence sur la création de vente
**Résolue depuis la v1** : `ventes.cle_idempotence` (unique, nullable) ajoutée au schéma (section 3). Implémentation : avant `INSERT`, vérifier si une vente avec cette clé existe déjà pour ce compte ; si oui, retourner la vente existante sans recréer ; sinon, poursuivre normalement. La vérification et l'insertion doivent avoir lieu dans la même transaction que la règle 7 ci-dessous, en s'appuyant sur la contrainte d'unicité de la colonne (même famille de solution que la règle 8 : laisser la contrainte de base de données faire foi plutôt qu'un `SELECT` préalable non atomique).

### Règle 7 — Numérotation des factures
Format inchangé : `FAC-{code_compte}-{code_boutique}-{annee}-{XXXXX}` (ex. `FAC-2KR-B01-2026-00042`). **Clarification de la décision A4** : `code_boutique` (`B01`, `B02`...) est désormais une numérotation séquentielle par compte (voir règle 8 bis ci-dessous pour sa génération), pas un code à 3 lettres — le reste du mécanisme transactionnel est inchangé :
```typescript
await prisma.$transaction(async (tx) => {
  const [{ dernier_numero }] = await tx.$queryRaw<{ dernier_numero: number }[]>`
    INSERT INTO compteurs_facture (id, boutique_id, annee, dernier_numero)
    VALUES (gen_random_uuid(), ${boutiqueId}, ${anneeCourante}, 1)
    ON CONFLICT (boutique_id, annee)
    DO UPDATE SET dernier_numero = compteurs_facture.dernier_numero + 1
    RETURNING dernier_numero
  `;
  const numeroFacture = `FAC-${codeCompte}-${codeBoutique}-${anneeCourante}-${String(dernier_numero).padStart(5, '0')}`;
  // + décrémentation de stock (règle 1) + calcul montant_total (règle 9) + vente.create, dans la même transaction
});
```

### Règle 8 — Génération de `comptes.code`
Inchangée : 3 lettres extraites de `nom_entreprise`, tentative d'`INSERT` directe, retry sur erreur `P2002` (contrainte d'unicité) avec régénération de suffixe.

### Règle 8 bis — Génération de `boutiques.code` (nouvelle, décision A4)
**Mécanisme différent de la règle 8** : pas d'extraction de lettres, une numérotation séquentielle par compte via un compteur atomique dédié (`compteur_boutique`, section 3) — même famille de solution que la règle 7, pas un `COUNT() + 1` applicatif :
```typescript
const [{ dernier_numero }] = await tx.$queryRaw<{ dernier_numero: number }[]>`
  INSERT INTO compteur_boutique (compte_id, dernier_numero)
  VALUES (${compteId}, 1)
  ON CONFLICT (compte_id)
  DO UPDATE SET dernier_numero = compteur_boutique.dernier_numero + 1
  RETURNING dernier_numero
`;
const codeBoutique = `B${String(dernier_numero).padStart(2, '0')}`; // B01, B02...
```
À exécuter dans la même transaction que la création de la boutique.

### Règle 9 — `montant_total` calculé automatiquement (nouvelle, résolution du point A3 de l'audit)
Même classe de bug que la règle 4 : `ventes.montant_total` n'est **jamais** un paramètre accepté en entrée d'une route de création de vente. Calculé dans la même transaction que la règle 7 :
```
montant_total = SUM(lignes_vente.quantite × lignes_vente.prix_unitaire_a_la_vente) − montant_remise
```

### Règle 10 — Annulation d'une vente non payée, restauration atomique du stock (nouvelle, résolution du point A1 de l'audit)
Une vente ne peut être annulée (`statut_vente = annulee`) que si `statut_paiement = impaye` — vérification côté serveur obligatoire, jamais uniquement côté interface. L'annulation doit, dans une seule transaction :
1. Vérifier `statut_paiement = impaye`, sinon rejeter avec message explicite ("remboursement non pris en charge au MVP")
2. Restaurer le stock, opération atomique symétrique à la règle 1 :
   ```typescript
   for (const ligne of vente.lignes_vente) {
     await tx.$queryRaw`
       UPDATE produits
       SET quantite_stock = quantite_stock + ${ligne.quantite}
       WHERE id = ${ligne.produit_id}
     `;
   }
   ```
   pour chaque ligne de la vente annulée
3. Positionner `statut_vente = annulee`, `annulee_par`, `date_annulation`
4. Écrire une entrée dans `journal_audit`
