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
