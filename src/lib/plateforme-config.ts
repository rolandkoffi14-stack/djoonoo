import { prisma } from "@/lib/prisma";

/**
 * Vérifie si l'instance a déjà été initialisée avec son entreprise et son compte Patron unique.
 */
export async function estEntrepriseInitialisee(): Promise<boolean> {
  try {
    const [nbComptes, nbPatrons] = await Promise.all([
      prisma.comptes.count(),
      prisma.utilisateurs.count({ where: { role: "patron" } }),
    ]);
    return nbComptes > 0 && nbPatrons > 0;
  } catch (err) {
    console.error("Erreur lors de la vérification de l'initialisation de l'entreprise:", err);
    return false;
  }
}

/**
 * Alias de compatibilité
 */
export async function estPlateformeInitialisee(): Promise<boolean> {
  return estEntrepriseInitialisee();
}
