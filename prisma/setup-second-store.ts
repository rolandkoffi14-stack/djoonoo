import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const patron = await prisma.utilisateurs.findUnique({
    where: { email: 'patron.clean@djoonoo.com' },
    include: { compte: true }
  });

  if (!patron) {
    console.log('Patron non trouvé');
    return;
  }

  // Find forfait Reseau (allows multiple boutiques)
  const forfaitReseau = await prisma.forfaits.findFirst({
    where: { nom: 'Réseau' }
  });

  if (forfaitReseau) {
    await prisma.comptes.update({
      where: { id: patron.compte_id },
      data: { forfait_id: forfaitReseau.id }
    });
    console.log('Compte passé au Forfait Réseau !');
  }

  // Check if second store already exists
  const existingBoutiques = await prisma.boutiques.findMany({
    where: { compte_id: patron.compte_id }
  });

  if (existingBoutiques.length < 2) {
    const b2 = await prisma.boutiques.create({
      data: {
        compte_id: patron.compte_id,
        code: 'B02',
        nom: 'ETS DJOONOO — Cadjèhoun',
        secteur_activite: 'Commerce général',
        adresse: 'Avenue Steinmetz, Cadjèhoun',
        ville: 'Cotonou',
        telephone: '+229 97 00 00 02',
        statut: 'actif'
      }
    });

    // Create a vendeur on B01 as well so we have both a Gerant and a Vendeur
    const existingVendeur = await prisma.utilisateurs.findFirst({
      where: { compte_id: patron.compte_id, role: 'vendeur' }
    });

    if (!existingVendeur) {
      const vendeur = await prisma.utilisateurs.create({
        data: {
          compte_id: patron.compte_id,
          boutique_id: existingBoutiques[0].id,
          role: 'vendeur',
          nom: 'Moussa Salifou',
          telephone: '+229 96 11 22 33',
          email: 'moussa.salifou@djoonoo.com',
          mot_de_passe_hash: 'placeholder_hash',
          deux_fa_active: false,
          statut: 'actif'
        }
      });

      await prisma.historique_affectations.create({
        data: {
          utilisateur_id: vendeur.id,
          boutique_id: existingBoutiques[0].id,
          date_debut: new Date()
        }
      });
      console.log('Vendeur Moussa Salifou créé sur B01');
    }

    console.log('Boutique B02 créée :', b2.nom);
  } else {
    console.log('Le compte a déjà au moins 2 boutiques :', existingBoutiques.length);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
