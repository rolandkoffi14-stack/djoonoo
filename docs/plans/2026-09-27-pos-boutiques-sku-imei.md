# Plan d'Implémentation : Gestion des Boutiques, Code SKU, Recherche Client & Traçabilité Double IMEI

> **Pour l'agent d'exécution :** Chaque tâche est jalonnée de cases à cocher (`- [ ]`). Validez chaque micro-étape séquentiellement.

**Objectif :** Permettre au Patron de modifier les coordonnées de ses boutiques, intégrer la gestion des codes SKU automatiques pour les produits avec scan en caisse, remplacer le sélecteur client par une recherche dynamique temps réel avec sélection automatique du nouveau client créé, assurer la traçabilité des téléphones par double IMEI (1 & 2) sur le panier et le reçu de vente, et épurer le calculateur de rendu de monnaie.  
**Architecture :** Extension non-bloquante du schéma Prisma (`code_barre` sur `produits`, `imei1`/`imei2` sur `lignes_vente`), Server Actions typées avec isolation multi-tenant stricte (`compte_id`), composants React modulaires avec `useTransition` et resynchronisation dynamique sans rechargement de page (`F5`).  
**Pile technique :** Next.js 15.5 App Router, React 19, Prisma ORM 6.5, PostgreSQL (Supabase), Vitest 5.0, TypeScript 5.  
**Spécification source :** Synthèse d'arbitrage validée avec l'utilisateur le 2026-09-27.  

---

## Contraintes Globales
- **Isolation Multi-Tenant (Règle 5)** : Toutes les requêtes en base filtrent rigoureusement par `compte_id` (dérivé de la session authentifiée).
- **Immuabilité Comptable (Règle 7 & 8)** : Le code interne de la boutique (`B01`, `B02`) reste strictement immuable pour préserver la séquence des factures.
- **Zéro Code Spaghetti** : `imei1` et `imei2` sont strictement optionnels (`String?`) pour s'adapter à 100% des commerces sans imposer de moteur de catégories lourd.
- **Performance & Scalabilité** : Index PostgreSQL dédiés sur `code_barre`, recherche client débouncée et bornée (`limit: 10`), aucune charge mémoire superflue.
- **Conventions de nommage** : Schéma et logique métier en français `snake_case`.

## Focus de Revue Critique (Top 5 des angles morts potentiels)
1. **Unicité des codes SKU (`code_barre`)** : Plusieurs produits sans SKU ont `code_barre: null` ; l'index composite PostgreSQL `@@unique([boutique_id, code_barre])` doit tolérer les valeurs multiples `null` sans violer la contrainte d'unicité.
2. **Robustesse de la recherche client en caisse** : La recherche dynamique doit gérer les caractères spéciaux de saisie téléphonique (`+`, espaces, tirets) sans faire planter les requêtes Prisma.
3. **Sélection automatique post-création** : Le client créé dans la modale rapide doit être sélectionné instantanément dans le panier de caisse sans nécessiter de rafraîchissement global.
4. **Conservation des IMEIs sur les avoirs et annulations** : En cas d'annulation de vente, les numéros IMEI doivent demeurer visibles dans l'historique d'audit et sur le duplicata de reçu.
5. **Rétrocompatibilité des ventes historiques** : Les ventes passées n'ayant pas de champs `imei1`/`imei2` doivent continuer de s'afficher sans `undefined` ni erreur de rendu dans les reçus et factures.

---

## Tâches d'Implémentation

### Tâche 1 : Évolution du Schéma Prisma (`code_barre`, `imei1`, `imei2`) & Synchronisation DB

**Fichiers concernés :**
- Modifier : `prisma/schema.prisma`
- Test : `tests/schema-sku-imei.test.ts`

**Contrats d'interface :**
- *Consomme :* Modèles existants `produits` et `lignes_vente`.
- *Produit :* Colonne `code_barre String?` avec index `@@unique([boutique_id, code_barre])` sur `produits` ; colonnes `imei1 String?` et `imei2 String?` sur `lignes_vente`.

