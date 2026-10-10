import { PrismaClient } from "@prisma/client";
import { siteConfig } from "../src/config/site";

const prisma = new PrismaClient();

async function main() {
  console.log("ℹ️ Note : Le compte Super-Admin n'est plus seedé avec des identifiants statiques par défaut (Règle CWE-798).");
  console.log("👉 L'initialisation du premier Super-Admin se fait désormais via l'interface sécurisée : /super-admin/initialisation");

  // Initialisation des paramètres plateforme par défaut depuis siteConfig
  await prisma.parametres_plateforme.upsert({
    where: { cle: "duree_essai_jours" },
    create: {
      cle: "duree_essai_jours",
      valeur: String(siteConfig.saas.dureeEssaiJoursDefaut),
      description: "Durée de la période d'essai gratuite en jours",
    },
    update: {},
  });

  await prisma.parametres_plateforme.upsert({
    where: { cle: "delai_grace_jours" },
    create: {
      cle: "delai_grace_jours",
      valeur: String(siteConfig.saas.delaiGraceJoursDefaut),
      description: "Délai de grâce accordé après échéance impayée avant suspension",
    },
    update: {},
  });

  console.log("✅ Paramètres plateforme prêts.");
}

main()
  .catch((e) => {
    console.error("❌ Erreur :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
