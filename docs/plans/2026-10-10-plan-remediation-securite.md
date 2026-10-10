# Plan d'Implémentation : Remédiation Complète de Sécurité djoonoo

> **Pour l'agent d'exécution :** Chaque tâche est jalonnée de cases à cocher (`- [ ]`). Validez chaque micro-étape séquentiellement selon le protocole TDD strict (Test en échec -> Implémentation minimale -> Test passant -> Validation).

**Objectif :** Corriger l'intégralité des vulnérabilités (❌ ÉCHOUÉ) et lacunes (⚠️ PARTIEL) identifiées lors de l'audit de sécurité afin d'obtenir une conformité 100% verte (✅ PASSÉ) sur l'ensemble de la checklist.  
**Architecture :** Next.js 16 (App Router), PostgreSQL via Prisma ORM, JWT via `jose`, TOTP 2FA via `otplib`, Zod pour la validation déclarative et Rate Limiting in-memory/sliding-window côté serveur.  
**Pile technique :** Next.js 16.4.0, React 19, TypeScript 5, Prisma 6.19.3, Zod 3.x, Vitest 5.0.2.  
**Spécification source :** Rapport d'audit de sécurité djoonoo (Checklist 1.1 à 8.3).

---

## Contraintes Globales
- **Aucune régression** sur les 91 tests existants (`npx vitest run`).
- **Isolation Multi-Tenant** : Toute lecture/écriture de données commerciales doit impérativement préserver le scoping `compte_id`.
- **Zéro fuite d'erreur** : Ne jamais renvoyer d'objets d'erreur Prisma ou de stack traces SQL au client.
- **Convention de nommage** : Modèles et champs en `snake_case` français fidèle au cahier des charges.

---

