import { z } from "zod";

/**
 * Schémas de validation déclarative stricte (Phase 5 - Item 4.1 de l'audit)
 * Prévient les erreurs de type, les dépassements et la falsification de montants (CWE-20).
 */

export const LigneVenteInputSchema = z.object({
  produit_id: z.string().min(1, "L'identifiant du produit est obligatoire"),
  quantite: z
    .number()
    .int("La quantité doit être un entier")
    .positive("La quantité doit être strictement positive"),
  prix_unitaire: z
    .number()
    .int("Le prix unitaire doit être un entier")
    .nonnegative("Le prix unitaire ne peut pas être négatif")
    .optional(),
  imei1: z.string().trim().nullable().optional(),
  imei2: z.string().trim().nullable().optional(),
});

export const VenteInputSchema = z.object({
  boutique_id: z.string().min(1, "L'identifiant de la boutique est obligatoire"),
  client_id: z.string().nullable().optional(),
  montant_remise: z
    .number()
    .int("La remise doit être un nombre entier")
    .min(0, "La remise ne peut pas être négative"),
  mode_paiement: z
    .enum(["especes", "mtn_momo", "moov_money"])
    .default("especes"),
  montant_recu: z.number().int().min(0).optional(),
  lignes: z
    .array(LigneVenteInputSchema)
    .min(1, "Une vente doit comporter au moins un article"),
});

export const ProduitInputSchema = z.object({
  nom: z
    .string()
    .trim()
    .min(2, "Le nom du produit doit comporter au moins 2 caractères")
    .max(200, "Le nom du produit ne peut pas dépasser 200 caractères"),
  boutique_id: z.string().min(1, "L'identifiant de la boutique est obligatoire"),
  prix_unitaire: z
    .number()
    .int("Le prix doit être un nombre entier")
    .positive("Le prix unitaire doit être strictement positif"),
  quantite_stock: z
    .number()
    .int("Le stock doit être un entier")
    .min(0, "Le stock ne peut pas être négatif"),
  seuil_alerte: z
    .number()
    .int("Le seuil d'alerte doit être un entier")
    .min(0, "Le seuil d'alerte ne peut pas être négatif"),
  code_barre: z.string().trim().optional(),
});

export const BoutiqueInputSchema = z.object({
  nom: z
    .string()
    .trim()
    .min(2, "Le nom de la boutique doit comporter au moins 2 caractères"),
  secteur_activite: z
    .string()
    .trim()
    .min(2, "Le secteur d'activité doit comporter au moins 2 caractères"),
  adresse: z
    .string()
    .trim()
    .min(2, "L'adresse doit comporter au moins 2 caractères"),
  ville: z
    .string()
    .trim()
    .min(2, "La ville doit comporter au moins 2 caractères"),
  telephone: z.string().trim().optional(),
});

export const AuthLoginSchema = z.object({
  email: z.string().trim().email("Adresse email invalide"),
  mot_de_passe: z
    .string()
    .min(6, "Le mot de passe doit comporter au moins 6 caractères"),
});

export const Auth2FASchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Le code 2FA doit être composé exactement de 6 chiffres"),
});

export const MotDePasseFortSchema = z
  .string()
  .min(8, "Le mot de passe doit comporter au moins 8 caractères.")
  .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une lettre majuscule.")
  .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre.")
  .regex(/[^a-zA-Z0-9]/, "Le mot de passe doit contenir au moins un caractère spécial.");
