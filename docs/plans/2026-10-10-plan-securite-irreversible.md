# Plan d'Implémentation : Sécurisation Irréversible & Verrouillage Anti-Régression djoonoo

> **Pour l'agent d'exécution :** Chaque tâche est jalonnée de cases à cocher (`- [ ]`). Validez chaque micro-étape séquentiellement selon le protocole TDD strict (Test en échec -> Implémentation minimale -> Test passant -> Commit atomique). Zéro placeholder, zéro code tronqué.

**Objectif :** Éliminer définitivement et de façon irréversible l'ensemble des 6 failles de sécurité résiduelles identifiées lors de l'audit de code, en verrouillant le système par des tests sentinelles de non-régression et un assainissement systématique par défaut.  
**Architecture :** Next.js 15/16 (App Router), Node.js `instrumentation.ts` au boot, validation déclarative Zod, limitation de débit glissante en amont des tiers et de l'auth, échappement HTML strict contre les XSS stockés, masquage centralisé des erreurs SQL via `formatSafeError`.  
**Pile technique :** Next.js 16.4.0, React 19, TypeScript 5, Prisma 6.19.3, Zod 4.6.5, Vitest 5.0.2, otplib, jose, crypto natif.  
**Spécification source :** Rapport d'audit de sécurité djoonoo (Checklist 1.1 à 8.3 & Conclusions #1 à #6).

---

## Contraintes Globales
- **Non-Régression Absolue** : Préservation des 127 tests existants (`npx vitest run`).
- **Zéro Log de Secret** : Interdiction totale d'émettre des codes OTP/secrets dans `console.log`/`console.info`/`console.warn`.
- **Échappement Systématique** : Tout contenu injecté dans un gabarit HTML servi au navigateur doit être assaini par `escapeHtml()`.
- **Rate-Limiting Universel** : Tout endpoint d'authentification ou consommateur de crédits tiers doit être protégé par `checkRateLimit`.
- **Fail-Fast** : Refus immédiat de démarrer si une variable d'environnement requise est manquante ou un secret trop court (< 32 car.).

---

