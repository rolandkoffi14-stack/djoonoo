# Plan d'Implémentation : Synchronisation Temps Réel Multi-Écrans sans Rechargement (Live Sync SSE)

> **Pour l'agent d'exécution :** Chaque tâche est jalonnée de cases à cocher (`- [ ]`). Validez chaque micro-étape séquentiellement selon le protocole TDD strict (Test en échec -> Implémentation minimale -> Test passant -> Validation).

**Objectif :** Permettre l'actualisation instantanée et automatique de tous les écrans actifs de l'application (Patron, Gérant, Vendeur) dès qu'une donnée change en base (ventes, stocks, paiements, impayés, clients), sans aucun rechargement complet de page (F5), sans clignotement d'interface, et sans jamais réinitialiser le panier en cours d'un caissier.  
**Architecture :** Next.js 16 (App Router), Server-Sent Events (SSE) via Route Handler streaming natif, Hub d'événements mémoire multi-tenant cloisonné par `compte_id`, composant d'écoute global `RealtimeListener` couplé à `router.refresh()` et synchronisation d'état réactive sur les composants analytiques (`RapportsManager`).  
**Pile technique :** Next.js 16.4.2, React 19, TypeScript 5, Prisma 6.19.3, Vitest 5.0.2.  
**Spécification source :** Rapport d'analyse d'architecture temps réel djoonoo (Sections 1.2, 5, 8, 10).

---

## Contraintes Globales
- **Accès exclusivement Prisma côté serveur (Section 10)** : Aucun SDK client direct (ex: Supabase JS côté client) n'est introduit dans le navigateur. Tout le flux temps réel est diffusé par Next.js et filtré côté serveur.
- **Zéro service externe payant (Section 10 & 16)** : Pas de service SaaS supplémentaire (Pusher, Ably). La solution fonctionne de manière 100 % autonome sur le VPS Contabo / Coolify via Node.js et Caddy.
- **Cloisonnement multi-tenant hermétique (Règle 5)** : Le hub d'événements est strictement cloisonné par `compte_id`. Aucun événement d'un compte ne peut être écouté par un autre compte.
- **Principe de charge minimale sur le flux (Payload-free events)** : Les événements SSE ne transportent que des métadonnées légères (`{ type, boutiqueId, timestamp }`). Aucune donnée sensible n'est transmise sur le flux ; c'est le `router.refresh()` qui déclenche la réexécution sécurisée des requêtes Prisma avec les droits RBAC stricts de chaque rôle.
- **Préservation absolue de l'état de Caisse POS** : Une mise à jour en tâche de fond ne doit jamais écraser le panier (`panier`) en cours d'un vendeur.
- **Zéro régression** : La suite de tests existante (161 tests) doit rester 100 % au vert.

---

## Focus de Revue Critique (Top 5 des angles morts)
1. **Saturation ou coupure des connexions HTTP streaming par les proxies** : Configurer les en-têtes HTTP SSE (`Cache-Control: no-cache, no-transform`, `X-Accel-Buffering: no`) et implémenter un signal de battement de cœur (*heartbeat/ping*) toutes les 25 secondes pour empêcher la fermeture par Caddy ou les pare-feu.
2. **Fuite mémoire sur les connexions SSE abandonnées** : Détecter la fermeture de l'onglet ou la coupure réseau via `req.signal.addEventListener("abort")` pour désabonner immédiatement le client du hub mémoire.
3. **Tempête de rafraîchissements (*Throttling / Debounce*)** : Si un import ou une rafale de 5 ventes survient en 2 secondes, le client doit temporiser (`debounce` de 250ms) pour ne déclencher qu'un seul `router.refresh()`.
4. **Graphiques de Rapports figés malgré le rafraîchissement serveur** : Dans `RapportsManager.tsx`, l'état `data` est local ; il est impératif d'ajouter la synchronisation `useEffect` sur `initialData` et de brancher un écouteur sur le filtre actif.
5. **Onglets inactifs ou en arrière-plan (*Page Visibility*)** : Lorsqu'un utilisateur rouvre un onglet laissé en sommeil, vérifier l'état de la connexion EventSource et forcer un rafraîchissement transparent si des événements ont été manqués.