## Focus de Revue Critique (Top 5 des angles morts potentiels)
1. **Middleware Next.js & Redirections infinies** : Veiller à ce que `src/middleware.ts` exclue expressément les routes publiques et assets statiques (`/_next`, `/favicon.ico`, `/connexion`, `/super-admin/connexion`, `/api/webhooks/fedapay`).
2. **Secrets manquants en environnement de test Vitest** : Définir des variables d'environnement de test sûres dans la configuration Vitest pour que le Fail-Fast ne bloque pas la suite de tests.
3. **Méthode POST sur le Cron** : Vérifier que les crons ou déclencheurs externes (Coolify/cron d'infrastructure) appellent désormais bien la route via HTTP `POST` avec l'en-tête `Authorization: Bearer <token>`.
4. **Bruteforce 2FA** : Le rate limiter doit bloquer temporairement après 5 échecs consécutifs sur un identifiant ou une IP donnée.
5. **Validation Zod sur FormData** : Parser proprement les chaînes FormData contenant du JSON sérialisé (`lignes`) sans lever d'erreur non capturée.

---

## Vue d'Ensemble des Phases de Remédiation

| Phase | Domaine | Items Checklist Couverts | Objectif |
|---|---|---|---|
| **Phase 1** | Secrets & Environnement Fail-Fast | 1.1 ❌, 1.6 ❌ | Éliminer les secrets de repli en dur et forcer le boot propre. |
| **Phase 2** | Middleware & Contrôle d'Accès Réseau | 3.1 ❌, 3.2 ❌, 3.6 ⚠️ | Mettre en place `src/middleware.ts` en politique de refus par défaut. |
| **Phase 3** | Méthodes HTTP & Sécurité des APIs | 4.4 ❌, 3.6 ⚠️ | Passer le cron en POST strict et sécuriser les accès IDOR sur les PDF. |
| **Phase 4** | Limitation de Débit (Rate Limiting) | 6.1 ❌, 6.2 ❌, 6.3 ❌ | Protéger les logins, la 2FA et la génération de reçus contre le bruteforce et DoS. |
| **Phase 5** | Validation Déclarative (Zod) | 4.1 ❌ | Remplacer les casts manuels par des schémas Zod stricts sur les Server Actions. |
| **Phase 6** | Assainissement des Erreurs | 1.4 ⚠️, 4.5 ⚠️ | Masquer les messages d'erreur internes de base de données aux clients. |
| **Phase 7** | Dépendances & Sécurité npm | 5.1 ⚠️, 5.4 ⚠️ | Mettre à jour Next.js et verrouiller les dépendances transitives vulnérables. |

---

## TÂCHES DÉTAILLÉES D'EXÉCUTION

### Phase 1 : Secrets & Initialisation Fail-Fast (Items 1.1 & 1.6)

- [ ] **Tâche 1.1 : Module de validation d'environnement Fail-Fast**
  - **Consomme :** `process.env`.
  - **Produit :** `src/lib/env.ts` exportant la fonction `validateEnv()` et l'objet typé `env`.
  - **1. Test unitaire :** Créer `tests/security-env.test.ts` vérifiant que `validateEnv()` lève une exception si `AUTH_SECRET`, `SUPERADMIN_AUTH_SECRET`, `DATABASE_URL` ou `CRON_SECRET` est absent ou si les clés secrètes font moins de 32 caractères.
  - **2. Implémentation :** Créer `src/lib/env.ts` avec validation stricte de la longueur minimale (32 caractères) et de la présence des variables requises.
  - **3. Validation :** `npx vitest run tests/security-env.test.ts`.

- [ ] **Tâche 1.2 : Élimination des fallbacks codés en dur**
  - **Consomme :** `src/lib/env.ts`.
  - **Produit :** `src/lib/auth.ts`, `src/lib/super-admin-auth.ts`, `src/app/api/cron/abonnements/route.ts` nettoyés.
  - **1. Modification :**
    - Dans `src/lib/auth.ts:11` : Remplacer le fallback par `getJwtSecret()` qui s'assure que le secret provient de l'environnement et lève une exception s'il est manquant.
    - Dans `src/lib/super-admin-auth.ts:11` : Remplacer le fallback par `getSuperAdminJwtSecret()` avec le même contrôle strict.
    - Dans `src/app/api/cron/abonnements/route.ts:5` : Supprimer le fallback string statique `"djoonoo-cron-secret-production-token-2026"`.
  - **2. Validation :** Relancer `npx vitest run tests/security-env.test.ts`.

---

### Phase 2 : Middleware de Sécurité & Refus par Défaut (Items 3.1, 3.2 & 3.6)

- [ ] **Tâche 2.1 : Création du Middleware Next.js d'interception**
  - **Consomme :** Cookies de requêtes Next.js (`djoonoo_session`, `djoonoo_superadmin_session`).
  - **Produit :** `src/middleware.ts`.
  - **1. Test unitaire / d'intégration :** Créer `tests/security-middleware.test.ts` simulant les requêtes sur routes protégées et publiques.
  - **2. Implémentation :**
    - Définir `PUBLIC_ROUTES = ["/", "/connexion", "/inscription", "/super-admin/connexion", "/api/webhooks/fedapay"]`.
    - Bloquer toute tentative d'accès à `/super-admin/*` (hors page de connexion) sans cookie `djoonoo_superadmin_session` valide -> redirection `/super-admin/connexion`.
    - Bloquer tout accès à `/dashboard/*` sans cookie `djoonoo_session` -> redirection `/connexion`.
    - Exclure les assets internes `_next`, images, et favicons dans le `matcher`.
  - **3. Sécurisation du layout Super-Admin :**
    - Mettre à jour `src/app/super-admin/layout.tsx` pour effectuer un guard serveur immédiat avec `getSuperAdminSession()`.
  - **4. Validation :** `npx vitest run tests/security-middleware.test.ts`.

---

### Phase 3 : Méthodes HTTP & Protection des Routes API (Items 4.4 & 3.6)

- [ ] **Tâche 3.1 : Transition du Cron d'Abonnement en POST strict avec Auth Bearer**
  - **Consomme :** Requêtes HTTP vers `/api/cron/abonnements`.
  - **Produit :** `src/app/api/cron/abonnements/route.ts` sécurisé.
  - **1. Test :** Créer `tests/security-cron-route.test.ts` vérifiant que `GET` renvoie un code 405, que `POST` sans `Authorization` renvoie 401, et que le token dans l'URL (`?key=...`) est désormais totalement ignoré.
  - **2. Implémentation :**
    - Supprimer la méthode `export async function GET`.
    - Implémenter exclusivement `export async function POST`.
    - Valider l'en-tête `Authorization: Bearer <CRON_SECRET>` avec `crypto.timingSafeEqual` pour empêcher toute fuite par analyse temporelle.
  - **3. Validation :** `npx vitest run tests/security-cron-route.test.ts` et `npx vitest run tests/subscriptions-cron.test.ts`.

- [ ] **Tâche 3.2 : Protection contre les IDOR sur la génération de PDF**
  - **Consomme :** `params.id` dans `/api/factures-abonnement/[id]/pdf`.
  - **Produit :** `src/app/api/factures-abonnement/[id]/pdf/route.ts` vérifié.
  - **1. Test :** Vérifier dans `tests/invoice-pdf-security.test.ts` qu'un utilisateur d'un compte B ne peut pas télécharger la facture d'un compte A.
  - **2. Implémentation :** S'assurer que la clause Prisma inclut `compte_id: session.compteId` (sauf si session super-admin).
  - **3. Validation :** `npx vitest run tests/invoice-pdf-security.test.ts`.

---

### Phase 4 : Limitation de Débit / Rate Limiting (Items 6.1, 6.2 & 6.3)

- [ ] **Tâche 4.1 : Implémentation du service Rate Limiter**
  - **Consomme :** Identifiant client / IP, seuil maximal, fenêtre glissante en secondes.
  - **Produit :** `src/lib/rate-limit.ts` avec la fonction `checkRateLimit(key, maxRequests, windowSeconds)`.
  - **1. Test unitaire :** Créer `tests/security-rate-limit.test.ts` testant le blocage au-delà du quota et la réinitialisation après expiration de la fenêtre temporelle.
  - **2. Implémentation :** Implémenter un cache de comptage glissant sécurisé avec nettoyage automatique des clés expirées pour éviter les fuites de mémoire.
  - **3. Validation :** `npx vitest run tests/security-rate-limit.test.ts`.

- [ ] **Tâche 4.2 : Application du Rate Limiting sur les actions sensibles**
  - **Consomme :** `checkRateLimit` de `src/lib/rate-limit.ts`.
  - **Produit :** `src/app/actions/auth.ts`, `src/app/api/factures-abonnement/[id]/pdf/route.ts`.
  - **1. Connexion (`loginUserAction`) :** Limiter à 5 tentatives par minute par email/IP.
  - **2. Validation 2FA (`verify2FAAndLoginAction`) :** Limiter à 5 tentatives par tranche de 5 minutes par utilisateur pour anéantir tout bruteforce sur les codes OTP à 6 chiffres.
  - **3. Inscription (`registerCompteAction`) :** Limiter à 3 inscriptions par heure par IP.
  - **4. Génération PDF :** Limiter à 10 requêtes par minute par compte.
  - **5. Validation :** Relancer la suite de tests auth.

---

### Phase 5 : Validation Déclarative par Schéma Zod (Item 4.1)

- [ ] **Tâche 5.1 : Installation de Zod et création des schémas d'entrées**
  - **Consomme :** `npm install zod`.
  - **Produit :** `src/lib/validations/index.ts`.
  - **1. Schémas à créer :**
    - `VenteSchema` : validation des lignes, quantités strictement positives, prix >= 0, remise >= 0, UUIDs valides.
    - `ProduitSchema` : nom (min 2 car.), prix unitaire > 0, quantite_stock >= 0, seuil_alerte >= 0, code-barre optionnel.
    - `BoutiqueSchema` : nom, adresse, ville, secteur.
    - `AuthLoginSchema` & `Auth2FASchema` : format email, mot de passe min 8 car., code TOTP 6 chiffres numériques stricts (`/^\d{6}$/`).
  - **2. Test unitaire :** Créer `tests/security-zod-schemas.test.ts` testant les rejets sur montants négatifs, JSON corrompus et codes invalides.
  - **3. Validation :** `npx vitest run tests/security-zod-schemas.test.ts`.

- [ ] **Tâche 5.2 : Application de Zod dans les Server Actions**
  - **Consomme :** Les schémas de `src/lib/validations/index.ts`.
  - **Produit :** `src/app/actions/ventes.ts`, `src/app/actions/produits.ts`, `src/app/actions/boutiques.ts`.
  - **1. Remplacement :** Remplacer les castings manuels `as string` et `parseInt` non validés par `schema.safeParse()`.
  - **2. Validation :** Relancer `npx vitest run tests/vente-double-imei.test.ts` et `tests/produits-sku.test.ts`.

---

### Phase 6 : Assainissement des Erreurs et Prévention des Fuites (Items 1.4 & 4.5)

- [ ] **Tâche 6.1 : Module centralisé de gestion d'erreurs sécurisées**
  - **Consomme :** Objets d'erreurs inconnus (`unknown`).
  - **Produit :** `src/lib/safe-action.ts` avec la fonction `formatSafeError(error, defaultMessage)`.
  - **1. Implémentation :**
    - En environnement de développement : possibilité de conserver des logs détaillés dans la console serveur.
    - En réponse retournée au client : ne JAMAIS renvoyer d'erreur contenant `"prisma"`, `"database"`, `"SELECT"`, `"INSERT"`, `"syntax error"`, ou de chemin de fichier système.
    - Mapper les erreurs de contrainte d'unicité connues vers des messages fonctionnels clairs (`"Cet enregistrement existe déjà"`).
  - **2. Application :** Nettoyer les blocs `catch` dans `src/app/actions/auth.ts`, `src/app/actions/parametres.ts`, et `src/app/actions/abonnements.ts`.
  - **3. Test :** Créer `tests/security-safe-errors.test.ts` validant qu'une erreur de base de données simulée ne fuite aucun fragment SQL vers le client.

---

### Phase 7 : Sécurité des Dépendances & Mise à Jour npm (Items 5.1 & 5.4)

- [ ] **Tâche 7.1 : Mise à jour de Next.js et verrouillage des dépendances transitives**
  - **Consomme :** `package.json`.
  - **Produit :** Dépendance `next` mise à niveau et bloc `overrides` configuré.
  - **1. Mise à jour de Next.js :**
    - Passer `next` à `16.4.0` (ou dernière version stable `>=16.3.8`) dans `package.json`.
  - **2. Neutralisation des CVEs transitives d'axios :**
    - Ajouter dans `package.json` :
      ```json
      "overrides": {
        "axios": "^1.7.9"
      }
      ```
  - **3. Installation & Audit :**
    - Exécuter `npm install`.
    - Exécuter `npm audit` pour vérifier la résolution des vulnérabilités de production.

---

## CRITÈRES DE SUCCÈS & CONTRÔLE FINAL
1. **Tous les tests Vitest passent au vert** : Les 91 tests existants + les 7 nouveaux tests de sécurité passent sans aucune erreur.
2. **Exécution d'une passe d'audit finale** : Chaque item de la checklist (1.1 à 8.3) est réévalué avec preuve factuelle et passe au vert (✅ PASSÉ ou ⬚ N/A).
