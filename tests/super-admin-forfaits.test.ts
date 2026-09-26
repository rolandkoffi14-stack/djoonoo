import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "../src/lib/prisma";
import {
  enregistrerForfaitAction,
  confirmerPaiementAbonnementAction,
} from "../src/app/actions/super-admin";
import * as superAdminAuth from "../src/lib/super-admin-auth";
import { StatutAbonnement, StatutFactureAbonnement } from "@prisma/client";

// Mock next/cache revalidatePath
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Super-Admin - Gestion des Forfaits et Paiements", () => {
  let adminId: string;

  beforeEach(async () => {
    // Obtenir ou créer un admin pour le foreign key du journal d'audit
    let admin = await prisma.super_admins.findFirst();
    if (!admin) {
      admin = await prisma.super_admins.create({
        data: {
          email: "superadmin-test@djoonoo.com",
          mot_de_passe_hash: "hash_test_fake",
          deux_fa_active: false,
        },
      });
    }
    adminId = admin.id;

    vi.spyOn(superAdminAuth, "getSuperAdminSession").mockResolvedValue({
      superAdminId: adminId,
      email: admin.email,
      deuxFaVerifiee: true,
    });
  });

  it("doit enregistrer un forfait avec une duree_jours personnalisée (ex: 365 jours)", async () => {
    const formData = new FormData();
    formData.set("nom", "Forfait Annuel Test");
    formData.set("prix_mensuel", "50000");
    formData.set("duree_jours", "365");
    formData.set("illimite_boutiques", "on");
    formData.set("illimite_employes", "on");
    formData.set("actif", "on");

    const res = await enregistrerForfaitAction(null, formData);
    expect(res.success).toBe(true);
    expect(res.forfait).toBeDefined();
    expect(res.forfait?.duree_jours).toBe(365);

    // Nettoyage
    if (res.forfait?.id) {
      await prisma.forfaits.delete({ where: { id: res.forfait.id } });
    }
  });

  it(
    "doit utiliser forfait.duree_jours lors de la confirmation manuelle d'un paiement",
    { timeout: 20000 },
    async () => {
    // Créer un forfait avec durée spécifique de 90 jours (trimestriel)
    const forfaitTrimestriel = await prisma.forfaits.create({
      data: {
        nom: "Trimestriel Test",
        prix_mensuel: 12000,
        duree_jours: 90,
        actif: true,
      },
    });

    const codeCompte = "TRM" + Math.floor(Math.random() * 899 + 100);
    const compte = await prisma.comptes.create({
      data: {
        code: codeCompte,
        nom_entreprise: "Trimestre Enterprise",
        email_principal: `trimestre-${codeCompte}@djoonoo.com`,
        forfait_id: forfaitTrimestriel.id,
        statut_abonnement: StatutAbonnement.impaye,
        telephone_principal: "+22901234567",
        ville: "Porto-Novo",
      },
    });

    const facture = await prisma.factures_abonnement.create({
      data: {
        compte_id: compte.id,
        montant: 12000,
        statut: StatutFactureAbonnement.en_attente,
        fournisseur_paiement: "manuel",
        date_echeance: new Date(),
      },
    });

    // Confirmation manuelle par le Super-Admin
    const res = await confirmerPaiementAbonnementAction(facture.id);
    expect(res.success).toBe(true);

    const compteApres = await prisma.comptes.findUnique({
      where: { id: compte.id },
    });

    expect(compteApres?.statut_abonnement).toBe(StatutAbonnement.actif);
    expect(compteApres?.date_fin_periode_courante).toBeDefined();

    // Vérifier que la durée ajoutée est de 90 jours (et non 30 jours)
    const diffJours = Math.round(
      (compteApres!.date_fin_periode_courante!.getTime() -
        compteApres!.date_debut_periode_courante!.getTime()) /
        (1000 * 60 * 60 * 24)
    );
    expect(diffJours).toBe(90);

    // Nettoyage
    await prisma.factures_abonnement.delete({ where: { id: facture.id } });
    await prisma.comptes.delete({ where: { id: compte.id } });
    await prisma.forfaits.delete({ where: { id: forfaitTrimestriel.id } });
  });
});
