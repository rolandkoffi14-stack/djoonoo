"use server";

import crypto from "crypto";
import { headers } from "next/headers";
import { getCurrentSession } from "@/lib/auth";
import { prisma, getScopedPrisma } from "@/lib/prisma";
import { enregistrerAudit } from "@/lib/business-rules";
import { revalidatePath } from "next/cache";
import { RoleUtilisateur, StatutUtilisateur } from "@prisma/client";
import { envoyerEmailInvitation } from "@/lib/email";

export interface EmployeActionResult {
  success: boolean;
  error?: string;
  avertissement?: string;
  employe?: {
    id: string;
    nom: string;
    email: string;
    role: RoleUtilisateur;
    boutiqueNom: string;
    statut: StatutUtilisateur;
  };
  totpQrCode?: string;
  totpSecret?: string;
}

/**
 * Création et invitation d'un collaborateur (Gérant ou Vendeur) par email
 * Section 2, Section 5.5, Règle 2 & Sécurité 2FA autonome sous 48h
 */
export async function creerEmployeAction(
  prevState: any,
  formData: FormData
): Promise<EmployeActionResult> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Session expirée. Veuillez vous reconnecter." };
  }

  // 1. Contrôle d'accès par rôle (Section 2)
  if (session.role !== "patron" && session.role !== "gerant") {
    return { success: false, error: "Action non autorisée. Seuls le Patron et le Gérant peuvent ajouter des collaborateurs." };
  }

  const nom = (formData.get("nom") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const telephone = (formData.get("telephone") as string)?.trim();
  const role = (formData.get("role") as RoleUtilisateur) || "vendeur";
  let boutiqueId = (formData.get("boutique_id") as string)?.trim();

  // Le Gérant ne peut inviter QUE des vendeurs et UNIQUEMENT dans sa propre boutique
  if (session.role === "gerant") {
    if (role !== "vendeur") {
      return { success: false, error: "En tant que Gérant, tu ne peux inviter que des vendeurs." };
    }
    if (!session.boutiqueId) {
      return { success: false, error: "Boutique d'affectation du gérant introuvable." };
    }
    boutiqueId = session.boutiqueId;
  }

  if (!nom || !email || !telephone || !boutiqueId) {
    return { success: false, error: "Tous les champs obligatoires (nom, email, téléphone, boutique) doivent être renseignés." };
  }

  try {
    const scoped = getScopedPrisma(session.compteId);

    // 2. Vérification que la boutique cible appartient bien au compte
    const boutiqueCible = await scoped.boutiques.findFirst({
      where: { id: boutiqueId, compte_id: session.compteId },
    });

    if (!boutiqueCible) {
      return { success: false, error: "La boutique sélectionnée n'existe pas dans ton entreprise." };
    }

    // 3. Vérification des plafonds de forfait (Section 5.5 & Décision B7)
    const compte = await prisma.comptes.findUnique({
      where: { id: session.compteId },
      include: { forfait: true },
    });

    if (!compte) {
      return { success: false, error: "Compte entreprise introuvable." };
    }

    const { forfait } = compte;
    if (forfait.max_employes_par_boutique !== null) {
      const employesActuels = await prisma.historique_affectations.count({
        where: {
          boutique_id: boutiqueId,
          date_fin: null,
        },
      });

      if (employesActuels >= forfait.max_employes_par_boutique) {
        return {
          success: false,
          error: `Limite atteinte : Le forfait ${forfait.nom} autorise un maximum de ${forfait.max_employes_par_boutique} collaborateur(s) par boutique. Passe au forfait supérieur pour agrandir ton équipe.`,
        };
      }
    }

    // 4. Vérification d'unicité de l'email
    const emailExistant = await prisma.utilisateurs.findUnique({
      where: { email },
    });

    if (emailExistant) {
      return { success: false, error: "Cette adresse email est déjà associée à un utilisateur sur djoonoo." };
    }

    // 5. Génération du token cryptographique d'invitation (32 octets, valable 48h)
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const dateExpiration = new Date(Date.now() + 48 * 60 * 60 * 1000);

    // 6. Transaction atomique Prisma : utilisateur (en_attente) + token d'invitation + affectation + audit
    const nouvelEmploye = await prisma.$transaction(async (tx) => {
      const utilisateur = await tx.utilisateurs.create({
        data: {
          compte_id: session.compteId,
          boutique_id: boutiqueId,
          role,
          nom,
          email,
          telephone,
          mot_de_passe_hash: null, // Pas de mot de passe initial
          deux_fa_active: false,   // Activé lors de l'onboarding pour le Gérant
          deux_fa_secret: null,
          statut: "en_attente",
        },
      });

      // Stocker le token d'invitation avec expiration 48h
      await tx.tokens_invitation.create({
        data: {
          utilisateur_id: utilisateur.id,
          token_hash: tokenHash,
          date_expiration: dateExpiration,
        },
      });

      // Règle 2 : Consignation dans l'historique des affectations
      await tx.historique_affectations.create({
        data: {
          utilisateur_id: utilisateur.id,
          boutique_id: boutiqueId,
          date_debut: new Date(),
          date_fin: null,
        },
      });

      // Consignation dans le journal d'audit
      await enregistrerAudit(tx, {
        compte_id: session.compteId,
        utilisateur_id: session.userId,
        action: "invitation_employe",
        entite_concernee: "utilisateurs",
        entite_id: utilisateur.id,
        details: {
          role,
          nom,
          email,
          boutique_id: boutiqueId,
          boutique_code: boutiqueCible.code,
        },
      });

      return utilisateur;
    });

    // 7. Déterminer l'URL d'activation
    let baseUrl = process.env.NEXTAUTH_URL || process.env.APP_URL;
    if (!baseUrl) {
      try {
        const headersList = await headers();
        const host = headersList.get("x-forwarded-host") || headersList.get("host") || "localhost:3000";
        const proto = headersList.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
        baseUrl = `${proto}://${host}`;
      } catch {
        baseUrl = "http://localhost:3000";
      }
    }
    const lienInvitation = `${baseUrl}/invitation/${rawToken}`;

    // 8. Expédier l'email d'invitation via Resend
    const resultatEnvoi = await envoyerEmailInvitation({
      destinataire: email,
      nom,
      role: role as "gerant" | "vendeur",
      nomEntreprise: compte.nom_entreprise,
      boutiqueNom: boutiqueCible.nom,
      lienInvitation,
    });

    revalidatePath("/dashboard/equipe");
    revalidatePath("/dashboard/boutiques");

    return {
      success: true,
      avertissement: !resultatEnvoi.success
        ? `Le collaborateur a été ajouté, mais l'envoi d'email a rencontré un problème : ${resultatEnvoi.error || "erreur Resend"}. Tu peux cliquer sur "Renvoyer l'invitation".`
        : undefined,
      employe: {
        id: nouvelEmploye.id,
        nom: nouvelEmploye.nom,
        email: nouvelEmploye.email,
        role: nouvelEmploye.role,
        boutiqueNom: boutiqueCible.nom,
        statut: nouvelEmploye.statut,
      },
    };
  } catch (err: any) {
    console.error("Erreur creerEmployeAction :", err);
    return { success: false, error: "Erreur serveur : " + (err.message || "Impossible d'ajouter le collaborateur.") };
  }
}

