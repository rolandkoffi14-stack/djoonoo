import React from "react";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ParametresClient from "@/components/dashboard/parametres/ParametresClient";

export const dynamic = "force-dynamic";

export default async function DashboardParametresPage() {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/connexion");
  }

  // 1. Récupérer l'utilisateur connecté
  const user = await prisma.utilisateurs.findUnique({
    where: { id: session.userId },
  });

  if (!user) {
    redirect("/connexion");
  }

  // 2. Récupérer le compte de l'entreprise
  const compte = await prisma.comptes.findUnique({
    where: { id: session.compteId },
  });

  if (!compte) {
    redirect("/connexion");
  }

  // 3. Récupérer la ou les boutiques selon le rôle
  const boutiques = await prisma.boutiques.findMany({
    where:
      session.role === "patron"
        ? { compte_id: session.compteId, statut: "actif" }
        : { id: user.boutique_id || undefined, statut: "actif" },
    orderBy: { code: "asc" },
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2B2119]">
          Paramètres du compte
        </h1>
        <p className="text-sm text-neutral-600 mt-1">
          Gère tes informations personnelles, la sécurité de ta session et les préférences de ton point de vente.
        </p>
      </div>

      <ParametresClient
        user={{
          id: user.id,
          nom: user.nom,
          email: user.email,
          telephone: user.telephone,
          role: user.role,
          deux_fa_active: user.deux_fa_active,
          boutique_id: user.boutique_id,
        }}
        entreprise={{
          nom_entreprise: compte.nom_entreprise,
          forme_juridique: compte.forme_juridique,
          ifu: compte.ifu,
          rccm: compte.rccm,
          telephone_principal: compte.telephone_principal,
          telephone_secondaire: compte.telephone_secondaire,
          ville: compte.ville,
          adresse_siege: compte.adresse_siege,
          code: compte.code,
        }}
        boutiques={boutiques.map((b) => ({
          id: b.id,
          code: b.code,
          nom: b.nom,
          ville: b.ville,
          adresse: b.adresse,
          telephone: b.telephone,
          secteur_activite: b.secteur_activite,
          statut: b.statut,
        }))}
      />
    </div>
  );
}
