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

  it("doit recevoir les événements pour l'annulation de vente, paiement et stock", () => {
    const listener = vi.fn();
    realtimeHub.subscribe("compte-test", listener);

    realtimeHub.publish({
      compteId: "compte-test",
      type: "VENTE_ANNULEE",
      boutiqueId: "b-1",
    });
    realtimeHub.publish({
      compteId: "compte-test",
      type: "PAIEMENT_ENREGISTRE",
      boutiqueId: "b-1",
    });
    realtimeHub.publish({
      compteId: "compte-test",
      type: "STOCK_MODIFIE",
      boutiqueId: "b-1",
    });
    realtimeHub.publish({
      compteId: "compte-test",
      type: "CLIENT_MODIFIE",
    });

    expect(listener).toHaveBeenCalledTimes(4);
  });
});