/**
 * Renvoi d'un lien d'invitation actif valable 48h
 */
export async function renvoyerInvitationAction(
  utilisateurId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Session expirée. Veuillez vous reconnecter." };
  }

  if (session.role !== "patron" && session.role !== "gerant") {
    return { success: false, error: "Action non autorisée." };
  }

  try {
    const employe = await prisma.utilisateurs.findFirst({
      where: {
        id: utilisateurId,
        compte_id: session.compteId,
      },
      include: {
        compte: true,
        boutique: true,
      },
    });

    if (!employe) {
      return { success: false, error: "Collaborateur introuvable." };
    }

    if (employe.statut !== "en_attente") {
      return { success: false, error: "Ce compte a déjà été activé par son collaborateur." };
    }

    if (session.role === "gerant" && employe.boutique_id !== session.boutiqueId) {
      return { success: false, error: "En tant que Gérant, tu ne peux gérer que les collaborateurs de ta propre boutique." };
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const dateExpiration = new Date(Date.now() + 48 * 60 * 60 * 1000);

    // Mettre à jour le token
    await prisma.tokens_invitation.upsert({
      where: { utilisateur_id: employe.id },
      update: {
        token_hash: tokenHash,
        date_expiration: dateExpiration,
      },
      create: {
        utilisateur_id: employe.id,
        token_hash: tokenHash,
        date_expiration: dateExpiration,
      },
    });

    let baseUrl = process.env.NEXTAUTH_URL || process.env.APP_URL;
    if (!baseUrl) {
      try {
        const headersList = await headers();
        const host = headersList.get("x-forwarded-host") || headersList.get("host") || "localhost:3000";
        const proto = headersList.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
        baseUrl = `${proto}://${host}`;
      } catch {
        baseUrl = "http://localhost:3000";
      }
    }
    const lienInvitation = `${baseUrl}/invitation/${rawToken}`;

    const resultatEnvoi = await envoyerEmailInvitation({
      destinataire: employe.email,
      nom: employe.nom,
      role: employe.role as "gerant" | "vendeur",
      nomEntreprise: employe.compte.nom_entreprise,
      boutiqueNom: employe.boutique?.nom || "Boutique",
      lienInvitation,
    });

    if (!resultatEnvoi.success) {
      return {
        success: false,
        error: `Impossible d'expédier l'email : ${resultatEnvoi.error || "erreur inconnue Resend"}`,
      };
    }

    await enregistrerAudit(prisma, {
      compte_id: session.compteId,
      utilisateur_id: session.userId,
      action: "renvoi_invitation_employe",
      entite_concernee: "utilisateurs",
      entite_id: employe.id,
      details: { email: employe.email, role: employe.role },
    });

    revalidatePath("/dashboard/equipe");
    return { success: true };
  } catch (err: any) {
    console.error("Erreur renvoyerInvitationAction :", err);
    return { success: false, error: "Impossible de renvoyer l'invitation." };
  }
}

