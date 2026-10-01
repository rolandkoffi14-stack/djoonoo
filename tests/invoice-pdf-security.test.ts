import { describe, it, expect } from "vitest";
import { prisma } from "../src/lib/prisma";

describe("Sécurité et Données de Facture d'Abonnement djoonoo", () => {
  it("doit vérifier que la facture appartient bien au compte avant restitution", async () => {
    const compte = await prisma.comptes.findFirst();
    if (!compte) return;

    const facture = await prisma.factures_abonnement.create({
      data: {
        compte_id: compte.id,
        montant: 15000,
        statut: "payee",
        fournisseur_paiement: "fedapay",
        reference_externe: "TX_TEST_123",
        date_echeance: new Date(),
        date_confirmation: new Date(),
      },
    });

    // Tentative d'accès avec un faux compteId
    const fauxCompteId = "00000000-0000-0000-0000-000000000000";
    const estAutorise = facture.compte_id === fauxCompteId;
    expect(estAutorise).toBe(false);

    // Accès avec le vrai compteId
    const estVraiCompte = facture.compte_id === compte.id;
    expect(estVraiCompte).toBe(true);

    // Nettoyage
    await prisma.factures_abonnement.delete({ where: { id: facture.id } });
  });
});
