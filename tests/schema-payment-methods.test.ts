import { describe, it, expect } from "vitest";
import { prisma } from "../src/lib/prisma";

describe("Schéma Prisma Méthodes de Paiement", () => {
  it("doit permettre de créer et requêter une méthode de paiement liée à un compte", async () => {
    const compte = await prisma.comptes.findFirst();
    if (!compte) return;

    const testMethode = await prisma.methodes_paiement_compte.create({
      data: {
        compte_id: compte.id,
        type: "mtn_momo",
        numero_telephone: "+22997123456",
        nom_titulaire: "Roland Koffi",
        derniers_chiffres: "56",
        par_defaut: true,
      },
    });

    expect(testMethode.id).toBeDefined();
    expect(testMethode.type).toBe("mtn_momo");
    expect(testMethode.derniers_chiffres).toBe("56");
    expect(testMethode.par_defaut).toBe(true);

    // Nettoyage
    await prisma.methodes_paiement_compte.delete({ where: { id: testMethode.id } });
  });
});
