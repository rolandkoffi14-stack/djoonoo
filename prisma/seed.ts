import { PrismaClient } from "@prisma/client";
import { siteConfig } from "../src/config/site";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Démarrage du seed djoonoo depuis siteConfig...");

  // 1. Paramètres plateforme initiaux configurés depuis siteConfig
  const parametres = [
    {
      cle: "duree_essai_jours",
      valeur: String(siteConfig.saas.dureeEssaiJoursDefaut),
      description: "Durée de la période d'essai initiale en jours (standard SaaS)",
    },
    {
      cle: "delai_grace_jours",
      valeur: String(siteConfig.saas.delaiGraceJoursDefaut),
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

  // 2. Forfaits initiaux depuis siteConfig.forfaitsInitiaux
  for (const f of siteConfig.forfaitsInitiaux) {
    const existing = await prisma.forfaits.findFirst({
      where: { nom: f.nom },
    });

    if (existing) {
      await prisma.forfaits.update({
        where: { id: existing.id },
        data: {
          prix_mensuel: f.prix_mensuel,
          duree_jours: f.duree_jours,
          max_boutiques: f.max_boutiques,
          max_employes_par_boutique: f.max_employes_par_boutique,
          actif: f.actif,
        },
      });
      console.log(`✓ Forfait mis à jour : ${f.nom} (${f.prix_mensuel} FCFA/${f.duree_jours} jours)`);
    } else {
      await prisma.forfaits.create({
        data: {
          nom: f.nom,
          prix_mensuel: f.prix_mensuel,
          duree_jours: f.duree_jours,
          max_boutiques: f.max_boutiques,
          max_employes_par_boutique: f.max_employes_par_boutique,
          actif: f.actif,
        },
      });
      console.log(`✓ Forfait créé : ${f.nom} (${f.prix_mensuel} FCFA/${f.duree_jours} jours)`);
    }
  }

  console.log("✅ Seed djoonoo terminé avec succès (Zéro identifiant super-admin codé en dur).");
}

main()
  .catch((e) => {
    console.error("❌ Erreur pendant le seed :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
