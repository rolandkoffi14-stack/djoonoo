import { PrismaClient, Prisma, StatutPaiementVente } from "@prisma/client";

export class StockInsuffisantError extends Error {
  constructor(public produitId: string) {
    super(`Stock insuffisant pour le produit ${produitId}`);
    this.name = "StockInsuffisantError";
  }
}

export class VenteNonAnnulableError extends Error {
  constructor(message: string = "Seules les ventes impayées peuvent être annulées. Remboursement non pris en charge au MVP.") {
    super(message);
    this.name = "VenteNonAnnulableError";
  }
}

/**
 * Règle 1 — Décrémentation de stock atomique (Section 4)
 */
export async function decrementerStockAtomique(
  tx: Prisma.TransactionClient,
  produitId: string,
  quantiteVendue: number
): Promise<number> {
  const result = await tx.$queryRaw<{ quantite_stock: number }[]>`
    UPDATE produits
    SET quantite_stock = quantite_stock - ${quantiteVendue}
    WHERE id = ${produitId} AND quantite_stock >= ${quantiteVendue}
    RETURNING quantite_stock
  `;

  if (!result || result.length === 0) {
    throw new StockInsuffisantError(produitId);
  }

  return result[0].quantite_stock;
}

/**
 * Règle 8 — Génération de comptes.code (Section 4)
 * 3 lettres extraites de nom_entreprise, retry en cas de collision d'unicité (P2002).
 */
export function extraireCodeBase(nomEntreprise: string): string {
  const nettoye = nomEntreprise
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");

  if (nettoye.length >= 3) {
    return nettoye.slice(0, 3);
  }
  return (nettoye + "XXX").slice(0, 3);
}

/**
 * Règle 8 bis — Génération séquentielle de boutiques.code par compte (Section 4, Décision A4)
 * Utilise la table compteur_boutique de manière atomique.
 */
export async function genererCodeBoutique(
  tx: Prisma.TransactionClient,
  compteId: string
): Promise<string> {
  const [{ dernier_numero }] = await tx.$queryRaw<{ dernier_numero: number }[]>`
    INSERT INTO compteur_boutique (compte_id, dernier_numero)
    VALUES (${compteId}, 1)
    ON CONFLICT (compte_id)
    DO UPDATE SET dernier_numero = compteur_boutique.dernier_numero + 1
    RETURNING dernier_numero
  `;

  return `B${String(dernier_numero).padStart(2, "0")}`; // B01, B02...
}

/**
 * Règle 7 — Numérotation des factures séquentielle par boutique et année (Section 4)
 * Format : FAC-{code_compte}-{code_boutique}-{annee}-{XXXXX}
 */
export async function genererNumeroFacture(
  tx: Prisma.TransactionClient,
  boutiqueId: string,
  codeCompte: string,
  codeBoutique: string,
  anneeCourante: number = new Date().getFullYear()
): Promise<string> {
  const [{ dernier_numero }] = await tx.$queryRaw<{ dernier_numero: number }[]>`
    INSERT INTO compteurs_facture (id, boutique_id, annee, dernier_numero)
    VALUES (gen_random_uuid(), ${boutiqueId}, ${anneeCourante}, 1)
    ON CONFLICT (boutique_id, annee)
    DO UPDATE SET dernier_numero = compteurs_facture.dernier_numero + 1
    RETURNING dernier_numero
  `;

  const numeroSequence = String(dernier_numero).padStart(5, "0");
  return `FAC-${codeCompte}-${codeBoutique}-${anneeCourante}-${numeroSequence}`;
}

/**
 * Règle 9 — Montant total calculé automatiquement (Section 4, Décision A3)
 * Jamais accepté en entrée d'une requête client.
 */
export function calculerMontantTotal(
  lignes: { quantite: number; prix_unitaire: number }[],
  montantRemise: number = 0
): number {
  const sousTotal = lignes.reduce((acc, l) => acc + l.quantite * l.prix_unitaire, 0);
  const total = sousTotal - Math.max(0, montantRemise);
  return Math.max(0, total);
}

