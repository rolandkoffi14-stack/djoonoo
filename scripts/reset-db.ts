import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function resetDatabase() {
  console.log("🧹 Début de la suppression de toutes les données utilisateurs...");

  try {
    // 1. Audit plateforme & Super-Admins
    const countAuditPlateforme = await prisma.journal_audit_plateforme.deleteMany();
    console.log(`- journal_audit_plateforme : ${countAuditPlateforme.count} supprimé(s)`);

    const countSuperAdmins = await prisma.super_admins.deleteMany();
    console.log(`- super_admins : ${countSuperAdmins.count} supprimé(s)`);

    // 2. Audit compte & Tokens d'invitation
    const countAudit = await prisma.journal_audit.deleteMany();
    console.log(`- journal_audit : ${countAudit.count} supprimé(s)`);

    const countTokens = await prisma.tokens_invitation.deleteMany();
    console.log(`- tokens_invitation : ${countTokens.count} supprimé(s)`);

    // 3. Ventes, lignes de vente, paiements
    const countPaiements = await prisma.paiements.deleteMany();
    console.log(`- paiements : ${countPaiements.count} supprimé(s)`);

    const countLignesVente = await prisma.lignes_vente.deleteMany();
    console.log(`- lignes_vente : ${countLignesVente.count} supprimé(s)`);

    const countVentes = await prisma.ventes.deleteMany();
    console.log(`- ventes : ${countVentes.count} supprimé(s)`);

    // 4. Clients
    const countClients = await prisma.clients.deleteMany();
    console.log(`- clients : ${countClients.count} supprimé(s)`);

    // 5. Historique d'affectations & Compteurs facture
    const countAffectations = await prisma.historique_affectations.deleteMany();
    console.log(`- historique_affectations : ${countAffectations.count} supprimé(s)`);

    const countCompteursFacture = await prisma.compteurs_facture.deleteMany();
    console.log(`- compteurs_facture : ${countCompteursFacture.count} supprimé(s)`);

    // 6. Produits
    const countProduits = await prisma.produits.deleteMany();
    console.log(`- produits : ${countProduits.count} supprimé(s)`);

    // 7. Utilisateurs
    const countUtilisateurs = await prisma.utilisateurs.deleteMany();
    console.log(`- utilisateurs : ${countUtilisateurs.count} supprimé(s)`);

    // 8. Boutiques
    const countBoutiques = await prisma.boutiques.deleteMany();
    console.log(`- boutiques : ${countBoutiques.count} supprimé(s)`);

    // 9. Factures abonnement, méthodes de paiement, compteur boutique
    const countFacturesAbo = await prisma.factures_abonnement.deleteMany();
    console.log(`- factures_abonnement : ${countFacturesAbo.count} supprimé(s)`);

    const countMethodesPaiement = await prisma.methodes_paiement_compte.deleteMany();
    console.log(`- methodes_paiement_compte : ${countMethodesPaiement.count} supprimé(s)`);

    const countCompteurBoutique = await prisma.compteur_boutique.deleteMany();
    console.log(`- compteur_boutique : ${countCompteurBoutique.count} supprimé(s)`);

    // 10. Comptes (Tenants)
    const countComptes = await prisma.comptes.deleteMany();
    console.log(`- comptes : ${countComptes.count} supprimé(s)`);

    console.log("✅ Toutes les données utilisateurs et super-admins ont été supprimées avec succès !");
  } catch (error) {
    console.error("❌ Erreur lors de la réinitialisation de la base :", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

resetDatabase();
