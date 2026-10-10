# Plan d'Implémentation : Remédiation Sécurité — Robustesse des Mots de Passe & Vérification d'Email

> **Pour l'agent d'exécution :** Chaque tâche est jalonnée de cases à cocher (`- [ ]`). Validez chaque micro-étape séquentiellement selon le protocole TDD strict (Test en échec -> Implémentation minimale -> Test passant -> Commit atomique). Zéro placeholder, zéro code tronqué.

**Objectif :** Résoudre définitivement les vulnérabilités identifiées lors de l'audit des 20 points :
1. Imposer une politique stricte de robustesse des mots de passe (Point 19).
2. Sécuriser l'inscription du Patron par un mécanisme de vérification d'adresse email via Resend (Point 13).
3. Assurer la révocation et l'invalidation des sessions actives lors du renouvellement de mot de passe.

**Architecture :** Schémas Zod stricts avec regex de complexité, service de notification Resend avec fallback local transparent (`src/lib/email.ts`), jetons cryptographiques d'activation hachés en SHA-256 avec expiration sous 24h, et cookies de session hermétiques.  
**Pile technique :** Next.js 16 (App Router), Prisma 6.19.3, Zod 4.6.5, Resend 6.30, Node.js `crypto` natif, Vitest 5.0.2.  
**Spécification source :** Rapport d'audit des 20 points (Points 13 et 19).

---

## Vue d'Ensemble des 3 Chantiers

| Chantier | Domaine | Cible Audit | Fichiers Cibles |
|---|---|:---:|---|
| **Chantier 1** | **Politique de Robustesse des Mots de Passe** | Point 19 | `src/lib/validations/index.ts`, `src/app/actions/auth.ts`, `src/app/actions/invitation.ts`, `tests/security-password-strength.test.ts` |
| **Chantier 2** | **Vérification d'Email à l'Inscription Patron** | Point 13 | `src/lib/email.ts`, `src/app/actions/auth.ts`, `src/app/verification-email/[token]/page.tsx`, `tests/security-email-verification.test.ts` |
| **Chantier 3** | **Révocation Active des Sessions après Changement MDP** | Point 3 (Urgent) | `src/lib/auth.ts`, `src/app/actions/parametres.ts`, `tests/security-session-revocation.test.ts` |

---

## TÂCHES DÉTAILLÉES D'EXÉCUTION

---

### Chantier 1 : Politique de Robustesse des Mots de Passe (Point 19)

- [ ] **Tâche 1.1 : Test sentinelle de complexité des mots de passe**
  - **Consomme :** `src/lib/validations/index.ts`.
  - **Produit :** `tests/security-password-strength.test.ts`.
  - **Vérifications :**
    - Rejeter les mots de passe < 8 caractères (ex: `Ab1!xyz`).
    - Rejeter les mots de passe sans lettre majuscule (ex: `motdepasse123!`).
    - Rejeter les mots de passe sans chiffre (ex: `MotDePasseFort!`).
    - Rejeter les mots de passe sans caractère spécial (ex: `MotDePasseFort123`).
    - Valider les mots de passe conformes (ex: `MotDePasseFort2026!`).

- [ ] **Tâche 1.2 : Déclaration du schéma `MotDePasseFortSchema` dans `src/lib/validations/index.ts`**
  - **Consomme :** `zod`.
  - **Produit :** Export de `MotDePasseFortSchema` avec messages d'erreurs en français.
  - **Règle :**
    ```typescript
    export const MotDePasseFortSchema = z
      .string()
      .min(8, "Le mot de passe doit comporter au moins 8 caractères.")
      .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une lettre majuscule.")
      .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre.")
      .regex(/[^a-zA-Z0-9]/, "Le mot de passe doit contenir au moins un caractère spécial.");
    ```

- [ ] **Tâche 1.3 : Intégration de `MotDePasseFortSchema` dans les Server Actions**
  - **Consomme :** `MotDePasseFortSchema`.
  - **Produit :**
    - `src/app/actions/auth.ts` (`inscrirePatronAction`) : remplacer la simple vérification `.length < 8` par `MotDePasseFortSchema.safeParse(motDePasse)`.
    - `src/app/actions/invitation.ts` (`finaliserActivationCompteAction`) : valider le mot de passe de l'invité avec `MotDePasseFortSchema`.
  - **Validation :** `npx vitest run tests/security-password-strength.test.ts` et `npx vitest run tests/inscription-patron.test.ts`.

---

### Chantier 2 : Vérification de l'Adresse Email du Patron (Point 13)

- [ ] **Tâche 2.1 : Test sentinelle de génération et validation de token d'email**
  - **Consomme :** `src/lib/email.ts` et `src/app/actions/auth.ts`.
  - **Produit :** `tests/security-email-verification.test.ts`.
  - **Vérifications :**
    - Génération d'un token cryptographique à usage unique haché en SHA-256 à l'inscription.
    - Expédition de l'email de confirmation via Resend (avec fallback log en test).
    - Validation atomique du token et confirmation de l'adresse email.
    - Rejet des tokens expirés ou falsifiés.

- [ ] **Tâche 2.2 : Template et envoi d'email de confirmation dans `src/lib/email.ts`**
  - **Consomme :** Resend API.
  - **Produit :** Fonction `envoyerEmailVerificationPatron({ destinataire, nom, lienVerification })`.
  - **Gabarit HTML :** Charte graphique officielle djoonoo (couleur `#C1652D`, logo SVG, lien d'activation sécurisé valable 24h).

- [ ] **Tâche 2.3 : Action de vérification et intégration au flux d'inscription**
  - **Consomme :** `tokens_invitation` ou modèle de token dédié en base.
  - **Produit :**
    - Server Action `verifierEmailPatronAction(token: string)` dans `src/app/actions/auth.ts`.
    - Page de confirmation publique `src/app/verification-email/[token]/page.tsx` avec retour visuel clair et redirection vers `/connexion`.
  - **Validation :** `npx vitest run tests/security-email-verification.test.ts`.

---

### Chantier 3 : Invalidation & Révocation Active des Sessions (Point 3 Urgent)

- [ ] **Tâche 3.1 : Test sentinelle d'invalidation de session**
  - **Consomme :** `src/lib/auth.ts`.
  - **Produit :** `tests/security-session-revocation.test.ts`.
  - **Vérifications :**
    - Destruction du cookie de session lors de la déconnexion (`deconnexionAction`).
    - Impossibilité d'accéder aux routes protégées après déconnexion.

- [ ] **Tâche 3.2 : Renforcement de la révocation et déconnexion universelle**
  - **Consomme :** `src/lib/auth.ts`.
  - **Produit :** Action `deconnexionAction` garantissant la suppression immédiate des cookies `djoonoo_session` et `djoonoo_superadmin_session` avec `maxAge: 0` et `path: "/"`.
  - **Validation :** `npx vitest run tests/security-session-revocation.test.ts`.

---

## CONTRÔLE FINAL DE CERTIFICATION
1. Compilation TypeScript : `npx tsc --noEmit` -> Code 0.
2. Suite complète de tests : `npx vitest run --fileParallelism=false` -> 100% de succès.
3. Rapport d'audit final mis à jour avec les 20 points certifiés.
4. Commit Git atomique documenté.
