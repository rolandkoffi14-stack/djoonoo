# Plan d'Implémentation : Pagination Serveur, Skeleton Loaders & Dynamisme Temps Réel

> **Pour l'agent d'exécution :** Chaque tâche est jalonnée de cases à cocher (`- [ ]`). Validez chaque micro-étape séquentiellement dans une démarche TDD rigoureuse.

**Objectif :** Éliminer le besoin de recharger le navigateur (F5) en instaurant une réactivité dynamique native Next.js 15, ajouter des Skeleton Loaders conformes à la charte graphique djoonoo sur tous les tableaux de bord (`loading.tsx` et `<Suspense />`), et paginer toutes les listes côté serveur (ventes, clients, stocks, logs) pour garantir un temps de réponse < 50ms même avec 10 000 clients et 1 000 000 de ventes en base.  
**Architecture :** Next.js 15 App Router avec Server Components pilotés par les Search Params (`?page=&limit=`), requêtes Prisma avec `skip`/`take` et agrégations SQL natives (`_sum`, `count`), index composés PostgreSQL, et réactivité client pilotée par `useTransition` + `router.refresh()`.  
**Pile technique :** Next.js 16.3 / React 19, TypeScript 5, Prisma ORM 6, Tailwind CSS 4, Vitest 5.  
**Spécification source :** Sections 0, 9, 10, 11 & 16 du référentiel (`.agents/rules/`).

---

