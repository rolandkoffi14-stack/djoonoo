# Plan d'Implémentation : Sécurisation Complète des 3 Derniers Points Partiels (Audit djoonoo)

> **Pour l'agent d'exécution :** Chaque tâche est jalonnée de cases à cocher (`- [ ]`). Validez chaque micro-étape séquentiellement selon le protocole TDD strict (Test en échec -> Implémentation minimale -> Test passant -> Commit atomique). Zéro placeholder, zéro code tronqué.

**Objectif :** Transformer les 3 items restants notés `⚠️ PARTIEL` lors de l'audit de sécurité (3.2, 5.1 et 6.3) en `✅ PASSE` pour atteindre un score de sécurité parfait sans régression fonctionnelle.  
**Architecture :** Next.js 16 (App Router), `middleware.ts` en liste blanche stricte (Default-Deny), assainissement d'arbre de dépendances npm (overrides), et moteur de limitation de débit adaptatif (In-Memory avec support transparent Redis/Upstash).  
**Pile technique :** Next.js 16.4.0, Node.js crypto natif, Vitest 5.0.2, TypeScript 5, npm.  
**Spécification source :** Rapport d'audit de sécurité djoonoo (Items 3.2, 5.1, 6.3).

---

## Vue d'Ensemble des 3 Chantiers de Finition

| Chantier | Domaine | Item Audit | Fichiers Cibles |
|---|---|---|---|
| **Chantier A** | Middleware Default-Deny (Liste Blanche) | 3.2 ⚠️ | `src/middleware.ts`, `tests/security-middleware-default-deny.test.ts` |
| **Chantier B** | Assainissement npm audit & Overrides | 5.1 ⚠️ | `package.json`, `package-lock.json` |
| **Chantier C** | Rate Limiting Adaptatif Multi-Noeuds | 6.3 ⚠️ | `src/lib/rate-limit.ts`, `tests/security-rate-limit-adapter.test.ts` |

---

## TÂCHES DÉTAILLÉES D'EXÉCUTION

---

### Chantier A : Middleware en Liste Blanche Stricte (Item 3.2)

- [ ] **Tâche A.1 : Test sentinelle du middleware en refus par défaut (Default-Deny)**
  - **Consomme :** `src/middleware.ts`.
  - **Produit :** `tests/security-middleware-default-deny.test.ts`.
  - **1. Test unitaire :**
    - Doit autoriser sans authentification les routes explicitement publiques : `/`, `/tarifs`, `/connexion`, `/inscription`, `/invitation/:token`, `/api/webhooks/fedapay`, `/api/cron/abonnements`.
    - Doit rediriger vers `/connexion` TOUTE NOUVELLE ROUTE PRIVÉE inconnue ou arbitraire (ex: `/gestion-stocks`, `/finances-avancees`, `/parametres`) si aucun cookie de session n'est fourni.
    - Doit autoriser les requêtes vers ces routes privées si le cookie `djoonoo_session` est présent.
    - Doit rediriger `/super-admin/forfaits` vers `/super-admin/connexion` si le cookie `djoonoo_superadmin_session` est absent.

- [ ] **Tâche A.2 : Refactorisation de `src/middleware.ts` en Default-Deny**
  - **Consomme :** `src/middleware.ts`.
  - **Produit :** `src/middleware.ts` avec ensemble immuable `PUBLIC_ROUTES` et expressions régulières de motifs publics (`/invitation/*`). Tout chemin non explicitement listé exige une session active.
  - **Validation :** `npx vitest run tests/security-middleware-default-deny.test.ts` et `npx vitest run tests/security-middleware.test.ts`.

---

### Chantier B : Assainissement des Dépendances & npm audit (Item 5.1)

- [ ] **Tâche B.1 : Ajout des overrides de sécurité dans `package.json`**
  - **Consomme :** `package.json`.
  - **Produit :** `package.json` enrichi d'overrides pour corriger les vulnérabilités de `braces`, `micromatch` et `deepmerge-ts` remontées dans l'outillage de lint/build.
  - **Validation :** `npm audit` -> Résolution des alertes ou réduction drastique, puis `npm run build` ou `npx tsc --noEmit` pour garantir l'absence de régression de compilation.

---

### Chantier C : Rate Limiting Adaptatif Hybride (Item 6.3)

- [ ] **Tâche C.1 : Test unitaire du Rate Limiter Hybride**
  - **Consomme :** `src/lib/rate-limit.ts`.
  - **Produit :** `tests/security-rate-limit-adapter.test.ts`.
  - **Vérifications :**
    - Fonctionnement transparent de `checkRateLimit` et `resetRateLimit` en mode in-memory par défaut.
    - Détection automatique et bascule vers l'adaptateur distribué si les variables d'environnement Redis sont fournies, sans casser la signature synchrone/asynchrone existante.

- [ ] **Tâche C.2 : Évolution modulaire de `src/lib/rate-limit.ts`**
  - **Consomme :** `src/lib/rate-limit.ts`.
  - **Produit :** `src/lib/rate-limit.ts` doté d'une abstraction de stockage avec support Zero-Config In-Memory et hook pour connecteur Upstash Redis / Redis REST.
  - **Validation :** `npx vitest run tests/security-rate-limit-adapter.test.ts` et `npx vitest run tests/security-rate-limiting-extended.test.ts`.

---

## CONTRÔLE FINAL DE CERTIFICATION
1. `npx tsc --noEmit` -> Code 0.
2. `npx vitest run` -> 100% des tests passants (143+ tests).
3. Commit git atomique documenté.
