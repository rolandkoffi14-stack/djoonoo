# Plan d'Implémentation : Remédiation Complète RBAC & Tableaux de Bord par Rôle (Patron, Gérant, Vendeur)

> **Pour l'agent d'exécution :** Chaque tâche est jalonnée de cases à cocher (`- [ ]`). Validez chaque micro-étape séquentiellement selon le protocole TDD strict (Test en échec -> Implémentation minimale -> Test passant -> Validation).

**Objectif :** Éliminer 100 % des fuites de données et non-conformités de permissions identifiées lors de l'audit pour les rôles Patron, Gérant et Vendeur, tout en garantissant que chaque rôle dispose d'un tableau de bord personnalisé et strictement restreint à son périmètre, sans aucune régression sur le fonctionnement existant.  
**Architecture :** Next.js 16 (App Router), Server Components & Server Actions, Prisma ORM avec isolation contextuelle par rôle et `compte_id`, Vitest pour les tests unitaires et d'intégration.  
**Pile technique :** Next.js 16.4.0, React 19, TypeScript 5, Prisma 6.19.3, Vitest 5.0.2.  
**Spécification source :** Rapport d'audit de sécurité des rôles & permissions djoonoo (Section 2, Section 8, Règle 5).

---

## Contraintes Globales
- **Zéro régression** : La suite de tests existante (52 fichiers, 161 tests réussis) doit rester intégralement au vert.
- **Principe du Moindre Privilège (PoLP)** :
  - **Patron** : Vue globale sur toutes les boutiques du compte (avec sélecteur de boutique active).
  - **Gérant** : Vue strictement limitée à sa boutique d'affectation (`session.boutiqueId`).
  - **Vendeur** : Vue strictement limitée à ce qui le concerne personnellement au sein de sa boutique (`session.boutiqueId` ET `session.userId`).
- **Défense en profondeur** : Le contrôle d'accès doit être appliqué au niveau des Server Components de page (redirection/filtrage) ET au niveau des Server Actions / API Routes (rejet formel 403 / message d'erreur explicite).
- **Zéro placeholder** : Chaque tâche fournit le code exact, les signatures et les tests sans omission.

---

## Focus de Revue Critique (Top 5 des angles morts)
1. **Rôle Vendeur sans boutique assignée** : Si un vendeur n'a pas encore de `boutiqueId` valide en session, sécuriser le fallback pour ne jamais exposer de données d'une autre boutique par défaut.
2. **Incohérence entre liste paginée et cartes KPIs** : Veiller à ce que les clauses `WHERE` des requêtes `aggregate` et `count` soient strictement identiques aux clauses des `findMany` pour chaque rôle.
3. **Clients multi-boutiques pour le Gérant** : Lors du filtrage des clients pour le Gérant, filtrer par relation `ventes: { some: { boutique_id: session.boutiqueId } }` afin qu'un gérant ne voie que les clients de sa boutique, et que ses agrégations financières ne comptent que les ventes de sa boutique.
4. **Navigation et liens dans la Sidebar** : Permettre au vendeur d'avoir son lien "Tableau de bord" (`/dashboard`) dans sa sidebar pour un parcours utilisateur clair et valorisant.
5. **Reçus de caisse au comptoir** : Permettre l'impression normale des reçus lors d'une nouvelle vente, mais bloquer la consultation arbitraire de factures tierces par simple identifiant d'URL.

---

## Vue d'Ensemble des Phases de Remédiation