/**
 * Changement de statut d'un collaborateur (actif / inactif)
 */
export async function changerStatutEmployeAction(
  employeId: string,
  nouveauStatut: StatutUtilisateur
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentSession();
  if (!session || (session.role !== "patron" && session.role !== "gerant")) {
    return { success: false, error: "Action non autorisée." };
  }

  // Interdiction de désactiver son propre compte
  if (employeId === session.userId) {
    return { success: false, error: "Tu ne peux pas désactiver ton propre compte." };
  }

  try {
    const scoped = getScopedPrisma(session.compteId);
    const employe = await scoped.utilisateurs.findFirst({
      where: { id: employeId, compte_id: session.compteId },
    });

    if (!employe) {
      return { success: false, error: "Collaborateur introuvable." };
    }

    // Le Gérant ne peut modifier QUE les vendeurs de sa boutique
    if (session.role === "gerant") {
      if (employe.role !== "vendeur" || employe.boutique_id !== session.boutiqueId) {
        return { success: false, error: "Action réservée au Patron ou non autorisée pour cette boutique." };
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.utilisateurs.update({
        where: { id: employeId },
        data: { statut: nouveauStatut },
      });

      await enregistrerAudit(tx, {
        compte_id: session.compteId,
        utilisateur_id: session.userId,
        action: nouveauStatut === "actif" ? "reactivation_collaborateur" : "desactivation_collaborateur",
        entite_concernee: "utilisateurs",
        entite_id: employeId,
        details: {
          nom: employe.nom,
          role: employe.role,
          nouveau_statut: nouveauStatut,
        },
      });
    });

    revalidatePath("/dashboard/equipe");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Transfert officiel d'un collaborateur (Gérant ou Vendeur) vers une autre boutique
 * Section 1.1, Décision H20, Règle 2 & Décision B7
 */
export async function transfererEmployeAction(payload: {
  employeId: string;
  nouvelleBoutiqueId: string;
}): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Session expirée. Veuillez vous reconnecter." };
  }

  // Contrôle de permission Section 2 : Réservé au Patron
  if (session.role !== "patron") {
    return {
      success: false,
      error: "Action non autorisée. Seul le Patron peut transférer un collaborateur d'une boutique à une autre (Section 2).",
    };
  }

  const { employeId, nouvelleBoutiqueId } = payload;

  if (!employeId || !nouvelleBoutiqueId) {
    return { success: false, error: "Employé ou boutique de destination non spécifié." };
  }

  if (employeId === session.userId) {
    return { success: false, error: "Tu ne peux pas transférer ton propre profil Patron." };
  }

  try {
    const scoped = getScopedPrisma(session.compteId);

    // 1. Récupération de l'employé
    const employe = await scoped.utilisateurs.findFirst({
      where: { id: employeId, compte_id: session.compteId },
      include: { boutique: true },
    });

    if (!employe) {
      return { success: false, error: "Collaborateur introuvable." };
    }

    if (employe.boutique_id === nouvelleBoutiqueId) {
      return { success: false, error: "Le collaborateur est déjà affecté à cette boutique." };
    }

    // 2. Vérification de la boutique cible
    const boutiqueCible = await scoped.boutiques.findFirst({
      where: { id: nouvelleBoutiqueId, compte_id: session.compteId },
    });

    if (!boutiqueCible) {
      return { success: false, error: "Boutique de destination introuvable." };
    }

    if (boutiqueCible.statut === "inactif") {
      return {
        success: false,
        error: "Impossible de transférer un collaborateur vers une boutique inactive (Règle 8 bis).",
      };
    }

    // 3. Contrôle du quota d'employés du forfait sur la boutique cible (Décision B7)
    const compte = await prisma.comptes.findUnique({
      where: { id: session.compteId },
      include: { forfait: true },
    });

    if (compte?.forfait.max_employes_par_boutique !== null) {
      const nbEmployesBoutiqueCible = await scoped.utilisateurs.count({
        where: {
          compte_id: session.compteId,
          boutique_id: nouvelleBoutiqueId,
          statut: "actif",
        },
      });

      if (nbEmployesBoutiqueCible >= compte!.forfait.max_employes_par_boutique) {
        return {
          success: false,
          error: `Limite atteinte : ton forfait "${compte!.forfait.nom}" n'autorise que ${compte!.forfait.max_employes_par_boutique} collaborateur(s) par boutique.`,
        };
      }
    }

    // 4. Transaction atomique ACID (Section 1.1, Décision H20, Règle 2)
    const maintenant = new Date();
    await prisma.$transaction(async (tx) => {
      // A. Clôture de l'affectation en cours dans l'historique
      await tx.historique_affectations.updateMany({
        where: {
          utilisateur_id: employe.id,
          date_fin: null,
        },
        data: {
          date_fin: maintenant,
        },
      });

      // B. Création de la nouvelle période d'affectation
      await tx.historique_affectations.create({
        data: {
          utilisateur_id: employe.id,
          boutique_id: nouvelleBoutiqueId,
          date_debut: maintenant,
        },
      });

      // C. Mise à jour de la boutique_id courante de l'employé
      await tx.utilisateurs.update({
        where: { id: employe.id },
        data: {
          boutique_id: nouvelleBoutiqueId,
        },
      });

      // D. Traçabilité dans le journal d'audit
      await enregistrerAudit(tx, {
        compte_id: session.compteId,
        utilisateur_id: session.userId,
        action: "transfert_collaborateur",
        entite_concernee: "utilisateurs",
        entite_id: employe.id,
        details: {
          collaborateur_nom: employe.nom,
          role: employe.role,
          ancienne_boutique_code: employe.boutique?.code || "N/A",
          ancienne_boutique_nom: employe.boutique?.nom || "N/A",
          nouvelle_boutique_code: boutiqueCible.code,
          nouvelle_boutique_nom: boutiqueCible.nom,
        },
      });
    });

    revalidatePath("/dashboard/equipe");
    revalidatePath("/dashboard/boutiques");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (err: any) {
    console.error("Erreur transfert employé :", err);
    return { success: false, error: "Erreur serveur : " + (err.message || "Impossible de transférer le collaborateur.") };
  }
}
