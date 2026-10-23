import { describe, it, expect, vi, beforeEach } from "vitest";
import { getFicheClientDetailleeAction } from "../src/app/actions/clients";
import * as prismaLib from "../src/lib/prisma";
import * as auth from "../src/lib/auth";

describe("RBAC Isolation Clients — getFicheClientDetailleeAction (Phase 3)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockClient = {
    id: "client-1",
    nom: "Amina Diallo",
    telephone: "97000000",
    date_creation: new Date("2026-01-01T00:00:00Z"),
    ventes: [
      {
        id: "vente-boutique-A",
        numero_facture: "FAC-B01-2026-0001",
        date_vente: new Date("2026-01-10T00:00:00Z"),
        boutique_id: "boutique-A",
        boutique: { nom: "Boutique A", code: "B01" },
        montant_total: 20000,
        montant_paye: 20000,
        reste_du: 0,
        statut_paiement: "paye",
        statut_vente: "validee",
        paiements: [{ montant: 20000 }],
        lignes_vente: [{ produit: { nom: "Plafonnier" }, quantite: 1, prix_unitaire_a_la_vente: 20000 }],
      },
      {
        id: "vente-boutique-B",
        numero_facture: "FAC-B02-2026-0005",
        date_vente: new Date("2026-02-10T00:00:00Z"),
        boutique_id: "boutique-B",
        boutique: { nom: "Boutique B", code: "B02" },
        montant_total: 50000,
        montant_paye: 50000,
        reste_du: 0,
        statut_paiement: "paye",
        statut_vente: "validee",
        paiements: [{ montant: 50000 }],
        lignes_vente: [{ produit: { nom: "Ventilateur" }, quantite: 1, prix_unitaire_a_la_vente: 50000 }],
      },
    ],
  };

  it("doit refuser formellement l'accès à la fiche détaillée pour un Vendeur", async () => {
    vi.spyOn(auth, "getCurrentSession").mockResolvedValue({
      userId: "vendeur-1",
      role: "vendeur",
      compteId: "compte-1",
      boutiqueId: "boutique-A",
    } as any);

    const res = await getFicheClientDetailleeAction("client-1");
    expect(res.success).toBe(false);
    expect(res.error).toContain("Action non autorisée");
  });

  it("doit borner les ventes d'un client à la boutique du Gérant", async () => {
    vi.spyOn(auth, "getCurrentSession").mockResolvedValue({
      userId: "gerant-1",
      role: "gerant",
      compteId: "compte-1",
      boutiqueId: "boutique-A",
    } as any);

    let capturedWhere: any = null;
    vi.spyOn(prismaLib, "getScopedPrisma").mockReturnValue({
      clients: {
        findFirst: vi.fn().mockImplementation((args) => {
          capturedWhere = args?.include?.ventes?.where;
          // Retourner le mock filtré selon le where
          return Promise.resolve({
            ...mockClient,
            ventes: mockClient.ventes.filter(
              (v) => !capturedWhere?.boutique_id || v.boutique_id === capturedWhere.boutique_id
            ),
          });
        }),
      },
    } as any);

    const res = await getFicheClientDetailleeAction("client-1");
    expect(res.success).toBe(true);
    expect(capturedWhere?.boutique_id).toBe("boutique-A");
    expect(res.client?.ventes.length).toBe(1);
    expect(res.client?.ventes[0].boutique_code).toBe("B01");
  });

  it("doit permettre au Patron de voir les ventes consolidées multi-boutiques", async () => {
    vi.spyOn(auth, "getCurrentSession").mockResolvedValue({
      userId: "patron-1",
      role: "patron",
      compteId: "compte-1",
      boutiqueId: null,
    } as any);

    let capturedWhere: any = null;
    vi.spyOn(prismaLib, "getScopedPrisma").mockReturnValue({
      clients: {
        findFirst: vi.fn().mockImplementation((args) => {
          capturedWhere = args?.include?.ventes?.where;
          return Promise.resolve(mockClient);
        }),
      },
    } as any);

    const res = await getFicheClientDetailleeAction("client-1");
    expect(res.success).toBe(true);
    expect(capturedWhere?.boutique_id).toBeUndefined();
    expect(res.client?.ventes.length).toBe(2);
  });
});
