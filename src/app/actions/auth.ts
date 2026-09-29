"use server";

import {
  hashPassword,
  verifyPassword,
  generateTotpSecret,
  generateTotpQrCode,
  verifyTotpCode,
  generateTotpCode,
  setSessionCookie,
  clearSessionCookie,
  getCurrentSession,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  extraireCodeBase,
  genererCodeBoutique,
  enregistrerAudit,
} from "@/lib/business-rules";
import { RoleUtilisateur, StatutAbonnement } from "@prisma/client";
import { redirect } from "next/navigation";

// Stockage temporaire en mémoire pour l'étape d'activation 2FA lors de l'inscription
const pendingRegistrations = new Map<
  string,
  {
    userId: string;
    email: string;
    nom: string;
    compteId: string;
    role: RoleUtilisateur;
    codeCompte: string;
    codeBoutique: string;
    totpSecret: string;
    statutAbonnement: StatutAbonnement;
  }
>();

export interface InscriptionState {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  step?: "infos" | "deux_fa";
  data?: {
    userId: string;
    email: string;
    qrCodeDataUrl: string;
    secret: string;
    codeCompte: string;
    codeBoutique: string;
  };
}

/**
 * Action d'inscription du Patron (Étape 3 & Décision C10)
 * Transaction atomique créant Compte + Première Boutique + Utilisateur Patron
 */
