import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Démarrage du seed djoonoo...");

  // 1. Paramètres plateforme initiaux (Section 3, Section 5.2, Section 16 point 6 & 7)
  const parametres = [
    {
      cle: "duree_essai_jours",
      valeur: "14",
      description: "Durée de la période d'essai initiale en jours (standard SaaS)",
    },
    {
      cle: "delai_grace_jours",
      valeur: "7",
      description: "Délai de grâce entre impayé et suspendu en jours",
    },
  ];

  for (const param of parametres) {
    await prisma.parametres_plateforme.upsert({
      where: { cle: param.cle },
      update: {
        valeur: param.valeur,
        description: param.description,
      },
      create: {
        cle: param.cle,
        valeur: param.valeur,
        description: param.description,
      },
    });
    console.log(`✓ Paramètre plateforme initialisé : ${param.cle} = ${param.valeur}`);
  }

  // 2. Forfaits initiaux (Solo, Réseau, Empire — Section 0 & 5, Décision B7 NULL = illimité)
  const forfaitsInitiaux = [
    {
      nom: "Solo",
      prix_mensuel: 5000,
      max_boutiques: 1,
      max_employes_par_boutique: 1,
      actif: true,
    },
    {
      nom: "Réseau",
      prix_mensuel: 15000,
      max_boutiques: 3,
      max_employes_par_boutique: 5,
      actif: true,
    },
    {
      nom: "Empire",
      prix_mensuel: 35000,
      max_boutiques: null, // NULL = illimité (décision B7)
      max_employes_par_boutique: null, // NULL = illimité
      actif: true,
    },
  ];

  for (const f of forfaitsInitiaux) {
    const existing = await prisma.forfaits.findFirst({
      where: { nom: f.nom },
    });

    if (existing) {
      await prisma.forfaits.update({
        where: { id: existing.id },
        data: {
          prix_mensuel: f.prix_mensuel,
          max_boutiques: f.max_boutiques,
          max_employes_par_boutique: f.max_employes_par_boutique,
          actif: f.actif,
        },
      });
      console.log(`✓ Forfait mis à jour : ${f.nom} (${f.prix_mensuel} FCFA/mois)`);
    } else {
      await prisma.forfaits.create({
        data: f,
      });
      console.log(`✓ Forfait créé : ${f.nom} (${f.prix_mensuel} FCFA/mois)`);
    }
  }

  console.log("✅ Seed djoonoo terminé avec succès.");
}

main()
  .catch((e) => {
    console.error("❌ Erreur pendant le seed :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
