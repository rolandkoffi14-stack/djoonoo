## 1. Périmètre fonctionnel MVP

### 1.1 Comptes & rôles
- Inscription et gestion d'un compte Patron (un compte = un tenant)
- Création, modification, désactivation de boutiques par le Patron
- Invitation et gestion d'employés (Gérant, Vendeur) par boutique
- Transfert d'un employé — **Gérant ou Vendeur, les deux rôles sont concernés de façon identique** (résolution du point H20 de l'audit : le cahier d'origine ne mentionnait explicitement que le vendeur, la structure de données ne fait aucune distinction et s'applique aux deux) — d'une boutique à une autre, tracé dans `historique_affectations`

### 1.2 Produits & stock
- CRUD produits, propre à chaque boutique
- Suivi du stock en temps réel
- Alerte de stock bas, seuil configurable par produit

### 1.3 Ventes
- Enregistrement d'une vente : un ou plusieurs produits, quantité, client optionnel, un ou plusieurs moyens de paiement
- Remise possible sur la vente (voir section 4, nouvelle règle 9) — résolution du point C12 de l'audit
- Reçu/facture numéroté généré automatiquement et obligatoirement à chaque vente (mécanisme exact section 4, règle 7)
- **Annulation d'une vente non encore payée** (voir section 4, nouvelle règle 10) — résolution du point A1 de l'audit. Une vente ayant déjà reçu au moins un paiement (`statut_paiement` ≠ `impaye`) **ne peut pas être annulée en MVP** — le remboursement après encaissement est explicitement hors périmètre (voir section 1 bis)

### 1.4 Gestion des impayés
- `statut_paiement` : `impaye` / `partiel` / `paye`, dérivé automatiquement (règle 4, section 4)
- Historique des paiements successifs par vente
- **Enregistrer un paiement de suivi sur une vente existante est une action ouverte au Vendeur et au Gérant**, pas réservée au Gérant seul (résolution du point D13 de l'audit — un client qui revient régler son solde ne doit pas dépendre de la présence du gérant). La consultation des **rapports financiers globaux** reste, elle, réservée au Gérant et au Patron (permissions inchangées, section 2)
- Liste consolidée des créances en cours, par boutique et globale

### 1.5 Clients
- Fiche client rattachée au compte Patron, jamais à une boutique
- Historique d'achats tous magasins confondus
- Coordonnées : nom, téléphone
- **Recherche par téléphone avant création** — résolution du point C11 de l'audit : à la saisie d'un nouveau client, l'interface doit chercher un client existant du même `compte_id` par téléphone et proposer un rapprochement plutôt que de laisser un vendeur recréer un doublon depuis une autre boutique du même compte. Pas de contrainte d'unicité stricte en base sur le téléphone (un numéro peut être partagé dans un foyer) — seulement un index de recherche rapide (voir schéma section 3)

### 1.6 Rapports de base
- Chiffre d'affaires jour/semaine/mois/année, par boutique et consolidé
- Liste des impayés en cours

### 1.7 Forfaits & abonnement
Voir section 5 — intégration complète et automatisée de la passerelle de paiement FedaPay (MTN MoMo, Moov Money, Carte bancaire). Le compte est activé/renouvelé automatiquement dès validation du paiement en ligne sans intervention requise du Super-Admin (décision H21). Période d'essai stricte de 14 jours, délai de grâce réservé aux renouvellements, et mode lecture seule pour les comptes suspendus.

### 1.8 Sécurité
Détail complet en section 7 (incluant la sécurité cryptographique des webhooks FedaPay).

## 1 bis. Hors périmètre MVP — ne pas implémenter

| Fonctionnalité exclue | Note |
|---|---|
| Classement produits les mieux vendus, tendances | Ajout facile après coup |
| Notifications SMS/WhatsApp clients | Intégration à part entière |
| Comparaison avancée entre boutiques | Le CA consolidé simple suffit |
| Système de fidélité | À définir avec des retours utilisateurs réels |
| Rapports exportables (PDF/Excel) | Non bloquant pour l'usage quotidien |
| Stockage de fichiers (photos produit, logo) | Schéma extensible sans migration structurante (`photo_url`/`logo_url` nullable admis dès maintenant, sans logique d'upload) |
| Table "Gérant multi-boutique" | Un gérant reste rattaché à une seule boutique à la fois, comme un vendeur |
| **Remboursement d'une vente déjà payée (partiellement ou totalement)** | Ajouté à cette liste suite à l'audit (point A1) — seule l'annulation d'une vente **non payée** est au MVP (section 1.3) |
| Passerelle Kkiapay | Réservée pour une itération ultérieure — FedaPay est la passerelle retenue et intégrée au MVP (décision H21) |
