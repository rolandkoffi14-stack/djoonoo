## 6. Dashboard Super-Admin

Authentification entièrement séparée (section 2).

### Fonctionnalités MVP
- Liste de tous les comptes, leur forfait, leur statut d'abonnement
- Suspension / réactivation manuelle d'un compte
- Confirmation manuelle d'un paiement d'abonnement (`factures_abonnement.statut = payee`, déclenche la mise à jour de `comptes.statut_abonnement`)
- **Création, modification, désactivation des forfaits** — confirmé comme prérogative exclusive du Super-Admin (décision B7) ; l'interface doit permettre de définir `nom`, `max_boutiques` (avec option explicite "illimité" plutôt que de laisser saisir une valeur numérique arbitraire quand NULL est voulu), `max_employes_par_boutique` (idem), `prix_mensuel`, `actif`
- Configuration de la durée d'essai et du délai de grâce (section 5.2) si ces paramètres sont externalisés comme recommandé

Chaque action écrit dans `journal_audit_plateforme`.

### Hors MVP
Statistiques avancées (MRR, churn), mode "support" pour consulter les données d'un compte client.
