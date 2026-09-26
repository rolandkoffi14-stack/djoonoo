import React from "react";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { prisma, getScopedPrisma } from "@/lib/prisma";
import EquipeManager, { EmployeItem, BoutiqueOption } from "@/components/dashboard/EquipeManager";

export const metadata = {
  title: "djoonoo — Équipe & Collaborateurs",
  description: "Gestion des employés, rôles et accès aux boutiques",
};

export default async function EquipePage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/connexion");
  }

  // Patron et Gérant ont accès à l'équipe
  if (session.role !== "patron" && session.role !== "gerant") {
    redirect("/dashboard");
  }

  const scoped = getScopedPrisma(session.compteId);

  // 1. Récupération du compte et du forfait
  const compte = await prisma.comptes.findUnique({
    where: { id: session.compteId },
    include: { forfait: true },
  });

  if (!compte) {
    redirect("/connexion");
  }

  // 2. Boutiques accessibles
  let boutiquesData: { id: string; code: string; nom: string }[] = [];

  if (session.role === "patron") {
    boutiquesData = await scoped.boutiques.findMany({
      where: { compte_id: session.compteId, statut: "actif" },
      orderBy: { code: "asc" },
      select: { id: true, code: true, nom: true },
    });
  } else {
    // Le gérant ne voit que sa boutique
    if (session.boutiqueId) {
      const b = await scoped.boutiques.findUnique({
        where: { id: session.boutiqueId },
        select: { id: true, code: true, nom: true },
      });
      if (b) boutiquesData = [b];
    }
  }

  // 3. Récupération des collaborateurs
  const whereClause: any = { compte_id: session.compteId };
  if (session.role === "gerant" && session.boutiqueId) {
    whereClause.boutique_id = session.boutiqueId;
  }

  const employesData = await scoped.utilisateurs.findMany({
    where: whereClause,
    orderBy: [
      { role: "asc" },
      { date_creation: "desc" },
    ],
    include: {
      boutique: {
        select: { id: true, code: true, nom: true },
      },
    },
  });

  const formattedEmployes: EmployeItem[] = employesData.map((u) => ({
    id: u.id,
    nom: u.nom,
    email: u.email,
    telephone: u.telephone,
    role: u.role,
    deux_fa_active: u.deux_fa_active,
    statut: u.statut,
    boutique: u.boutique,
    date_creation: u.date_creation.toISOString(),
  }));

  const formattedBoutiques: BoutiqueOption[] = boutiquesData.map((b) => ({
    id: b.id,
    code: b.code,
    nom: b.nom,
  }));

  return (
    <div className="max-w-6xl mx-auto">
      <EquipeManager
        employes={formattedEmployes}
        boutiques={formattedBoutiques}
        userRole={session.role}
        currentUserId={session.userId}
        forfait={{
          nom: compte.forfait.nom,
          max_employes_par_boutique: compte.forfait.max_employes_par_boutique,
        }}
      />
    </div>
  );
}
