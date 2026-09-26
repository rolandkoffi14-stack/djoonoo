import React from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCurrentSession } from "@/lib/auth";
import { getScopedPrisma } from "@/lib/prisma";
import CaissePOS, { ProduitCaisse, ClientCaisse, BoutiqueInfo } from "@/components/dashboard/CaissePOS";
import { AlertTriangle, Store } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "djoonoo — Caisse POS & Terminal d'Encaissement",
  description: "Enregistrement rapide des ventes, encaissement et impression des reçus",
};

export default async function CaissePage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/connexion");
  }

  const scoped = getScopedPrisma(session.compteId);

  // 1. Résolution des boutiques accessibles
  let boutiques: {
    id: string;
    code: string;
    nom: string;
    ville: string;
    adresse: string;
    telephone: string | null;
    statut: string;
  }[] = [];

  if (session.role === "patron") {
    boutiques = await scoped.boutiques.findMany({
      where: { compte_id: session.compteId },
      orderBy: { code: "asc" },
      select: {
        id: true,
        code: true,
        nom: true,
        ville: true,
        adresse: true,
        telephone: true,
        statut: true,
      },
    });
  } else if (session.boutiqueId) {
    const b = await scoped.boutiques.findUnique({
      where: { id: session.boutiqueId },
      select: {
        id: true,
        code: true,
        nom: true,
        ville: true,
        adresse: true,
        telephone: true,
        statut: true,
      },
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

  // Règle 8 bis : Si la boutique est inactive, bloquer la caisse
  if (activeBoutique.statut === "inactif") {
    return (
      <div className="bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl p-8 max-w-xl mx-auto text-center space-y-4 shadow-sm mt-8">
        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-extrabold text-[#2B2119]">
          Caisse inaccessible : Boutique désactivée
        </h2>
        <p className="text-xs text-[#6D5D52]">
          La boutique <span className="font-bold text-[#2B2119]">{activeBoutique.nom} ({activeBoutique.code})</span> est actuellement marquée comme inactive. Conformément à la règle 8 bis, aucune nouvelle vente ne peut y être enregistrée.
        </p>
        {session.role === "patron" && (
          <div className="pt-2">
            <Link
              href="/dashboard/boutiques"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#C1652D] text-[#FAF6F1] text-xs font-bold hover:bg-[#a95524] transition-colors"
            >
              <Store className="w-4 h-4" />
              <span>Gérer mes boutiques</span>
            </Link>
          </div>
        )}
      </div>
    );
  }

  // 3. Récupération des produits de la boutique active
  const produitsDb = await scoped.produits.findMany({
    where: {
      compte_id: session.compteId,
      boutique_id: activeBoutique.id,
    },
    orderBy: { nom: "asc" },
    select: {
      id: true,
      nom: true,
      prix_unitaire: true,
      quantite_stock: true,
      seuil_alerte: true,
    },
  });

  const produits: ProduitCaisse[] = produitsDb.map((p) => ({
    id: p.id,
    nom: p.nom,
    prix_unitaire: p.prix_unitaire,
    quantite_stock: p.quantite_stock,
    seuil_alerte: p.seuil_alerte,
  }));

  // 4. Récupération des clients du compte
  const clientsDb = await scoped.clients.findMany({
    where: { compte_id: session.compteId },
    orderBy: { nom: "asc" },
    select: {
      id: true,
      nom: true,
      telephone: true,
    },
  });

  const clients: ClientCaisse[] = clientsDb.map((c) => ({
    id: c.id,
    nom: c.nom,
    telephone: c.telephone,
  }));

  return (
    <CaissePOS
      boutique={activeBoutique}
      produitsInitiaux={produits}
      clientsInitiaux={clients}
      vendeurNom={session.nom}
      userRole={session.role}
    />
  );
}
