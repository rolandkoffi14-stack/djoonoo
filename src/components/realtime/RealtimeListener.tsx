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
