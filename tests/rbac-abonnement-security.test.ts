import { describe, it, expect, vi, beforeEach } from "vitest";
import { listerMethodesPaiementAction } from "../src/app/actions/payment-methods";
import { prisma } from "../src/lib/prisma";
import * as auth from "../src/lib/auth";

describe("RBAC Sécurité Abonnement & Méthodes de Paiement (Phase 4)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("doit refuser formellement de lister les méthodes de paiement à un Vendeur", async () => {
    vi.spyOn(auth, "getCurrentSession").mockResolvedValue({
      userId: "vendeur-1",
      role: "vendeur",
      compteId: "compte-1",
    } as any);

    const res = await listerMethodesPaiementAction();
    expect(res.success).toBe(false);
    expect(res.error).toContain("Action réservée au Patron");
  });

  it("doit refuser formellement de lister les méthodes de paiement à un Gérant", async () => {
    vi.spyOn(auth, "getCurrentSession").mockResolvedValue({
      userId: "gerant-1",
      role: "gerant",
      compteId: "compte-1",
      boutiqueId: "boutique-A",
    } as any);

    const res = await listerMethodesPaiementAction();
    expect(res.success).toBe(false);
    expect(res.error).toContain("Action réservée au Patron");
  });

  it("doit autoriser le Patron à lister les méthodes de paiement de son compte", async () => {
    vi.spyOn(auth, "getCurrentSession").mockResolvedValue({
      userId: "patron-1",
      role: "patron",
      compteId: "compte-1",
    } as any);

    vi.spyOn(prisma.methodes_paiement_compte, "findMany").mockResolvedValue([
      {
        id: "m1",
        compte_id: "compte-1",
        type: "mtn_momo",
        numero_telephone: "+22997000000",
        nom_titulaire: "Patron",
        derniers_chiffres: "00",
        par_defaut: true,
        date_creation: new Date(),
      },
    ] as any);

    const res = await listerMethodesPaiementAction();
    expect(res.success).toBe(true);
    expect(res.data?.length).toBe(1);
    expect(res.data?.[0].type).toBe("mtn_momo");
  });
});
