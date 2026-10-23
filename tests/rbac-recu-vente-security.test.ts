import { describe, it, expect, vi, beforeEach } from "vitest";
import { getRecuVenteAction } from "../src/app/actions/ventes";
import * as prismaLib from "../src/lib/prisma";
import * as auth from "../src/lib/auth";

describe("RBAC Sécurité Reçus de Vente — getRecuVenteAction (Phase 2)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockVente = {
    id: "vente-1",
    numero_facture: "FAC-B01-2026-0001",
    date_vente: new Date("2026-10-20T10:00:00Z"),
    montant_total: 15000,
    montant_remise: 0,
    statut_paiement: "paye",
    boutique_id: "boutique-A",
    utilisateur_id: "vendeur-1",
    compte_id: "compte-1",
    boutique: {
      code: "B01",
      nom: "Boutique Centrale",
      ville: "Cotonou",
      adresse: "Haie Vive",
      telephone: "97000001",
      compte: {
        nom_entreprise: "Enterprise SARL",
        ifu: "1234567890",
        rccm: "RB/COT/2026",
        telephone_principal: "97000000",
        telephone_secondaire: null,
        adresse_siege: "Cotonou",
        ville: "Cotonou",
      },
    },
    utilisateur: { nom: "Vendeur Pierre" },
    client: { nom: "Client Test", telephone: "96000000" },
    lignes_vente: [
      {
        produit: { nom: "Article A" },
        quantite: 1,
        prix_unitaire_a_la_vente: 15000,
        imei1: null,
        imei2: null,
      },
    ],
    paiements: [{ montant: 15000, mode_paiement: "especes" }],
  };

  it("doit formellement refuser la consultation d'un reçu émis par un collègue pour un Vendeur", async () => {
    vi.spyOn(auth, "getCurrentSession").mockResolvedValue({
      userId: "vendeur-2", // Autre vendeur
      role: "vendeur",
      compteId: "compte-1",
      boutiqueId: "boutique-A",
    } as any);

    vi.spyOn(prismaLib, "getScopedPrisma").mockReturnValue({
      ventes: { findFirst: vi.fn().mockResolvedValue(mockVente) },
    } as any);

    const res = await getRecuVenteAction("vente-1");
    expect(res.success).toBe(false);
    expect(res.error).toContain("tu ne peux consulter que les reçus de tes propres ventes");
  });

  it("doit formellement refuser la consultation d'un reçu d'une autre boutique pour un Gérant", async () => {
    vi.spyOn(auth, "getCurrentSession").mockResolvedValue({
      userId: "gerant-1",
      role: "gerant",
      compteId: "compte-1",
      boutiqueId: "boutique-B", // Gérant de la boutique B, pas A
    } as any);

    vi.spyOn(prismaLib, "getScopedPrisma").mockReturnValue({
      ventes: { findFirst: vi.fn().mockResolvedValue(mockVente) },
    } as any);

    const res = await getRecuVenteAction("vente-1");
    expect(res.success).toBe(false);
    expect(res.error).toContain("tu ne peux consulter que les factures de ta boutique");
  });

  it("doit autoriser le Vendeur à consulter le reçu de sa propre vente", async () => {
    vi.spyOn(auth, "getCurrentSession").mockResolvedValue({
      userId: "vendeur-1", // Même vendeur
      role: "vendeur",
      compteId: "compte-1",
      boutiqueId: "boutique-A",
    } as any);

    vi.spyOn(prismaLib, "getScopedPrisma").mockReturnValue({
      ventes: { findFirst: vi.fn().mockResolvedValue(mockVente) },
    } as any);

    const res = await getRecuVenteAction("vente-1");
    expect(res.success).toBe(true);
    expect(res.recu?.numero_facture).toBe("FAC-B01-2026-0001");
  });

  it("doit autoriser le Gérant à consulter le reçu de toute vente de sa boutique", async () => {
    vi.spyOn(auth, "getCurrentSession").mockResolvedValue({
      userId: "gerant-1",
      role: "gerant",
      compteId: "compte-1",
      boutiqueId: "boutique-A", // Même boutique
    } as any);

    vi.spyOn(prismaLib, "getScopedPrisma").mockReturnValue({
      ventes: { findFirst: vi.fn().mockResolvedValue(mockVente) },
    } as any);

    const res = await getRecuVenteAction("vente-1");
    expect(res.success).toBe(true);
    expect(res.recu?.numero_facture).toBe("FAC-B01-2026-0001");
  });

  it("doit autoriser le Patron à consulter n'importe quelle facture de son compte", async () => {
    vi.spyOn(auth, "getCurrentSession").mockResolvedValue({
      userId: "patron-1",
      role: "patron",
      compteId: "compte-1",
      boutiqueId: null,
    } as any);

    vi.spyOn(prismaLib, "getScopedPrisma").mockReturnValue({
      ventes: { findFirst: vi.fn().mockResolvedValue(mockVente) },
    } as any);

    const res = await getRecuVenteAction("vente-1");
    expect(res.success).toBe(true);
    expect(res.recu?.numero_facture).toBe("FAC-B01-2026-0001");
  });
});