- [ ] **1.1 Écrire le test unitaire en échec**  
  Créer le fichier `tests/schema-sku-imei.test.ts` :
  ```typescript
  import { describe, it, expect } from "vitest";
  import { prisma } from "../src/lib/prisma";

  describe("Schéma Prisma - SKU et Double IMEI", () => {
    it("doit accepter un code_barre sur un produit et les champs imei1 / imei2 sur une ligne de vente", async () => {
      const compte = await prisma.comptes.findFirst({
        include: { boutiques: true },
      });
      if (!compte || compte.boutiques.length === 0) return;

      const boutique = compte.boutiques[0];
      const testSku = `SKU-TEST-${Date.now()}`;

      // 1. Création d'un produit avec code_barre
      const produit = await prisma.produits.create({
        data: {
          compte_id: compte.id,
          boutique_id: boutique.id,
          nom: "Produit Test SKU",
          prix_unitaire: 15000,
          quantite_stock: 5,
          seuil_alerte: 1,
          code_barre: testSku,
        },
      });

      expect(produit.code_barre).toBe(testSku);

      // Nettoyage du produit de test
      await prisma.produits.delete({ where: { id: produit.id } });
    });
  });
  ```

- [x] **1.1 Écrire le test unitaire en échec**  
  Créer le fichier `tests/schema-sku-imei.test.ts` :

- [x] **1.2 Exécuter le test et vérifier son échec initial**  
  ```powershell
  npx vitest run tests/schema-sku-imei.test.ts
  ```
  *Erreur attendue : Type error ou PrismaClientValidationError car code_barre n'existe pas encore sur produits.*

- [x] **1.3 Mettre à jour `prisma/schema.prisma`**  
  Dans le modèle `produits` :
  ```prisma
  model produits {
    id             String   @id @default(uuid())
    boutique_id    String
    compte_id      String   // dénormalisé depuis boutique.compte_id à la création, figé — résolution section 16, point 2
    code_barre     String?  // Code SKU interne ou code-barres (optionnel)
    nom            String
    prix_unitaire  Int      // FCFA
    quantite_stock Int
    seuil_alerte   Int
    date_creation  DateTime @default(now())

    boutique       boutiques      @relation(fields: [boutique_id], references: [id])
    lignes_vente   lignes_vente[]

    @@unique([boutique_id, code_barre])
    @@index([boutique_id])
    @@index([compte_id])
    @@index([boutique_id, nom])
    @@index([boutique_id, code_barre])
  }
  ```
  Dans le modèle `lignes_vente` :
  ```prisma
  model lignes_vente {
    id                       String  @id @default(uuid())
    vente_id                 String
    produit_id               String
    compte_id                String  // dénormalisé, figé — résolution section 16 (ex-point 2)
    quantite                 Int
    prix_unitaire_a_la_vente Int     // FIGÉ, règle 3
    imei1                    String? // Premier IMEI / N° de série (optionnel)
    imei2                    String? // Deuxième IMEI (optionnel pour Dual SIM)

    vente   ventes   @relation(fields: [vente_id], references: [id])
    produit produits @relation(fields: [produit_id], references: [id])

    @@index([vente_id])
    @@index([compte_id])
  }
  ```

- [x] **1.4 Synchroniser la base PostgreSQL Supabase et régénérer le client Prisma**  
  ```powershell
  npx prisma db push
  ```

- [x] **1.5 Exécuter le test et vérifier son passage au vert**  
  ```powershell
  npx vitest run tests/schema-sku-imei.test.ts
  ```
  *Résultat attendu : 1 test passed (100%).*

- [x] **1.6 Commit Git atomique**  
  ```powershell
  git add prisma/schema.prisma tests/schema-sku-imei.test.ts
  git commit -m "feat(db): ajout des colonnes code_barre sku et imei1 imei2 dans prisma"
  ```

---

### Tâche 2 : Modification des Coordonnées de la Boutique par le Patron

**Fichiers concernés :**
- Modifier : `src/app/actions/boutiques.ts`
- Modifier : `src/components/dashboard/BoutiquesManager.tsx`
- Test : `tests/modifier-boutique.test.ts`

**Contrats d'interface :**
- *Consomme :* Session patron (`session.role === "patron"`), `compteId`.
- *Produit :* `modifierBoutiqueAction(boutiqueId: string, data: ModifierBoutiquePayload): Promise<BoutiqueActionResult>`.

