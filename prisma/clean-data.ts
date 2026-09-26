import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Vidage des données métier de test...");

  // Suppression ordonnée des données métier
  await prisma.journal_audit.deleteMany();
  await prisma.paiements.deleteMany();
  await prisma.lignes_vente.deleteMany();
  await prisma.ventes.deleteMany();
  await prisma.produits.deleteMany();
  await prisma.historique_affectations.deleteMany();
  await prisma.utilisateurs.deleteMany();
  await prisma.compteurs_facture.deleteMany();
  await prisma.boutiques.deleteMany();
  await prisma.compteur_boutique.deleteMany();
  await prisma.factures_abonnement.deleteMany();
  await prisma.clients.deleteMany();
  await prisma.comptes.deleteMany();

  console.log("✨ Toutes les tables métier sont désormais 100% vides.");
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
