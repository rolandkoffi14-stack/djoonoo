import crypto from "crypto";
import { prisma } from "./prisma";
import { StatutAbonnement, StatutFactureAbonnement } from "@prisma/client";

const FEDAPAY_SECRET_KEY = process.env.FEDAPAY_SECRET_KEY || "";
const FEDAPAY_WEBHOOK_SECRET = process.env.FEDAPAY_WEBHOOK_SECRET || "";
const FEDAPAY_ENVIRONMENT = process.env.FEDAPAY_ENVIRONMENT || "sandbox";

const BASE_URL =
  FEDAPAY_ENVIRONMENT === "live"
    ? "https://api.fedapay.com/v1"
    : "https://sandbox-api.fedapay.com/v1";

export interface InitPaiementParams {
  compteId: string;
  forfaitId: string;
  montant: number;
  email: string;
  nom: string;
  telephone: string;
  callbackUrl: string;
}

/**
 * Initialise une transaction FedaPay et génère l'URL du guichet de paiement
 */
export async function creerTransactionFedaPay(params: InitPaiementParams) {
  if (!FEDAPAY_SECRET_KEY) {
    throw new Error("Clé secrète FedaPay (FEDAPAY_SECRET_KEY) non configurée.");
  }

  // 1. Récupérer le forfait
  const forfait = await prisma.forfaits.findUnique({
    where: { id: params.forfaitId },
  });
  if (!forfait) {
    throw new Error("Forfait introuvable.");
  }

  // 2. Créer une facture en attente
  const echeance = new Date();
  echeance.setDate(echeance.getDate() + 1); // 24h pour payer la transaction initiée

  const facture = await prisma.factures_abonnement.create({
    data: {
      compte_id: params.compteId,
      montant: params.montant,
      statut: StatutFactureAbonnement.en_attente,
      fournisseur_paiement: "fedapay",
      date_echeance: echeance,
    },
  });

  // 3. Appel API FedaPay pour créer la transaction
  const resp = await fetch(`${BASE_URL}/transactions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${FEDAPAY_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      description: `Abonnement djoonoo — Forfait ${forfait.nom}`,
      amount: params.montant,
      currency: { iso: "XOF" },
      callback_url: params.callbackUrl,
      customer: {
        firstname: params.nom.split(" ")[0] || "Client",
        lastname: params.nom.split(" ").slice(1).join(" ") || "djoonoo",
        email: params.email,
        phone_number: {
          number: params.telephone.replace(/[^0-9]/g, ""),
          country: "BJ",
        },
      },
      custom_metadata: {
        compte_id: params.compteId,
        facture_id: facture.id,
        forfait_id: forfait.id,
      },
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error("Erreur création transaction FedaPay :", errText);
    throw new Error("Impossible de créer la transaction chez le prestataire de paiement.");
  }

  const txData = await resp.json();
  const transactionId = txData.v1?.id || txData.id;

  // 4. Générer le token / lien de paiement
  const tokenResp = await fetch(`${BASE_URL}/transactions/${transactionId}/token`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${FEDAPAY_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
  });

  if (!tokenResp.ok) {
    const errToken = await tokenResp.text();
    console.error("Erreur génération token FedaPay :", errToken);
    throw new Error("Impossible de générer le guichet de paiement.");
  }

  const tokenData = await tokenResp.json();
  const paymentUrl = tokenData.url;

  // Mise à jour de la référence externe sur la facture
  await prisma.factures_abonnement.update({
    where: { id: facture.id },
    data: { reference_externe: String(transactionId) },
  });

  return {
    urlPaiement: paymentUrl,
    transactionId: transactionId,
    factureId: facture.id,
  };
}

/**
 * Vérifie la signature cryptographique du Webhook FedaPay
 * Format attendu: "t=123456789,s=abcdef..." ou signature brute
 */
export function verifierSignatureFedaPay(
  rawBody: string,
  signatureHeader: string,
  secret: string = FEDAPAY_WEBHOOK_SECRET
): boolean {
  if (!signatureHeader || !secret) return false;

  try {
    let timestamp = 0;
    let signature = "";

    if (signatureHeader.includes("t=") && signatureHeader.includes("s=")) {
      const parts = signatureHeader.split(",");
      for (const p of parts) {
        const [k, v] = p.trim().split("=");
        if (k === "t") timestamp = parseInt(v, 10);
        if (k === "s") signature = v;
      }
    } else {
      // Fallback signature directe sans timestamp
      signature = signatureHeader;
    }

    // Vérification anti-rejeu si timestamp présent (tolérance 300s)
    if (timestamp > 0) {
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - timestamp) > 300) {
        console.warn("[FedaPay Webhook] Horodatage rejeté (rejeu suspect) :", { timestamp, now });
        return false;
      }
    }

    const toSign = timestamp > 0 ? `${timestamp}.${rawBody}` : rawBody;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(toSign)
      .digest("hex");

    if (signature.length !== expectedSignature.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex")
    );
  } catch (err) {
    console.error("[FedaPay Webhook] Erreur vérification signature :", err);
    return false;
  }
}

/**
 * Traitement atomique d'un événement webhook FedaPay approuvé
 */
export async function traiterWebhookFedaPay(payload: any) {
  const eventName = payload.name;
  const entity = payload.entity;

  if (!eventName || !entity) {
    return { succes: false, message: "Payload invalide." };
  }

  if (eventName !== "transaction.approved") {
    return { succes: true, message: `Événement ${eventName} ignoré.` };
  }

  const transactionId = String(entity.id);
  const customMetadata = entity.custom_metadata || {};
  const factureId = customMetadata.facture_id;
  const compteId = customMetadata.compte_id;
  const forfaitId = customMetadata.forfait_id;

  // Idempotence : vérifier si la transaction ou la facture a déjà été validée
  const facture = await prisma.factures_abonnement.findFirst({
    where: {
      OR: [
        ...(factureId ? [{ id: factureId }] : []),
        { reference_externe: transactionId },
        { cle_idempotence: `fedapay_${transactionId}` },
      ],
    },
    include: { compte: { include: { forfait: true } } },
  });

  if (!facture) {
    console.error("[FedaPay Webhook] Aucune facture trouvée pour la transaction :", transactionId);
    return { succes: false, message: "Facture introuvable." };
  }

  if (facture.statut === StatutFactureAbonnement.payee) {
    // Déjà traité, réponse idempotente 200
    return { succes: true, message: "Transaction déjà validée." };
  }

  const targetForfaitId = forfaitId || facture.compte.forfait_id;
  const forfait = await prisma.forfaits.findUnique({
    where: { id: targetForfaitId },
  });
  const dureeJours = forfait?.duree_jours || 30;

  const maintenant = new Date();
  const dateFin = new Date(maintenant);
  dateFin.setDate(dateFin.getDate() + dureeJours);

  // Transaction atomique PostgreSQL
  await prisma.$transaction(async (tx) => {
    // 1. Mettre à jour la facture d'abonnement
    await tx.factures_abonnement.update({
      where: { id: facture.id },
      data: {
        statut: StatutFactureAbonnement.payee,
        reference_externe: transactionId,
        cle_idempotence: `fedapay_${transactionId}`,
        date_confirmation: maintenant,
      },
    });

    // 2. Activer / renouveler le compte
    await tx.comptes.update({
      where: { id: facture.compte_id },
      data: {
        statut_abonnement: StatutAbonnement.actif,
        forfait_id: targetForfaitId,
        date_debut_periode_courante: maintenant,
        date_fin_periode_courante: dateFin,
      },
    });

    // 3. Journaliser l'encaissement automatique
    await tx.journal_audit.create({
      data: {
        compte_id: facture.compte_id,
        utilisateur_id: facture.compte_id, // Identifiant système
        action: "paiement_abonnement_fedapay",
        entite_concernee: "abonnements",
        entite_id: facture.id,
        details: {
          montant: facture.montant,
          transaction_id: transactionId,
          forfait_nom: forfait?.nom,
          duree_jours: dureeJours,
          nouvelle_echeance: dateFin.toISOString(),
        },
      },
    });
  });

  console.log(`✅ [FedaPay] Compte ${facture.compte_id} activé/renouvelé avec succès jusqu'au ${dateFin.toLocaleDateString()}`);
  return { succes: true, message: "Abonnement activé avec succès.", compteId: facture.compte_id };
}