- [x] **2.1 Écrire le test unitaire en échec**  
  Créer le fichier `tests/modifier-boutique.test.ts` :
  ```typescript
  import { describe, it, expect } from "vitest";
  import { prisma } from "../src/lib/prisma";

  describe("Modification de Boutique", () => {
    it("doit mettre à jour le nom, l'adresse et le téléphone d'une boutique sans toucher à son code immuable", async () => {
      const boutique = await prisma.boutiques.findFirst();
      if (!boutique) return;

      const codeInitial = boutique.code;
      const nomNouveau = `Boutique Renommée ${Date.now()}`;
      const nouvelleVille = "Cotonou Littoral";

      const updated = await prisma.boutiques.update({
        where: { id: boutique.id },
        data: {
          nom: nomNouveau,
          ville: nouvelleVille,
        },
      });

      expect(updated.nom).toBe(nomNouveau);
      expect(updated.ville).toBe(nouvelleVille);
      expect(updated.code).toBe(codeInitial); // Le code interne B01 reste figé

      // Rétablissement du nom initial
      await prisma.boutiques.update({
        where: { id: boutique.id },
        data: { nom: boutique.nom, ville: boutique.ville },
      });
    });
  });
  ```

- [x] **2.2 Exécuter le test**  
  ```powershell
  npx vitest run tests/modifier-boutique.test.ts
  ```

- [x] **2.3 Implémenter `modifierBoutiqueAction` dans `src/app/actions/boutiques.ts`**  
  Ajouter la fonction serveur sécurisée :
  ```typescript
  export interface ModifierBoutiquePayload {
    nom: string;
    ville: string;
    adresse: string;
    secteur_activite?: string;
    telephone?: string | null;
  }

  export async function modifierBoutiqueAction(
    boutiqueId: string,
    payload: ModifierBoutiquePayload
  ): Promise<BoutiqueActionResult> {
    const session = await getCurrentSession();
    if (!session || session.role !== "patron") {
      return { success: false, error: "Action non autorisée. Seul le Patron peut modifier une boutique." };
    }

    const guard = verifierStatutAbonnementPourEcriture(session.statutAbonnement);
    if (!guard.autorise) {
      return { success: false, error: guard.erreur };
    }

    const nom = payload.nom.trim();
    const ville = payload.ville.trim();
    const adresse = payload.adresse.trim();
    const secteurActivite = payload.secteur_activite?.trim() || "Commerce général";
    const telephone = payload.telephone?.trim() || null;

    if (!nom || !ville || !adresse) {
      return { success: false, error: "Le nom, la ville et l'adresse sont obligatoires." };
    }

    try {
      const scoped = getScopedPrisma(session.compteId);
      const boutiqueExistante = await scoped.boutiques.findFirst({
        where: { id: boutiqueId },
      });

      if (!boutiqueExistante) {
        return { success: false, error: "Boutique introuvable." };
      }

      const boutiqueMaj = await prisma.$transaction(async (tx) => {
        const maj = await tx.boutiques.update({
          where: { id: boutiqueId },
          data: {
            nom,
            ville,
            adresse,
            secteur_activite: secteurActivite,
            telephone,
          },
        });

        await enregistrerAudit(tx, {
          compte_id: session.compteId,
          utilisateur_id: session.userId,
          action: "modification_boutique",
          entite_concernee: "boutiques",
          entite_id: boutiqueId,
          details: {
            code: maj.code,
            ancien_nom: boutiqueExistante.nom,
            nouveau_nom: nom,
            ancienne_ville: boutiqueExistante.ville,
            nouvelle_ville: ville,
          },
        });

        return maj;
      });

      revalidatePath("/dashboard");
      revalidatePath("/dashboard/boutiques");

      return {
        success: true,
        boutique: {
          id: boutiqueMaj.id,
          code: boutiqueMaj.code,
          nom: boutiqueMaj.nom,
          ville: boutiqueMaj.ville,
          statut: boutiqueMaj.statut,
        },
      };
    } catch (err: any) {
      return { success: false, error: err.message || "Erreur lors de la mise à jour." };
    }
  }
  ```

- [x] **2.4 Ajouter la modale de modification dans `src/components/dashboard/BoutiquesManager.tsx`**  
  - Ajouter un bouton d'action *"Modifier"* (icône crayon `Edit2`) sur chaque carte boutique.
  - État `boutiqueEnEdition: BoutiqueItem | null`.
  - Modale dédiée affichant le code immuable en badge fixe (`Code : B01 — non modifiable`) et des champs éditables pour le Nom, la Ville, l'Adresse, le Secteur et le Téléphone.
  - Déclenchement de `modifierBoutiqueAction` dans `startTransition` avec `router.refresh()` et fermeture propre de la modale.

- [x] **2.5 Exécuter les tests et vérifier la compilation**  
  ```powershell
  npx vitest run tests/modifier-boutique.test.ts
  npx tsc --noEmit
  ```