---

## Vue d'Ensemble des Phases d'Implémentation

| Phase | Domaine | Objectif |
|---|---|---|
| **Phase 1** | Hub d'Événements Serveur Multi-Tenant | Créer le bus d'événements mémoire in-process (`realtime-hub.ts`) cloisonné par `compte_id`. |
| **Phase 2** | Endpoint SSE Streaming & Authentification | Créer la Route Handler `GET /api/realtime/stream` protégée par session Auth.js. |
| **Phase 3** | Émission d'Événements dans les Server Actions | Publier les événements métier dans `ventes.ts`, `impayes.ts`, `produits.ts` et `clients.ts`. |
| **Phase 4** | Écouteur Client Global & Déclencheur UI | Créer le composant `RealtimeListener` et l'intégrer au `DashboardLayout`. |
| **Phase 5** | Synchronisation Ciblée & Sécurisation POS | Mettre à niveau `RapportsManager.tsx` et blinder `CaissePOS.tsx` contre la perte de panier. |
| **Phase 6** | Validation Complète, Non-Régression & Build | Exécuter l'intégralité de la suite Vitest (161+ tests) et valider le build de production. |

---

## TÂCHES DÉTAILLÉES D'EXÉCUTION

---

### Phase 1 : Hub d'Événements Serveur Multi-Tenant

- [x] **Tâche 1.1 : Test unitaire du Hub d'Événements Temps Réel**
  - **Consomme :** `vitest`.
  - **Produit :** Nouveau fichier `tests/realtime-hub.test.ts`.
  - **Code complet du test :**
    ```typescript
    import { describe, it, expect, vi, beforeEach } from "vitest";
    import { realtimeHub, RealtimeEvent } from "@/lib/realtime-hub";

    describe("realtimeHub - Bus d'événements multi-tenant", () => {
      beforeEach(() => {
        realtimeHub.resetForTesting();
      });

      it("doit diffuser un événement uniquement aux auditeurs du même compte_id", () => {
        const listenerTenantA = vi.fn();
        const listenerTenantB = vi.fn();

        const unsubA = realtimeHub.subscribe("compte-1", listenerTenantA);
        const unsubB = realtimeHub.subscribe("compte-2", listenerTenantB);

        const eventTenantA: RealtimeEvent = {
          compteId: "compte-1",
          type: "VENTE_CREEE",
          boutiqueId: "b-01",
          timestamp: Date.now(),
        };

        realtimeHub.publish(eventTenantA);

        expect(listenerTenantA).toHaveBeenCalledTimes(1);
        expect(listenerTenantA).toHaveBeenCalledWith(eventTenantA);
        expect(listenerTenantB).not.toHaveBeenCalled();

        unsubA();
        unsubB();
      });

      it("doit cesser de notifier un client après son désabonnement", () => {
        const listener = vi.fn();
        const unsub = realtimeHub.subscribe("compte-1", listener);

        realtimeHub.publish({ compteId: "compte-1", type: "VENTE_CREEE" });
        expect(listener).toHaveBeenCalledTimes(1);

        unsub();
        realtimeHub.publish({ compteId: "compte-1", type: "VENTE_CREEE" });
        expect(listener).toHaveBeenCalledTimes(1);
      });
    });
    ```
  - **Commande de validation de l'échec :**
    ```bash
    npx vitest run tests/realtime-hub.test.ts
    ```