export async function inscrirePatronAction(
  prevState: InscriptionState | null,
  formData: FormData
): Promise<InscriptionState> {
  const nomEntreprise = (formData.get("nom_entreprise") as string)?.trim();
  const nom = (formData.get("nom") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const motDePasse = formData.get("mot_de_passe") as string;
  const telephone = (formData.get("telephone") as string)?.trim();
  const ville = (formData.get("ville") as string)?.trim();
  const secteurActivite = (formData.get("secteur_activite") as string)?.trim() || "Commerce général";
  const adresseSiege = (formData.get("adresse_siege") as string)?.trim() || null;

  // 1. Validation côté serveur
  const fieldErrors: Record<string, string> = {};
  if (!nomEntreprise) fieldErrors.nom_entreprise = "Indique le nom de ton entreprise.";
  if (!nom) fieldErrors.nom = "Indique ton nom complet.";
  if (!email || !email.includes("@")) fieldErrors.email = "Indique une adresse email valide.";
  if (!motDePasse || motDePasse.length < 8) fieldErrors.mot_de_passe = "Le mot de passe doit comporter au moins 8 caractères.";
  if (!telephone) fieldErrors.telephone = "Indique ton numéro de téléphone.";
  if (!ville) fieldErrors.ville = "Indique la ville d'activité.";

  if (Object.keys(fieldErrors).length > 0) {
    return { success: false, fieldErrors };
  }

  // 2. Préparation du secret 2FA TOTP (Section 7 & Section 16.3)
  const { secret: totpSecret, otpauth } = generateTotpSecret(email);
  const qrCodeDataUrl = await generateTotpQrCode(otpauth);
  const mdpHash = await hashPassword(motDePasse);

  let userId: string;
  let compteId: string;
  let codeCompteFinal: string;
  let codeBoutiqueFinal: string;

  try {
    // Vérification de l'email unique (décision C10)
    const existingUser = await prisma.utilisateurs.findUnique({
      where: { email },
    });

    if (existingUser) {
      return {
        success: false,
        error: "Cette adresse email est déjà associée à un compte djoonoo.",
      };
    }

    // Récupération dynamique du forfait choisi (Tâche 7) ou fallback sur Solo
    const forfaitIdOuNom = (formData.get("forfait_id") as string)?.trim() || (formData.get("forfait_nom") as string)?.trim();
    let forfait = null;
    if (forfaitIdOuNom) {
      forfait = await prisma.forfaits.findFirst({
        where: {
          OR: [
            { id: forfaitIdOuNom },
            { nom: { equals: forfaitIdOuNom, mode: "insensitive" } },
          ],
          actif: true,
        },
      });
    }

    if (!forfait) {
      forfait = await prisma.forfaits.findFirst({
        where: { nom: "Solo", actif: true },
      });
    }

    if (!forfait) {
      forfait = await prisma.forfaits.findFirst({
        where: { actif: true },
      });
    }

    if (!forfait) {
      // Fallback ultime si base vide
      forfait = await prisma.forfaits.create({
        data: {
          nom: "Solo",
          prix_mensuel: 5000,
          duree_jours: 30,
          max_boutiques: 1,
          max_employes_par_boutique: 1,
          actif: true,
        },
      });
    }

    // Période d'essai : 14 jours (Section 5.2 & Section 16.6)
    const dureeEssaiParam = await prisma.parametres_plateforme.findUnique({
      where: { cle: "duree_essai_jours" },
    });
    const dureeEssaiJours = dureeEssaiParam ? parseInt(dureeEssaiParam.valeur, 10) : 14;

    const dateDebut = new Date();
    const dateFinEssai = new Date();
    dateFinEssai.setDate(dateDebut.getDate() + dureeEssaiJours);

    // Règle 8 : Génération atomique de comptes.code avec retry sur P2002
    const codeBase = extraireCodeBase(nomEntreprise);
    let codeCompte = codeBase;
    let tentative = 1;
    let compteCree = null;

    while (!compteCree && tentative <= 10) {
      try {
        compteCree = await prisma.$transaction(async (tx) => {
          // A. Création du compte
          const nouveauCompte = await tx.comptes.create({
            data: {
              code: codeCompte,
              nom_entreprise: nomEntreprise,
              email_principal: email,
              forfait_id: forfait!.id,
              statut_abonnement: "essai",
              telephone_principal: telephone,
              ville: ville,
              adresse_siege: adresseSiege,
              date_fin_essai: dateFinEssai,
              date_debut_periode_courante: dateDebut,
              date_fin_periode_courante: dateFinEssai,
            },
          });

          // B. Règle 8 bis : Initialisation du compteur boutique et code B01
          const codeBoutique = await genererCodeBoutique(tx, nouveauCompte.id);

          // C. Création de la première boutique
          const nouvelleBoutique = await tx.boutiques.create({
            data: {
              compte_id: nouveauCompte.id,
              code: codeBoutique,
              nom: nomEntreprise,
              secteur_activite: secteurActivite,
              adresse: adresseSiege || ville,
              ville: ville,
              telephone: telephone,
              statut: "actif",
            },
          });

          // D. Création de l'utilisateur Patron
          const patronUser = await tx.utilisateurs.create({
            data: {
              compte_id: nouveauCompte.id,
              boutique_id: null, // NULL uniquement pour role = patron (Règle, Section 3)
              role: "patron",
              nom: nom,
              telephone: telephone,
              email: email,
              mot_de_passe_hash: mdpHash,
              deux_fa_active: false, // Activé dès validation du code TOTP
              deux_fa_secret: totpSecret,
              statut: "actif",
            },
          });

          // E. Audit log (Section 7)
          await enregistrerAudit(tx, {
            compte_id: nouveauCompte.id,
            utilisateur_id: patronUser.id,
            action: "creation_compte",
            entite_concernee: "comptes",
            entite_id: nouveauCompte.id,
            details: {
              code_compte: codeCompte,
              premiere_boutique: codeBoutique,
              forfait: forfait!.nom,
              duree_essai: dureeEssaiJours,
            },
          });

          return {
            compte: nouveauCompte,
            boutique: nouvelleBoutique,
            patron: patronUser,
          };
        });
      } catch (err: any) {
        // En cas de collision sur contrainte d'unicité (P2002), suffixer le code
        if (err.code === "P2002" && err.meta?.target?.includes("code")) {
          tentative++;
          codeCompte = `${codeBase}${tentative}`;
        } else {
          throw err;
        }
      }
    }

    if (!compteCree) {
      throw new Error("Impossible de générer un code d'entreprise unique après 10 tentatives.");
    }

    userId = compteCree.patron.id;
    compteId = compteCree.compte.id;
    codeCompteFinal = compteCree.compte.code;
    codeBoutiqueFinal = compteCree.boutique.code;
  } catch (dbError: any) {
    console.error("Erreur création compte en base de données :", dbError);
    return {
      success: false,
      error: "Erreur lors de la création du compte : " + (dbError.message || "Impossible de contacter la base de données."),
    };
  }

  // Stocke en session d'inscription temporaire pour l'étape 2 (Validation 2FA)
  pendingRegistrations.set(userId, {
    userId,
    email,
    nom,
    compteId,
    role: "patron",
    codeCompte: codeCompteFinal,
    codeBoutique: codeBoutiqueFinal,
    totpSecret,
    statutAbonnement: "essai",
  });

  const codeTotpActuel = generateTotpCode(totpSecret);
  console.log(`\n==================================================`);
  console.log(`🔐 [2FA djoonoo] Inscription de ${email}`);
  console.log(`👉 CODE 2FA TOTP (tolérance 5 minutes) : ${codeTotpActuel}`);
  console.log(`==================================================\n`);

  return {
    success: true,
    step: "deux_fa",
    data: {
      userId,
      email,
      qrCodeDataUrl,
      secret: totpSecret,
      codeCompte: codeCompteFinal,
      codeBoutique: codeBoutiqueFinal,
    },
  };
}

/**
 * Validation finale du code TOTP lors de l'inscription (Étape 3 & Section 7)
 */
export async function validerDeuxFaInscriptionAction(
  userId: string,
  code: string
): Promise<{ success: boolean; error?: string; redirectUrl?: string }> {
  let pending = pendingRegistrations.get(userId);
  if (!pending) {
    // Fallback résilient en base de données si le serveur dev Next.js a redémarré
    const dbUser = await prisma.utilisateurs.findUnique({
      where: { id: userId },
      include: { compte: true, boutique: true },
    });
    if (dbUser && dbUser.deux_fa_secret) {
      pending = {
        userId: dbUser.id,
        email: dbUser.email,
        nom: dbUser.nom,
        compteId: dbUser.compte_id,
        role: dbUser.role,
        codeCompte: dbUser.compte.code,
        codeBoutique: dbUser.boutique?.code || "B01",
        totpSecret: dbUser.deux_fa_secret,
        statutAbonnement: dbUser.compte.statut_abonnement,
      };
    } else {
      return {
        success: false,
        error: "Session d'inscription expirée. Merci de recommencer.",
      };
    }
  }

  const isValid = verifyTotpCode(code, pending.totpSecret);
  if (!isValid) {
    return {
      success: false,
      error: "Code d'authentification invalide. Vérifie l'heure de ton appareil et saisis les 6 chiffres affichés.",
    };
  }

  // Activer la 2FA en base de données
  try {
    await prisma.utilisateurs.update({
      where: { id: userId },
      data: {
        deux_fa_active: true,
      },
    });
  } catch (e: any) {
    console.error("Erreur mise à jour statut 2FA DB :", e);
    return {
      success: false,
      error: "Erreur lors de l'enregistrement de la 2FA en base de données.",
    };
  }

  // Création du cookie de session sécurisé
  await setSessionCookie({
    userId: pending.userId,
    email: pending.email,
    role: pending.role,
    compteId: pending.compteId,
    boutiqueId: null,
    nom: pending.nom,
    statutAbonnement: pending.statutAbonnement,
    deuxFaVerifiee: true,
  });

  pendingRegistrations.delete(userId);

  return {
    success: true,
    redirectUrl: "/dashboard",
  };
}

/**
 * Action de connexion (Email + Mot de passe) — Section 7 & 8 bis
 */
export async function connexionAction(
  prevState: any,
  formData: FormData
): Promise<{
  success?: boolean;
  error?: string;
  require2FA?: boolean;
  userId?: string;
  email?: string;
  redirectUrl?: string;
}> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const motDePasse = formData.get("mot_de_passe") as string;

  if (!email || !motDePasse) {
    return { error: "Indique ton adresse email et ton mot de passe." };
  }

  try {
    const user = await prisma.utilisateurs.findUnique({
      where: { email },
      include: {
        compte: true,
      },
    });

    if (!user) {
      return { error: "Identifiants invalides." };
    }

    // Vérification compte en attente d'activation
    if (user.statut === "en_attente" || !user.mot_de_passe_hash) {
      return {
        error:
          "Ton compte n'est pas encore activé. Veuillez cliquer sur le lien d'invitation reçu par email pour définir votre mot de passe.",
      };
    }

    // Vérification du mot de passe
    const mdpValide = await verifyPassword(motDePasse, user.mot_de_passe_hash);
    if (!mdpValide) {
      return { error: "Identifiants invalides." };
    }

    // Vérification statut utilisateur
    if (user.statut === "inactif") {
      return { error: "Ton accès utilisateur a été désactivé par le Patron." };
    }

    // Règle 8 bis : Compte suspendu -> blocage complet à la connexion
    if (user.compte.statut_abonnement === "suspendu") {
      return {
        error:
          "Ton compte djoonoo est suspendu pour des raisons administratives ou de sécurité. Merci de contacter le support.",
      };
    }

    // 2FA obligatoire pour Patron et Gérant (Section 2 & 7)
    if (user.role === "patron" || user.role === "gerant" || user.deux_fa_active) {
      if (user.deux_fa_secret) {
        const codeTotpConnexion = generateTotpCode(user.deux_fa_secret);
        console.log(`\n==================================================`);
        console.log(`🔐 [2FA djoonoo] Connexion de ${user.nom} (${user.email})`);
        console.log(`👉 CODE 2FA TOTP (tolérance 5 minutes) : ${codeTotpConnexion}`);
        console.log(`==================================================\n`);
      }
      return {
        success: true,
        require2FA: true,
        userId: user.id,
        email: user.email,
      };
    }

    // Vendeur sans 2FA active -> session directe
    await setSessionCookie({
      userId: user.id,
      email: user.email,
      role: user.role,
      compteId: user.compte_id,
      boutiqueId: user.boutique_id,
      nom: user.nom,
      statutAbonnement: user.compte.statut_abonnement,
      deuxFaVerifiee: true,
    });

    return { success: true, redirectUrl: "/dashboard" };
  } catch (dbErr: any) {
    console.error("Erreur connexion base de données :", dbErr);
    return {
      error: "Connexion impossible à la base de données. Vérifie ta connexion ou contacte le support.",
    };
  }
}