| Phase | Domaine | Items de l'Audit Couverts | Objectif |
|---|---|---|---|
| **Phase 1** | Tableaux de bord & KPIs de vente | Failles 1 & 2 | Personnaliser `/dashboard` pour chaque rôle et borner les KPIs de `/dashboard/ventes` au vendeur. |
| **Phase 2** | Consultation & Réimpression des Reçus | Faille 3 | Sécuriser `getRecuVenteAction` pour empêcher la lecture des factures d'autres vendeurs/boutiques. |
| **Phase 3** | Répertoire Clients & Fiches Détaillées | Failles 4 & 5 | Interdire `/dashboard/clients` au vendeur et restreindre la vue du gérant à sa boutique. |
| **Phase 4** | Espace Abonnement & Données Financières | Failles 6, 7 & 8 | Réserver `/dashboard/abonnement`, ses méthodes de paiement et ses PDFs au Patron. |
| **Phase 5** | Règlements de Suivi d'Impayés | Faille 9 | Borner l'enregistrement des paiements d'impayés du vendeur à ses propres ventes. |
| **Phase 6** | Validation Globale & Non-Régression | Ensemble | Valider l'intégralité de la suite Vitest (161+ tests) et le build de production Next.js. |

---

## TÂCHES DÉTAILLÉES D'EXÉCUTION

---

### Phase 1 : Tableaux de Bord Adaptatifs & Cohérence Navigation (Failles 1 & 2)

- [x] **Tâche 1.1 : Test unitaire pour l'isolation des métriques du Vendeur sur le Dashboard et les Ventes**
  - **Consomme :** `vitest`, `src/lib/auth.ts`, `src/lib/prisma.ts`.
  - **Produit :** Nouveau fichier de test `tests/rbac-dashboard-vendeur.test.ts`.
  - **1. Test unitaire :** Vérifier que les requêtes agrégées de vente pour un vendeur injectent obligatoirement `utilisateur_id = session.userId`.
  - **2. Commande d'exécution :**
    ```bash
    npx vitest run tests/rbac-dashboard-vendeur.test.ts
    ```