- [x] **Tâche 1.2 : Implémenter le singleton `realtimeHub`**
  - **Consomme :** `tests/realtime-hub.test.ts`.
  - **Produit :** Nouveau fichier `src/lib/realtime-hub.ts`.
  - **Code d'implémentation complet :**
    ```typescript
    export type RealtimeEventType =
      | "VENTE_CREEE"
      | "VENTE_ANNULEE"
      | "PAIEMENT_ENREGISTRE"
      | "STOCK_MODIFIE"
      | "CLIENT_MODIFIE";

    export interface RealtimeEvent {
      compteId: string;
      type: RealtimeEventType;
      boutiqueId?: string;
      timestamp?: number;
    }

    type EventCallback = (event: RealtimeEvent) => void;

    class RealtimeHub {
      private channels: Map<string, Set<EventCallback>> = new Map();

      public subscribe(compteId: string, callback: EventCallback): () => void {
        let listeners = this.channels.get(compteId);
        if (!listeners) {
          listeners = new Set();
          this.channels.set(compteId, listeners);
        }
        listeners.add(callback);

        return () => {
          const currentListeners = this.channels.get(compteId);
          if (currentListeners) {
            currentListeners.delete(callback);
            if (currentListeners.size === 0) {
              this.channels.delete(compteId);
            }
          }
        };
      }

      public publish(event: RealtimeEvent): void {
        const listeners = this.channels.get(event.compteId);
        if (!listeners || listeners.size === 0) return;

        const payload: RealtimeEvent = {
          ...event,
          timestamp: event.timestamp || Date.now(),
        };

        for (const callback of listeners) {
          try {
            callback(payload);
          } catch (err) {
            console.error("[realtimeHub] Erreur lors de la notification d'un écouteur:", err);
          }
        }
      }

      public resetForTesting(): void {
        this.channels.clear();
      }
    }

    const globalForRealtime = globalThis as unknown as {
      realtimeHubInstance?: RealtimeHub;
    };

    export const realtimeHub =
      globalForRealtime.realtimeHubInstance ?? new RealtimeHub();

    if (process.env.NODE_ENV !== "production") {
      globalForRealtime.realtimeHubInstance = realtimeHub;
    }
    ```
  - **Commande de validation du passage au vert :**
    ```bash
    npx vitest run tests/realtime-hub.test.ts
    ```

---

### Phase 2 : Endpoint SSE Streaming & Authentification

- [x] **Tâche 2.1 : Test unitaire de la Route SSE `/api/realtime/stream`**
  - **Consomme :** `src/lib/realtime-hub.ts`, `src/lib/auth.ts`.
  - **Produit :** Nouveau fichier `tests/realtime-route.test.ts`.
  - **Code complet du test :**
    ```typescript
    import { describe, it, expect, vi, beforeEach } from "vitest";
    import * as auth from "@/lib/auth";
    import { GET } from "@/app/api/realtime/stream/route";

    vi.mock("@/lib/auth", () => ({
      getCurrentSession: vi.fn(),
    }));

    describe("GET /api/realtime/stream", () => {
      beforeEach(() => {
        vi.clearAllMocks();
      });

      it("doit refuser la connexion avec un code 401 si l'utilisateur n'est pas connecté", async () => {
        vi.mocked(auth.getCurrentSession).mockResolvedValue(null);

        const response = await GET(new Request("http://localhost/api/realtime/stream"));
        expect(response.status).toBe(401);
      });

      it("doit ouvrir un flux SSE avec les en-têtes HTTP requis si l'utilisateur est authentifié", async () => {
        vi.mocked(auth.getCurrentSession).mockResolvedValue({
          userId: "user-1",
          compteId: "compte-1",
          role: "patron",
          nom: "Boss",
          email: "boss@djoonoo.com",
        } as any);

        const response = await GET(new Request("http://localhost/api/realtime/stream"));
        expect(response.status).toBe(200);
        expect(response.headers.get("Content-Type")).toBe("text/event-stream");
        expect(response.headers.get("Cache-Control")).toContain("no-cache");
        expect(response.headers.get("X-Accel-Buffering")).toBe("no");
      });
    });
    ```
  - **Commande de validation de l'échec :**
    ```bash
    npx vitest run tests/realtime-route.test.ts
    ```

