"use server";

import { prisma } from "@/lib/prisma";
import {
  getSuperAdminSession,
  verifySuperAdminPassword,
  verifySuperAdminTotp,
  createSuperAdminSessionToken,
  setSuperAdminSessionCookie,
  destroySuperAdminSession,
} from "@/lib/super-admin-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { StatutAbonnement, StatutFactureAbonnement } from "@prisma/client";

/**
 * Connexion Super-Admin avec 2FA TOTP obligatoire (Section 2 & 6)
 */
export async function connexionSuperAdminAction(
  prevState: any,
  formData: FormData
) {
  try {
    const email = (formData.get("email") as string)?.trim().toLowerCase();
    const motDePasse = (formData.get("mot_de_passe") as string)?.trim();
    const code2fa = (formData.get("code_2fa") as string)?.trim();

    if (!email || !motDePasse) {
      return { success: false, error: "Identifiant et mot de passe requis." };
    }

    const admin = await prisma.super_admins.findUnique({
      where: { email },
    });

    if (!admin) {
      return { success: false, error: "Identifiants invalides." };
    }

    const motDePasseValide = await verifySuperAdminPassword(
      motDePasse,
      admin.mot_de_passe_hash
    );
    if (!motDePasseValide) {
      return { success: false, error: "Identifiants invalides." };
    }

    // 2FA TOTP obligatoire pour le Super-Admin (Section 2 & 7)
    if (admin.deux_fa_active) {
      if (!code2fa) {
        return {
          success: false,
          needs2Fa: true,
          error: "Code d'authentification à 6 chiffres requis.",
        };
      }

      if (!admin.deux_fa_secret) {
        return {
          success: false,
          error: "Configuration 2FA manquante sur ce compte administrateur.",
        };
      }

      const totpValide = verifySuperAdminTotp(code2fa, admin.deux_fa_secret);
      if (!totpValide) {
        return {
          success: false,
          needs2Fa: true,
          error: "Code TOTP incorrect ou expiré. Veuillez réessayer.",
        };
      }
    }

    // Création session hermétique Super-Admin
    const token = await createSuperAdminSessionToken({
      superAdminId: admin.id,
      email: admin.email,
      deuxFaVerifiee: true,
    });

    await setSuperAdminSessionCookie(token);

    // Traçabilité dans journal_audit_plateforme
    await prisma.journal_audit_plateforme.create({
      data: {
        super_admin_id: admin.id,
        action: "connexion_super_admin",
        details: { email: admin.email, ip: "interne" },
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Erreur connexion Super-Admin:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de l'authentification.",
    };
  }
}

/**
 * Déconnexion Super-Admin
 */
export async function deconnexionSuperAdminAction() {
  await destroySuperAdminSession();
  redirect("/super-admin/connexion");
}

/**
 * Suspension / Réactivation manuelle d'un compte marchand (Section 6 & 8 bis)
 */
export async function suspendreOuReactiverCompteAction(
  compteId: string,
  nouveauStatut: StatutAbonnement,
  motif?: string
) {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return { success: false, error: "Session administrateur expirée." };
    }

    const compte = await prisma.comptes.findUnique({
      where: { id: compteId },
      include: { forfait: true },
    });

    if (!compte) {
      return { success: false, error: "Compte introuvable." };
    }

    const ancienStatut = compte.statut_abonnement;

    await prisma.$transaction(async (tx) => {
      // 1. Mise à jour statut
      await tx.comptes.update({
        where: { id: compteId },
        data: { statut_abonnement: nouveauStatut },
      });

      // 2. Traçabilité dans journal_audit_plateforme
      await tx.journal_audit_plateforme.create({
        data: {
          super_admin_id: session.superAdminId,
          action:
            nouveauStatut === StatutAbonnement.suspendu
              ? "suspension_compte"
              : "reactivation_compte",
          compte_cible_id: compteId,
          details: {
            nom_entreprise: compte.nom_entreprise,
            ancien_statut: ancienStatut,
            nouveau_statut: nouveauStatut,
            motif: motif || "Action administrative",
          },
        },
      });
    });

    revalidatePath("/super-admin");
    return { success: true };
  } catch (error) {
    console.error("Erreur suspension/réactivation compte:", error);
    return {
      success: false,
      error: "Impossible de modifier le statut du compte.",
    };
  }
}

/**
 * Confirmation manuelle d'un paiement d'abonnement (Section 6 & Section 5.3)
 */
