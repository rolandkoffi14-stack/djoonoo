"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Composant de synchronisation temps-réel optimisé pour Vercel / Serverless.
 * Rafraîchit les données lors du retour sur l'onglet (visibilitychange / focus)
 * et effectue un rafraîchissement périodique léger quand l'onglet est actif.
 */
export default function RealtimeListener() {
  const router = useRouter();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const triggerRefresh = () => {
      if (document.visibilityState !== "visible") return;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        router.refresh();
      }, 300);
    };

    // 1. Rafraîchissement automatique au retour sur l'onglet
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        triggerRefresh();
      }
    };

    // 2. Rafraîchissement au focus de la fenêtre
    const handleFocus = () => {
      triggerRefresh();
    };

    // 3. Rafraîchissement périodique (toutes les 45s) si l'utilisateur est actif sur l'onglet
    intervalId = setInterval(() => {
      if (document.visibilityState === "visible") {
        triggerRefresh();
      }
    }, 45000);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [router]);

  return null;
}
