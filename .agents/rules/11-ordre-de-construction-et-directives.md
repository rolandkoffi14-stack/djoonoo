## 15. Ordre de construction recommandé

1. **Fondations** : schéma Prisma (section 3), pooling Supabase configuré dès cette étape
2. **Isolation multi-tenant** : middleware/extension Prisma `compte_id`
3. **Authentification client** : inscription Patron (email unique = identifiant de connexion, décision C10), connexion, 2FA Patron, création premier compte + première boutique (génère `comptes.code` et `boutiques.code` — règles 8 et 8 bis) — seed de `parametres_plateforme` (durée d'essai 14 jours, délai de grâce 7 jours) à effectuer avant cette étape
4. **Gestion boutiques et employés** : CRUD boutiques, invitation Gérant/Vendeur (2FA Gérant incluse), application des limites de forfait (NULL = illimité)
5. **Produits & stock**
6. **Ventes** : création avec règles 1, 3, 7, 8 bis, 9 dans la même transaction ; tests de concurrence obligatoires avant de continuer
7. **Paiements, statut de facture, annulation** : règles 4, 6, 10
8. **Clients** : avec recherche de rapprochement par téléphone (décision C11)
9. **Rapports de base**
10. **Transfert d'employés** : non-régression sur la règle 2
11. **Journal d'audit client**
12. **Dashboard Super-Admin** : gestion des comptes/forfaits, confirmation manuelle des `factures_abonnement`
13. **Job planifié d'abonnement** (section 5.4) : une fois le reste stable, pas en fondation — dépend de comptes/forfaits déjà fonctionnels
14. **Design final** : application de la section 11 sur les écrans déjà fonctionnels

---

## Directive d'exécution

"Ce document (v3 — zones d'ombre résolues) est la seule source de vérité. Les décisions A1 à H20 (section 14) et 1 à 7 (section 16) ont toutes été tranchées explicitement — applique-les sans les remettre en question. Si une nouvelle zone d'ombre apparaît en cours de construction, arrête-toi et documente la décision prise plutôt que de la prendre en silence. Les règles métier de la section 4 (10 au total) sont des implémentations obligatoires, testées par des scénarios de concurrence avant de passer à l'étape suivante de la section 15. Le nom du produit s'écrit `djoonoo`, toujours en minuscules, sans exception."
