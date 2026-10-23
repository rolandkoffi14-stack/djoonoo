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
