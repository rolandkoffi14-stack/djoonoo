import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Super-Admin & Paramètres Plateforme...");

  // 1. Paramètres plateforme obligatoires (Section 16, ex-point 6)
  await prisma.parametres_plateforme.upsert({
    where: { cle: "duree_essai_jours" },
    create: {
      cle: "duree_essai_jours",
      valeur: "14",
      description: "Durée de la période d'essai gratuite en jours",
    },
    update: {},
  });

  await prisma.parametres_plateforme.upsert({
    where: { cle: "delai_grace_jours" },
    create: {
      cle: "delai_grace_jours",
      valeur: "7",
      description: "Délai de grâce accordé après échéance impayée avant suspension",
    },
    update: {},
  });

  // 2. Compte Super-Admin par défaut
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash("SuperAdmin2026!", salt);
  // Clé secrète TOTP base32 standard pour les tests (32 chars)
  const totpSecret = "Y74PATETHLNTQS6BWRRBIPIYOU6CRWED";

  const admin = await prisma.super_admins.upsert({
    where: { email: "admin@djoonoo.com" },
    create: {
      email: "admin@djoonoo.com",
      mot_de_passe_hash: hash,
      deux_fa_active: true,
      deux_fa_secret: totpSecret,
    },
    update: {
      mot_de_passe_hash: hash,
      deux_fa_active: true,
      deux_fa_secret: totpSecret,
    },
  });

  console.log("✅ Super-Admin prêt :", admin.email);

  // 3. Création d'une facture d'abonnement en attente pour tester la confirmation
  const premierCompte = await prisma.comptes.findFirst();
  if (premierCompte) {
    const factureExistante = await prisma.factures_abonnement.findFirst({
      where: { compte_id: premierCompte.id, statut: "en_attente" },
    });

    if (!factureExistante) {
      const echeance = new Date();
      echeance.setDate(echeance.getDate() + 5);

      await prisma.factures_abonnement.create({
        data: {
          compte_id: premierCompte.id,
          montant: 25000,
          statut: "en_attente",
          fournisseur_paiement: "manuel",
          date_echeance: echeance,
        },
      });
      console.log("✅ Facture d'abonnement de test créée pour", premierCompte.nom_entreprise);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
