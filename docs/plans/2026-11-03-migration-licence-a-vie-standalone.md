# Plan d'implémentation — Migration djoonoo vers Licence à Vie (Standalone / Vercel)

Ce document détaille les phases et les étapes techniques pour transformer djoonoo d'un SaaS multi-tenant récurrent en une application autonome à licence à vie (déploiement unique par client sur Vercel).

---

## 1. Choix validés

1. **Suppression de `/super-admin`** : Le Patron est l'administrateur unique de l'instance.
2. **Système de Licence Hors-Ligne** : Validation cryptographique (HMAC-SHA256) basée sur le nom de l'entreprise et une clé signée éditeur.
3. **Quotas pilotés par la Licence** : 1 boutique (Licence Standard) ou Illimité (Licence Pro/Réseau).
4. **Conservation de `compte_id`** : Stabilité maximale du schéma Prisma et des requêtes existantes, lié à l'unique compte d'entreprise créé au Setup.
5. **Redirection de la racine `/`** : Redirection directe vers `/connexion` ou `/dashboard`.
6. **Optimisation Temps-Réel Vercel** : Actualisation au focus d'écran (`visibilitychange`) sans SSE persistant bloquant.

---

## 2. Découpage par Phase

- [x] **Phase 1 : Module de Licence & Utilitaires Métier**
  - [x] Créer `src/lib/license.ts` (génération & validation de clé de licence hors-ligne).
  - [x] Mettre à jour `src/lib/subscription-guard.ts` pour toujours autoriser les écritures d'une licence valide.
  - [x] Adapter la vérification des quotas de boutiques dans `src/app/actions/boutiques.ts`.

- [x] **Phase 2 : Élimination des composants SaaS & FedaPay & Cron & Super-Admin**
  - [x] Supprimer `src/lib/fedapay.ts` et `src/app/api/webhooks/fedapay`.
  - [x] Supprimer `src/lib/subscriptions-cron.ts` et `src/app/api/cron/abonnements`.
  - [x] Supprimer `src/app/actions/subscription.ts`.
  - [x] Supprimer les dossiers d'abonnement `/app/dashboard/abonnement` et `/app/abonnement`.
  - [x] Supprimer `/app/super-admin`, `src/app/actions/super-admin.ts`, `src/lib/super-admin-auth.ts`, `src/components/super-admin`.

- [x] **Phase 3 : Assistant d'Initialisation Unique (`/initialisation`) & Verrouillage Inscription**
  - [x] Créer la vérification `estEntrepriseInitialisee()`.
  - [x] Créer la page `/initialisation` : saisie de la clé de licence, nom d'entreprise, IFU, ville, et création du premier compte Patron.
  - [x] Verrouiller `/inscription` et `/initialisation` dès que l'entreprise existe (redirection automatique vers `/connexion`).
  - [x] Mettre à jour `src/middleware.ts`.

- [x] **Phase 4 : Nettoyage de l'Interface Utilisateur (UI)**
  - [x] Rediriger `/` vers `/connexion` ou `/dashboard`.
  - [x] Retirer l'onglet "Abonnement" dans `Sidebar.tsx`.
  - [x] Remplacer le compteur d'essai par le badge "Licence Active" dans `Header.tsx`.
  - [x] Supprimer `BannerAbonnement.tsx`.
  - [x] Ajouter un onglet "Licence & Logiciel" dans `/dashboard/parametres`.

- [x] **Phase 5 : Optimisation Vercel & Temps-Réel**
  - [x] Ajuster `RealtimeListener.tsx` pour l'actualisation au focus/visibilité.
  - [x] Supprimer `output: "standalone"` dans `next.config.ts`.
  - [x] Nettoyer le schéma Prisma (optionnel : archiver les tables inutilisées sans casser les migrations).

- [x] **Phase 6 : Tests & Validation finale**
  - [x] Mettre à jour les tests unitaires et d'intégration.
  - [x] Vérifier le cycle complet : Initialisation -> Connexion Patron -> Création Boutique -> Vente Caisse POS.

