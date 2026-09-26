# Plan d'Implémentation : Intégration FedaPay & Refonte du Cycle de Vie SaaS

> **Pour l'agent d'exécution :** Chaque tâche est jalonnée de cases à cocher (`- [ ]`). Validez chaque micro-étape séquentiellement en respectant le protocole TDD strict (test en échec → code minimal → test au vert → commit).

**Objectif :** Transformer le cycle de vie des abonnements de djoonoo en un parcours SaaS moderne, autonome et sécurisé : choix du forfait par le Patron, intégration de la passerelle de paiement FedaPay (MTN MoMo, Moov Money, Cartes bancaires), fin du délai de grâce indu sur la période d'essai (14 jours stricts), mode lecture seule pour les comptes suspendus (accès conservé aux données historiques) et durée de forfait dynamique en base.

**Architecture :**
- Architecture adaptateur de paiement autour du SDK/API REST FedaPay avec vérification cryptographique des signatures Webhook (HMAC SHA-256) et protection anti-rejeu par horodatage.
- Découplage strict entre la période d'essai (14 jours sans grâce) et les renouvellements de clients payants (7 jours de grâce en cas d'impayé).
- Protection applicative uniforme du mode lecture seule : connexion autorisée, consultation préservée, blocage serveur des mutations (`COMPTE_SUSPENDU`).
- Traçabilité et supervision temps réel sur le tableau de bord Super-Admin sans blocage sur l'activation.

**Pile technique :**
- Next.js 15.3 (App Router, Server Actions, Route Handlers)
- Prisma ORM 6.7 + PostgreSQL Supabase
- FedaPay REST API v1 / SDK Node.js (`fedapay`)
- Vitest / Node Test Runner pour la suite de tests unitaires
- Tailwind CSS / Vanilla tokens djoonoo (`#C1652D`, `#FAF6F1`, `#2B2119`)

