## 6. Dashboard Super-Admin — Supervision & Paramétrage

Authentification entièrement isolée (`super_admins`, 2FA TOTP obligatoire).

### 6.1 Rôle dans le flux SaaS automatisé (décision H21)
Dans l'architecture modernisée avec FedaPay, l'intervention du Super-Admin **n'est plus un prérequis pour l'activation d'un compte client**. Le flux d'abonnement est 100% autonome.
Le Super-Admin assure un rôle de **supervision, de gouvernance et de régularisation d'exception** :

- **Supervision des encaissements en direct** : Visualisation de toutes les factures d'abonnement, statuts, montants en FCFA, et références de transactions FedaPay.
- **Régularisation manuelle exceptionnelle** : Possibilité de valider manuellement un paiement d'abonnement uniquement pour des cas hors passerelle (virement bancaire corporate, convention commerciale spéciale, chèque ou geste SAV). Cette action enregistre `confirme_par_super_admin_id` et `fournisseur_paiement = "manuel"`.
- **Gestion des forfaits** : Création, modification et désactivation des forfaits avec configuration complète : `nom`, `prix_mensuel`, `duree_jours` (décision H24), `max_boutiques` (NULL = illimité), `max_employes_par_boutique` (NULL = illimité), `actif`.
- **Gestion des comptes & suspension administrative** : Possibilité de suspendre ou réactiver manuellement un compte pour raison contractuelle ou de sécurité.
- **Configuration des paramètres plateforme** : Réglage dynamique de la durée d'essai (`duree_essai_jours` = 14) et du délai de grâce des renouvellements (`delai_grace_jours` = 7).
- **Audit de gouvernance** : Chaque action administrative écrit une entrée immuable dans `journal_audit_plateforme`.

### 6.2 Hors périmètre MVP
Statistiques financières poussées (MRR, churn, cohortes), mode "impersonation / support" pour accéder à la boutique d'un client.
