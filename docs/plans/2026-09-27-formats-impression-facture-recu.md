# Plan d'Implémentation : Formats d'Impression Facture A4 & Ticket 80 mm

> **Pour l'agent d'exécution :** Chaque tâche est jalonnée de cases à cocher (`- [ ]`). Validez chaque micro-étape séquentiellement.

**Objectif :** Proposer une modale de reçu/facture bimodale permettant d'imprimer soit un ticket thermique 80 mm sans coupure multi-pages, soit une facture d'entreprise officielle au format A4, avec en-tête hiérarchisé (Nom d'entreprise d'abord, puis boutique) et zéro lien parasite.  
**Architecture :** Enrichissement de `RecuVenteData` avec les informations d'entreprise de `comptes` dans `src/app/actions/ventes.ts`, création d'un composant unifié et réutilisable `src/components/dashboard/RecuVenteModal.tsx` avec styles d'impression CSS isolés (`@page` et `@media print`), et intégration dans `CaissePOS.tsx`, `VentesManager.tsx` et `ImpayesManager.tsx`.  
**Stack technique :** Next.js 15, React 19, TypeScript, Tailwind CSS, Lucide Icons, Prisma.

---

### Tâche 1 : Enrichissement de `RecuVenteData` avec les Données de l'Entreprise

**Fichiers concernés :**
- Modifier : `src/app/actions/ventes.ts`
- Test : `tests/recu-format-impression.test.ts`

**Contrats d'interface :**
- *Consomme :* Modèle `comptes` Prisma (`nom_entreprise`, `ifu`, `rccm`, `telephone_principal`, `telephone_secondaire`, `adresse_siege`, `ville`).
- *Produit :* Champ `entreprise` dans `RecuVenteData`, retourné par `enregistrerVenteAction` et `getRecuVenteAction`.

- [x] **1.1 Écrire le test unitaire en échec**  
  Créer le fichier `tests/recu-format-impression.test.ts` :
  ```typescript
  import { describe, it, expect } from "vitest";
  import { prisma } from "../src/lib/prisma";
  import { getRecuVenteAction } from "../src/app/actions/ventes";

  describe("Enrichissement RecuVenteData - Entreprise et Formats", () => {
    it("doit inclure les données de l'entreprise dans le reçu de vente", async () => {
      const vente = await prisma.ventes.findFirst({
        include: { boutique: true, compte: true },
      });
      if (!vente) return;

      const compte = await prisma.comptes.findUnique({
        where: { id: vente.compte_id },
      });
      expect(compte).toBeDefined();
      expect(compte?.nom_entreprise).toBeDefined();
    });
  });
  ```

- [x] **1.2 Exécuter le test**  
  ```powershell
  npx vitest run tests/recu-format-impression.test.ts
  ```

- [x] **1.3 Mettre à jour `RecuVenteData` et les actions dans `src/app/actions/ventes.ts`**  
  - Ajouter l'interface `EntrepriseInfo` dans `RecuVenteData` :
    ```typescript
    export interface RecuVenteData {
      id: string;
      numero_facture: string;
      date_vente: string;
      entreprise: {
        nom: string;
        ifu?: string | null;
        rccm?: string | null;
        telephone_principal: string;
        telephone_secondaire?: string | null;
        adresse_siege?: string | null;
        ville: string;
      };
      boutique: {
        code: string;
        nom: string;
        ville: string;
        adresse: string;
        telephone: string | null;
      };
      // ... suite des champs inchangés
    }
    ```
  - Dans `enregistrerVenteAction`, inclure les champs entreprise de `compte`.
  - Dans `getRecuVenteAction`, inclure la relation `compte` et mapper `entreprise`.

---

### Tâche 2 : Création du Composant Réutilisable `RecuVenteModal.tsx` (Ticket 80 mm & Facture A4)

**Fichiers concernés :**
- Créer : `src/components/dashboard/RecuVenteModal.tsx`

**Contrats d'interface :**
- *Consomme :* `RecuVenteData`, callback `onClose`, titre optionnel `titreSucces`.
- *Produit :* Composant modale avec commutateur d'affichage et d'impression pour :
  1. `Ticket thermique 80 mm` (`@page { size: 80mm auto; margin: 0; }`).
  2. `Facture A4 officielle` (`@page { size: A4 portrait; margin: 8mm; }`).
  - Suppression de l'impression sur 2 pages par isolation stricte du conteneur imprimable.
  - Hiérarchie en-tête stricte : **Nom de l'entreprise** tout en haut, puis **Nom de la boutique**, puis suite des informations.
  - Zéro lien URL djoonoo, simple texte statique en pied de page *"Propulsé par djoonoo.com"*.

- [x] **2.1 Développer `src/components/dashboard/RecuVenteModal.tsx`**  
  - Gérer l'état `formatActif: "ticket_80mm" | "facture_a4"`.
  - Implémenter le déclencheur d'impression avec injection de styles dynamiques sans coupure de page intempestive.

---

### Tâche 3 : Intégration dans `CaissePOS.tsx`, `VentesManager.tsx` et `ImpayesManager.tsx`

**Fichiers concernés :**
- Modifier : `src/components/dashboard/CaissePOS.tsx`
- Modifier : `src/components/dashboard/VentesManager.tsx`
- Modifier : `src/components/dashboard/ImpayesManager.tsx`

- [x] **3.1 Remplacer la modale inline dans `CaissePOS.tsx` par `RecuVenteModal`**
- [x] **3.2 Remplacer la modale inline dans `VentesManager.tsx` par `RecuVenteModal`**
- [x] **3.3 Remplacer la modale inline dans `ImpayesManager.tsx` par `RecuVenteModal`**

---

### Tâche 4 : Validation Globale, Tests Vitest, Typecheck & Push

- [x] **4.1 Exécuter les tests Vitest**  
  ```powershell
  npx vitest run
  ```
- [x] **4.2 Vérifier la compilation TypeScript stricte**  
  ```powershell
  npx tsc --noEmit
  ```
- [x] **4.3 Commits atomiques et Push Git**  
  ```powershell
  git push
  ```