export async function confirmerPaiementAbonnementAction(
  factureAbonnementId: string
) {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return { success: false, error: "Session administrateur expirée." };
    }

    const facture = await prisma.factures_abonnement.findUnique({
      where: { id: factureAbonnementId },
      include: {
        compte: {
          include: {
            forfait: true,
          },
        },
      },
    });

    if (!facture) {
      return { success: false, error: "Facture d'abonnement introuvable." };
    }

    if (facture.statut === StatutFactureAbonnement.payee) {
      return { success: false, error: "Cette facture est déjà marquée comme payée." };
    }

    const maintenant = new Date();
    // Période courante basée sur la durée configurée du forfait (décision H24)
    let dateDebut = maintenant;
    if (
      facture.compte.date_fin_periode_courante &&
      facture.compte.date_fin_periode_courante > maintenant
    ) {
      dateDebut = facture.compte.date_debut_periode_courante || maintenant;
    }

    const dureeJours = facture.compte.forfait?.duree_jours || 30;
    const dateFin = new Date(dateDebut);
    dateFin.setDate(dateFin.getDate() + dureeJours);

    await prisma.$transaction(async (tx) => {
      // 1. Clôture de la facture en statut payee
      await tx.factures_abonnement.update({
        where: { id: factureAbonnementId },
        data: {
          statut: StatutFactureAbonnement.payee,
          confirme_par_super_admin_id: session.superAdminId,
          date_confirmation: maintenant,
        },
      });

      // 2. Mise à jour du compte (statut actif + prolongation période)
      await tx.comptes.update({
        where: { id: facture.compte_id },
        data: {
          statut_abonnement: StatutAbonnement.actif,
          date_debut_periode_courante: dateDebut,
          date_fin_periode_courante: dateFin,
        },
      });

      // 3. Traçabilité dans journal_audit_plateforme
      await tx.journal_audit_plateforme.create({
        data: {
          super_admin_id: session.superAdminId,
          action: "confirmation_paiement",
          compte_cible_id: facture.compte_id,
          details: {
            facture_id: facture.id,
            montant: facture.montant,
            fournisseur_paiement: facture.fournisseur_paiement,
            nouvelle_date_fin: dateFin.toISOString(),
          },
        },
      });
    });

    revalidatePath("/super-admin");
    revalidatePath("/super-admin/abonnements");
    return { success: true };
  } catch (error) {
    console.error("Erreur confirmation paiement abonnement:", error);
    return {
      success: false,
      error: "Impossible de valider le paiement de l'abonnement.",
    };
  }
}

/**
 * Création ou modification d'un forfait (Décision B7 : NULL = Illimité & Décision H24 : duree_jours dynamique)
 */
export async function enregistrerForfaitAction(
  prevState: any,
  formData: FormData
) {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return { success: false, error: "Session administrateur expirée." };
    }

    const id = (formData.get("id") as string)?.trim();
    const nom = (formData.get("nom") as string)?.trim();
    const prixMensuel = parseInt((formData.get("prix_mensuel") as string) || "0", 10);
    const dureeJoursVal = parseInt((formData.get("duree_jours") as string) || "30", 10);
    const duree_jours = isNaN(dureeJoursVal) || dureeJoursVal <= 0 ? 30 : dureeJoursVal;
    const illimiteBoutiques = formData.get("illimite_boutiques") === "on";
    const maxBoutiquesVal = parseInt((formData.get("max_boutiques") as string) || "1", 10);
    const illimiteEmployes = formData.get("illimite_employes") === "on";
    const maxEmployesVal = parseInt((formData.get("max_employes") as string) || "2", 10);
    const actif = formData.get("actif") === "on";

    if (!nom || isNaN(prixMensuel) || prixMensuel < 0) {
      return { success: false, error: "Nom et prix mensuel valide requis." };
    }

    // Décision B7 : NULL plutôt qu'une sentinelle (-1) pour illimité
    const max_boutiques = illimiteBoutiques ? null : maxBoutiquesVal;
    const max_employes_par_boutique = illimiteEmployes ? null : maxEmployesVal;

    let forfait;
    if (id) {
      forfait = await prisma.forfaits.update({
        where: { id },
        data: {
          nom,
          prix_mensuel: prixMensuel,
          duree_jours,
          max_boutiques,
          max_employes_par_boutique,
          actif,
        },
      });

      await prisma.journal_audit_plateforme.create({
        data: {
          super_admin_id: session.superAdminId,
          action: "modification_forfait",
          details: { forfait_id: id, nom, prix_mensuel: prixMensuel, duree_jours, max_boutiques, max_employes_par_boutique, actif },
        },
      });
    } else {
      forfait = await prisma.forfaits.create({
        data: {
          nom,
          prix_mensuel: prixMensuel,
          duree_jours,
          max_boutiques,
          max_employes_par_boutique,
          actif,
        },
      });

      await prisma.journal_audit_plateforme.create({
        data: {
          super_admin_id: session.superAdminId,
          action: "creation_forfait",
          details: { forfait_id: forfait.id, nom, prix_mensuel: prixMensuel, duree_jours, max_boutiques, max_employes_par_boutique, actif },
        },
      });
    }

    revalidatePath("/super-admin/forfaits");
    return { success: true, forfait };
  } catch (error) {
    console.error("Erreur enregistrement forfait:", error);
    return { success: false, error: "Impossible d'enregistrer le forfait." };
  }
}

/**
 * Mise à jour d'un paramètre plateforme (Section 6 & 16)
 */
export async function modifierParametrePlateformeAction(
  cle: string,
  valeur: string,
  description?: string
) {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return { success: false, error: "Session administrateur expirée." };
    }

    await prisma.parametres_plateforme.upsert({
      where: { cle },
      create: { cle, valeur, description },
      update: { valeur, description },
    });

    await prisma.journal_audit_plateforme.create({
      data: {
        super_admin_id: session.superAdminId,
        action: "modification_parametre_plateforme",
        details: { cle, valeur },
      },
    });

    revalidatePath("/super-admin/parametres");
    return { success: true };
  } catch (error) {
    console.error("Erreur modification paramètre plateforme:", error);
    return { success: false, error: "Impossible de mettre à jour le paramètre." };
  }
}

/**
 * Déclenchement manuel du cycle d'abonnement depuis le dashboard Super-Admin
 */
export async function declencherCycleAbonnementsManuelAction() {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return { success: false, error: "Session administrateur expirée." };
    }

    const { executerCycleAbonnements } = await import("@/lib/subscriptions-cron");
    const rapport = await executerCycleAbonnements();

    revalidatePath("/super-admin");
    revalidatePath("/super-admin/abonnements");

    return { success: true, rapport };
  } catch (error) {
    console.error("Erreur déclenchement manuel cycle abonnements:", error);
    return {
      success: false,
      error: "Erreur lors de l'exécution du cycle d'abonnements.",
    };
  }
}

