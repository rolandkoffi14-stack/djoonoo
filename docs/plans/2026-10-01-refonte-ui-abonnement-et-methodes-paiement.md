# Plan d'Implémentation : Refonte UI Abonnement, Checkout Split-View & Méthodes de Paiement

> **Pour l'agent d'exécution :** Chaque tâche est jalonnée de cases à cocher (`- [ ]`). Validez chaque micro-étape séquentiellement en respectant le protocole TDD strict (test en échec → code minimal → test au vert → commit).

**Objectif :** Refondre intégralement l'espace Abonnement de djoonoo en une interface SaaS à 3 onglets (Forfait actif, Historique des paiements, Méthodes de paiement), intégrer une modale de sélection de forfaits avec contrôle universel des quotas de boutiques, mettre en place une page de checkout Split-View (inspirée ElevenLabs/Stripe) dédiée au Mobile Money FedaPay avec méthode par défaut présélectionnée, et permettre le téléchargement de la facture PDF officielle émise par djoonoo.

**Architecture :**
- Architecture multi-tenant stricte avec isolation `compte_id` sur toutes les requêtes et mutations.
- Modèle Prisma `methodes_paiement_compte` pour la mémorisation sécurisée des numéros Mobile Money (MTN MoMo, Moov Money) et cartes.
- Moteur métier unifié d'évaluation des quotas de boutiques (`src/lib/subscription-quotas.ts`) empêchant tout contournement lors d'une activation, prolongation, changement, régularisation ou réactivation.
- Page de checkout Split-View `/dashboard/abonnement/checkout` avec volet récapitulatif sombre `#2B2119` et volet de validation clair `#FAF6F1`.
- Service de génération de facture officielle d'abonnement djoonoo avec mentions légales société (IFU, RCCM, Cotonou) et route sécurisée de téléchargement.

**Pile technique :**
- Next.js 15.3 (App Router, Server Actions, Route Handlers)
- Prisma ORM 6.7 + PostgreSQL Supabase
- Zod pour la validation des formulaires
- Vitest pour la suite de tests unitaires
- Lucide React pour les icônes vectorielles
- Tailwind CSS / Design System djoonoo (`#C1652D`, `#FAF6F1`, `#2B2119`)