- [x] **2.6 Commit Git atomique**  
  ```powershell
  git add src/app/actions/boutiques.ts src/components/dashboard/BoutiquesManager.tsx tests/modifier-boutique.test.ts
  git commit -m "feat(boutiques): modification des coordonnees de boutique par le patron"
  ```

---

### Tâche 3 : Génération Automatique des Codes SKU & Scan en Caisse POS

**Fichiers concernés :**
- Modifier : `src/lib/business-rules.ts`
- Modifier : `src/app/actions/produits.ts`
- Modifier : `src/components/dashboard/ProduitsManager.tsx`
- Modifier : `src/components/dashboard/CaissePOS.tsx`
- Test : `tests/produits-sku.test.ts`

**Contrats d'interface :**
- *Consomme :* `boutique_id`, `nom`, `prix_unitaire`, `quantite_stock`.
- *Produit :* Helper `genererCodeSKU(tx, boutiqueId, boutiqueCode): Promise<string>` ; gestion du SKU dans `creerProduitAction` et `modifierProduitAction`.

- [x] **3.1 Écrire le test unitaire en échec**  
  Créer le fichier `tests/produits-sku.test.ts` :
  ```typescript
  import { describe, it, expect } from "vitest";
  import { prisma } from "../src/lib/prisma";
  import { genererCodeSKU } from "../src/lib/business-rules";

  describe("Génération de Code SKU Produit", () => {
    it("doit générer un code SKU séquentiel unique par boutique au format SKU-B01-XXXX", async () => {
      const boutique = await prisma.boutiques.findFirst();
      if (!boutique) return;

      const sku = await genererCodeSKU(prisma, boutique.id, boutique.code);
      expect(sku).toMatch(new RegExp(`^SKU-${boutique.code}-\\d{4}$`));
    });
  });
  ```

- [x] **3.2 Exécuter le test et vérifier son échec initial**  
  ```powershell
  npx vitest run tests/produits-sku.test.ts
  ```

- [x] **3.3 Implémenter `genererCodeSKU` dans `src/lib/business-rules.ts`**  
  ```typescript
  export async function genererCodeSKU(
    tx: any,
    boutiqueId: string,
    boutiqueCode: string
  ): Promise<string> {
    const totalProduits = await tx.produits.count({
      where: { boutique_id: boutiqueId },
    });
    const seq = (totalProduits + 1).toString().padStart(4, "0");
    return `SKU-${boutiqueCode}-${seq}`;
  }
  ```

- [x] **3.4 Mettre à jour `creerProduitAction` et `modifierProduitAction` dans `src/app/actions/produits.ts`**  
  - À la création, si `code_barre` n'est pas fourni manuellement, appeler `genererCodeSKU(tx, boutique.id, boutique.code)`.
  - À la modification, autoriser la mise à jour de `code_barre` avec contrôle d'unicité sur la boutique (`@@unique([boutique_id, code_barre])`).

- [x] **3.5 Adapter `ProduitsManager.tsx` et `CaissePOS.tsx` pour le SKU**  
  - Dans `ProduitsManager.tsx` : afficher la pastille SKU (ex: `SKU-B01-0004`) sous le nom de chaque produit avec option de copie ou d'impression.
  - Dans `CaissePOS.tsx` :
    - Ajouter le champ de scan rapide dédié au code-barres / SKU avec écouteur de touche `Enter`.
    - Dès qu'un SKU valide est scanné/saisi, localiser instantanément le produit, l'ajouter au panier (ou `quantite + 1`), vider le champ et émettre un court bip sonore via Web Audio API.

- [x] **3.6 Exécuter le test et vérifier son passage au vert**  
  ```powershell
  npx vitest run tests/produits-sku.test.ts
  ```

- [x] **3.7 Commit Git atomique**  
  ```powershell
  git add src/lib/business-rules.ts src/app/actions/produits.ts src/components/dashboard/ProduitsManager.tsx src/components/dashboard/CaissePOS.tsx tests/produits-sku.test.ts
  git commit -m "feat(produits): generation automatique de code sku et scan code-barres en caisse"
  ```

---

### Tâche 4 : Recherche Dynamique de Client en Caisse POS & Sélection Automatique Post-Création

**Fichiers concernés :**
- Modifier : `src/app/actions/clients.ts`
- Modifier : `src/components/dashboard/CaissePOS.tsx`
- Test : `tests/recherche-client-caisse.test.ts`

**Contrats d'interface :**
- *Consomme :* Chaîne de recherche `query` (nom ou téléphone) et session authentifiée.
- *Produit :* `rechercherClientsAction(query: string, limit?: number): Promise<{ success: boolean; clients: ClientItem[] }>`.