**Spécification source :**
- [`.agents/rules/05-forfaits-et-abonnements.md`](file:///c:/Users/Cédric/Downloads/Africavibecoding/facturepro/djoonoo/.agents/rules/05-forfaits-et-abonnements.md)
- [`.agents/rules/07-securite-multitenant-cycledevie.md`](file:///c:/Users/Cédric/Downloads/Africavibecoding/facturepro/djoonoo/.agents/rules/07-securite-multitenant-cycledevie.md)
- [`.agents/rules/06-dashboard-super-admin.md`](file:///c:/Users/Cédric/Downloads/Africavibecoding/facturepro/djoonoo/.agents/rules/06-dashboard-super-admin.md)
- [`.agents/rules/10-decisions-audit-et-zones-resolues.md`](file:///c:/Users/Cédric/Downloads/Africavibecoding/facturepro/djoonoo/.agents/rules/10-decisions-audit-et-zones-resolues.md) (Décisions H21 à H24)

---

## Contraintes Globales
- **Aucune prise en main du navigateur** : Toute vérification est effectuée via tests automatisés ou requêtes HTTP `curl`.
- **Zéro fuite de termes techniques** côté utilisateur final (aucun terme d'infrastructure dans l'UI).
- **Sécurité maximale sur les paiements** : Rejet systématique de tout webhook sans signature valide (`X-FEDAPAY-SIGNATURE`) ou dont l'horodatage dérive de plus de 300 secondes. Idempotence garantie par clé unique en base de données.
- **Préservation de la charte graphique** : `#FAF6F1` (fond), `#2B2119` (texte), `#C1652D` (accent unique), tutoiement constant.

## Focus de Revue Critique (Top 5 des angles morts potentiels)
1. **Attaque par rejeu de webhook FedaPay** : Un attaquant qui capture une requête webhook valide tente de la rejouer pour prolonger indûment un abonnement. *Contremesure : vérification de l'horodatage signed timestamp (< 300s) + vérification d'idempotence sur l'ID de transaction unique.*
2. **Latence réseau et retries FedaPay** : FedaPay réémet les webhooks jusqu'à 9 fois en cas de réponse lente. *Contremesure : traitement idempotent atomique dans une transaction Prisma et réponse HTTP 200 immédiate.*
3. **Contournement du mode lecture seule** : Un utilisateur avec un compte suspendu qui tente de court-circuiter l'UI via des requêtes API/Server Actions directes. *Contremesure : vérification systématique de `statut_abonnement !== 'suspendu'` au tout début de chaque Server Action de mutation (`creerVente`, `ajouterProduit`, `modifierPrix`, `creerBoutique`, etc.).*
4. **Transition d'essai non payé** : S'assurer que le cron quotidien ne bascule jamais un essai expiré en `impaye` (qui donnerait 7 jours gratuits de plus), mais bien directement en `suspendu`.
5. **Comptes existants et rétrocompatibilité** : La colonne `forfaits.duree_jours` doit avoir une valeur par défaut de `30` pour ne pas casser les forfaits existants en base.

---

## Tâche 1 : Évolution du Schéma Prisma & Migration Base de Données

### Description & Objectif
Ajouter la colonne `duree_jours` au modèle `forfaits` et la colonne `cle_idempotence` au modèle `factures_abonnement`, synchroniser le schéma avec la base Supabase et mettre à jour le script de seed.

### Contrat d'Interface
- **Consomme :** Fichier [`prisma/schema.prisma`](file:///c:/Users/Cédric/Downloads/Africavibecoding/facturepro/djoonoo/prisma/schema.prisma)
- **Produit :** Schéma synchronisé, client Prisma régénéré, types TypeScript à jour avec `duree_jours` et `cle_idempotence`.

### Micro-étapes TDD :

- [ ] **1.1 Test unitaire de validation du schéma Prisma**
  Créer le fichier de test `tests/schema-forfaits.test.ts` :
  ```typescript
  import { describe, it, expect } from "vitest";
  import { prisma } from "../src/lib/prisma";

  describe("Schéma Forfaits & Factures Abonnement", () => {
    it("doit comporter le champ duree_jours sur les forfaits avec une valeur par défaut de 30", async () => {
      const forfaits = await prisma.forfaits.findMany();
      expect(forfaits.length).toBeGreaterThan(0);
      for (const f of forfaits) {
        expect(f.duree_jours).toBeDefined();
        expect(typeof f.duree_jours).toBe("number");
        expect(f.duree_jours).toBeGreaterThan(0);
      }
    });

    it("doit permettre le stockage de cle_idempotence sur factures_abonnement", async () => {
      const compte = await prisma.comptes.findFirst();
      if (!compte) return; // Si base vide de test
      const testKey = "test_idem_" + Date.now();
      const facture = await prisma.factures_abonnement.create({
        data: {
          compte_id: compte.id,
          montant: 5000,
          statut: "en_attente",
          fournisseur_paiement: "fedapay",
          cle_idempotence: testKey,
          date_echeance: new Date(),
        },
      });
      expect(facture.cle_idempotence).toBe(testKey);
      await prisma.factures_abonnement.delete({ where: { id: facture.id } });
    });
  });
  ```

- [ ] **1.2 Exécuter le test et vérifier son échec initial**
  ```powershell
  npx vitest run tests/schema-forfaits.test.ts
  ```
  *Erreur attendue : Property 'duree_jours' does not exist on type 'forfaits'.*

- [ ] **1.3 Mettre à jour `prisma/schema.prisma`**
  Modifier les modèles `forfaits` et `factures_abonnement` :
  ```prisma
  model forfaits {
    id                        String  @id @default(uuid())
    nom                       String
    max_boutiques             Int?
    max_employes_par_boutique Int?
    prix_mensuel              Int
    duree_jours               Int     @default(30)
    actif                     Boolean @default(true)

    comptes comptes[]
  }

  model factures_abonnement {
    id                          String                  @id @default(uuid())
    compte_id                   String
    montant                     Int
    statut                      StatutFactureAbonnement @default(en_attente)
    fournisseur_paiement        String                  @default("fedapay")
    reference_externe           String?
    cle_idempotence             String?                 @unique
    confirme_par_super_admin_id String?
    date_echeance               DateTime
    date_confirmation           DateTime?

    compte comptes @relation(fields: [compte_id], references: [id])

    @@index([compte_id])
  }
  ```

- [ ] **1.4 Pousser les modifications en base et régénérer le client**
  ```powershell
  npx prisma db push
  npx prisma generate
  ```

- [ ] **1.5 Mettre à jour le seed (`prisma/seed.ts`)**
  S'assurer que les forfaits créés incluent `duree_jours: 30`.
  ```powershell
  npx tsx prisma/seed.ts
  ```

- [ ] **1.6 Exécuter le test et vérifier le passage au vert**
  ```powershell
  npx vitest run tests/schema-forfaits.test.ts
  ```

- [ ] **1.7 Commit Git atomique**
  ```powershell
  git add prisma/schema.prisma prisma/seed.ts tests/schema-forfaits.test.ts
  git commit -m "feat(prisma): ajout duree_jours forfait et cle_idempotence factures_abonnement"
  ```

---

## Tâche 2 : Correction du Moteur de Cycle de Vie & Cron (Fin de la grâce sur l'essai)

### Description & Objectif
Corriger [`src/lib/subscriptions-cron.ts`](file:///c:/Users/Cédric/Downloads/Africavibecoding/facturepro/djoonoo/src/lib/subscriptions-cron.ts) :
1. Les comptes dont l'essai de 14 jours est expiré (`date_fin_essai < maintenant`) passent **directement en `suspendu`** (mode lecture seule) sans aucune période de grâce.
2. Les comptes dont l'abonnement payé est expiré (`date_fin_periode_courante < maintenant`) passent en `impaye` avec une période de grâce de 7 jours (`delai_grace_jours`).
3. Les comptes en `impaye` dont la grâce est dépassée passent en `suspendu`.

### Contrat d'Interface
- **Consomme :** `prisma.comptes`, `prisma.parametres_plateforme`, `prisma.factures_abonnement`
- **Produit :** Fonction `executerCycleAbonnements(): Promise<RapportCycleAbonnements>` avec logique de transition conforme aux décisions H22 & H23.

### Micro-étapes TDD :

- [ ] **2.1 Écrire le test unitaire du cycle de vie**
  Créer `tests/subscriptions-cron.test.ts` :
  ```typescript
  import { describe, it, expect, beforeEach } from "vitest";
  import { prisma } from "../src/lib/prisma";
  import { executerCycleAbonnements } from "../src/lib/subscriptions-cron";
  import { StatutAbonnement } from "@prisma/client";

  describe("Moteur du Cycle de Vie des Abonnements", () => {
    it("doit suspendre DIRECTEMENT un compte d'essai expiré sans lui accorder de délai de grâce", async () => {
      const forfait = await prisma.forfaits.findFirst();
      const codeTest = "TST" + Math.floor(Math.random() * 899 + 100);
      
      const hier = new Date();
      hier.setDate(hier.getDate() - 1);

      // Création d'un compte avec essai expiré hier
      const compteTest = await prisma.comptes.create({
        data: {
          code: codeTest,
          nom_entreprise: "Test Essai Expiré",
          email_principal: `test-${codeTest}@test.com`,
          forfait_id: forfait!.id,
          statut_abonnement: StatutAbonnement.essai,
          telephone_principal: "+22901000000",
          ville: "Cotonou",
          date_fin_essai: hier,
        },
      });

      // Exécution du cron
      const rapport = await executerCycleAbonnements();
      expect(rapport.success).toBe(true);

      // Vérification : le compte doit être 'suspendu' et NON 'impaye'
      const compteApres = await prisma.comptes.findUnique({
        where: { id: compteTest.id },
      });
      expect(compteApres?.statut_abonnement).toBe(StatutAbonnement.suspendu);

      // Nettoyage
      await prisma.comptes.delete({ where: { id: compteTest.id } });
    });

    it("doit passer un compte ACTIF dont la période est échue en IMPAYE avec un délai de grâce", async () => {
      const forfait = await prisma.forfaits.findFirst();
      const codeTest = "ACT" + Math.floor(Math.random() * 899 + 100);
      
      const hier = new Date();
      hier.setDate(hier.getDate() - 1);

      const compteTest = await prisma.comptes.create({
        data: {
          code: codeTest,
          nom_entreprise: "Test Actif Expiré",
          email_principal: `test-${codeTest}@test.com`,
          forfait_id: forfait!.id,
          statut_abonnement: StatutAbonnement.actif,
          telephone_principal: "+22901000001",
          ville: "Cotonou",
          date_fin_periode_courante: hier,
        },
      });

      const rapport = await executerCycleAbonnements();
      expect(rapport.success).toBe(true);

      const compteApres = await prisma.comptes.findUnique({
        where: { id: compteTest.id },
      });
      expect(compteApres?.statut_abonnement).toBe(StatutAbonnement.impaye);

      // Nettoyage
      await prisma.factures_abonnement.deleteMany({ where: { compte_id: compteTest.id } });
      await prisma.comptes.delete({ where: { id: compteTest.id } });
    });
  });
  ```

- [ ] **2.2 Exécuter le test et vérifier son échec**
  ```powershell
  npx vitest run tests/subscriptions-cron.test.ts
  ```
  *Erreur attendue : AssertionError: expected 'impaye' to be 'suspendu' pour le premier test.*

- [ ] **2.3 Implémenter la logique corrigée dans `src/lib/subscriptions-cron.ts`**
  Dans `executerCycleAbonnements()` :
  - **Phase 1 (Essais expirés)** :
    ```typescript
    // Les comptes en essai dont la date_fin_essai est dépassée passent directement en SUSPENDU (Décision H22)
    for (const compte of comptesEssaiExpires) {
      await prisma.comptes.update({
        where: { id: compte.id },
        data: { statut_abonnement: StatutAbonnement.suspendu },
      });

      if (superAdminSysteme) {
        await prisma.journal_audit_plateforme.create({
          data: {
            super_admin_id: adminId,
            action: "suspension_fin_essai",
            compte_cible_id: compte.id,
            details: {
              nom_entreprise: compte.nom_entreprise,
              date_fin_essai: compte.date_fin_essai?.toISOString(),
              motif: "Fin des 14 jours d'essai sans souscription",
            },
          },
        });
      }

      rapport.stats.comptesSuspendus++;
      rapport.details.suspensions.push({
        compteId: compte.id,
        nomEntreprise: compte.nom_entreprise,
        dateEcheance: compte.date_fin_essai || maintenant,
      });
    }
    ```
  - **Phase 2 (Périodes actives échues)** : maintien du passage en `impaye` avec création d'une facture de renouvellement ayant pour date d'échéance `maintenant + delaiGraceJours`.
  - **Phase 3 (Grâce dépassée)** : passage des comptes `impaye` en `suspendu`.

- [ ] **2.4 Exécuter le test et vérifier le passage au vert**
  ```powershell
  npx vitest run tests/subscriptions-cron.test.ts
  ```

- [ ] **2.5 Commit Git atomique**
  ```powershell
  git add src/lib/subscriptions-cron.ts tests/subscriptions-cron.test.ts
  git commit -m "fix(subscription): fin de la grâce sur essai gratuit, transition directe en suspendu"
  ```

---

## Tâche 3 : Module d'Intégration Sécurisée FedaPay (`src/lib/fedapay.ts`)

### Description & Objectif
Créer le module central FedaPay encapsulant :
1. La création de transaction et la génération du lien de paiement sécurisé.
2. La vérification cryptographique rigoureuse de la signature webhook (`X-FEDAPAY-SIGNATURE`) via HMAC SHA-256 avec validation de l'horodatage (< 300s).
3. Le traitement idempotent atomique des événements `transaction.approved` pour activer ou renouveler un abonnement selon `forfait.duree_jours`.

### Contrat d'Interface
- **Consomme :** Variables d'environnement `FEDAPAY_SECRET_KEY`, `FEDAPAY_PUBLIC_KEY`, `FEDAPAY_WEBHOOK_SECRET`, `FEDAPAY_ENVIRONMENT`, `NEXT_PUBLIC_APP_URL`
- **Produit :**
  - `creerTransactionFedaPay(params: InitPaiementParams): Promise<{ urlPaiement: string; transactionId: number }>`
  - `verifierSignatureFedaPay(rawBody: string, signatureHeader: string): boolean`
  - `traiterWebhookFedaPay(payload: any): Promise<{ succes: boolean; message: string; compteId?: string }>`

### Micro-étapes TDD :

- [ ] **3.1 Installer la dépendance officielle ou module helper**
  Vérifier ou installer `fedapay` :
  ```powershell
  npm install fedapay
  ```

- [ ] **3.2 Écrire le test unitaire de sécurité cryptographique FedaPay**
  Créer `tests/fedapay-security.test.ts` :
  ```typescript
  import { describe, it, expect } from "vitest";
  import crypto from "crypto";
  import { verifierSignatureFedaPay } from "../src/lib/fedapay";

  describe("Sécurité Cryptographique FedaPay", () => {
    const secretTest = "wh_test_secret_key_123456";
    const bodyTest = JSON.stringify({
      name: "transaction.approved",
      entity: { id: 9999, status: "approved", amount: 15000 },
    });

    it("doit valider une signature HMAC SHA-256 valide avec horodatage récent", () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const toSign = `${timestamp}.${bodyTest}`;
      const hash = crypto.createHmac("sha256", secretTest).update(toSign).digest("hex");
      const signatureHeader = `t=${timestamp},s=${hash}`;

      const valide = verifierSignatureFedaPay(bodyTest, signatureHeader, secretTest);
      expect(valide).toBe(true);
    });

    it("doit rejeter un webhook dont l'horodatage est antérieur à 5 minutes (protection anti-rejeu)", () => {
      const vieuxTimestamp = Math.floor(Date.now() / 1000) - 400; // 400s en arrière (>300s)
      const toSign = `${vieuxTimestamp}.${bodyTest}`;
      const hash = crypto.createHmac("sha256", secretTest).update(toSign).digest("hex");
      const signatureHeader = `t=${vieuxTimestamp},s=${hash}`;

      const valide = verifierSignatureFedaPay(bodyTest, signatureHeader, secretTest);
      expect(valide).toBe(false);
    });

    it("doit rejeter une signature altérée ou falsifiée", () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const signatureHeader = `t=${timestamp},s=mauvaisesignaturefalsifiee12345`;

      const valide = verifierSignatureFedaPay(bodyTest, signatureHeader, secretTest);
      expect(valide).toBe(false);
    });
  });
  ```

- [ ] **3.3 Exécuter le test et vérifier son échec initial**
  ```powershell
  npx vitest run tests/fedapay-security.test.ts
  ```
  *Erreur attendue : Cannot find module '../src/lib/fedapay'.*

- [ ] **3.4 Implémenter `src/lib/fedapay.ts`**
  Rédiger l'implémentation complète avec gestion de la signature HMAC SHA-256, tolérance de 300s, appel à l'API FedaPay (`/v1/transactions` et `/v1/transactions/{id}/token`) et traitement atomique Prisma d'activation :
  ```typescript
  import crypto from "crypto";
  import { prisma } from "./prisma";
  import { StatutAbonnement, StatutFactureAbonnement } from "@prisma/client";

  const FEDAPAY_SECRET_KEY = process.env.FEDAPAY_SECRET_KEY || "";
  const FEDAPAY_WEBHOOK_SECRET = process.env.FEDAPAY_WEBHOOK_SECRET || "";
  const FEDAPAY_ENVIRONMENT = process.env.FEDAPAY_ENVIRONMENT || "sandbox";

  const BASE_URL =
    FEDAPAY_ENVIRONMENT === "live"
      ? "https://api.fedapay.com/v1"
      : "https://sandbox-api.fedapay.com/v1";

  export interface InitPaiementParams {
    compteId: string;
    forfaitId: string;
    montant: number;
    email: string;
    nom: string;
    telephone: string;
    callbackUrl: string;
  }

  /**
   * Initialise une transaction FedaPay et génère l'URL du guichet de paiement
   */
  export async function creerTransactionFedaPay(params: InitPaiementParams) {
    if (!FEDAPAY_SECRET_KEY) {
      throw new Error("Clé secrète FedaPay (FEDAPAY_SECRET_KEY) non configurée.");
    }

    // 1. Récupérer le forfait
    const forfait = await prisma.forfaits.findUnique({
      where: { id: params.forfaitId },
    });
    if (!forfait) {
      throw new Error("Forfait introuvable.");
    }

    // 2. Créer une facture en attente
    const echeance = new Date();
    echeance.setDate(echeance.getDate() + 1); // 24h pour payer la transaction initiée

    const facture = await prisma.factures_abonnement.create({
      data: {
        compte_id: params.compteId,
        montant: params.montant,
        statut: StatutFactureAbonnement.en_attente,
        fournisseur_paiement: "fedapay",
        date_echeance: echeance,
      },
    });

    // 3. Appel API FedaPay pour créer la transaction
    const resp = await fetch(`${BASE_URL}/transactions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FEDAPAY_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        description: `Abonnement djoonoo — Forfait ${forfait.nom}`,
        amount: params.montant,
        currency: { iso: "XOF" },
        callback_url: params.callbackUrl,
        customer: {
          firstname: params.nom.split(" ")[0] || "Client",
          lastname: params.nom.split(" ").slice(1).join(" ") || "djoonoo",
          email: params.email,
          phone_number: {
            number: params.telephone.replace(/[^0-9]/g, ""),
            country: "BJ",
          },
        },
        custom_metadata: {
          compte_id: params.compteId,
          facture_id: facture.id,
          forfait_id: forfait.id,
        },
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("Erreur création transaction FedaPay :", errText);
      throw new Error("Impossible de créer la transaction chez le prestataire de paiement.");
    }

    const txData = await resp.json();
    const transactionId = txData.v1?.id || txData.id;

    // 4. Générer le token / lien de paiement
    const tokenResp = await fetch(`${BASE_URL}/transactions/${transactionId}/token`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FEDAPAY_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!tokenResp.ok) {
      const errToken = await tokenResp.text();
      console.error("Erreur génération token FedaPay :", errToken);
      throw new Error("Impossible de générer le guichet de paiement.");
    }

    const tokenData = await tokenResp.json();
    const paymentUrl = tokenData.url;

    // Mise à jour de la référence externe sur la facture
    await prisma.factures_abonnement.update({
      where: { id: facture.id },
      data: { reference_externe: String(transactionId) },
    });

    return {
      urlPaiement: paymentUrl,
      transactionId: transactionId,
      factureId: facture.id,
    };
  }

  /**
   * Vérifie la signature cryptographique du Webhook FedaPay
   * Format attendu: "t=123456789,s=abcdef..." ou signature brute
   */
  export function verifierSignatureFedaPay(
    rawBody: string,
    signatureHeader: string,
    secret: string = FEDAPAY_WEBHOOK_SECRET
  ): boolean {
    if (!signatureHeader || !secret) return false;

    try {
      let timestamp = 0;
      let signature = "";

      if (signatureHeader.includes("t=") && signatureHeader.includes("s=")) {
        const parts = signatureHeader.split(",");
        for (const p of parts) {
          const [k, v] = p.trim().split("=");
          if (k === "t") timestamp = parseInt(v, 10);
          if (k === "s") signature = v;
        }
      } else {
        // Fallback signature directe sans timestamp
        signature = signatureHeader;
      }

      // Vérification anti-rejeu si timestamp présent (tolérance 300s)
      if (timestamp > 0) {
        const now = Math.floor(Date.now() / 1000);
        if (Math.abs(now - timestamp) > 300) {
          console.warn("[FedaPay Webhook] Horodatage rejeté (rejeu suspect) :", { timestamp, now });
          return false;
        }
      }

      const toSign = timestamp > 0 ? `${timestamp}.${rawBody}` : rawBody;
      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(toSign)
        .digest("hex");

      return crypto.timingSafeEqual(
        Buffer.from(signature, "hex"),
        Buffer.from(expectedSignature, "hex")
      );
    } catch (err) {
      console.error("[FedaPay Webhook] Erreur vérification signature :", err);
      return false;
    }
  }

  /**
   * Traitement atomique d'un événement webhook FedaPay approuvé
   */
  export async function traiterWebhookFedaPay(payload: any) {
    const eventName = payload.name;
    const entity = payload.entity;

    if (!eventName || !entity) {
      return { succes: false, message: "Payload invalide." };
    }

    if (eventName !== "transaction.approved") {
      return { succes: true, message: `Événement ${eventName} ignoré.` };
    }

    const transactionId = String(entity.id);
    const customMetadata = entity.custom_metadata || {};
    const factureId = customMetadata.facture_id;
    const compteId = customMetadata.compte_id;
    const forfaitId = customMetadata.forfait_id;

    // Idempotence : vérifier si la transaction ou la facture a déjà été validée
    const facture = await prisma.factures_abonnement.findFirst({
      where: {
        OR: [
          { id: factureId },
          { reference_externe: transactionId },
          { cle_idempotence: `fedapay_${transactionId}` },
        ],
      },
      include: { compte: { include: { forfait: true } } },
    });

    if (!facture) {
      console.error("[FedaPay Webhook] Aucune facture trouvée pour la transaction :", transactionId);
      return { succes: false, message: "Facture introuvable." };
    }

    if (facture.statut === StatutFactureAbonnement.payee) {
      // Déjà traité, réponse idempotente 200
      return { succes: true, message: "Transaction déjà validée." };
    }

    const targetForfaitId = forfaitId || facture.compte.forfait_id;
    const forfait = await prisma.forfaits.findUnique({
      where: { id: targetForfaitId },
    });
    const dureeJours = forfait?.duree_jours || 30;

    const maintenant = new Date();
    const dateFin = new Date(maintenant);
    dateFin.setDate(dateFin.getDate() + dureeJours);

    // Transaction atomique PostgreSQL
    await prisma.$transaction(async (tx) => {
      // 1. Mettre à jour la facture d'abonnement
      await tx.factures_abonnement.update({
        where: { id: facture.id },
        data: {
          statut: StatutFactureAbonnement.payee,
          reference_externe: transactionId,
          cle_idempotence: `fedapay_${transactionId}`,
          date_confirmation: maintenant,
        },
      });

      // 2. Activer / renouveler le compte
      await tx.comptes.update({
        where: { id: facture.compte_id },
        data: {
          statut_abonnement: StatutAbonnement.actif,
          forfait_id: targetForfaitId,
          date_debut_periode_courante: maintenant,
          date_fin_periode_courante: dateFin,
        },
      });

      // 3. Journaliser l'encaissement automatique
      await tx.journal_audit.create({
        data: {
          compte_id: facture.compte_id,
          utilisateur_id: facture.compte_id, // Identifiant système
          action: "paiement_abonnement_fedapay",
          entite_concernee: "abonnements",
          entite_id: facture.id,
          details: {
            montant: facture.montant,
            transaction_id: transactionId,
            forfait_nom: forfait?.nom,
            duree_jours: dureeJours,
            nouvelle_echeance: dateFin.toISOString(),
          },
        },
      });
    });

    console.log(`✅ [FedaPay] Compte ${facture.compte_id} activé/renouvelé avec succès jusqu'au ${dateFin.toLocaleDateString()}`);
    return { succes: true, message: "Abonnement activé avec succès.", compteId: facture.compte_id };
  }
  ```

- [ ] **3.5 Exécuter le test et vérifier le passage au vert**
  ```powershell
  npx vitest run tests/fedapay-security.test.ts
  ```

- [ ] **3.6 Commit Git atomique**
  ```powershell
  git add src/lib/fedapay.ts tests/fedapay-security.test.ts package.json package-lock.json
  git commit -m "feat(fedapay): module d'initiation et vérification sécurisée des paiements en ligne"
  ```

---

## Tâche 4 : Route Handler Webhook Sécurisée (`src/app/api/webhooks/fedapay/route.ts`)

### Description & Objectif
Créer le point de terminaison HTTP `POST /api/webhooks/fedapay` qui reçoit les notifications de FedaPay, vérifie la signature de sécurité, gère l'idempotence et répond immédiatement en HTTP 200.

### Contrat d'Interface
- **Consomme :** Requête HTTP POST avec corps brut (`req.text()`) et en-tête `x-fedapay-signature`
- **Produit :** Réponse HTTP 200 `{"received": true}` ou HTTP 400 en cas de signature invalide.

### Micro-étapes TDD :

- [ ] **4.1 Écrire le test d'intégration du Webhook API**
  Créer `tests/fedapay-webhook-route.test.ts` :
  ```typescript
  import { describe, it, expect } from "vitest";
  import { POST } from "../src/app/api/webhooks/fedapay/route";

  describe("Point de terminaison Webhook FedaPay", () => {
    it("doit renvoyer un statut 400 si l'en-tête de signature est manquant", async () => {
      const req = new Request("http://localhost:3000/api/webhooks/fedapay", {
        method: "POST",
        body: JSON.stringify({ name: "transaction.approved" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Signature");
    });
  });
  ```

- [ ] **4.2 Exécuter le test et vérifier son échec initial**
  ```powershell
  npx vitest run tests/fedapay-webhook-route.test.ts
  ```

- [ ] **4.3 Implémenter `src/app/api/webhooks/fedapay/route.ts`**
  ```typescript
  import { NextRequest, NextResponse } from "next/server";
  import { verifierSignatureFedaPay, traiterWebhookFedaPay } from "@/lib/fedapay";

  export async function POST(req: NextRequest) {
    try {
      const signature = req.headers.get("x-fedapay-signature") || "";
      if (!signature) {
        return NextResponse.json(
          { error: "Signature de webhook FedaPay manquante." },
          { status: 400 }
        );
      }

      const rawBody = await req.text();

      // Vérification cryptographique HMAC SHA-256 + anti-rejeu
      const estValide = verifierSignatureFedaPay(rawBody, signature);
      if (!estValide) {
        console.warn("⚠️ [FedaPay Webhook] Tentative de webhook avec signature invalide !");
        return NextResponse.json(
          { error: "Signature de webhook FedaPay invalide." },
          { status: 400 }
        );
      }

      let payload: any;
      try {
        payload = JSON.parse(rawBody);
      } catch {
        return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
      }

      // Traitement atomique idempotent
      const resultat = await traiterWebhookFedaPay(payload);

      return NextResponse.json({ received: true, detail: resultat.message }, { status: 200 });
    } catch (err: any) {
      console.error("❌ [FedaPay Webhook] Erreur interne :", err);
      return NextResponse.json(
        { error: "Erreur interne de traitement du webhook." },
        { status: 500 }
      );
    }
  }
  ```

- [ ] **4.4 Exécuter le test et vérifier le passage au vert**
  ```powershell
  npx vitest run tests/fedapay-webhook-route.test.ts
  ```

- [ ] **4.5 Commit Git atomique**
  ```powershell
  git add src/app/api/webhooks/fedapay/route.ts tests/fedapay-webhook-route.test.ts
  git commit -m "feat(api): route handler webhook fedapay avec vérification signature et idempotence"
  ```

---

## Tâche 5 : Mode Lecture Seule pour Comptes Suspendus & Déblocage Connexion

### Description & Objectif
1. Supprimer le blocage de connexion dans `src/app/actions/auth.ts` : les utilisateurs de comptes suspendus peuvent se connecter.
2. Ajouter le garde d'écriture `COMPTE_SUSPENDU` dans les Server Actions de mutation :
   - `creerVenteAction` / `enregistrerPaiementVenteAction` dans [`src/app/actions/sales.ts`](file:///c:/Users/Cédric/Downloads/Africavibecoding/facturepro/djoonoo/src/app/actions/sales.ts)
   - `creerProduitAction` / `modifierPrixAction` dans [`src/app/actions/products.ts`](file:///c:/Users/Cédric/Downloads/Africavibecoding/facturepro/djoonoo/src/app/actions/products.ts)
   - `creerBoutiqueAction` dans [`src/app/actions/shops.ts`](file:///c:/Users/Cédric/Downloads/Africavibecoding/facturepro/djoonoo/src/app/actions/shops.ts)
3. Créer le composant UI de bannière d'alerte et de réactivation [`src/components/BannerAbonnement.tsx`](file:///c:/Users/Cédric/Downloads/Africavibecoding/facturepro/djoonoo/src/components/BannerAbonnement.tsx).

### Contrat d'Interface
- **Consomme :** Cookie de session `djoonoo_session`, statut de compte `comptes.statut_abonnement`
- **Produit :** Connexion non bloquante, mutations rejetées si suspendu avec message explicite, bannière de réactivation affichée dans le layout du dashboard.

### Micro-étapes TDD :

- [ ] **5.1 Écrire le test unitaire du garde de mutation lecture seule**
  Créer `tests/read-only-guard.test.ts` :
  ```typescript
  import { describe, it, expect } from "vitest";
  import { verifierStatutAbonnementPourEcriture } from "../src/lib/subscription-guard";

  describe("Garde de Mutation Lecture Seule", () => {
    it("doit autoriser les mutations pour un compte actif", () => {
      const res = verifierStatutAbonnementPourEcriture("actif");
      expect(res.autorise).toBe(true);
    });

    it("doit autoriser les mutations pour un compte en essai", () => {
      const res = verifierStatutAbonnementPourEcriture("essai");
      expect(res.autorise).toBe(true);
    });

    it("doit autoriser les mutations pour un compte en impaye (grâce active)", () => {
      const res = verifierStatutAbonnementPourEcriture("impaye");
      expect(res.autorise).toBe(true);
    });

    it("doit BLOQUER les mutations pour un compte suspendu", () => {
      const res = verifierStatutAbonnementPourEcriture("suspendu");
      expect(res.autorise).toBe(false);
      expect(res.erreur).toContain("suspendu");
    });
  });
  ```

- [ ] **5.2 Exécuter le test et vérifier son échec**
  ```powershell
  npx vitest run tests/read-only-guard.test.ts
  ```

- [ ] **5.3 Créer `src/lib/subscription-guard.ts`**
  ```typescript
  export function verifierStatutAbonnementPourEcriture(statut: string | undefined): {
    autorise: boolean;
    erreur?: string;
  } {
    if (statut === "suspendu") {
      return {
        autorise: false,
        erreur:
          "Action impossible : ton compte djoonoo est actuellement en mode lecture seule suite à l'expiration de ton abonnement. Règle ton forfait pour reprendre tes ventes et la gestion de tes stocks.",
      };
    }
    if (statut === "resilie") {
      return {
        autorise: false,
        erreur: "Ton compte a été résilié. Contacte le support pour le réactiver.",
      };
    }
    return { autorise: true };
  }
  ```

- [ ] **5.4 Modifier `src/app/actions/auth.ts`**
  Supprimer les lignes 397-404 qui bloquaient la connexion des comptes suspendus. Les utilisateurs peuvent maintenant se connecter et leur session porte `statutAbonnement: "suspendu"`.

- [ ] **5.5 Protéger les Server Actions de mutation**
  Intégrer l'appel `verifierStatutAbonnementPourEcriture(session.statutAbonnement)` au début de :
  - `creerVenteAction` (`src/app/actions/sales.ts`)
  - `enregistrerPaiementVenteAction` (`src/app/actions/sales.ts`)
  - `creerProduitAction` (`src/app/actions/products.ts`)
  - `modifierPrixAction` (`src/app/actions/products.ts`)
  - `creerBoutiqueAction` (`src/app/actions/shops.ts`)

- [ ] **5.6 Créer la bannière UI `src/components/BannerAbonnement.tsx`**
  Composant affichant l'état selon `statut_abonnement` :
  - Si `suspendu` : Bannière `#C1652D` chaude invitant à régulariser en 1 clic avec bouton "Choisir un forfait & réactiver".
  - Si `impaye` : Bannière d'avertissement de délai de grâce avec décompte des jours restants.
  - Intégrer la bannière en haut du layout `src/app/dashboard/layout.tsx`.

- [ ] **5.7 Exécuter les tests et vérifier le passage au vert**
  ```powershell
  npx vitest run tests/read-only-guard.test.ts
  ```

- [ ] **5.8 Commit Git atomique**
  ```powershell
  git add src/lib/subscription-guard.ts src/app/actions/auth.ts src/app/actions/sales.ts src/app/actions/products.ts src/app/actions/shops.ts src/components/BannerAbonnement.tsx src/app/dashboard/layout.tsx tests/read-only-guard.test.ts
  git commit -m "feat(security): mode lecture seule pour les comptes suspendus et déblocage de connexion"
  ```

---

## Tâche 6 : Parcours de Choix de Forfait & Paiement en Ligne (`/dashboard/abonnement`)

### Description & Objectif
1. Créer la Server Action `initierPaiementAbonnementAction(forfaitId: string)` permettant au Patron de déclencher le paiement FedaPay.
2. Créer la page `/dashboard/abonnement` permettant au Patron de visualiser son statut, de comparer les forfaits disponibles et de cliquer pour payer via FedaPay.
3. Gérer le retour client depuis FedaPay avec message de confirmation instantané.

### Contrat d'Interface
- **Consomme :** `creerTransactionFedaPay` (`src/lib/fedapay.ts`), liste des forfaits actifs `prisma.forfaits.findMany({ where: { actif: true } })`
- **Produit :** Page `/dashboard/abonnement` et action serveur retournant l'URL FedaPay vers laquelle rediriger le Patron.

### Micro-étapes TDD :

- [ ] **6.1 Créer l'action serveur `src/app/actions/subscription.ts`**
  ```typescript
  "use server";

  import { getSession } from "@/lib/auth";
  import { prisma } from "@/lib/prisma";
  import { creerTransactionFedaPay } from "@/lib/fedapay";

  export async function initierPaiementAbonnementAction(forfaitId: string) {
    const session = await getSession();
    if (!session || session.role !== "patron") {
      return { success: false, error: "Action réservée au Patron du compte." };
    }

    const compte = await prisma.comptes.findUnique({
      where: { id: session.compteId },
      include: { forfait: true },
    });
    if (!compte) {
      return { success: false, error: "Compte introuvable." };
    }

    const forfaitCible = await prisma.forfaits.findUnique({
      where: { id: forfaitId, actif: true },
    });
    if (!forfaitCible) {
      return { success: false, error: "Forfait sélectionné non disponible." };
    }

    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const callbackUrl = `${appUrl}/dashboard/abonnement?status=verif`;

      const res = await creerTransactionFedaPay({
        compteId: compte.id,
        forfaitId: forfaitCible.id,
        montant: forfaitCible.prix_mensuel,
        email: session.email,
        nom: session.nom || compte.nom_entreprise,
        telephone: compte.telephone_principal,
        callbackUrl,
      });

      return { success: true, urlPaiement: res.urlPaiement };
    } catch (err: any) {
      return { success: false, error: err.message || "Erreur lors de l'initialisation du paiement." };
    }
  }
  ```

- [ ] **6.2 Créer la vue `/dashboard/abonnement/page.tsx`**
  - Affichage de la situation actuelle : badge de statut (`essai`, `actif`, `impaye`, `suspendu`), date d'échéance formatée.
  - Grille responsive des 3 forfaits (Solo, Réseau, Empire) avec leurs limites (boutiques, employés), prix en FCFA/mois.
  - Bouton interactif avec indicateur de chargement appelant `initierPaiementAbonnementAction` et redirigeant vers l'URL FedaPay (`window.location.href = urlPaiement`).
  - Bloc de réassurance : logos Mobile Money (MTN MoMo, Moov Money) et Cartes bancaires sécurisées par FedaPay.

- [ ] **6.3 Intégrer le lien "Mon Abonnement" dans la navigation du dashboard**
  Ajouter l'onglet dans la sidebar ou navbar du dashboard pour un accès direct au suivi d'abonnement.

- [ ] **6.4 Tester via requête HTTP locale**
  Vérifier que la route répond correctement en statut 200 :
  ```powershell
  curl -I http://localhost:3000/dashboard/abonnement
  ```

- [ ] **6.5 Commit Git atomique**
  ```powershell
  git add src/app/actions/subscription.ts src/app/dashboard/abonnement/page.tsx src/components/Sidebar.tsx
  git commit -m "feat(subscription): page de choix de forfait et initiation de paiement en ligne FedaPay"
  ```

---

## Tâche 7 : Choix du Forfait à l'Inscription & Attribution Dynamique

### Description & Objectif
Permettre au futur commerçant de sélectionner dès le formulaire d'inscription le forfait auquel il souhaite souscrire (Solo, Réseau, Empire), et enregistrer son choix pour sa période d'essai de 14 jours.

### Contrat d'Interface
- **Consomme :** Formulaire [`src/app/inscription/page.tsx`](file:///c:/Users/Cédric/Downloads/Africavibecoding/facturepro/djoonoo/src/app/inscription/page.tsx), action `inscrirePatronAction` dans [`src/app/actions/auth.ts`](file:///c:/Users/Cédric/Downloads/Africavibecoding/facturepro/djoonoo/src/app/actions/auth.ts)
- **Produit :** Compte créé avec le `forfait_id` sélectionné par l'utilisateur au lieu d'un fallback codé en dur sur "Solo".

### Micro-étapes TDD :

- [ ] **7.1 Adapter l'action `inscrirePatronAction` dans `src/app/actions/auth.ts`**
  - Récupérer `forfaitId` depuis `formData.get("forfait_id")`.
  - Si fourni, valider son existence dans `prisma.forfaits`.
  - Si absent, fallback gracieux sur le premier forfait actif (Solo).
  - Assigner ce forfait au compte créé.

- [ ] **7.2 Ajouter le sélecteur de forfait dans `src/app/inscription/page.tsx`**
  - Ajouter une étape ou un bloc épuré de sélection de forfait avec les 3 options (Solo 5 000 F / Réseau 15 000 F / Empire 35 000 F).
  - Badge "14 jours d'essai gratuit inclus sur le forfait de ton choix".

- [ ] **7.3 Vérifier la validation du formulaire**
  S'assurer que la validation Zod côté serveur accepte le champ optionnel/obligatoire `forfait_id`.

- [ ] **7.4 Commit Git atomique**
  ```powershell
  git add src/app/inscription/page.tsx src/app/actions/auth.ts
  git commit -m "feat(onboarding): sélection du forfait souhaité dès l'inscription du Patron"
  ```

---

## Tâche 8 : Supervision Super-Admin & Durée Configurable des Forfaits

### Description & Objectif
1. Permettre au Super-Admin de configurer la durée `duree_jours` lors de la création/modification d'un forfait (ex: 30 jours pour mensuel, 365 pour annuel).
2. Afficher dans le dashboard Super-Admin l'historique de toutes les transactions d'abonnement FedaPay avec références externes et statuts en direct.

### Contrat d'Interface
- **Consomme :** `src/app/actions/super-admin.ts`, `src/app/super-admin/forfaits/page.tsx`, `src/app/super-admin/abonnements/page.tsx`
- **Produit :** Gestion dynamique de la durée des forfaits et supervision temps réel des encaissements FedaPay.

### Micro-étapes TDD :

- [ ] **8.1 Mettre à jour `src/app/actions/super-admin.ts`**
  - Modifier `creerForfaitAction` et `modifierForfaitAction` pour accepter et valider `duree_jours` (nombre entier > 0, défaut 30).
  - Lors de la confirmation manuelle de paiement de secours, prolonger `date_fin_periode_courante` de `forfait.duree_jours` au lieu d'un 30 en dur.

- [ ] **8.2 Mettre à jour les formulaires de gestion de forfaits dans l'interface Super-Admin**
  - Ajouter le champ "Durée de validité (en jours)" avec valeur par défaut 30.

- [ ] **8.3 Créer la vue de supervision des paiements FedaPay dans le Super-Admin**
  - Afficher les colonnes : Référence FedaPay, Entreprise cliente, Forfait, Montant (FCFA), Date d'échéance, Statut (`payee`, `en_attente`, `echouee`), Moyen de paiement.
  - Maintenir le bouton de validation manuelle exceptionnelle pour les cas hors passerelle.

- [ ] **8.4 Commit Git atomique**
  ```powershell
  git add src/app/actions/super-admin.ts src/app/super-admin/forfaits/page.tsx src/app/super-admin/abonnements/page.tsx
  git commit -m "feat(super-admin): supervision des paiements fedapay et configuration dynamique duree_jours forfaits"
  ```

---

## Tâche 9 : Tests d'Intégration Fin-en-Fin & Validation Globale

### Description & Objectif
Valider l'ensemble du cycle de vie via des tests automatisés de bout en bout :
1. Inscription d'un nouveau compte avec sélection de forfait.
2. Exécution du cron après 14 jours : passage direct en `suspendu`.
3. Connexion sur le compte suspendu : connexion réussie, blocage des mutations en lecture seule.
4. Initiation d'un paiement FedaPay et traitement du webhook simulé : passage instantané à `actif` pour `duree_jours`.
5. Fin de période active : passage en `impaye` avec 7 jours de grâce.

### Micro-étapes TDD :

- [ ] **9.1 Écrire le test d'intégration du cycle complet**
  Créer `tests/e2e-subscription-flow.test.ts` simulant l'ensemble de la machine à états et des requêtes.

- [ ] **9.2 Exécuter l'intégralité de la suite de tests**
  ```powershell
  npx vitest run
  ```
  Vérifier que 100% des tests passent au vert.

- [ ] **9.3 Vérification de la compilation TypeScript et Next.js**
  ```powershell
  npm run build
  ```
  S'assurer qu'aucune erreur de type ou de lint n'apparaît.

- [ ] **9.4 Commit Git final**
  ```powershell
  git add .
  git commit -m "feat(release): cycle de vie saas moderne 100% automatisé avec fedapay et lecture seule"
  ```
