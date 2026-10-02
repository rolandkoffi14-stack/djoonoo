import { describe, it, expect, vi, beforeEach } from "vitest";
import { creerTransactionFedaPay } from "../src/lib/fedapay";
import { prisma } from "../src/lib/prisma";

describe("Création de Transaction FedaPay & Extraction du Guichet", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("doit extraire correctement l'identifiant et payment_url depuis txData['v1/transaction']", async () => {
    // Mock du compte et du forfait dans prisma
    const compteMock = {
      id: "compte-test-fedapay",
      code: "TST",
      nom_entreprise: "Test Enterprise",
      telephone_principal: "97123456",
    };

    const forfaitMock = {
      id: "forfait-solo-test",
      nom: "Solo",
      prix_mensuel: 5000,
      duree_jours: 30,
    };

    vi.spyOn(prisma.forfaits, "findUnique").mockResolvedValue(forfaitMock as any);
    vi.spyOn(prisma.factures_abonnement, "findFirst").mockResolvedValue(null);
    vi.spyOn(prisma.factures_abonnement, "create").mockResolvedValue({
      id: "facture-test-123",
      compte_id: compteMock.id,
      montant: 5000,
    } as any);
    vi.spyOn(prisma.factures_abonnement, "update").mockResolvedValue({} as any);

    // Mock de fetch pour simuler la réponse réelle de FedaPay
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/transactions")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            "v1/transaction": {
              id: 987654,
              reference: "trx_test_987654",
              payment_url: "https://sandbox-process.fedapay.com/token_secret_123",
            },
          }),
        };
      }
      return { ok: false, status: 404 };
    });

    global.fetch = mockFetch as any;

    const res = await creerTransactionFedaPay({
      compteId: compteMock.id,
      forfaitId: forfaitMock.id,
      montant: 5000,
      email: "test@djoonoo.com",
      nom: "Test Patron",
      telephone: "97123456",
      callbackUrl: "https://djoonoo.com/callback",
    });

    expect(res.transactionId).toBe(987654);
    expect(res.urlPaiement).toBe("https://sandbox-process.fedapay.com/token_secret_123");
    expect(res.factureId).toBe("facture-test-123");

    // Vérifier que prisma.factures_abonnement.update a bien été appelé avec l'ID résolu 987654
    expect(prisma.factures_abonnement.update).toHaveBeenCalledWith({
      where: { id: "facture-test-123" },
      data: { reference_externe: "987654" },
    });
  });
});