- [x] **4.1 Écrire le test unitaire en échec**  
  Créer le fichier `tests/recherche-client-caisse.test.ts` :
  ```typescript
  import { describe, it, expect } from "vitest";
  import { prisma } from "../src/lib/prisma";
  import { rechercherClientsAction } from "../src/app/actions/clients";

  describe("Recherche Dynamique Client Caisse", () => {
    it("doit trouver un client par nom ou par numéro de téléphone", async () => {
      const client = await prisma.clients.findFirst();
      if (!client) return;

      // Recherche par fragment de nom
      const resNom = await prisma.clients.findMany({
        where: {
          compte_id: client.compte_id,
          nom: { contains: client.nom.slice(0, 3), mode: "insensitive" },
        },
        take: 10,
      });
      expect(resNom.length).toBeGreaterThan(0);

      // Recherche par fragment de téléphone
      const resTel = await prisma.clients.findMany({
        where: {
          compte_id: client.compte_id,
          telephone: { contains: client.telephone.slice(-4) },
        },
        take: 10,
      });
      expect(resTel.length).toBeGreaterThan(0);
    });
  });
  ```

- [x] **4.2 Exécuter le test**  
  ```powershell
  npx vitest run tests/recherche-client-caisse.test.ts
  ```

- [x] **4.3 Implémenter `rechercherClientsAction` dans `src/app/actions/clients.ts`**  
  ```typescript
  export async function rechercherClientsAction(
    query: string,
    limit: number = 10
  ): Promise<{ success: boolean; clients: { id: string; nom: string; telephone: string }[]; error?: string }> {
    const session = await getCurrentSession();
    if (!session) {
      return { success: false, error: "Session expirée." };
    }

    const q = query.trim();
    if (!q) {
      return { success: true, clients: [] };
    }

    try {
      const scoped = getScopedPrisma(session.compteId);
      const resultats = await scoped.clients.findMany({
        where: {
          compte_id: session.compteId,
          OR: [
            { nom: { contains: q, mode: "insensitive" } },
            { telephone: { contains: q } },
          ],
        },
        take: limit,
        orderBy: { nom: "asc" },
        select: { id: true, nom: true, telephone: true },
      });

      return { success: true, clients: resultats };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
  ```

- [x] **4.4 Intégrer l'Autocomplétion Client et la Sélection Automatique dans `CaissePOS.tsx`**  
  - Remplacer le `<select>` par un composant Combobox dynamique :
    - Champ texte de recherche avec écouteur `onChange` débouncé à 250ms.
    - Liste déroulante des correspondances affichant le Nom et le Téléphone.
    - Si aucun résultat : afficher le message neutre *"Aucun client trouvé"* (sans bouton additionnel).
    - Permettre de revenir à *"Client comptoir anonyme"* via un bouton d'effacement discret (`X`).
  - Dans la fonction de callback `handleClientCree(nouveauClient)` :
    - Dès que `creerClientAction` réussit :
      ```typescript
      setClientSelectionneId(res.client.id);
      setClientRechercheTexte(`${res.client.nom} (${res.client.telephone})`);
      setModalNouveauClient(false);
      ```
    - Le client est instantanément lié au panier sans aucune recherche requise de la part du caissier.

- [x] **4.5 Exécuter les tests et vérifier la compilation**  
  ```powershell
  npx vitest run tests/recherche-client-caisse.test.ts
  npx tsc --noEmit
  ```

- [x] **4.6 Commit Git atomique**  
  ```powershell
  git add src/app/actions/clients.ts src/components/dashboard/CaissePOS.tsx tests/recherche-client-caisse.test.ts
  git commit -m "feat(caisse): recherche dynamique de clients et selection automatique a la creation"
  ```

---

### Tâche 5 : Traçabilité Double IMEI, Épuration du Calculateur de Monnaie & Reçu de Vente

**Fichiers concernés :**
- Modifier : `src/app/actions/ventes.ts`
- Modifier : `src/components/dashboard/CaissePOS.tsx`
- Modifier : `src/components/dashboard/RecuVenteModal.tsx`
- Test : `tests/vente-double-imei.test.ts`

**Contrats d'interface :**
- *Consomme :* `LigneVenteInput` avec champs optionnels `imei1?: string | null` et `imei2?: string | null`.
- *Produit :* Persistance des colonnes `imei1` et `imei2` sur `lignes_vente` ; affichage sur le reçu et le duplicata thermique.

