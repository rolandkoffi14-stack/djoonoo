"use server";

import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export interface ActionResponse {
  success: boolean;
  error?: string;
  message?: string;
}

/**
 * Modifie les informations personnelles du profil de l'utilisateur connecté.
 * Si le rôle est Patron, l'email principal de comptes est également synchronisé (décision C10).
 */
export async function modifierProfilAction(formData: FormData): Promise<ActionResponse> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Non authentifié." };
  }

  const nom = (formData.get("nom") as string)?.trim();
  const telephone = (formData.get("telephone") as string)?.trim();

  if (!nom || nom.length < 2) {
    return { success: false, error: "Le nom doit comporter au moins 2 caractères." };
  }

  if (!telephone || telephone.length < 6) {
    return { success: false, error: "Numéro de téléphone invalide." };
  }

  // Mise à jour de l'utilisateur (nom et téléphone uniquement, email non modifiable)
  await prisma.utilisateurs.update({
    where: { id: session.userId },
    data: {
      nom,
      telephone,
    },
  });

  revalidatePath("/dashboard/parametres");
  return { success: true, message: "Profil mis à jour avec succès." };
}

/**
 * Modifie le mot de passe de l'utilisateur connecté après vérification de l'ancien mot de passe.
 */
export async function modifierMotDePasseAction(formData: FormData): Promise<ActionResponse> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Non authentifié." };
  }

  const ancienMotDePasse = (formData.get("ancienMotDePasse") as string) || "";
  const nouveauMotDePasse = (formData.get("nouveauMotDePasse") as string) || "";
  const confirmationMotDePasse = (formData.get("confirmationMotDePasse") as string) || "";

  if (!ancienMotDePasse) {
    return { success: false, error: "L'ancien mot de passe est obligatoire." };
  }

  if (nouveauMotDePasse.length < 8) {
    return { success: false, error: "Le nouveau mot de passe doit comporter au moins 8 caractères." };
  }

  if (nouveauMotDePasse !== confirmationMotDePasse) {
    return { success: false, error: "Les deux nouveaux mots de passe ne correspondent pas." };
  }

  const user = await prisma.utilisateurs.findUnique({
    where: { id: session.userId },
  });

  if (!user || !user.mot_de_passe_hash) {
    return { success: false, error: "Utilisateur ou mot de passe introuvable." };
  }

  const match = await bcrypt.compare(ancienMotDePasse, user.mot_de_passe_hash);
  if (!match) {
    return { success: false, error: "Ancien mot de passe incorrect." };
  }

  const nouveauHash = await bcrypt.hash(nouveauMotDePasse, 10);

  await prisma.utilisateurs.update({
    where: { id: session.userId },
    data: {
      mot_de_passe_hash: nouveauHash,
    },
  });

  return { success: true, message: "Mot de passe modifié avec succès." };
}

/**
 * Modifie les données légales et coordonnées de l'entreprise (réservé au rôle Patron).
 */
export async function modifierEntrepriseAction(formData: FormData): Promise<ActionResponse> {
  const session = await getCurrentSession();
  if (!session || session.role !== "patron") {
    return { success: false, error: "Action réservée au Patron du compte." };
  }

  const nom_entreprise = (formData.get("nom_entreprise") as string)?.trim();
  const forme_juridique = (formData.get("forme_juridique") as string)?.trim() || null;
  const ifu = (formData.get("ifu") as string)?.trim() || null;
  const rccm = (formData.get("rccm") as string)?.trim() || null;
  const telephone_principal = (formData.get("telephone_principal") as string)?.trim();
  const telephone_secondaire = (formData.get("telephone_secondaire") as string)?.trim() || null;
  const ville = (formData.get("ville") as string)?.trim();
  const adresse_siege = (formData.get("adresse_siege") as string)?.trim() || null;

  if (!nom_entreprise || nom_entreprise.length < 2) {
    return { success: false, error: "Le nom de l'entreprise doit comporter au moins 2 caractères." };
  }

  if (!telephone_principal || telephone_principal.length < 6) {
    return { success: false, error: "Le numéro de téléphone principal est obligatoire." };
  }

  if (!ville || ville.length < 2) {
    return { success: false, error: "La ville du siège est obligatoire." };
  }

  await prisma.comptes.update({
    where: { id: session.compteId },
    data: {
      nom_entreprise,
      forme_juridique,
      ifu,
      rccm,
      telephone_principal,
      telephone_secondaire,
      ville,
      adresse_siege,
    },
  });

  // Journalisation d'audit
  await prisma.journal_audit.create({
    data: {
      compte_id: session.compteId,
      utilisateur_id: session.userId,
      action: "modification_entreprise",
      entite_concernee: "comptes",
      entite_id: session.compteId,
      details: {
        nom_entreprise,
        forme_juridique,
        ifu,
        rccm,
        ville,
      },
    },
  });

  revalidatePath("/dashboard/parametres");
  return { success: true, message: "Informations de l'entreprise mises à jour avec succès." };
}

/**
 * Permet au Vendeur d'activer ou désactiver son 2FA TOTP optionnel.
 * Refuse formellement l'opération pour un Patron ou un Gérant (2FA obligatoire, règle 2).
 */
export async function basculer2FAVendeurAction(formData: FormData): Promise<ActionResponse> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Non authentifié." };
  }

  if (session.role === "patron" || session.role === "gerant") {
    return {
      success: false,
      error: "La double authentification (2FA) est obligatoire pour votre rôle et ne peut être désactivée.",
    };
  }

  const active = formData.get("active") === "true";

  await prisma.utilisateurs.update({
    where: { id: session.userId },
    data: {
      deux_fa_active: active,
    },
  });

  revalidatePath("/dashboard/parametres");
  return {
    success: true,
    message: active
      ? "Double authentification activée pour votre compte."
      : "Double authentification désactivée.",
  };
}

/**
 * Modifie les coordonnées de la boutique (Patron ou Gérant sur sa propre boutique).
 */
export async function modifierParametresBoutiqueAction(formData: FormData): Promise<ActionResponse> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Non authentifié." };
  }

  const boutiqueId = formData.get("boutiqueId") as string;
  const nom = (formData.get("nom") as string)?.trim();
  const ville = (formData.get("ville") as string)?.trim();
  const adresse = (formData.get("adresse") as string)?.trim();
  const telephone = (formData.get("telephone") as string)?.trim() || null;
  const secteurActivite = (formData.get("secteurActivite") as string)?.trim() || "Commerce général";

  if (!boutiqueId) {
    return { success: false, error: "Identifiant de boutique manquant." };
  }

  if (!nom || !ville || !adresse) {
    return { success: false, error: "Le nom, la ville et l'adresse sont obligatoires." };
  }

  // Vérification des droits : Seul le Patron peut modifier les coordonnées d'une boutique (Règle 2)
  if (session.role !== "patron") {
    return { success: false, error: "Seul le Patron a l'autorisation de modifier les coordonnées d'une boutique." };
  }

  const boutique = await prisma.boutiques.findFirst({
    where: {
      id: boutiqueId,
      compte_id: session.compteId,
    },
  });

  if (!boutique) {
    return { success: false, error: "Boutique introuvable." };
  }

  await prisma.boutiques.update({
    where: { id: boutiqueId },
    data: {
      nom,
      ville,
      adresse,
      telephone,
      secteur_activite: secteurActivite,
    },
  });

  revalidatePath("/dashboard/parametres");
  revalidatePath("/dashboard/boutiques");
  return { success: true, message: "Coordonnées de la boutique mises à jour avec succès." };
}
