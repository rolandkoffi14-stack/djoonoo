import React from "react";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { prisma, getScopedPrisma } from "@/lib/prisma";
import BoutiquesManager, { BoutiqueItem } from "@/components/dashboard/BoutiquesManager";

export const metadata = {
  title: "djoonoo — Mes Boutiques",
  description: "Gestion des boutiques et points de vente djoonoo",
};

export default async function BoutiquesPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/connexion");
  }

  // Seul le patron gère la liste et la configuration des boutiques
  if (session.role !== "patron") {
    redirect("/dashboard");
  }

  const scoped = getScopedPrisma(session.compteId);

  // 1. Récupération du compte et de son forfait
  const compte = await prisma.comptes.findUnique({
    where: { id: session.compteId },
    include: { forfait: true },
  });

  if (!compte) {
    redirect("/connexion");
  }

  // 2. Récupération des boutiques du compte
  const boutiquesData = await scoped.boutiques.findMany({
    where: { compte_id: session.compteId },
    orderBy: { code: "asc" },
    include: {
      historique_affectations: {
        where: { date_fin: null },
        select: { id: true },
      },
    },
  });

  // 3. Prochain code séquentiel via compteur_boutique (Règle 8 bis)
  const compteur = await prisma.compteur_boutique.findUnique({
    where: { compte_id: session.compteId },
  });
  const prochainNumero = (compteur?.dernier_numero || boutiquesData.length) + 1;
  const prochainCode = `B${String(prochainNumero).padStart(2, "0")}`;

  const formattedBoutiques: BoutiqueItem[] = boutiquesData.map((b) => ({
    id: b.id,
    code: b.code,
    nom: b.nom,
    secteur_activite: b.secteur_activite,
    adresse: b.adresse,
    ville: b.ville,
    telephone: b.telephone,
    statut: b.statut,
    nbEmployes: b.historique_affectations.length,
    date_creation: b.date_creation.toISOString(),
  }));

  return (
    <div className="max-w-6xl mx-auto">
      <BoutiquesManager
        boutiques={formattedBoutiques}
        forfait={{
          nom: compte.forfait.nom,
          max_boutiques: compte.forfait.max_boutiques,
        }}
        prochainCode={prochainCode}
      />
    </div>
  );
}