- [x] **Tâche 2.2 : Implémenter la Route Handler SSE `/api/realtime/stream/route.ts`**
  - **Consomme :** `src/lib/auth.ts`, `src/lib/realtime-hub.ts`.
  - **Produit :** Nouveau fichier `src/app/api/realtime/stream/route.ts`.
  - **Code d'implémentation complet :**
    ```typescript
    import { getCurrentSession } from "@/lib/auth";
    import { realtimeHub, RealtimeEvent } from "@/lib/realtime-hub";

    export const dynamic = "force-dynamic";

    export async function GET(request: Request) {
      const session = await getCurrentSession();

      if (!session) {
        return new Response("Non autorisé", { status: 401 });
      }

      const encoder = new TextEncoder();
      let unsubscribe: (() => void) | null = null;
      let heartbeatInterval: NodeJS.Timeout | null = null;

      const stream = new ReadableStream({
        start(controller) {
          // 1. Message de bienvenue initial
          controller.enqueue(
            encoder.encode(`event: connected\ndata: ${JSON.stringify({ status: "ok", compteId: session.compteId })}\n\n`)
          );

          // 2. Abonnement au Hub pour ce compte_id
          unsubscribe = realtimeHub.subscribe(session.compteId, (event: RealtimeEvent) => {
            try {
              controller.enqueue(
                encoder.encode(`event: update\ndata: ${JSON.stringify(event)}\n\n`)
              );
            } catch (err) {
              console.error("[SSE] Erreur d'envoi client:", err);
            }
          });

          // 3. Heartbeat toutes les 25 secondes pour maintenir la connexion active
          heartbeatInterval = setInterval(() => {
            try {
              controller.enqueue(encoder.encode(`: ping\n\n`));
            } catch {
              if (heartbeatInterval) clearInterval(heartbeatInterval);
            }
          }, 25000);
        },
        cancel() {
          if (unsubscribe) unsubscribe();
          if (heartbeatInterval) clearInterval(heartbeatInterval);
        },
      });

      // Gestion de la coupure par le client
      request.signal.addEventListener("abort", () => {
        if (unsubscribe) unsubscribe();
        if (heartbeatInterval) clearInterval(heartbeatInterval);
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform, no-store",
          "Connection": "keep-alive",
          "X-Accel-Buffering": "no",
        },
      });
    }
    ```
  - **Commande de validation du passage au vert :**
    ```bash
    npx vitest run tests/realtime-route.test.ts
    ```

---

### Phase 3 : Émission d'Événements dans les Server Actions

- [x] **Tâche 3.1 : Test unitaire d'émission sur les actions de vente et d'impayé**
  - **Consomme :** `tests/realtime-hub.test.ts`.
  - **Produit :** Nouveau fichier `tests/realtime-actions-emit.test.ts`.
  - **Code complet du test :**
    ```typescript
    import { describe, it, expect, vi, beforeEach } from "vitest";
    import { realtimeHub } from "@/lib/realtime-hub";

    describe("Émission des événements métier", () => {
      beforeEach(() => {
        realtimeHub.resetForTesting();
      });

      it("doit recevoir un événement lors de la publication d'une vente", () => {
        const listener = vi.fn();
        realtimeHub.subscribe("compte-test", listener);

        realtimeHub.publish({
          compteId: "compte-test",
          type: "VENTE_CREEE",
          boutiqueId: "b-1",
        });

        expect(listener).toHaveBeenCalledWith(
          expect.objectContaining({
            compteId: "compte-test",
            type: "VENTE_CREEE",
            boutiqueId: "b-1",
          })
        );
      });
    });
    ```
  - **Commande :**
    ```bash
    npx vitest run tests/realtime-actions-emit.test.ts
    ```