- [x] **Tâche 1.2 : Adapter le Tableau de Bord `/dashboard` au rôle Vendeur**
  - **Consomme :** `src/app/dashboard/page.tsx`.
  - **Produit :** Modification de [src/app/dashboard/page.tsx](file:///c:/Users/C%C3%A9dric/Downloads/Africavibecoding/facturepro/djoonoo/src/app/dashboard/page.tsx).
  - **Implémentation :**
    - Si `session.role === "vendeur"`, injecter `utilisateur_id: session.userId` dans `scoped.ventes.aggregate` (CA du jour) et dans `scoped.ventes.findMany` (impayés).
    - Adapter les textes des cartes pour le vendeur : "Mes ventes du jour" et "Mes impayés à recouvrer".
    - Pour les alertes stock, conserver les alertes de sa boutique (information utile pour la vente).

- [x] **Tâche 1.3 : Adapter les 4 cartes KPIs de `/dashboard/ventes` au rôle Vendeur**
  - **Consomme :** `src/app/dashboard/ventes/page.tsx`.
  - **Produit :** Modification de [src/app/dashboard/ventes/page.tsx](file:///c:/Users/C%C3%A9dric/Downloads/Africavibecoding/facturepro/djoonoo/src/app/dashboard/ventes/page.tsx).
  - **Implémentation :**
    - Dans les requêtes `scoped.ventes.aggregate` et `scoped.paiements.aggregate`, ajouter `utilisateur_id: session.userId` lorsque `session.role === "vendeur"`.
    - Garantir que `caTotal`, `totalEncaisse`, `totalImpayes` et `nombreVentes` reflètent uniquement l'activité du vendeur connecté.

- [x] **Tâche 1.4 : Ajouter le lien "Tableau de bord" pour le Vendeur dans la Sidebar**
  - **Consomme :** `src/components/dashboard/Sidebar.tsx`.
  - **Produit :** Modification de [src/components/dashboard/Sidebar.tsx](file:///c:/Users/C%C3%A9dric/Downloads/Africavibecoding/facturepro/djoonoo/src/components/dashboard/Sidebar.tsx).
  - **Implémentation :**
    - Dans `getNavItems()` pour le cas `"vendeur"`, ajouter en première position :
      `{ label: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard }`.

---

### Phase 2 : Réimpression & Consultation des Reçus de Vente (Faille 3)

- [x] **Tâche 2.1 : Test unitaire de sécurité sur `getRecuVenteAction`**
  - **Consomme :** `tests/rbac-recu-vente-security.test.ts`.
  - **Produit :** Fichier de test validant le refus d'accès pour :
    1. Un vendeur tentant de charger la facture d'un autre vendeur de la même boutique.
    2. Un gérant tentant de charger la facture d'une autre boutique.
    3. Un patron ayant accès à toutes les factures de son compte.
  - **Commande :**
    ```bash
    npx vitest run tests/rbac-recu-vente-security.test.ts
    ```

- [x] **Tâche 2.2 : Implémenter le contrôle RBAC dans `getRecuVenteAction`**
  - **Consomme :** `src/app/actions/ventes.ts`.
  - **Produit :** Modification de [src/app/actions/ventes.ts:434](file:///c:/Users/C%C3%A9dric/Downloads/Africavibecoding/facturepro/djoonoo/src/app/actions/ventes.ts#L434).
  - **Implémentation :**
    - Récupérer `vente.utilisateur_id` et `vente.boutique_id`.
    - Si `session.role === "vendeur"` et `vente.utilisateur_id !== session.userId` : renvoyer `{ success: false, error: "Accès refusé : tu ne peux consulter que tes propres reçus." }`.
    - Si `session.role === "gerant"` et `vente.boutique_id !== session.boutiqueId` : renvoyer `{ success: false, error: "Accès refusé : tu ne peux consulter que les reçus de ta boutique." }`.

---

### Phase 3 : Isolation du Répertoire Clients & Fiches Détaillées (Failles 4 & 5)

- [x] **Tâche 3.1 : Test unitaire pour l'isolation Clients & Fiche Détaillée**
  - **Consomme :** `tests/rbac-clients-isolation.test.ts`.
  - **Produit :** Fichier de test validant :
    1. Le refus pour un vendeur d'appeler `getFicheClientDetailleeAction`.
    2. Le bornage strict des ventes retournées pour un gérant à sa propre boutique.
  - **Commande :**
    ```bash
    npx vitest run tests/rbac-clients-isolation.test.ts
    ```

- [x] **Tâche 3.2 : Protection et Scoping Boutique sur `/dashboard/clients/page.tsx`**
  - **Consomme :** `src/app/dashboard/clients/page.tsx`.
  - **Produit :** Modification de [src/app/dashboard/clients/page.tsx](file:///c:/Users/C%C3%A9dric/Downloads/Africavibecoding/facturepro/djoonoo/src/app/dashboard/clients/page.tsx).
  - **Implémentation :**
    - Si `session.role === "vendeur"` : rediriger vers `/dashboard/caisse` (le vendeur n'administre pas le portefeuille client).
    - Si `session.role === "gerant"` :
      - Filtrer `whereCondition` pour ne retenir que les clients ayant au moins une vente dans `session.boutiqueId` (`whereCondition.ventes = { some: { boutique_id: session.boutiqueId, statut_vente: "validee" } }`).
      - Filtrer les ventes incluses par client à `where: { boutique_id: session.boutiqueId, statut_vente: "validee" }`.
      - Filtrer `statsVentesClients` et `statsPaiementsClients` avec `boutique_id: session.boutiqueId`.

- [x] **Tâche 3.3 : Scoping Boutique et Restriction Vendeur sur `getFicheClientDetailleeAction`**
  - **Consomme :** `src/app/actions/clients.ts`.
  - **Produit :** Modification de [src/app/actions/clients.ts:329](file:///c:/Users/C%C3%A9dric/Downloads/Africavibecoding/facturepro/djoonoo/src/app/actions/clients.ts#L329).
  - **Implémentation :**
    - Si `session.role === "vendeur"` : renvoyer `{ success: false, error: "Action non autorisée pour le profil Vendeur." }`.
    - Si `session.role === "gerant"` : filtrer les ventes associées dans la requête Prisma avec `where: { boutique_id: session.boutiqueId }`.

---

### Phase 4 : Protection du Périmètre Abonnement & Données Financières (Failles 6, 7 & 8)

- [x] **Tâche 4.1 : Test unitaire de restriction Patron sur Abonnement et Méthodes de Paiement**
  - **Consomme :** `tests/rbac-abonnement-security.test.ts`.
  - **Produit :** Fichier de test vérifiant :
    1. Le rejet de `listerMethodesPaiementAction` si le rôle n'est pas `patron`.
    2. Le rejet de `/api/factures-abonnement/[id]/pdf` si l'utilisateur n'est pas `patron` ni `super_admin`.
  - **Commande :**
    ```bash
    npx vitest run tests/rbac-abonnement-security.test.ts
    ```

- [x] **Tâche 4.2 : Sécuriser les Pages `/dashboard/abonnement` et `/dashboard/abonnements`**
  - **Consomme :** `src/app/dashboard/abonnement/page.tsx` et `src/app/dashboard/abonnements/page.tsx`.
  - **Produit :** Ajout de la garde Patron :
    ```ts
    if (session.role !== "patron") {
      redirect("/dashboard");
    }
    ```

- [x] **Tâche 4.3 : Restreindre `listerMethodesPaiementAction` au Patron**
  - **Consomme :** `src/app/actions/payment-methods.ts`.
  - **Produit :** Modification de [src/app/actions/payment-methods.ts:249](file:///c:/Users/C%C3%A9dric/Downloads/Africavibecoding/facturepro/djoonoo/src/app/actions/payment-methods.ts#L249) :
    Vérifier `if (!session || session.role !== "patron") return { success: false, error: "Action réservée au Patron du compte." };`.

- [x] **Tâche 4.4 : Restreindre l'API Route PDF `/api/factures-abonnement/[id]/pdf` au Patron**
  - **Consomme :** `src/app/api/factures-abonnement/[id]/pdf/route.ts`.
  - **Produit :** Modification de [src/app/api/factures-abonnement/[id]/pdf/route.ts:36](file:///c:/Users/C%C3%A9dric/Downloads/Africavibecoding/facturepro/djoonoo/src/app/api/factures-abonnement/%5Bid%5D/pdf/route.ts#L36) :
    Exiger `session?.role === "patron"` si la requête n'émane pas d'un super-administrateur.

---

### Phase 5 : Règlements de Suivi d'Impayés Sécurisés (Faille 9)

- [x] **Tâche 5.1 : Test unitaire sur l'encaissement d'impayés par rôle**
  - **Consomme :** `tests/rbac-reglement-impayes.test.ts`.
  - **Produit :** Fichier de test validant :
    1. Le refus pour un vendeur d'enregistrer un paiement sur une facture d'un autre vendeur.
    2. L'autorisation pour le gérant sur toute facture de sa boutique.
    3. L'autorisation pour le patron sur toute facture de son compte.
  - **Commande :**
    ```bash
    npx vitest run tests/rbac-reglement-impayes.test.ts
    ```

- [x] **Tâche 5.2 : Appliquer la restriction dans `enregistrerReglementImpayeAction`**
  - **Consomme :** `src/app/actions/impayes.ts`.
  - **Produit :** Modification de [src/app/actions/impayes.ts:70](file:///c:/Users/C%C3%A9dric/Downloads/Africavibecoding/facturepro/djoonoo/src/app/actions/impayes.ts#L70) :
    Si `session.role === "vendeur"` et `vente.utilisateur_id !== session.userId`, renvoyer `{ success: false, error: "Action non autorisée : tu ne peux encaisser de règlement que sur tes propres ventes." }`.

---

### Phase 6 : Validation Globale & Non-Régression

- [x] **Tâche 6.1 : Exécution complète de la suite de tests Vitest**
  - **Commande :**
    ```bash
    npx vitest run
    ```
  - **Critère de succès :** 100 % des tests existants (161 tests) + l'ensemble des nouveaux tests RBAC passent avec succès.

- [x] **Tâche 6.2 : Validation du Build Next.js**
  - **Commande :**
    ```bash
    npm run build
    ```
  - **Critère de succès :** Compilation sans aucune erreur TypeScript ni avertissement ESLint.
