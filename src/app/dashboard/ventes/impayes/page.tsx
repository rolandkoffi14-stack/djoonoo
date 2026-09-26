import React from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCurrentSession } from "@/lib/auth";
import { getScopedPrisma } from "@/lib/prisma";
import ImpayesManager, { ImpayeItem } from "@/components/dashboard/ImpayesManager";

export const metadata = {
  title: "djoonoo — Suivi des Impayés & Créances",
  description: "Suivi des dettes clients, encaissement des règlements et annulation des ventes impayées",
};

export default async function ImpayesPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/connexion");
  }

  const scoped = getScopedPrisma(session.compteId);

  // 1. Boutiques accessibles
  let boutiques: { id: string; code: string; nom: string }[] = [];

  if (session.role === "patron") {
    boutiques = await scoped.boutiques.findMany({
      where: { compte_id: session.compteId },
      orderBy: { code: "asc" },
      select: { id: true, code: true, nom: true },
    });
  } else if (session.boutiqueId) {
    const b = await scoped.boutiques.findUnique({
      where: { id: session.boutiqueId },
      select: { id: true, code: true, nom: true },
    });
    if (b) boutiques = [b];
  }

  if (boutiques.length === 0) {
    redirect("/dashboard/boutiques");
  }

  // 2. Boutique active
  const cookieStore = await cookies();
  const activeBoutiqueCookie = cookieStore.get("djoonoo_active_boutique")?.value;

  let activeBoutique =
    boutiques.find((b) => b.id === activeBoutiqueCookie) ||
    boutiques.find((b) => b.id === session.boutiqueId) ||
    boutiques[0];

  if (session.role !== "patron" && session.boutiqueId) {
    activeBoutique = boutiques[0];
  }

  // 3. Condition de filtre selon le rôle (Section 2) :
  // Le Vendeur ne voit que ses propres impayés ; le Patron et le Gérant voient toute la boutique
  const whereCondition: any = {
    compte_id: session.compteId,
    boutique_id: activeBoutique.id,
    statut_paiement: { in: ["impaye", "partiel"] },
    statut_vente: "validee",
  };

  if (session.role === "vendeur") {
    whereCondition.utilisateur_id = session.userId;
  }

  // 4. Récupération des ventes impayées ou partielles
  const impayesDb = await scoped.ventes.findMany({
    where: whereCondition,
    orderBy: { date_vente: "desc" },
    include: {
      boutique: { select: { id: true, code: true, nom: true } },
      utilisateur: { select: { id: true, nom: true } },
      client: { select: { id: true, nom: true, telephone: true } },
      paiements: {
        select: { id: true, montant: true, mode_paiement: true, date_paiement: true },
        orderBy: { date_paiement: "asc" },
      },
      lignes_vente: {
        select: {
          id: true,
          quantite: true,
          prix_unitaire_a_la_vente: true,
          produit: { select: { nom: true } },
        },
      },
    },
  });

  const impayes: ImpayeItem[] = impayesDb.map((v) => ({
    id: v.id,
    numero_facture: v.numero_facture,
    date_vente: v.date_vente.toISOString(),
    montant_total: v.montant_total,
    montant_remise: v.montant_remise,
    statut_paiement: v.statut_paiement,
    statut_vente: v.statut_vente,
    boutique: v.boutique,
    utilisateur: v.utilisateur,
    client: v.client,
    paiements: v.paiements.map((p) => ({
      id: p.id,
      montant: p.montant,
      mode_paiement: p.mode_paiement,
      date_paiement: p.date_paiement.toISOString(),
    })),
    lignes_vente: v.lignes_vente.map((l) => ({
      id: l.id,
      produit_nom: l.produit.nom,
      quantite: l.quantite,
      prix_unitaire: l.prix_unitaire_a_la_vente,
    })),
  }));

  return (
    <ImpayesManager
      impayes={impayes}
      boutiqueNom={activeBoutique.nom}
      boutiqueCode={activeBoutique.code}
      userRole={session.role}
    />
  );
}