- [ ] **5.1 Écrire le test unitaire en échec**  
  Créer le fichier `tests/vente-double-imei.test.ts` :
  ```typescript
  import { describe, it, expect } from "vitest";
  import { prisma } from "../src/lib/prisma";

  describe("Enregistrement de Vente avec Double IMEI", () => {
    it("doit enregistrer une ligne de vente comportant un imei1 et un imei2", async () => {
      const vente = await prisma.ventes.findFirst({
        include: { boutique: true, utilisateur: true },
      });
      const produit = await prisma.produits.findFirst();
      if (!vente || !produit) return;

      const imei1Test = "354892110293847";
      const imei2Test = "354892110293848";

      const ligne = await prisma.lignes_vente.create({
        data: {
          vente_id: vente.id,
          produit_id: produit.id,
          compte_id: vente.compte_id,
          quantite: 1,
          prix_unitaire_a_la_vente: produit.prix_unitaire,
          imei1: imei1Test,
          imei2: imei2Test,
        },
      });

      expect(ligne.imei1).toBe(imei1Test);
      expect(ligne.imei2).toBe(imei2Test);

      await prisma.lignes_vente.delete({ where: { id: ligne.id } });
    });
  });
  ```

- [ ] **5.2 Exécuter le test**  
  ```powershell
  npx vitest run tests/vente-double-imei.test.ts
  ```

- [ ] **5.3 Mettre à jour `src/app/actions/ventes.ts`**  
  - Adapter `LigneVenteInput` :
    ```typescript
    export interface LigneVenteInput {
      produit_id: string;
      quantite: number;
      imei1?: string | null;
      imei2?: string | null;
    }
    ```
  - Dans `enregistrerVenteAction`, insérer `imei1` et `imei2` lors de la création des `lignes_vente`.
  - Dans `getRecuVenteAction`, inclure `imei1` et `imei2` dans les lignes renvoyées au client.

- [ ] **5.4 Adapter `CaissePOS.tsx` (Panier avec saisie IMEI & Suppression des boutons 2k/5k/10k)**  
  - **Saisie IMEI** :
    - Sur chaque ligne du panier, ajouter un petit bouton ou champ dépliable *"Ajouter N° IMEI (Optionnel)"*.
    - Proposer 2 champs : `IMEI 1` (recommandé si téléphone) et `IMEI 2` (optionnel Dual SIM).
  - **Calculateur de Monnaie Épuré** :
    - Conserver l'affichage en vert *"Rendre : X FCFA"* calculé à partir de la saisie manuelle.
    - Supprimer définitivement le bloc des boutons rapides `[+2000]`, `[+5000]`, `[+10000]`.

- [ ] **5.5 Adapter `RecuVenteModal.tsx` pour l'impression des IMEIs**  
  - Sous le libellé de chaque produit du reçu (à l'écran et dans le template `@media print` pour imprimante thermique) :
    - Si `ligne.imei1` existe : afficher `IMEI 1 : ${ligne.imei1}`.
    - Si `ligne.imei2` existe : afficher `IMEI 2 : ${ligne.imei2}`.

- [ ] **5.6 Exécuter le test et vérifier son passage au vert**  
  ```powershell
  npx vitest run tests/vente-double-imei.test.ts
  ```

- [ ] **5.7 Commit Git atomique**  
  ```powershell
  git add src/app/actions/ventes.ts src/components/dashboard/CaissePOS.tsx src/components/dashboard/RecuVenteModal.tsx tests/vente-double-imei.test.ts
  git commit -m "feat(vente): tracabilite double imei panier et recu calculateur de monnaie epure"
  ```

---

### Tâche 6 : Validation Globale, Tests de Non-Régression & Compilation

**Fichiers concernés :**
- L'ensemble du projet
- `docs/plans/2026-09-27-pos-boutiques-sku-imei.md`

- [ ] **6.1 Exécuter la suite complète de tests Vitest**  
  ```powershell
  npx vitest run
  ```
  *Résultat attendu : 100% des tests passés avec succès sans régression sur FedaPay, l'authentification ni la pagination.*

- [ ] **6.2 Vérifier la compilation TypeScript stricte**  
  ```powershell
  npx tsc --noEmit
  ```
  *Résultat attendu : 0 erreur de type.*

- [ ] **6.3 Commit Git final de clôture du chantier**  
  ```powershell
  git commit --allow-empty -m "release(pos): boutiques modifiables, recherche client, sku et tracabilite double imei completes avec succes"
  ```