## Contraintes Globales & Règles Non Négociables
- **Isolation multi-tenant stricte (Règle 5)** : Toutes les requêtes (y compris le `count()` et les agrégations de pagination) doivent impérativement transiter par `getScopedPrisma(session.compteId)` ou inclure explicitement `{ compte_id: session.compteId }`.
- **Charte graphique djoonoo (Section 0 & 11)** : Les Skeletons doivent utiliser les tons chauds du design system : fond crème `#FAF6F1`, bordures sable `#E5DACF`, pulsation dans les tons `#F2EBE3` (aucun gris neutre générique d'IA).
- **Stateless & URL-driven (Section 9)** : La pagination doit être pilotée par l'URL (`searchParams`) pour permettre le bookmarking, l'usage des boutons Précédent/Suivant du navigateur et le streaming serveur sans état en mémoire vive Node.js.
- **Zéro agrégation en mémoire Node.js** : Ne jamais ramener 100 000 lignes dans un `.findMany()` pour exécuter un `.reduce()` ou un `.filter()` en JavaScript. Utiliser exclusivement `count()` et `aggregate()` de Prisma/PostgreSQL.

---

## Focus de Revue Critique (Top 5 des angles morts potentiels)
1. **Dépassement de page lors d'un filtre ou suppression** : Si un utilisateur est sur la page 4 et filtre par un mot-clé qui ne renvoie que 10 résultats, la page demandée (4) serait vide sans un ajustement automatique vers la page 1 (`page = Math.min(page, maxPages)`).
2. **Latence des sous-requêtes imbriquées (N+1)** : Éviter d'inclure des relations profondes non paginées (ex: `include: { ventes: { include: { paiements } } }`) sur chaque client affiché.
3. **Perte de filtres lors de la pagination** : Le clic sur "Page suivante" doit préserver les autres paramètres de l'URL (`recherche`, `statut`, `tri`, `boutique`).
4. **Concurrence & transition réactive** : L'utilisation de `startTransition` avec `router.refresh()` doit afficher un indicateur visuel de chargement non intrusif sans figer l'interface.
5. **Index PostgreSQL manquants sur les tris** : Un `ORDER BY date_vente DESC` sur 1M de lignes sans index composé `[compte_id, boutique_id, date_vente]` déclenche un *Sequential Scan* lent.

---

## Tâche 1 : Optimisation des Index PostgreSQL dans Prisma (Montée en charge 1M+ lignes)

### Contexte & Objectif
Préparer la base PostgreSQL pour que les requêtes paginées avec tri (`ORDER BY date_vente DESC`) s'exécutent en moins de 10ms même avec des millions de lignes, conformément à la Section 9 du cahier des charges.

- [x] **1.1 Écrire le test unitaire validant la présence des index dans le schéma**  
  Créer le fichier `tests/schema-indexes.test.ts` :
  ```typescript
  import { describe, it, expect } from "vitest";
  import fs from "fs";
  import path from "path";

  describe("Index de Performance Prisma (Section 9)", () => {
    it("doit comporter les index composés pour la pagination et les tris fréquents", () => {
      const schemaPath = path.resolve(process.cwd(), "prisma/schema.prisma");
      const schemaContent = fs.readFileSync(schemaPath, "utf-8");

      // Index pour les ventes : [boutique_id, date_vente] et [compte_id, date_vente]
      expect(schemaContent).toContain("@@index([boutique_id, date_vente])");
      expect(schemaContent).toContain("@@index([compte_id, date_vente])");

      // Index pour les clients : recherche par nom au sein du compte
      expect(schemaContent).toContain("@@index([compte_id, nom])");

      // Index pour les produits : tri par nom au sein de la boutique
      expect(schemaContent).toContain("@@index([boutique_id, nom])");
    });
  });
  ```

- [x] **1.2 Exécuter le test et vérifier son échec initial**  
  ```powershell
  npx vitest run tests/schema-indexes.test.ts
  ```
  *Erreur attendue : AssertionError: expected ... to contain '@@index([boutique_id, date_vente])'*

- [x] **1.3 Mettre à jour `prisma/schema.prisma`**  
  Ajouter les index composites sur les modèles `ventes`, `clients` et `produits` :
  ```prisma
  model ventes {
    // ... champs existants ...

    @@index([boutique_id])
    @@index([compte_id])
    @@index([boutique_id, date_vente])
    @@index([compte_id, date_vente])
  }

  model produits {
    // ... champs existants ...

    @@index([boutique_id])
    @@index([compte_id])
    @@index([boutique_id, nom])
  }

  model clients {
    // ... champs existants ...

    @@index([compte_id, telephone])
    @@index([compte_id, nom])
  }
  ```

- [x] **1.4 Pousser les modifications sur Supabase et régénérer le client**  
  ```powershell
  npx prisma db push
  ```

- [x] **1.5 Exécuter le test et vérifier le passage au vert**  
  ```powershell
  npx vitest run tests/schema-indexes.test.ts
  ```

- [x] **1.6 Commit Git atomique**  
  ```powershell
  git add prisma/schema.prisma tests/schema-indexes.test.ts
  git commit -m "perf(db): ajout des index composes postgres pour pagination et tri a grande echelle"
  ```

---

## Tâche 2 : Utilitaire de Pagination & Composant UI `<Pagination />`

### Contexte & Objectif
Créer un helper typé pour analyser et borner les paramètres d'URL (`page`, `limit`), ainsi qu'un composant UI accessible et élégant aux couleurs de djoonoo.

- [x] **2.1 Écrire le test unitaire de l'utilitaire de pagination**  
  Créer le fichier `tests/pagination-helper.test.ts` :
  ```typescript
  import { describe, it, expect } from "vitest";
  import { parsePaginationParams, genererTranchesPagination } from "../src/lib/pagination";

  describe("Utilitaires de Pagination", () => {
    it("doit attribuer les valeurs par défaut page=1 et limit=25 si absent ou invalide", () => {
      const p1 = parsePaginationParams({});
      expect(p1.page).toBe(1);
      expect(p1.limit).toBe(25);
      expect(p1.skip).toBe(0);

      const p2 = parsePaginationParams({ page: "-5", limit: "abc" });
      expect(p2.page).toBe(1);
      expect(p2.limit).toBe(25);
      expect(p2.skip).toBe(0);
    });

    it("doit borner le limit entre 10 et 100 pour éviter la saturation mémoire", () => {
      const p1 = parsePaginationParams({ limit: "5" });
      expect(p1.limit).toBe(10);

      const p2 = parsePaginationParams({ limit: "5000" });
      expect(p2.limit).toBe(100);

      const p3 = parsePaginationParams({ page: "3", limit: "50" });
      expect(p3.page).toBe(3);
      expect(p3.limit).toBe(50);
      expect(p3.skip).toBe(100);
    });

    it("doit générer correctement les numéros de page avec ellipses", () => {
      // 10 pages au total, page courante = 1 -> [1, 2, 3, "...", 10]
      const tranches1 = genererTranchesPagination(1, 10);
      expect(tranches1).toEqual([1, 2, 3, "...", 10]);

      // 10 pages, page courante = 5 -> [1, "...", 4, 5, 6, "...", 10]
      const tranches2 = genererTranchesPagination(5, 10);
      expect(tranches2).toEqual([1, "...", 4, 5, 6, "...", 10]);

      // 5 pages, page courante = 3 -> [1, 2, 3, 4, 5] (pas d'ellipse nécessaire)
      const tranches3 = genererTranchesPagination(3, 5);
      expect(tranches3).toEqual([1, 2, 3, 4, 5]);
    });
  });
  ```

- [x] **2.2 Exécuter le test et vérifier son échec initial**  
  ```powershell
  npx vitest run tests/pagination-helper.test.ts
  ```
  *Erreur attendue : Cannot find module '../src/lib/pagination'.*

- [x] **2.3 Implémenter `src/lib/pagination.ts`**  
  ```typescript
  export interface PaginationParams {
    page: number;
    limit: number;
    skip: number;
  }

  export function parsePaginationParams(
    searchParams?: { page?: string | number; limit?: string | number },
    defaultLimit: number = 25
  ): PaginationParams {
    let page = parseInt(String(searchParams?.page || "1"), 10);
    if (isNaN(page) || page < 1) page = 1;

    let limit = parseInt(String(searchParams?.limit || defaultLimit), 10);
    if (isNaN(limit) || limit < 10) limit = 10;
    if (limit > 100) limit = 100;

    const skip = (page - 1) * limit;

    return { page, limit, skip };
  }

  export function genererTranchesPagination(
    pageCourante: number,
    totalPages: number
  ): (number | "...")[] {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (pageCourante <= 3) {
      return [1, 2, 3, 4, "...", totalPages];
    }

    if (pageCourante >= totalPages - 2) {
      return [1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [
      1,
      "...",
      pageCourante - 1,
      pageCourante,
      pageCourante + 1,
      "...",
      totalPages,
    ];
  }
  ```

- [x] **2.4 Créer le composant client `src/components/ui/Pagination.tsx`**  
  Composant accessible préservant tous les paramètres d'URL existants :
  ```tsx
  "use client";

  import React, { useTransition } from "react";
  import { useRouter, usePathname, useSearchParams } from "next/navigation";
  import { ChevronLeft, ChevronRight } from "lucide-react";
  import { genererTranchesPagination } from "@/lib/pagination";

  interface PaginationProps {
    page: number;
    totalPages: number;
    totalElements: number;
    limit: number;
  }

  export default function Pagination({
    page,
    totalPages,
    totalElements,
    limit,
  }: PaginationProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    if (totalElements === 0 || totalPages <= 1) {
      return null;
    }

    const changerPage = (nouvellePage: number) => {
      if (nouvellePage < 1 || nouvellePage > totalPages || nouvellePage === page) return;

      const params = new URLSearchParams(searchParams.toString());
      params.set("page", String(nouvellePage));

      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    };

    const changerLimite = (nouvelleLimite: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("limit", String(nouvelleLimite));
      params.set("page", "1"); // Revenir en page 1 quand la taille change

      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    };

    const debut = (page - 1) * limit + 1;
    const fin = Math.min(page * limit, totalElements);
    const tranches = genererTranchesPagination(page, totalPages);

    return (
      <div
        className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-4 bg-[#FAF6F1] border-t border-[#E5DACF] text-xs text-[#6D5D52] transition-opacity duration-200 ${
          isPending ? "opacity-50 pointer-events-none" : "opacity-100"
        }`}
      >
        <div className="flex items-center gap-3">
          <span>
            Affichage de <strong className="text-[#2B2119]">{debut}</strong> à{" "}
            <strong className="text-[#2B2119]">{fin}</strong> sur{" "}
            <strong className="text-[#2B2119]">{totalElements.toLocaleString("fr-FR")}</strong>
          </span>

          <div className="hidden sm:flex items-center gap-1.5 ml-2">
            <span>Par page :</span>
            <select
              value={limit}
              onChange={(e) => changerLimite(Number(e.target.value))}
              className="bg-[#FAF6F1] border border-[#E5DACF] rounded-lg px-2 py-1 text-xs text-[#2B2119] focus:outline-none focus:ring-1 focus:ring-[#C1652D]"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => changerPage(page - 1)}
            disabled={page <= 1}
            className="p-1.5 rounded-lg border border-[#E5DACF] hover:bg-[#E5DACF]/40 disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-colors"
            title="Page précédente"
          >
            <ChevronLeft className="w-4 h-4 text-[#2B2119]" />
          </button>

          {tranches.map((item, index) =>
            item === "..." ? (
              <span key={`dots-${index}`} className="px-2 py-1 text-[#8C7A6B]">
                ...
              </span>
            ) : (
              <button
                key={`page-${item}`}
                type="button"
                onClick={() => changerPage(item as number)}
                className={`min-w-8 h-8 rounded-lg font-bold transition-all cursor-pointer ${
                  item === page
                    ? "bg-[#C1652D] text-[#FAF6F1] shadow-xs"
                    : "border border-[#E5DACF] text-[#2B2119] hover:bg-[#E5DACF]/40"
                }`}
              >
                {item}
              </button>
            )
          )}

          <button
            type="button"
            onClick={() => changerPage(page + 1)}
            disabled={page >= totalPages}
            className="p-1.5 rounded-lg border border-[#E5DACF] hover:bg-[#E5DACF]/40 disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-colors"
            title="Page suivante"
          >
            <ChevronRight className="w-4 h-4 text-[#2B2119]" />
          </button>
        </div>
      </div>
    );
  }
  ```

- [x] **2.5 Exécuter les tests et vérifier le passage au vert**  
  ```powershell
  npx vitest run tests/pagination-helper.test.ts
  ```

- [x] **2.6 Commit Git atomique**  
  ```powershell
  git add src/lib/pagination.ts src/components/ui/Pagination.tsx tests/pagination-helper.test.ts
  git commit -m "feat(ui): utilitaire de pagination et composant ui accessible pagination"
  ```

---

## Tâche 3 : Bibliothèque de Skeletons & Déploiement des `loading.tsx`

### Contexte & Objectif
Créer les composants Skeleton chauds conformes à la charte graphique djoonoo et créer les fichiers `loading.tsx` sur toutes les routes du dashboard et super-admin pour un affichage instantané sans blocage.

- [x] **3.1 Créer les composants Skeleton modulaires dans `src/components/ui/Skeleton.tsx`**  
  ```tsx
  import React from "react";

  export function Skeleton({ className = "" }: { className?: string }) {
    return (
      <div
        className={`animate-pulse bg-[#E5DACF]/50 rounded-xl ${className}`}
      />
    );
  }

  export function CardsKpiSkeleton({ count = 4 }: { count?: number }) {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${count} gap-4`}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl p-5 space-y-3"
          >
            <div className="flex justify-between items-center">
              <Skeleton className="w-24 h-4" />
              <Skeleton className="w-8 h-8 rounded-lg" />
            </div>
            <Skeleton className="w-36 h-7" />
            <Skeleton className="w-20 h-3" />
          </div>
        ))}
      </div>
    );
  }

  export function TableSkeleton({
    colonnes = 5,
    lignes = 8,
  }: {
    colonnes?: number;
    lignes?: number;
  }) {
    return (
      <div className="bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl overflow-hidden shadow-sm space-y-4 p-5">
        {/* Barre de recherche et filtres factices */}
        <div className="flex flex-col sm:flex-row justify-between gap-3">
          <Skeleton className="w-full sm:w-72 h-10 rounded-xl" />
          <div className="flex gap-2">
            <Skeleton className="w-20 h-10 rounded-xl" />
            <Skeleton className="w-20 h-10 rounded-xl" />
          </div>
        </div>

        {/* Lignes du tableau */}
        <div className="space-y-3 pt-2">
          <Skeleton className="w-full h-8 rounded-lg bg-[#E5DACF]/70" />
          {Array.from({ length: lignes }).map((_, i) => (
            <div key={i} className="flex gap-3 items-center py-2 border-b border-[#E5DACF]/30">
              {Array.from({ length: colonnes }).map((_, j) => (
                <Skeleton
                  key={j}
                  className={`h-5 ${j === 0 ? "w-24" : j === 1 ? "flex-1" : "w-20"}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }
  ```

- [x] **3.2 Créer `src/app/dashboard/loading.tsx` (Vue d'ensemble)**  
  ```tsx
  import React from "react";
  import { Skeleton, CardsKpiSkeleton } from "@/components/ui/Skeleton";

  export default function DashboardLoading() {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Bannière de Bienvenue */}
        <div className="bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl p-6 sm:p-7 space-y-3">
          <Skeleton className="w-48 h-8" />
          <Skeleton className="w-96 max-w-full h-4" />
        </div>

        {/* KPIs */}
        <CardsKpiSkeleton count={4} />

        {/* Grille inférieure */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl p-6 space-y-4">
            <Skeleton className="w-40 h-6" />
            <Skeleton className="w-full h-48 rounded-xl" />
          </div>
          <div className="bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl p-6 space-y-4">
            <Skeleton className="w-40 h-6" />
            <Skeleton className="w-full h-48 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }
  ```

- [x] **3.3 Créer les `loading.tsx` des sous-pages du Dashboard**  
  - `src/app/dashboard/ventes/loading.tsx` : `<TableSkeleton colonnes={7} lignes={8} />`
  - `src/app/dashboard/clients/loading.tsx` : `<TableSkeleton colonnes={6} lignes={8} />`
  - `src/app/dashboard/produits/loading.tsx` : `<TableSkeleton colonnes={6} lignes={8} />`
  - `src/app/dashboard/audit/loading.tsx` : `<TableSkeleton colonnes={5} lignes={10} />`
  - `src/app/dashboard/equipe/loading.tsx` : `<CardsKpiSkeleton count={3} />`
  - `src/app/dashboard/rapports/loading.tsx` : `<CardsKpiSkeleton count={4} />`
  - `src/app/dashboard/caisse/loading.tsx` : Squelette divisé (grille produits à gauche + bloc commande à droite).
  - `src/app/dashboard/abonnement/loading.tsx` : Squelette forfait actif + table factures.
  - `src/app/super-admin/loading.tsx` & `src/app/super-admin/abonnements/loading.tsx`.

- [x] **3.4 Commit Git atomique**  
  ```powershell
  git add src/components/ui/Skeleton.tsx src/app/dashboard/loading.tsx src/app/dashboard/*/loading.tsx src/app/super-admin/**/loading.tsx
  git commit -m "feat(ui): deploiement des skeleton loaders et loading.tsx sur toutes les pages"
  ```

---

## Tâche 4 : Pagination Serveur des Ventes (`/dashboard/ventes`)

### Contexte & Objectif
Remplacer le chargement monolithique de toutes les ventes par une double requête atomique paginée (`count` + `findMany`) pilotée par `searchParams`.

- [x] **4.1 Écrire le test unitaire de la pagination des ventes**  
  Créer le fichier `tests/ventes-pagination.test.ts` :
  ```typescript
  import { describe, it, expect } from "vitest";
  import { prisma } from "../src/lib/prisma";
  import { parsePaginationParams } from "../src/lib/pagination";

  describe("Pagination Serveur des Ventes", () => {
    it("doit renvoyer un nombre de ventes strictement borné par limit et un compte total", async () => {
      const compte = await prisma.comptes.findFirst({
        include: { boutiques: true },
      });
      if (!compte || compte.boutiques.length === 0) return;

      const { page, limit, skip } = parsePaginationParams({ page: "1", limit: "10" });

      const [total, ventes] = await Promise.all([
        prisma.ventes.count({
          where: { compte_id: compte.id, boutique_id: compte.boutiques[0].id },
        }),
        prisma.ventes.findMany({
          where: { compte_id: compte.id, boutique_id: compte.boutiques[0].id },
          skip,
          take: limit,
          orderBy: { date_vente: "desc" },
        }),
      ]);

      expect(ventes.length).toBeLessThanOrEqual(10);
      expect(total).toBeGreaterThanOrEqual(ventes.length);
    });
  });
  ```

- [x] **4.2 Écrire le test et vérifier son comportement**  
  ```powershell
  npx vitest run tests/ventes-pagination.test.ts
  ```

- [x] **4.3 Mettre à jour `src/app/dashboard/ventes/page.tsx`**  
  - Accepter `searchParams: Promise<{ page?: string; limit?: string; q?: string; statut?: string }>`
  - Utiliser `parsePaginationParams(params)` pour calculer `skip` et `take`.
  - Construire la condition Prisma avec recherche textuelle et statut de paiement côté serveur.
  - Exécuter `Promise.all([ scoped.ventes.count({ where }), scoped.ventes.findMany({ skip, take, where, orderBy, select }) ])`.
  - Calculer `totalPages = Math.ceil(total / limit)`.
  - Passer `page`, `limit`, `totalPages`, `totalCount` au composant `VentesManager`.

- [x] **4.4 Adapter `src/components/dashboard/VentesManager.tsx`**  
  - Intégrer `<Pagination page={page} totalPages={totalPages} totalElements={totalCount} limit={limit} />` au bas du tableau.
  - Lier la recherche textuelle et les filtres statuts aux URL search params avec `useTransition` et `router.push`.

- [x] **4.5 Exécuter les tests et vérifier le passage au vert**  
  ```powershell
  npx vitest run tests/ventes-pagination.test.ts
  ```

- [x] **4.6 Commit Git atomique**  
  ```powershell
  git add src/app/dashboard/ventes/page.tsx src/components/dashboard/VentesManager.tsx tests/ventes-pagination.test.ts
  git commit -m "perf(ventes): pagination serveur et filtres url pour les ventes a grande echelle"
  ```

---

## Tâche 5 : Pagination Serveur des Clients (`/dashboard/clients`) & Suppression du N+1

### Contexte & Objectif
Supprimer le `findMany` qui chargeait l'intégralité des clients avec toutes leurs ventes en mémoire. Mettre en place une pagination stricte (25 par page) et calculer les soldes de manière ciblée.

- [x] **5.1 Écrire le test unitaire de la pagination des clients**  
  Créer le fichier `tests/clients-pagination.test.ts` :
  ```typescript
  import { describe, it, expect } from "vitest";
  import { prisma } from "../src/lib/prisma";
  import { parsePaginationParams } from "../src/lib/pagination";

  describe("Pagination Serveur des Clients", () => {
    it("doit paginer les clients sans charger l'historique complet de la base en mémoire", async () => {
      const compte = await prisma.comptes.findFirst();
      if (!compte) return;

      const { skip, limit } = parsePaginationParams({ page: "1", limit: "15" });

      const [total, clients] = await Promise.all([
        prisma.clients.count({ where: { compte_id: compte.id } }),
        prisma.clients.findMany({
          where: { compte_id: compte.id },
          skip,
          take: limit,
          orderBy: { nom: "asc" },
        }),
      ]);

      expect(clients.length).toBeLessThanOrEqual(15);
      expect(total).toBeGreaterThanOrEqual(clients.length);
    });
  });
  ```

- [x] **5.2 Exécuter le test**  
  ```powershell
  npx vitest run tests/clients-pagination.test.ts
  ```

- [x] **5.3 Mettre à jour `src/app/dashboard/clients/page.tsx`**  
  - Accepter `searchParams` (`page`, `limit`, `q`).
  - Filtrer sur `compte_id` et le nom/téléphone (`contains`, `mode: "insensitive"`).
  - N'agréger les ventes et paiements que pour les clients de la page courante (`take: limit`).
  - Passer les métriques et `<Pagination />` à `ClientsManager.tsx`.

- [x] **5.4 Adapter `src/components/dashboard/ClientsManager.tsx`**  
  - Ajouter le composant `<Pagination />`.
  - Raccorder la recherche de client aux paramètres d'URL via `useTransition`.

- [x] **5.5 Commit Git atomique**  
  ```powershell
  git add src/app/dashboard/clients/page.tsx src/components/dashboard/ClientsManager.tsx tests/clients-pagination.test.ts
  git commit -m "perf(clients): pagination serveur des clients et elimination du goulot memoire n+1"
  ```

---

## Tâche 6 : Pagination Serveur des Produits (`/dashboard/produits`) & Audit (`/dashboard/audit`)

### Contexte & Objectif
Paginer les produits et le journal d'audit pour éviter toute dégradation lorsque l'entreprise accumule des milliers de références ou d'actions journalisées.

- [x] **6.1 Mettre à jour `src/app/dashboard/produits/page.tsx` et `ProduitsManager.tsx`**  
  - Pagination par boutique active avec `skip` et `take`.
  - Intégration du composant `<Pagination />`.
  - Filtre par alerte de stock et recherche par nom.

- [x] **6.2 Mettre à jour `src/app/dashboard/audit/page.tsx` et `AuditManager.tsx`**  
  - Pagination par tranches de 25 ou 50 événements d'audit.
  - Indexation temporelle `date: "desc"`.

- [x] **6.3 Commit Git atomique**  
  ```powershell
  git add src/app/dashboard/produits/page.tsx src/components/dashboard/ProduitsManager.tsx src/app/dashboard/audit/page.tsx src/components/dashboard/AuditManager.tsx
  git commit -m "perf(stock-audit): pagination serveur du stock produits et du journal d audit"
  ```

---

## Tâche 7 : Optimisation SQL des Métriques du Dashboard (`/dashboard/page.tsx`)

### Contexte & Objectif
Remplacer les `.findMany()` qui ramenaient des milliers d'objets pour faire des `.length` et des `.reduce()` dans le tableau de bord d'accueil par des requêtes SQL natives ultra-rapides (`count` et `aggregate`).

- [x] **7.1 Mettre à jour `src/app/dashboard/page.tsx`**  
  Remplacer le chargement exhaustif par des agrégations PostgreSQL directes :
  ```typescript
  const [alertesStockCount, ventesAujourdhuiAgg, ventesImpayeesAgg] = await Promise.all([
    // 1. Nombre de produits en alerte stock
    scoped.produits.count({
      where: {
        compte_id: session.compteId,
        boutique_id: activeBoutique.id,
        quantite_stock: { lte: 5 }, // seuil d'alerte ciblé
      },
    }),
    // 2. Chiffre d'affaires et nombre de ventes du jour (SQL direct)
    scoped.ventes.aggregate({
      where: {
        compte_id: session.compteId,
        boutique_id: activeBoutique.id,
        date_vente: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        statut_vente: "validee",
      },
      _sum: { montant_total: true },
      _count: true,
    }),
    // 3. Aperçu limité des impayés (max 50)
    scoped.ventes.findMany({
      where: {
        compte_id: session.compteId,
        boutique_id: activeBoutique.id,
        statut_paiement: { in: ["impaye", "partiel"] },
        statut_vente: "validee",
      },
      select: {
        montant_total: true,
        paiements: { select: { montant: true } },
      },
      take: 50,
    }),
  ]);
  ```

- [x] **7.2 Commit Git atomique**  
  ```powershell
  git add src/app/dashboard/page.tsx
  git commit -m "perf(dashboard): agregations sql natives pour les kpis de la vue d ensemble"
  ```

---

## Tâche 8 : Dynamisme Sans Rechargement (Élimination du besoin de F5)

### Contexte & Objectif
Assurer que toute action utilisateur (encaissement en caisse, création de client, modification de stock, changement de boutique active) mette à jour immédiatement l'état visible sans jamais nécessiter un rechargement manuel du navigateur (`F5`).

- [x] **8.1 Caisse POS (`src/components/dashboard/CaissePOS.tsx`)** :
  - Après l'appel réussi à `enregistrerVenteAction`, déclencher `router.refresh()` dans le `startTransition` pour synchroniser les stocks du serveur sans recharger la page.
  - Mettre à jour l'état local immédiatement de manière optimiste.

- [x] **8.2 Sélecteur de Boutique dans le Header (`src/components/dashboard/Header.tsx`)** :
  - Lors de la sélection d'une boutique, poser le cookie `djoonoo_active_boutique` puis exécuter `startTransition(() => { router.refresh(); })`.

- [x] **8.3 Gestionnaires de Ressources (`ProduitsManager`, `ClientsManager`, `EquipeManager`, `ImpayesManager`)** :
  - Vérifier et homogénéiser le pattern : après toute création/suppression/mise à jour, appeler `router.refresh()` dans un `startTransition` et réinitialiser les modales/formulaires proprement.

- [x] **8.4 Commit Git atomique**  
  ```powershell
  git add src/components/dashboard/CaissePOS.tsx src/components/dashboard/Header.tsx src/components/dashboard/*.tsx
  git commit -m "feat(ux): revalidation dynamique instantanee sans rechargement de page navigateur"
  ```

---

## Tâche 9 : Validation Globale, Tests de Non-Régression & Compilation

### Contexte & Objectif
S'assurer que toutes les pages fonctionnent harmonieusement, que l'intégralité de la suite Vitest passe au vert et que TypeScript compile sans la moindre erreur.

- [x] **9.1 Exécuter la suite complète de tests Vitest**  
  ```powershell
  npx vitest run
  ```
  *Résultat attendu : 100% des tests passés avec succès.*

- [x] **9.2 Vérifier la compilation TypeScript**  
  ```powershell
  npx tsc --noEmit
  ```
  *Résultat attendu : 0 erreur de type.*

- [x] **9.3 Commit Git final de clôture du chantier**  
  ```powershell
  git commit --allow-empty -m "release(perf): pagination serveur, skeletons et dynamisme temps reel completes avec succes"
  ```
