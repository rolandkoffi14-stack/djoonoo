import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/config/site";

export interface ForfaitCatalogue {
  id: string;
  nom: string;
  prix: number;
  dureeJours: number;
  maxBoutiques: number | null;
  maxEmployesParBoutique: number | null;
  badge?: string;
  description: string;
  boutiques: string;
  employes: string;
  avantages: string[];
}

/**
 * Récupère les paramètres de plateforme (durée d'essai, délai de grâce)
 * depuis la base de données, avec repli sur siteConfig.
 */
export async function getPlateformeParametres() {
  try {
    const [paramEssai, paramGrace] = await Promise.all([
      prisma.parametres_plateforme.findUnique({ where: { cle: "duree_essai_jours" } }),
      prisma.parametres_plateforme.findUnique({ where: { cle: "delai_grace_jours" } }),
    ]);

    const dureeEssaiJours = paramEssai
      ? parseInt(paramEssai.valeur, 10)
      : siteConfig.saas.dureeEssaiJoursDefaut;

    const delaiGraceJours = paramGrace
      ? parseInt(paramGrace.valeur, 10)
      : siteConfig.saas.delaiGraceJoursDefaut;

    return {
      dureeEssaiJours: isNaN(dureeEssaiJours) ? siteConfig.saas.dureeEssaiJoursDefaut : dureeEssaiJours,
      delaiGraceJours: isNaN(delaiGraceJours) ? siteConfig.saas.delaiGraceJoursDefaut : delaiGraceJours,
    };
  } catch (err) {
    console.warn("Impossible de charger parametres_plateforme depuis Prisma, repli sur siteConfig.", err);
    return {
      dureeEssaiJours: siteConfig.saas.dureeEssaiJoursDefaut,
      delaiGraceJours: siteConfig.saas.delaiGraceJoursDefaut,
    };
  }
}

/**
 * Récupère les forfaits actifs en base de données et enrichit leur présentation
 * pour l'affichage (Landing Page, Inscription, Choix Forfait).
 * 
 * Si la base de données est vide, utilise le catalogue initial de siteConfig.
 */
export async function getForfaitsCatalogue(): Promise<ForfaitCatalogue[]> {
  try {
    const forfaitsBdd = await prisma.forfaits.findMany({
      where: { actif: true },
      orderBy: { prix_mensuel: "asc" },
    });

    if (forfaitsBdd && forfaitsBdd.length > 0) {
      return forfaitsBdd.map((f) => {
        // Rapprochement avec les métadonnées de présentation de siteConfig si le nom concorde
        const template = siteConfig.forfaitsInitiaux.find(
          (t) => t.nom.toLowerCase() === f.nom.toLowerCase()
        );

        const boutiquesLabel =
          f.max_boutiques === null
            ? "Boutiques illimitées"
            : f.max_boutiques === 1
            ? "1 boutique"
            : `Jusqu'à ${f.max_boutiques} boutiques`;

        const employesLabel =
          f.max_employes_par_boutique === null
            ? "Employés illimités"
            : f.max_employes_par_boutique === 1
            ? "1 employé inclus"
            : `Jusqu'à ${f.max_employes_par_boutique} employés/btq`;

        const isRecommande = f.nom.toLowerCase().includes("réseau");

        return {
          id: f.id,
          nom: f.nom,
          prix: f.prix_mensuel,
          dureeJours: f.duree_jours,
          maxBoutiques: f.max_boutiques,
          maxEmployesParBoutique: f.max_employes_par_boutique,
          badge: isRecommande ? "Recommandé" : template?.badge,
          description:
            template?.description ||
            `Formule ${f.nom} conçue pour la gestion complète de vos points de vente.`,
          boutiques: template?.boutiquesLabel || boutiquesLabel,
          employes: template?.employesLabel || employesLabel,
          avantages: template?.avantages
            ? [...template.avantages]
            : [
                boutiquesLabel,
                employesLabel,
                "Gestion des stocks et alertes",
                "Émission de factures numérotées",
                "Suivi des impayés et créances clients",
                "Rapports de ventes quotidiens",
              ],
        };
      });
    }
  } catch (err) {
    console.warn("Impossible de charger les forfaits depuis Prisma, repli sur siteConfig.", err);
  }

  // Fallback si base de données non initialisée ou indisponible
  return siteConfig.forfaitsInitiaux.map((t, idx) => ({
    id: `seed-forfait-${idx}`,
    nom: t.nom,
    prix: t.prix_mensuel,
    dureeJours: t.duree_jours,
    maxBoutiques: t.max_boutiques,
    maxEmployesParBoutique: t.max_employes_par_boutique,
    badge: t.badge,
    description: t.description,
    boutiques: t.boutiquesLabel,
    employes: t.employesLabel,
    avantages: [...t.avantages],
  }));
}

/**
 * Vérifie si la plateforme a déjà été initialisée avec un Super-Admin.
 */
export async function estPlateformeInitialisee(): Promise<boolean> {
  try {
    const count = await prisma.super_admins.count();
    return count > 0;
  } catch (err) {
    console.error("Erreur lors de la vérification de l'initialisation de la plateforme:", err);
    return false;
  }
}