/**
 * Règle 4 — Statut de paiement dérivé automatiquement (Section 4, Décision 1)
 * Géré par transaction applicative.
 */
export async function determinerStatutPaiement(
  tx: Prisma.TransactionClient,
  venteId: string,
  montantTotal: number
): Promise<StatutPaiementVente> {
  const aggregat = await tx.paiements.aggregate({
    where: { vente_id: venteId },
    _sum: { montant: true },
  });

  const totalPaye = aggregat._sum.montant || 0;

  if (totalPaye >= montantTotal) {
    return "paye";
  } else if (totalPaye > 0) {
    return "partiel";
  } else {
    return "impaye";
  }
}

/**
 * Règle 10 — Annulation d'une vente non payée avec restauration atomique de stock (Section 4, Décision A1)
 */
export async function annulerVenteEtRestaurerStock(
  tx: Prisma.TransactionClient,
  venteId: string,
  annuleeParUtilisateurId: string,
  compteId: string
) {
  const vente = await tx.ventes.findFirst({
    where: { id: venteId, compte_id: compteId },
    include: {
      lignes_vente: true,
    },
  });

  if (!vente) {
    throw new Error("Vente introuvable");
  }

  if (vente.statut_paiement !== "impaye") {
    throw new VenteNonAnnulableError();
  }

  if (vente.statut_vente === "annulee") {
    throw new Error("Cette vente est déjà annulée");
  }

  // 1. Restauration atomique du stock
  for (const ligne of vente.lignes_vente) {
    await tx.$queryRaw`
      UPDATE produits
      SET quantite_stock = quantite_stock + ${ligne.quantite}
      WHERE id = ${ligne.produit_id}
    `;
  }

  // 2. Mise à jour de la vente
  const venteAnnulee = await tx.ventes.update({
    where: { id: venteId },
    data: {
      statut_vente: "annulee",
      annulee_par: annuleeParUtilisateurId,
      date_annulation: new Date(),
    },
  });

  // 3. Entrée dans le journal d'audit
  await tx.journal_audit.create({
    data: {
      compte_id: compteId,
      utilisateur_id: annuleeParUtilisateurId,
      action: "annulation_vente",
      entite_concernee: "ventes",
      entite_id: venteId,
      details: {
        numero_facture: vente.numero_facture,
        montant_total: vente.montant_total,
        lignes_restaurees: vente.lignes_vente.length,
      },
    },
  });

  return venteAnnulee;
}

/**
 * Aide à la consignation dans le journal d'audit (Section 7)
 */
export async function enregistrerAudit(
  tx: Prisma.TransactionClient,
  donnees: {
    compte_id: string;
    utilisateur_id: string;
    action: string;
    entite_concernee: string;
    entite_id: string;
    details?: Prisma.InputJsonValue;
  }
) {
  return tx.journal_audit.create({
    data: donnees,
  });
}

/**
 * Génération automatique d'un code SKU séquentiel unique par boutique (ex: SKU-B01-0001)
 */
export async function genererCodeSKU(
  tx: any,
  boutiqueId: string,
  boutiqueCode: string
): Promise<string> {
  const totalProduits = await tx.produits.count({
    where: { boutique_id: boutiqueId },
  });
  const seq = (totalProduits + 1).toString().padStart(4, "0");
  let candidate = `SKU-${boutiqueCode}-${seq}`;

  let existant = await tx.produits.findFirst({
    where: { boutique_id: boutiqueId, code_barre: candidate },
  });
  let offset = 1;
  while (existant) {
    const nextSeq = (totalProduits + 1 + offset).toString().padStart(4, "0");
    candidate = `SKU-${boutiqueCode}-${nextSeq}`;
    existant = await tx.produits.findFirst({
      where: { boutique_id: boutiqueId, code_barre: candidate },
    });
    offset++;
  }

  return candidate;
}

