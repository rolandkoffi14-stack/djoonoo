## 14. Récapitulatif des décisions prises lors de l'audit & évolutions (traçabilité)

| # | Sujet | Décision |
|---|---|---|
| A1 | Annulation de vente | Ajoutée au MVP, limitée aux ventes non payées (règle 10) |
| A2 | Abonnement | Automatique avec essai, passerelle différée, architecture en adaptateur (section 5) |
| A3 | `montant_total` | Calculé automatiquement (règle 9) |
| A4 | Numérotation boutique | Séquentielle par compte (B01, B02...), compteur atomique dédié (règle 8 bis) |
| B5 | Noms de forfaits | Confirmés comme données de seed, pas de contrainte code |
| B6 | `boutiques.statut` | Harmonisé en français (`actif`/`inactif`) |
| B7 | "Illimité" | Représenté par `NULL`, jamais `-1` |
| C9 | Champs entreprise/boutique | IFU, RCCM, forme juridique, téléphones, ville — tous nullable sauf téléphone principal du compte |
| C10 | Email de connexion | `email_principal` = identifiant de connexion Patron, éditable pendant l'inscription |
| C11 | Dédoublonnage client | Recherche par téléphone avant création, pas de contrainte unique stricte |
| C12 | Remise | `montant_remise` ajouté sur `ventes` |
| D13 | Permission paiement | Ouverte à Vendeur et Gérant |
| D14 | 2FA | Étendue au Gérant |
| D15 | Actions à journaliser | Liste non exhaustive fournie (section 7), à compléter en cours de développement |
| F17 | Type monétaire | `Int` (FCFA) partout, plus de `Decimal` |
| G18/19 | Boutique désactivée / compte suspendu | Comportements précisés (section 8 bis) |
| H20 | Transfert Gérant | Confirmé identique au Vendeur |
| **H21** | **Passerelle FedaPay intégrée** | **Intégration directe de FedaPay (MTN/Moov/CB) au MVP. Activation 100% autonome dès paiement, plus de blocage Super-Admin obligatoire (sections 1.7, 5, 6, 7)** |
| **H22** | **Fin de la grâce sur l'essai** | **14 jours d'essai stricts. Le délai de grâce de 7 jours est réservé exclusivement aux renouvellements de forfaits payés (section 5.2)** |
| **H23** | **Compte suspendu en lecture seule** | **Connexion permise pour tous, consultation intégrale des données historiques, blocage strict des opérations d'écriture et CTA de réactivation vers FedaPay (section 8 bis.2)** |
| **H24** | **Durée de forfait configurable** | **Ajout de `forfaits.duree_jours` (30 jours par défaut) pour rendre la périodicité dynamique et non codée en dur (section 3)** |

---

## 16. Zones d'ombre — toutes résolues

| # | Sujet | Décision | Détail |
|---|---|---|---|
| 1 | `statut_paiement` : trigger ou transaction ? | Transaction applicative | Règle 4, section 4 |
| 2 | `compte_id` manquant sur `ventes`/`produits` | Dénormalisé sur `ventes`, `produits`, `lignes_vente`, `paiements` | Schéma section 3, règle 5 |
| 3 | Mécanisme de 2FA | TOTP (`otplib`), pas de SMS | Section 7 |
| 4 | Infrastructure de rate limiting | `caddy-ratelimit` (proxy) + compteur en base Postgres, aucun service externe supplémentaire | Section 7, section 10 |
| 5 | Fournisseur d'email | Resend | Section 10 |
| 6 | Durée d'essai / délai de grâce | 14 jours / 7 jours | Section 5.2 |
| 7 | Configuration des paramètres plateforme | Table clé-valeur `parametres_plateforme` | Schéma section 3 |
| 8 | Activation sans friction SaaS | Webhook FedaPay automatisé + signature HMAC SHA-256 + idempotence | Section 5.3, 7.2 |
