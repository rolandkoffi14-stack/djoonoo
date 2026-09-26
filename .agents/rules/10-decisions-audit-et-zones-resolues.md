## 14. Récapitulatif des décisions prises lors de l'audit (traçabilité)

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

---

## 16. Zones d'ombre — toutes résolues à ce tour

Les 7 points ci-dessous étaient encore ouverts après l'audit précédent. Chacun a désormais une décision tranchée et implémentée dans les sections indiquées — traçabilité complète, dans le même esprit que le tableau de la section 14.

| # | Sujet | Décision | Détail |
|---|---|---|---|
| 1 | `statut_paiement` : trigger ou transaction ? | Transaction applicative | Règle 4, section 4 |
| 2 | `compte_id` manquant sur `ventes`/`produits` | Dénormalisé sur `ventes`, `produits`, `lignes_vente`, `paiements` | Schéma section 3, règle 5 |
| 3 | Mécanisme de 2FA | TOTP (`otplib`), pas de SMS | Section 7 |
| 4 | Infrastructure de rate limiting | `caddy-ratelimit` (proxy) + compteur en base Postgres, aucun service externe supplémentaire | Section 7, section 10 |
| 5 | Fournisseur d'email | Resend | Section 10 |
| 6 | Durée d'essai / délai de grâce | 14 jours / 7 jours | Section 5.2 |
| 7 | Configuration des paramètres plateforme | Table clé-valeur `parametres_plateforme` | Schéma section 3 |

Plus aucune zone d'ombre non résolue à ce tour. Si une nouvelle ambiguïté apparaît en cours de construction (section 15), elle doit être signalée de la même façon plutôt que tranchée silencieusement.
