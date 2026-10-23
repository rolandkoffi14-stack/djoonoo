import { describe, it, expect, vi, beforeEach } from "vitest";
import { enregistrerReglementImpayeAction } from "../src/app/actions/impayes";
import * as prismaLib from "../src/lib/prisma";
import * as auth from "../src/lib/auth";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

describe("RBAC Sécurité Règlement d'Impayés — enregistrerReglementImpayeAction (Phase 5)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    (prismaLib.prisma as any).journal_audit = {
      create: vi.fn().mockResolvedValue({ id: "audit-1" }),
    };
  });

  const mockVenteImpayee = {
    id: "vente-impayee-1",
    numero_facture: "FAC-B01-2026-0010",
    compte_id: "compte-1",
    boutique_id: "boutique-A",
    utilisateur_id: "vendeur-1",
    montant_total: 20000,
    statut_paiement: "partiel",
    statut_vente: "validee",
    paiements: [{ montant: 10000 }],
  };

  it("doit refuser formellement l'encaissement d'un reliquat à un Vendeur si ce n'est pas sa vente", async () => {
    vi.spyOn(auth, "getCurrentSession").mockResolvedValue({
      userId: "vendeur-2", // Autre vendeur
      role: "vendeur",
      compteId: "compte-1",
      boutiqueId: "boutique-A",
      statutAbonnement: "actif",
    } as any);

    vi.spyOn(prismaLib, "getScopedPrisma").mockReturnValue({
      ventes: { findFirst: vi.fn().mockResolvedValue(mockVenteImpayee) },
    } as any);

    const res = await enregistrerReglementImpayeAction({
      vente_id: "vente-impayee-1",
      montant: 5000,
      mode_paiement: "especes",
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain("tu ne peux encaisser de règlement que sur tes propres ventes");
  });

  it("doit refuser l'encaissement d'un reliquat à un Gérant si la vente est dans une autre boutique", async () => {
    vi.spyOn(auth, "getCurrentSession").mockResolvedValue({
      userId: "gerant-1",
      role: "gerant",
      compteId: "compte-1",
      boutiqueId: "boutique-B", // Gérant boutique B
      statutAbonnement: "actif",
    } as any);

    vi.spyOn(prismaLib, "getScopedPrisma").mockReturnValue({
      ventes: { findFirst: vi.fn().mockResolvedValue(mockVenteImpayee) },
    } as any);

    const res = await enregistrerReglementImpayeAction({
      vente_id: "vente-impayee-1",
      montant: 5000,
      mode_paiement: "especes",
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain("Action non autorisée pour cette boutique");
  });

  it("doit autoriser l'encaissement d'un reliquat par le vendeur sur sa propre vente", async () => {
    vi.spyOn(auth, "getCurrentSession").mockResolvedValue({
      userId: "vendeur-1",
      role: "vendeur",
      compteId: "compte-1",
      boutiqueId: "boutique-A",
      statutAbonnement: "actif",
    } as any);

    vi.spyOn(prismaLib, "getScopedPrisma").mockReturnValue({
      ventes: { findFirst: vi.fn().mockResolvedValue(mockVenteImpayee) },
    } as any);

    vi.spyOn(prismaLib.prisma, "$transaction").mockImplementation(async (callback: any) => {
      return callback({
        paiements: { create: vi.fn().mockResolvedValue({ id: "paiement-new" }) },
        ventes: { update: vi.fn().mockResolvedValue({}) },
        journal_audit: { create: vi.fn().mockResolvedValue({ id: "audit-1" }) },
      });
    });

    const res = await enregistrerReglementImpayeAction({
      vente_id: "vente-impayee-1",
      montant: 5000,
      mode_paiement: "especes",
    });

    expect(res.success).toBe(true);
    expect(res.resteDu).toBe(5000);
  });

  it("doit autoriser l'encaissement d'un reliquat par le gérant sur une vente de sa boutique même faite par un autre vendeur", async () => {
    vi.spyOn(auth, "getCurrentSession").mockResolvedValue({
      userId: "gerant-1",
      role: "gerant",
      compteId: "compte-1",
      boutiqueId: "boutique-A",
      statutAbonnement: "actif",
    } as any);

    vi.spyOn(prismaLib, "getScopedPrisma").mockReturnValue({
      ventes: { findFirst: vi.fn().mockResolvedValue(mockVenteImpayee) },
    } as any);

    vi.spyOn(prismaLib.prisma, "$transaction").mockImplementation(async (callback: any) => {
      return callback({
        paiements: { create: vi.fn().mockResolvedValue({ id: "paiement-new" }) },
        ventes: { update: vi.fn().mockResolvedValue({}) },
        journal_audit: { create: vi.fn().mockResolvedValue({ id: "audit-1" }) },
      });
    });

    const res = await enregistrerReglementImpayeAction({
      vente_id: "vente-impayee-1",
      montant: 10000,
      mode_paiement: "mtn_momo",
    });

    expect(res.success).toBe(true);
    expect(res.resteDu).toBe(0);
    expect(res.nouveauStatut).toBe("paye");
  });
});