**Spécification source :**
- Discussion de cadrage et validation du 01/10/2026
- [`.agents/rules/05-forfaits-et-abonnements.md`](file:///c:/Users/Cédric/Downloads/Africavibecoding/facturepro/djoonoo/.agents/rules/05-forfaits-et-abonnements.md)
- [`.agents/rules/07-securite-multitenant-cycledevie.md`](file:///c:/Users/Cédric/Downloads/Africavibecoding/facturepro/djoonoo/.agents/rules/07-securite-multitenant-cycledevie.md)
- [`.agents/rules/09-design-et-conventions.md`](file:///c:/Users/Cédric/Downloads/Africavibecoding/facturepro/djoonoo/.agents/rules/09-design-et-conventions.md)

---

## Contraintes Globales
- **Isolation Multi-Tenant absolue** : Chaque accès à `methodes_paiement_compte` ou `factures_abonnement` doit filtrer par `session.compteId`.
- **Rôle Patron strict** : Seul l'utilisateur avec `role = 'patron'` a l'autorisation d'ajouter/supprimer des méthodes de paiement et d'initier un paiement.
- **Règle stricte des quotas** : Ne jamais masquer un forfait. Si `nb_boutiques_actives > forfait.max_boutiques`, désactiver le bouton et afficher la consigne exacte de désactivation.
- **Préservation des conventions visuelles** : Boutons conformes aux styles existants du SaaS (`#2B2119` et `#C1652D`, border-radius standard, aucun bouton flashy excentrique).

## Focus de Revue Critique (Top 5 des angles morts potentiels)
1. **Contournement des quotas en manipulant le paramètre d'URL au checkout** : Un utilisateur avec 3 boutiques actives qui force l'URL `/dashboard/abonnement/checkout?forfaitId=solo`. *Contremesure : vérification stricte côté serveur au rendu du checkout ET dans la Server Action `initierPaiementAbonnementAction` avec rejet immédiat si quota dépassé.*
2. **Concurrence sur la méthode de paiement par défaut** : Si un compte définit simultanément deux méthodes par défaut. *Contremesure : transaction Prisma atomique réinitialisant toutes les méthodes du compte à `par_defaut = false` avant de passer la cible à `true`.*
3. **Suppression de la méthode par défaut active** : Si l'utilisateur supprime la méthode définie par défaut alors qu'il en a d'autres. *Contremesure : transfert automatique du flag par défaut sur la méthode enregistrée la plus récente.*
4. **Fuite de données de facturation inter-comptes** : Téléchargement de la facture PDF d'un autre tenant en modifiant l'ID dans l'URL. *Contremesure : validation rigoureuse de la propriété `compte_id === session.compteId` dans le Route Handler PDF.*
5. **Format des numéros Mobile Money** : Numéros béninois saisis avec ou sans indicatif (`+229`, `01`, espaces). *Contremesure : normalisation automatique E.164 (`+229XXXXXXXX`) à l'enregistrement et extraction propre des 2 derniers chiffres pour l'affichage masqué.*

---

## Tâche 1 : Modèle Prisma `methodes_paiement_compte` & Migration Base de Données

### Description & Objectif
Ajouter l'entité `methodes_paiement_compte` dans `prisma/schema.prisma` liée au modèle `comptes`, synchroniser avec Supabase et régénérer le client Prisma.

### Contrat d'Interface
- **Consomme :** `prisma/schema.prisma`
- **Produit :** Modèle `prisma.methodes_paiement_compte` avec relation `compte.methodes_paiement`.

### Micro-étapes TDD :

- [x] **1.1 Test unitaire du schéma Prisma pour `methodes_paiement_compte`**
- [x] **1.2 Exécuter le test et vérifier son échec initial**
- [x] **1.3 Mettre à jour `prisma/schema.prisma`**
- [x] **1.4 Pousser les modifications en base et régénérer le client**
- [x] **1.5 Exécuter le test et vérifier le passage au vert**
- [x] **1.6 Commit Git atomique**

---

## Tâche 2 : Logique Métier des Quotas & Libellés Dynamiques (`src/lib/subscription-quotas.ts`)

### Description & Objectif
Créer le module central pur calculant :
1. La compatibilité d'un forfait vis-à-vis des quotas de boutiques actives du compte.
2. Le libellé exact du bouton principal d'action pour l'onglet 1 (Dilemme 1).
3. Les badges et libellés de boutons pour les cartes de la modale de forfaits (Dilemme 2).

### Contrat d'Interface
- **Consomme :** Informations du compte, statut, date d'échéance, nombre de boutiques actives, et catalogue des forfaits.
- **Produit :** Fonctions `evaluerCompatibiliteForfait`, `determinerBoutonActionPrincipal`, `determinerAffichageCarteModale`.

### Micro-étapes TDD :

- [x] **2.1 Écrire le test unitaire du moteur de quotas et libellés**
- [x] **2.2 Exécuter le test et vérifier son échec initial**
- [x] **2.3 Implémenter `src/lib/subscription-quotas.ts`**
- [x] **2.4 Exécuter le test et vérifier le passage au vert**
- [x] **2.5 Commit Git atomique**

---

## Tâche 3 : Server Actions des Méthodes de Paiement (`src/app/actions/payment-methods.ts`)

### Description & Objectif
Créer les Server Actions sécurisées pour la gestion des méthodes de paiement :
1. `ajouterMethodePaiementAction(params)` : validation numéro Mobile Money béninois, normalisation, calcul des derniers chiffres, gestion automatique du flag `par_defaut`.
2. `definirMethodeParDefautAction(id)` : bascule transactionnelle atomique.
3. `supprimerMethodePaiementAction(id)` : suppression avec réassignation de la méthode par défaut si nécessaire.
4. `listerMethodesPaiementAction()` : liste isolée par `session.compteId`.

### Contrat d'Interface
- **Consomme :** `getCurrentSession()`, `prisma.methodes_paiement_compte`
- **Produit :** Actions serveur typées retournant `{ success: boolean, data?: any, error?: string }`.

### Micro-étapes TDD :

- [x] **3.1 Écrire le test unitaire des actions méthodes de paiement**
- [x] **3.2 Exécuter le test et vérifier son échec initial**
- [x] **3.3 Implémenter `src/app/actions/payment-methods.ts`**
- [x] **3.4 Exécuter le test et vérifier le passage au vert**
- [x] **3.5 Commit Git atomique**

---

## Tâche 4 : Composant Client 3 Onglets, Ligne Synthétique & Modale avec Quotas

### Description & Objectif
Refondre `src/components/dashboard/AbonnementClient.tsx` :
1. Implémenter la navigation par onglets : `Forfait actif`, `Historique de paiements`, `Méthodes de paiement` (avec mémorisation de l'onglet actif).
2. Dans l'onglet 1 : Afficher le forfait actif sous forme de **ligne synthétique épurée Bento** (Formule, Statut, Tarif, Échéance, Quotas réels boutiques/employés, et bouton(s) d'action dynamique(s) au style standard).
3. Modale de sélection de forfaits :
   - Présentation des forfaits disponibles.
   - Application stricte des badges et boutons selon Dilemme 2.
   - Blocage avec message d'incompatibilité si le quota de boutiques est dépassé.
   - Validation ouvrant la page de checkout.

### Contrat d'Interface
- **Consomme :** Props de `AbonnementPage`, `src/lib/subscription-quotas.ts`
- **Produit :** Composant client interactif ultra-fluide respectant scrupuleusement la charte visuelle djoonoo.

### Micro-étapes TDD :

- [x] **4.1 Test unitaire de validation du rendu des onglets et boutons**
- [x] **4.2 Implémenter le composant `AbonnementClient.tsx` avec les 3 onglets et la modale de forfaits**
- [x] **4.3 Exécuter les tests unitaires et vérifier le succès**
- [x] **4.4 Commit Git atomique**

---

## Tâche 5 : Page Checkout Split-View (`/dashboard/abonnement/checkout`)

### Description & Objectif
Créer la page dédiée plein écran Split-View (inspirée de la capture ElevenLabs/Stripe) :
1. **Panneau gauche (Dark `#2B2119`)** : Marque djoonoo, Nom du forfait, Montant en FCFA, Durée (30 jours), Liste des fonctionnalités incluses, Total dû aujourd'hui.
2. **Panneau droit (Light `#FAF6F1`)** :
   - Coordonnées de l'entreprise et du Patron.
   - Sélecteur de méthode de paiement (Mobile Money MTN MoMo, Moov Money, Carte) avec **la méthode par défaut présélectionnée**.
   - Option pour utiliser un autre numéro avec case à cocher « Définir par défaut ».
   - Bouton de confirmation appelant `initierPaiementAbonnementAction` et redirigeant vers FedaPay.
3. **Sécurité serveur** : Rejet immédiat si le client tente de charger un forfait incompatible avec ses quotas de boutiques actives.

### Contrat d'Interface
- **Consomme :** Paramètre d'URL `forfaitId`, méthodes de paiement du compte, session Patron
- **Produit :** Route `/dashboard/abonnement/checkout/page.tsx` et Server Action adaptée.

### Micro-étapes TDD :

- [ ] **5.1 Test de garde-fou serveur du checkout pour quota dépassé**
  Créer `tests/checkout-guard.test.ts` : vérifie qu'un compte avec 3 boutiques ne peut pas initier un paiement sur le forfait Solo.
- [ ] **5.2 Adapter `initierPaiementAbonnementAction` dans `src/app/actions/subscription.ts`**
  Ajouter la vérification stricte :
  ```typescript
  const nbBoutiques = await prisma.boutiques.count({
    where: { compte_id: session.compteId, statut: "actif" },
  });
  if (forfaitCible.max_boutiques !== null && nbBoutiques > forfaitCible.max_boutiques) {
    return {
      success: false,
      error: `Quotas dépassés : tu as ${nbBoutiques} boutiques actives pour un forfait limité à ${forfaitCible.max_boutiques}.`,
    };
  }
  ```
- [ ] **5.3 Créer la page `src/app/dashboard/abonnement/checkout/page.tsx`**
  Mise en page Split-Screen responsive avec formulaires interactifs et boutons de réassurance.
- [ ] **5.4 Exécuter le test et vérifier le passage au vert**
  ```powershell
  npx vitest run tests/checkout-guard.test.ts
  ```
- [ ] **5.5 Commit Git atomique**
  ```powershell
  git add src/app/dashboard/abonnement/checkout/page.tsx src/app/actions/subscription.ts tests/checkout-guard.test.ts
  git commit -m "feat(checkout): page split-view dediee mobile money fedapay avec selection par defaut et garde quotas"
  ```

---

## Tâche 6 : Onglet 2 « Historique des paiements » & Modale Détail Transaction

### Description & Objectif
1. Intégrer dans l'onglet 2 le tableau complet des factures d'abonnement (`factures_abonnement`) avec filtres et statuts.
2. Créer la **Modale Détail Transaction** : affiche l'ID FedaPay, la date précise, le mode de paiement, la date de confirmation et la période couverte.
3. Ajouter le bouton de téléchargement de facture.

### Micro-étapes TDD :
- [ ] **6.1 Test unitaire du composant historique et modale de détail**
- [ ] **6.2 Implémenter `HistoriquePaiementsTab.tsx` et `ModalDetailFacture.tsx`**
- [ ] **6.3 Commit Git atomique**
  ```powershell
  git add src/components/dashboard/HistoriquePaiementsTab.tsx src/components/dashboard/ModalDetailFacture.tsx
  git commit -m "feat(subscription): onglet historique des paiements et modale detail transaction"
  ```

---

## Tâche 7 : Génération de Facture PDF Officielle djoonoo & Route de Téléchargement

### Description & Objectif
Créer la route de téléchargement de la facture PDF officielle `/api/factures-abonnement/[id]/pdf` :
1. Document émis par la société éditrice de djoonoo (mentions légales, IFU, RCCM, adresse à Cotonou).
2. Adressé à l'entreprise cliente (`nom_entreprise`, IFU, téléphone).
3. Mention de la période d'abonnement acquittée, montant en FCFA et référence FedaPay.
4. Contrôle de sécurité tenant : rejet `403` si la facture n'appartient pas au `compte_id` de la session.

### Micro-étapes TDD :
- [ ] **7.1 Test unitaire de sécurité et de génération de facture**
  Créer `tests/invoice-pdf-security.test.ts`.
- [ ] **7.2 Créer le générateur de facture PDF HTML/Printable `src/lib/invoice-generator.ts`**
- [ ] **7.3 Créer le Route Handler `src/app/api/factures-abonnement/[id]/pdf/route.ts`**
- [ ] **7.4 Exécuter le test et vérifier le passage au vert**
  ```powershell
  npx vitest run tests/invoice-pdf-security.test.ts
  ```
- [ ] **7.5 Commit Git atomique**
  ```powershell
  git add src/lib/invoice-generator.ts src/app/api/factures-abonnement/[id]/pdf/route.ts tests/invoice-pdf-security.test.ts
  git commit -m "feat(invoice): service et route de telechargement de la facture pdf officielle djoonoo"
  ```

---

## Tâche 8 : Onglet 3 « Méthodes de paiement » (CRUD Complet)

### Description & Objectif
Créer l'interface de gestion autonome des moyens de paiement :
1. Cartes visuelles épurées pour chaque moyen enregistré (Logo MTN/Moov/Carte, numéro masqué `+229 97 •••• 36`, titulaire).
2. Badge vert `Par défaut` sur la méthode prioritaire.
3. Bouton `Définir par défaut` sur les autres méthodes.
4. Bouton `Supprimer` avec modale de confirmation.
5. Tiroir/Modale `+ Ajouter un moyen de paiement` avec formulaire de saisie et validation immédiate.

### Micro-étapes TDD :
- [ ] **8.1 Test unitaire du composant de gestion des méthodes de paiement**
- [ ] **8.2 Créer le composant `MethodesPaiementTab.tsx` et `ModalAjoutMethode.tsx`**
- [ ] **8.3 Brancher avec les Server Actions créées à la Tâche 3**
- [ ] **8.4 Commit Git atomique**
  ```powershell
  git add src/components/dashboard/MethodesPaiementTab.tsx src/components/dashboard/ModalAjoutMethode.tsx
  git commit -m "feat(ui): onglet methodes de paiement avec ajout, suppression et definition par defaut"
  ```

---

## Tâche 9 : Tests d'Intégration Globale & Validation de Compilation

### Description & Objectif
Valider l'ensemble du cycle :
1. Navigation fluide entre les 3 onglets.
2. Comportement des boutons dynamiques (Dilemme 1) et de la modale avec respect strict des quotas (Dilemme 2).
3. Parcours complet jusqu'au checkout Split-View avec moyen par défaut présélectionné.
4. Téléchargement d'une facture PDF djoonoo.
5. Exécution de `npm run build` et `npx vitest run` sans aucune erreur.

### Micro-étapes :
- [ ] **9.1 Exécuter la suite complète de tests**
  ```powershell
  npx vitest run
  ```
- [ ] **9.2 Vérifier la compilation Next.js / TypeScript**
  ```powershell
  npm run build
  ```
- [ ] **9.3 Commit final de livraison**
  ```powershell
  git add .
  git commit -m "feat(release): refonte complete du menu abonnement, checkout split-view et gestion des methodes de paiement"
  ```