/**
 * Validation 2FA lors de la connexion
 */
export async function validerDeuxFaConnexionAction(
  userId: string,
  code: string
): Promise<{ success: boolean; error?: string; redirectUrl?: string }> {
  try {
    const user = await prisma.utilisateurs.findUnique({
      where: { id: userId },
      include: { compte: true },
    });

    if (!user || !user.deux_fa_secret) {
      return { success: false, error: "Utilisateur ou configuration 2FA introuvable." };
    }

    const isValid = verifyTotpCode(code, user.deux_fa_secret);
    if (!isValid) {
      return { success: false, error: "Code à 6 chiffres incorrect ou expiré." };
    }

    if (user.compte.statut_abonnement === "suspendu") {
      return {
        success: false,
        error:
          "Ton compte djoonoo est suspendu pour des raisons administratives ou de sécurité. Merci de contacter le support.",
      };
    }

    await setSessionCookie({
      userId: user.id,
      email: user.email,
      role: user.role,
      compteId: user.compte_id,
      boutiqueId: user.boutique_id,
      nom: user.nom,
      statutAbonnement: user.compte.statut_abonnement,
      deuxFaVerifiee: true,
    });

    return { success: true, redirectUrl: "/dashboard" };
  } catch (err: any) {
    return { success: false, error: "Erreur lors de la validation 2FA : " + err.message };
  }
}

/**
 * Action de déconnexion
 */
export async function deconnexionAction() {
  await clearSessionCookie();
  redirect("/connexion");
}
