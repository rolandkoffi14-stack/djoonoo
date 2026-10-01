import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../src/lib/prisma";
import {
  ajouterMethodePaiementInterne,
  definirMethodeParDefautInterne,
  supprimerMethodePaiementInterne,
  listerMethodesPaiementInterne,
} from "../src/app/actions/payment-methods";

describe("Server Actions Méthodes de Paiement", () => {
  let compteTestId: string;

  beforeEach(async () => {
    const compte = await prisma.comptes.findFirst();
    if (!compte) throw new Error("Aucun compte en base pour les tests.");
    compteTestId = compte.id;
    await prisma.methodes_paiement_compte.deleteMany({ where: { compte_id: compteTestId } });
  });

  it("doit ajouter une méthode et la définir par défaut si c'est la première", async () => {
    const res = await ajouterMethodePaiementInterne({
      compteId: compteTestId,
      type: "mtn_momo",
      numeroTelephone: "+22997142536",
      nomTitulaire: "Roland Koffi",
    });

    expect(res.success).toBe(true);
    expect(res.data.par_defaut).toBe(true);
    expect(res.data.derniers_chiffres).toBe("36");
    expect(res.data.numero_telephone).toBe("+22997142536");
  });

  it("doit permettre de basculer la méthode par défaut de manière atomique", async () => {
    const m1 = await ajouterMethodePaiementInterne({
      compteId: compteTestId,
      type: "mtn_momo",
      numeroTelephone: "+22997111111",
    });
    const m2 = await ajouterMethodePaiementInterne({
      compteId: compteTestId,
      type: "moov_money",
      numeroTelephone: "+22995222222",
    });

    const resSwitch = await definirMethodeParDefautInterne({
      compteId: compteTestId,
      methodeId: m2.data.id,
    });
    expect(resSwitch.success).toBe(true);

    const m1Check = await prisma.methodes_paiement_compte.findUnique({ where: { id: m1.data.id } });
    const m2Check = await prisma.methodes_paiement_compte.findUnique({ where: { id: m2.data.id } });

    expect(m1Check?.par_defaut).toBe(false);
    expect(m2Check?.par_defaut).toBe(true);
  });

  it("doit réassigner automatiquement le statut par défaut si la méthode par défaut est supprimée", async () => {
    const m1 = await ajouterMethodePaiementInterne({
      compteId: compteTestId,
      type: "mtn_momo",
      numeroTelephone: "+22997111111",
    });
    const m2 = await ajouterMethodePaiementInterne({
      compteId: compteTestId,
      type: "moov_money",
      numeroTelephone: "+22995222222",
    });

    // m1 est par défaut. Supprimons m1.
    const delRes = await supprimerMethodePaiementInterne({
      compteId: compteTestId,
      methodeId: m1.data.id,
    });
    expect(delRes.success).toBe(true);

    const m2Check = await prisma.methodes_paiement_compte.findUnique({ where: { id: m2.data.id } });
    expect(m2Check?.par_defaut).toBe(true);
  });

  it("doit lister les méthodes en plaçant la méthode par défaut en tête", async () => {
    await ajouterMethodePaiementInterne({
      compteId: compteTestId,
      type: "mtn_momo",
      numeroTelephone: "+22997111111",
    });
    const m2 = await ajouterMethodePaiementInterne({
      compteId: compteTestId,
      type: "moov_money",
      numeroTelephone: "+22995222222",
    });

    await definirMethodeParDefautInterne({
      compteId: compteTestId,
      methodeId: m2.data.id,
    });

    const liste = await listerMethodesPaiementInterne(compteTestId);
    expect(liste.length).toBe(2);
    expect(liste[0].id).toBe(m2.data.id);
    expect(liste[0].par_defaut).toBe(true);
  });
});