## Focus de Revue Critique (Top 5 des angles morts potentiels)
1. **Tests espions de console (Spy on console.log)** : S'assurer que les mocks `vi.spyOn(console, 'log')` restaurent systématiquement la méthode d'origine dans un bloc `afterEach` pour ne pas perturber les autres tests.
2. **Caractères HTML spéciaux dans les factures** : L'échappement HTML doit couvrir `&`, `<`, `>`, `"`, et `'` sans casser la mise en page CSS des templates de facture.
3. **Erreurs Zod dans les Server Actions** : Les échecs de validation Zod doivent renvoyer un objet normalisé `{ success: false, error: message }` attendu par les composants React du frontend, sans lever d'exception non interceptée.
4. **Environnement de test vs boot `instrumentation.ts`** : S'assurer que Next.js n'exécute pas `instrumentation.ts` de façon bloquante lors de la compilation Vitest grâce à un guard `process.env.NODE_ENV !== "test"`.
5. **Robustesse de `checkRateLimit`** : Les clés de limitation doivent être uniques et étanches (ex: `sa:login:${email}`, `email:invite:${employeId}`).

---

## Vue d'Ensemble des 6 Chantiers

| Chantier | Domaine | Item Audit | Fichiers Cibles |
|---|---|---|---|
| **Chantier 1** | Éradication des fuites 2FA dans les logs | 1.4 ❌ (Concl. #1) | `src/app/actions/auth.ts`, `tests/security-no-totp-logs.test.ts` |
| **Chantier 2** | Neutralisation du XSS dans les factures | 4.3 ❌ (Concl. #2) | `src/lib/invoice-generator.ts`, `tests/security-invoice-xss.test.ts` |
| **Chantier 3** | Bouclier Anti-Bruteforce & Anti-Spam Tiers | 6.1 ❌, 6.2 ❌ (Concl. #3 & #5) | `src/app/actions/super-admin.ts`, `src/app/actions/auth.ts`, `src/app/actions/employes.ts`, `src/app/actions/subscription.ts`, `tests/security-rate-limiting-extended.test.ts` |
| **Chantier 4** | Colmatage de la fuite d'erreur SQL brute | 4.5 ❌ (Concl. #4) | `src/app/actions/auth.ts`, `tests/security-safe-errors.test.ts` |
| **Chantier 5** | Verrouillage au boot du serveur | 1.6 ⚠️ (Concl. #7) | `src/instrumentation.ts`, `tests/security-instrumentation.test.ts` |
| **Chantier 6** | Validation déclarative Zod systématique | 4.1 ⚠️ | `src/app/actions/auth.ts`, `src/app/actions/boutiques.ts`, `tests/security-zod-integration.test.ts` |

---

## TÂCHES DÉTAILLÉES D'EXÉCUTION

---

### Chantier 1 : Éradication des Fuites 2FA dans les Logs (Conclusion #1)

- [ ] **Tâche 1.1 : Test sentinelle contre la fuite de codes TOTP dans les logs**
  - **Consomme :** `src/app/actions/auth.ts`.
  - **Produit :** `tests/security-no-totp-logs.test.ts`.
  - **1. Test unitaire :**
    ```typescript
    import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
    import { connecterAction } from "../src/app/actions/auth";
    import { prisma } from "../src/lib/prisma";

    describe("Sentinelle Sécurité — Zéro Fuite de Code 2FA dans les Logs", () => {
      let consoleLogSpy: any;

      beforeEach(() => {
        consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      });

      afterEach(() => {
        consoleLogSpy.mockRestore();
      });

      it("ne doit JAMAIS afficher de code TOTP à 6 chiffres dans console.log lors d'une connexion", async () => {
        // Tentative de connexion avec identifiants bidons ou réels
        await connecterAction("test-patron@example.com", "mauvais-mot-de-passe");

        // Analyser tous les appels à console.log
        const calls = consoleLogSpy.mock.calls.map((args: any[]) => args.join(" "));
        const regexCodeTotp = /CODE 2FA TOTP.*:\s*\d{6}/i;

        for (const logLine of calls) {
          expect(logLine).not.toMatch(regexCodeTotp);
        }
      });
    });
    ```
  - **2. Commande d'exécution :** `npx vitest run tests/security-no-totp-logs.test.ts`.

- [ ] **Tâche 1.2 : Suppression définitive des logs de codes TOTP dans `src/app/actions/auth.ts`**
  - **Consomme :** `src/app/actions/auth.ts`.
  - **Produit :** `src/app/actions/auth.ts` sans aucun affichage de code OTP.
  - **1. Modification :**
    - Supprimer les lignes 300 à 304 dans `inscrirePatronAction` :
      ```typescript
      // SUPPRIMER :
      // const codeTotpActuel = generateTotpCode(totpSecret);
      // console.log(`\n==================================================`);
      // console.log(`🔐 [2FA djoonoo] Inscription de ${email}`);
      // console.log(`👉 CODE 2FA TOTP (tolérance 5 minutes) : ${codeTotpActuel}`);
      // console.log(`==================================================\n`);
      ```
    - Supprimer les lignes 472 à 477 dans `connecterAction` :
      ```typescript
      // SUPPRIMER :
      // const codeTotpConnexion = generateTotpCode(user.deux_fa_secret);
      // console.log(`\n==================================================`);
      // console.log(`🔐 [2FA djoonoo] Connexion de ${user.nom} (${user.email})`);
      // console.log(`👉 CODE 2FA TOTP (tolérance 5 minutes) : ${codeTotpConnexion}`);
      // console.log(`==================================================\n`);
      ```
    - Retirer l'import inutile `generateTotpCode` dans `src/app/actions/auth.ts`.
  - **2. Validation :** `npx vitest run tests/security-no-totp-logs.test.ts`.

---

### Chantier 2 : Neutralisation du XSS dans le Générateur de Facture (Conclusion #2)

- [ ] **Tâche 2.1 : Test sentinelle d'échappement XSS sur la facture HTML**
  - **Consomme :** `src/lib/invoice-generator.ts`.
  - **Produit :** `tests/security-invoice-xss.test.ts`.
  - **1. Test unitaire :**
    ```typescript
    import { describe, it, expect } from "vitest";
    import { genererHtmlFactureAbonnement } from "../src/lib/invoice-generator";

    describe("Sentinelle Sécurité — Prévention XSS Stocké Facture Abonnement", () => {
      it("doit neutraliser et échapper tout code HTML ou script injecté dans les métadonnées client", () => {
        const payloadMalveillant = {
          numeroFacture: "FAC-TEST-001",
          dateEmission: "10/10/2026",
          datePaiement: null,
          statut: "en_attente",
          montant: 5000,
          forfaitNom: "Solo <script>alert('forfait')</script>",
          dureeJours: 30,
          fournisseurPaiement: "fedapay",
          referenceFedaPay: "TX-123\"><script>alert('ref')</script>",
          client: {
            nomEntreprise: "Boutique Dangereuse <script>alert('xss-nom')</script>",
            email: "hacker@test.com",
            telephone: "+22990000000",
            ifu: "1234567890<img src=x onerror=alert('xss-ifu')>",
            rccm: "RB/COT/26-A-0000",
            adresse: "Rue 10 \" onmouseover=\"alert('xss-addr')",
            ville: "Cotonou <iframe src=javascript:alert('xss-ville')></iframe>",
          },
        };

        const html = genererHtmlFactureAbonnement(payloadMalveillant);

        // Aucune balise script ou gestionnaire d'événement inline non échappé ne doit être présent
        expect(html).not.toContain("<script>alert('xss-nom')</script>");
        expect(html).not.toContain("<img src=x onerror=alert('xss-ifu')>");
        expect(html).not.toContain("<iframe src=javascript:alert('xss-ville')></iframe>");
        expect(html).not.toContain("\" onmouseover=\"alert('xss-addr')");

        // Doit contenir les versions échappées
        expect(html).toContain("&lt;script&gt;alert(&#39;xss-nom&#39;)&lt;/script&gt;");
        expect(html).toContain("&lt;img src=x onerror=alert(&#39;xss-ifu&#39;)&gt;");
      });
    });
    ```
  - **2. Commande d'exécution :** `npx vitest run tests/security-invoice-xss.test.ts`.

- [ ] **Tâche 2.2 : Implémentation d'`escapeHtml` et assainissement dans `src/lib/invoice-generator.ts`**
  - **Consomme :** `src/lib/invoice-generator.ts`.
  - **Produit :** Fonction utilitaire exportée `escapeHtml(val: string | null | undefined): string` et template HTML sécurisé.
  - **1. Implémentation de l'utilitaire :**
    ```typescript
    export function escapeHtml(val: string | number | null | undefined): string {
      if (val === null || val === undefined) return "";
      const str = String(val);
      return str.replace(/[&<>"']/g, (m) => {
        switch (m) {
          case "&": return "&amp;";
          case "<": return "&lt;";
          case ">": return "&gt;";
          case '"': return "&quot;";
          case "'": return "&#39;";
          default: return m;
        }
      });
    }
    ```
  - **2. Application dans `genererHtmlFactureAbonnement` :**
    Échapper tous les champs dynamiques interpolés :
    - `escapeHtml(data.numeroFacture)`
    - `escapeHtml(data.client.nomEntreprise)`
    - `escapeHtml(data.client.ville)`
    - `escapeHtml(data.client.adresse)`
    - `escapeHtml(data.client.telephone)`
    - `escapeHtml(data.client.email)`
    - `escapeHtml(data.client.ifu)`
    - `escapeHtml(data.forfaitNom)`
    - `escapeHtml(data.referenceFedaPay)`
  - **3. Validation :** `npx vitest run tests/security-invoice-xss.test.ts` et `npx vitest run tests/invoice-pdf-security.test.ts`.

---

### Chantier 3 : Bouclier Anti-Bruteforce & Anti-Spam Tiers (Conclusions #3 & #5)

- [ ] **Tâche 3.1 : Tests d'intégration du Rate Limiting étendu**
  - **Consomme :** `src/lib/rate-limit.ts`.
  - **Produit :** `tests/security-rate-limiting-extended.test.ts`.
  - **1. Test unitaire :**
    ```typescript
    import { describe, it, expect } from "vitest";
    import { checkRateLimit, resetRateLimit } from "../src/lib/rate-limit";

    describe("Sentinelle Sécurité — Limitation de Débit Étendue", () => {
      it("doit bloquer le login Super-Admin après 5 tentatives échouées sur 5 minutes", () => {
        const key = "sa:login:admin-test@djoonoo.com";
        resetRateLimit(key);

        for (let i = 0; i < 5; i++) {
          const res = checkRateLimit(key, 5, 300);
          expect(res.allowed).toBe(true);
        }

        const bloque = checkRateLimit(key, 5, 300);
        expect(bloque.allowed).toBe(false);
        expect(bloque.resetInSeconds).toBeGreaterThan(0);
      });

      it("doit bloquer le renvoi excessif d'emails d'invitation après 3 envois en 5 minutes", () => {
        const key = "email:invite:emp-test-123";
        resetRateLimit(key);

        expect(checkRateLimit(key, 3, 300).allowed).toBe(true);
        expect(checkRateLimit(key, 3, 300).allowed).toBe(true);
        expect(checkRateLimit(key, 3, 300).allowed).toBe(true);

        const spam = checkRateLimit(key, 3, 300);
        expect(spam.allowed).toBe(false);
      });
    });
    ```
  - **2. Commande d'exécution :** `npx vitest run tests/security-rate-limiting-extended.test.ts`.

- [ ] **Tâche 3.2 : Application du Rate Limiting dans les Server Actions ciblées**
  - **Consomme :** `checkRateLimit` de `src/lib/rate-limit.ts`.
  - **Produit :**
    - `src/app/actions/super-admin.ts` : Dans `connecterSuperAdminAction`, ajouter :
      ```typescript
      const rateLimit = checkRateLimit(`sa:login:${cleanEmail}`, 5, 300);
      if (!rateLimit.allowed) {
        return {
          success: false,
          error: `Trop de tentatives de connexion Super-Admin. Réessayez dans ${rateLimit.resetInSeconds} secondes.`,
        };
      }
      ```
    - `src/app/actions/auth.ts` : Dans `validerDeuxFaInscriptionAction`, ajouter :
      ```typescript
      const rateLimit = checkRateLimit(`totp-signup:${userId}`, 5, 300);
      if (!rateLimit.allowed) {
        return {
          success: false,
          error: `Trop de tentatives de validation 2FA. Réessayez dans ${rateLimit.resetInSeconds} secondes.`,
        };
      }
      ```
    - `src/app/actions/employes.ts` : Dans `renvoyerInvitationAction`, ajouter :
      ```typescript
      const rateLimit = checkRateLimit(`email:invite:${employeId}`, 3, 300);
      if (!rateLimit.allowed) {
        return {
          success: false,
          error: `Un email d'invitation a déjà été envoyé récemment. Veuillez patienter ${rateLimit.resetInSeconds} secondes avant de renvoyer.`,
        };
      }
      ```
    - `src/app/actions/subscription.ts` : Dans `initierPaiementAbonnementAction`, ajouter :
      ```typescript
      const rateLimit = checkRateLimit(`fedapay:tx:${session.compteId}`, 5, 300);
      if (!rateLimit.allowed) {
        return {
          success: false,
          error: `Trop d'initiations de paiement en cours. Veuillez patienter ${rateLimit.resetInSeconds} secondes avant de réessayer.`,
        };
      }
      ```
  - **3. Validation :** `npx vitest run tests/security-rate-limiting-extended.test.ts`.

---

### Chantier 4 : Colmatage de la Fuite d'Erreur SQL Brute (Conclusion #4)

- [ ] **Tâche 4.1 : Test sentinelle contre la fuite d'erreur à l'inscription**
  - **Consomme :** `src/lib/safe-action.ts`.
  - **Produit :** `tests/security-safe-errors.test.ts` enrichi.
  - **1. Test unitaire :**
    Vérifier que `formatSafeError(new Error("Unique constraint failed on the fields: (email) ... SELECT ..."))` ne contient ni `SELECT`, ni `Unique constraint`, ni `fields`.
  - **2. Commande :** `npx vitest run tests/security-safe-errors.test.ts`.

- [ ] **Tâche 4.2 : Sécurisation du catch dans `inscrirePatronAction`**
  - **Consomme :** `formatSafeError` de `src/lib/safe-action.ts`.
  - **Produit :** `src/app/actions/auth.ts:280-285` nettoyé.
  - **1. Modification :**
    Remplacer :
    ```typescript
    error: "Erreur lors de la création du compte : " + (dbError.message || "Impossible de contacter la base de données."),
    ```
    Par :
    ```typescript
    error: formatSafeError(
      dbError,
      "Une erreur est survenue lors de la création du compte. Vérifie tes informations et réessaie."
    ),
    ```
  - **2. Validation :** `npx vitest run tests/security-safe-errors.test.ts` et `npx vitest run tests/inscription-patron.test.ts`.

---

### Chantier 5 : Verrouillage au Boot du Serveur Next.js (Conclusion #7)

- [ ] **Tâche 5.1 : Création du hook natif `src/instrumentation.ts`**
  - **Consomme :** `src/lib/env.ts`.
  - **Produit :** `src/instrumentation.ts`.
  - **1. Implémentation complète :**
    ```typescript
    export async function register() {
      // Exécuté une seule fois côté serveur au démarrage de Next.js
      if (process.env.NEXT_RUNTIME === "nodejs") {
        const { validateEnv } = await import("@/lib/env");
        validateEnv();
      }
    }
    ```
  - **2. Test unitaire de validation :** Créer `tests/security-instrumentation.test.ts` :
    ```typescript
    import { describe, it, expect, vi } from "vitest";

    describe("Sentinelle Sécurité — Boot Fail-Fast Next.js (instrumentation.ts)", () => {
      it("doit invoquer validateEnv lors de register() sous environnement nodejs", async () => {
        process.env.NEXT_RUNTIME = "nodejs";
        const { register } = await import("../src/instrumentation");
        expect(typeof register).toBe("function");
        await expect(register()).resolves.not.toThrow();
      });
    });
    ```
  - **3. Validation :** `npx vitest run tests/security-instrumentation.test.ts`.

---

### Chantier 6 : Brancher les Schémas Zod Partout

- [ ] **Tâche 6.1 : Test d'intégration Zod sur l'authentification et les boutiques**
  - **Consomme :** `src/lib/validations/index.ts`.
  - **Produit :** `tests/security-zod-integration.test.ts`.
  - **1. Test unitaire :**
    Tester le rejet sur mot de passe < 6 caractères, email malformé, et nom de boutique vide via `AuthLoginSchema` et `BoutiqueInputSchema`.
  - **2. Commande :** `npx vitest run tests/security-zod-integration.test.ts`.

- [ ] **Tâche 6.2 : Branchement Zod dans `connecterAction` et `creerBoutiqueAction`**
  - **Consomme :** `AuthLoginSchema`, `Auth2FASchema`, `BoutiqueInputSchema` de `src/lib/validations/index.ts`.
  - **Produit :** `src/app/actions/auth.ts` et `src/app/actions/boutiques.ts`.
  - **1. Dans `connecterAction` ([src/app/actions/auth.ts](file:///c:/Users/C%C3%A9dric/Downloads/Africavibecoding/facturepro/djoonoo/src/app/actions/auth.ts)) :**
    Valider les entrées au tout début avec `AuthLoginSchema.safeParse({ email, mot_de_passe: motDePasse })`. Si échec, renvoyer immédiatement la première erreur de validation Zod.
  - **2. Dans `validerDeuxFaConnexionAction` :**
    Valider le code avec `Auth2FASchema.safeParse({ code })`.
  - **3. Dans `creerBoutiqueAction` ([src/app/actions/boutiques.ts](file:///c:/Users/C%C3%A9dric/Downloads/Africavibecoding/facturepro/djoonoo/src/app/actions/boutiques.ts)) :**
    Valider les champs avec `BoutiqueInputSchema.safeParse({ nom, ville, adresse, secteur_activite: secteurActivite, telephone })`.
  - **4. Validation :** `npx vitest run tests/security-zod-integration.test.ts` et `npx vitest run tests/modifier-boutique.test.ts`.

---

## CONTRÔLE FINAL DE VALIDATION
1. **Compilation TypeScript sans erreur** : `npx tsc --noEmit` -> Code 0.
2. **Suite complète de tests au vert** : `npx vitest run` -> 100% des tests passants (anciens + nouveaux tests sentinelles).
3. **Commit git atomique certifié** : Enregistrement sur la branche principale avec documentation des remédiations.