- [x] **Tâche 3.2 : Publier l'événement lors de l'enregistrement et l'annulation d'une vente**
  - **Consomme :** `src/app/actions/ventes.ts`, `src/lib/realtime-hub.ts`.
  - **Produit :** Modification de [src/app/actions/ventes.ts:371](file:///c:/Users/C%C3%A9dric/Downloads/Africavibecoding/facturepro/djoonoo/src/app/actions/ventes.ts#L371) et [src/app/actions/ventes.ts:600](file:///c:/Users/C%C3%A9dric/Downloads/Africavibecoding/facturepro/djoonoo/src/app/actions/ventes.ts#L600).
  - **Implémentation :**
    - Importer `realtimeHub` dans `ventes.ts`.
    - Juste après `revalidatePath("/dashboard/ventes")` dans `enregistrerVenteAction` :
      ```typescript
      realtimeHub.publish({
        compteId: session.compteId,
        type: "VENTE_CREEE",
        boutiqueId: boutique.id,
      });
      ```
    - Juste après la revalidation dans `annulerVenteAction` :
      ```typescript
      realtimeHub.publish({
        compteId: session.compteId,
        type: "VENTE_ANNULEE",
        boutiqueId: vente.boutique_id,
      });
      ```

- [x] **Tâche 3.3 : Publier l'événement lors du règlement d'un impayé**
  - **Consomme :** `src/app/actions/impayes.ts`, `src/lib/realtime-hub.ts`.
  - **Produit :** Modification de [src/app/actions/impayes.ts:180](file:///c:/Users/C%C3%A9dric/Downloads/Africavibecoding/facturepro/djoonoo/src/app/actions/impayes.ts#L180).
  - **Implémentation :**
    - Importer `realtimeHub`.
    - Après la transaction réussie de règlement :
      ```typescript
      realtimeHub.publish({
        compteId: session.compteId,
        type: "PAIEMENT_ENREGISTRE",
        boutiqueId: vente.boutique_id,
      });
      ```

- [x] **Tâche 3.4 : Publier l'événement lors de la modification des stocks et des clients**
  - **Consomme :** `src/app/actions/produits.ts`, `src/app/actions/clients.ts`.
  - **Produit :** Modifications de `src/app/actions/produits.ts` et `src/app/actions/clients.ts`.
  - **Implémentation :**
    - Dans `produits.ts` (création, édition, suppression de produit) : émettre `{ compteId: session.compteId, type: "STOCK_MODIFIE", boutiqueId: ... }`.
    - Dans `clients.ts` (création, modification de client) : émettre `{ compteId: session.compteId, type: "CLIENT_MODIFIE" }`.

---

### Phase 4 : Écouteur Client Global & Déclencheur UI

- [x] **Tâche 4.1 : Créer le composant client `RealtimeListener`**
  - **Consomme :** `next/navigation` (`useRouter`).
  - **Produit :** Nouveau fichier `src/components/realtime/RealtimeListener.tsx`.
  - **Code d'implémentation complet :**
    ```typescript
    "use client";

    import { useEffect, useRef } from "react";
    import { useRouter } from "next/navigation";

    export default function RealtimeListener() {
      const router = useRouter();
      const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

      useEffect(() => {
        let eventSource: EventSource | null = null;
        let retryTimeout: NodeJS.Timeout | null = null;
        let isComponentMounted = true;

        function connecter() {
          if (!isComponentMounted) return;

          try {
            eventSource = new EventSource("/api/realtime/stream");

            eventSource.addEventListener("update", (event: MessageEvent) => {
              try {
                const data = JSON.parse(event.data);

                // Dispatch global d'un CustomEvent pour les composants nécessitant une mise à jour d'état local (ex: Rapports)
                window.dispatchEvent(
                  new CustomEvent("djoonoo:realtime-update", { detail: data })
                );

                // Throttling / Debounce de 250ms pour rafraîchir les Server Components sans saturer
                if (debounceTimerRef.current) {
                  clearTimeout(debounceTimerRef.current);
                }

                debounceTimerRef.current = setTimeout(() => {
                  router.refresh();
                }, 250);
              } catch (err) {
                console.error("[RealtimeListener] Erreur parsing message update:", err);
              }
            });

            eventSource.onerror = () => {
              if (eventSource) {
                eventSource.close();
                eventSource = null;
              }
              // Tentative de reconnexion après 5 secondes si déconnecté
              if (isComponentMounted && !retryTimeout) {
                retryTimeout = setTimeout(() => {
                  retryTimeout = null;
                  connecter();
                }, 5000);
              }
            };
          } catch (err) {
            console.error("[RealtimeListener] Erreur d'initialisation SSE:", err);
          }
        }

        connecter();

        // Gestion de la visibilité de l'onglet : rafraîchissement au retour sur l'onglet
        const handleVisibilityChange = () => {
          if (document.visibilityState === "visible") {
            if (!eventSource || eventSource.readyState === EventSource.CLOSED) {
              connecter();
            }
            router.refresh();
          }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
          isComponentMounted = false;
          if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
          if (retryTimeout) clearTimeout(retryTimeout);
          if (eventSource) eventSource.close();
          document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
      }, [router]);

      return null;
    }
    ```

- [x] **Tâche 4.2 : Monter `RealtimeListener` dans le Layout du Dashboard**
  - **Consomme :** `src/app/dashboard/layout.tsx`.
  - **Produit :** Modification de [src/app/dashboard/layout.tsx:90](file:///c:/Users/C%C3%A9dric/Downloads/Africavibecoding/facturepro/djoonoo/src/app/dashboard/layout.tsx#L90).
  - **Implémentation :**
    - Importer `RealtimeListener` depuis `@/components/realtime/RealtimeListener`.
    - L'ajouter comme premier enfant dans le JSX de `DashboardLayout` :
      ```tsx
      return (
        <div className="min-h-screen bg-[#FAF6F1] flex">
          <RealtimeListener />
          <Sidebar ... />
          ...
        </div>
      );
      ```

---

### Phase 5 : Synchronisation Ciblée & Sécurisation POS

- [x] **Tâche 5.1 : Test de non-régression sur la préservation du panier en Caisse POS**
  - **Consomme :** `vitest`, `src/components/dashboard/CaissePOS.tsx`.
  - **Produit :** Nouveau fichier `tests/realtime-caisse-safety.test.ts`.
  - **Code complet du test :**
    Vérifier que la mise à jour des `produitsInitiaux` met à jour les stocks disponibles tout en préservant intactes les lignes ajoutées dans le panier.
  - **Commande :**
    ```bash
    npx vitest run tests/realtime-caisse-safety.test.ts
    ```

- [x] **Tâche 5.2 : Synchronisation réactive dans `RapportsManager.tsx`**
  - **Consomme :** `src/components/dashboard/RapportsManager.tsx`.
  - **Produit :** Modification de [src/components/dashboard/RapportsManager.tsx:50-70](file:///c:/Users/C%C3%A9dric/Downloads/Africavibecoding/facturepro/djoonoo/src/components/dashboard/RapportsManager.tsx#L50-L70).
  - **Implémentation :**
    - Synchroniser l'état local `data` lorsque le Server Component fournit de nouvelles props :
      ```typescript
      React.useEffect(() => {
        setData(initialData);
      }, [initialData]);
      ```
    - Ajouter l'écoute du `CustomEvent` pour recharger les données si l'utilisateur a sélectionné une vue personnalisée (période ou boutique non par défaut) :
      ```typescript
      React.useEffect(() => {
        const onRealtimeUpdate = (e: Event) => {
          const customEvent = e as CustomEvent;
          if (customEvent.detail?.type === "VENTE_CREEE" || customEvent.detail?.type === "VENTE_ANNULEE") {
            rechargerRapport(periode, boutiqueSelectionnee);
          }
        };
        window.addEventListener("djoonoo:realtime-update", onRealtimeUpdate);
        return () => window.removeEventListener("djoonoo:realtime-update", onRealtimeUpdate);
      }, [periode, boutiqueSelectionnee]);
      ```

---

### Phase 6 : Validation Globale, Non-Régression & Build

- [x] **Tâche 6.1 : Exécution complète de la suite de tests Vitest**
  - **Commande :**
    ```bash
    npx vitest run
    ```
  - **Critère de succès :** 100 % des tests existants (161 tests) + l'ensemble des nouveaux tests de temps réel et de sécurité passent avec succès.

- [x] **Tâche 6.2 : Validation du Build de production Next.js**
  - **Commande :**
    ```bash
    npm run build
    ```
  - **Critère de succès :** Compilation sans aucune erreur TypeScript ni avertissement ESLint.
