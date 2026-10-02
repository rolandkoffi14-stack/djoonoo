import React from "react";
import Link from "next/link";
import { getCurrentSession } from "@/lib/auth";
import { prisma, getScopedPrisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  Store,
  TrendingUp,
  Package,
  AlertTriangle,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Users,
  Clock,
  ArrowUpRight,
} from "lucide-react";

export const metadata = {
  title: "djoonoo — Vue d'ensemble & Tableau de Bord",
  description: "Tableau de bord de pilotage des ventes, boutiques et indicateurs clés",
};

export default async function DashboardPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/connexion");
  }

  const scoped = getScopedPrisma(session.compteId);
  const cookieStore = await cookies();
  const activeBoutiqueCookie = cookieStore.get("djoonoo_active_boutique")?.value;

  const activeBoutique = await scoped.boutiques.findFirst({
    where: activeBoutiqueCookie
      ? { id: activeBoutiqueCookie, compte_id: session.compteId }
      : { compte_id: session.compteId },
    orderBy: { code: "asc" },
  });

  let alertesStockCount = 0;
  let ventesAujourdhuiTotal = 0;
  let nbVentesAujourdhui = 0;
  let totalImpayes = 0;
  let nbImpayes = 0;

  if (activeBoutique) {
    const [alertesRaw, ventesAujourdhuiAgg, ventesImpayees] = await Promise.all([
      // 1. Nombre de produits sous leur seuil d'alerte (SQL natif optimisé)
      prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(*)::int as count 
        FROM produits 
        WHERE compte_id = ${session.compteId} 
          AND boutique_id = ${activeBoutique.id} 
          AND quantite_stock <= seuil_alerte
      `,
      // 2. Chiffre d'affaires et nombre de ventes du jour (SQL direct)
      scoped.ventes.aggregate({
        where: {
          compte_id: session.compteId,
          boutique_id: activeBoutique.id,
          date_vente: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
          statut_vente: "validee",
        },
        _sum: { montant_total: true },
        _count: true,
      }),
      // 3. Échantillon borné des impayés pour le calcul du tableau de bord
      scoped.ventes.findMany({
        where: {
          compte_id: session.compteId,
          boutique_id: activeBoutique.id,
          statut_paiement: { in: ["impaye", "partiel"] },
          statut_vente: "validee",
        },
        select: {
          montant_total: true,
          paiements: { select: { montant: true } },
        },
        take: 50,
      }),
    ]);

    alertesStockCount = alertesRaw[0]?.count || 0;
    nbVentesAujourdhui = ventesAujourdhuiAgg._count || 0;
    ventesAujourdhuiTotal = ventesAujourdhuiAgg._sum.montant_total || 0;

    ventesImpayees.forEach((v) => {
      const paye = v.paiements.reduce((acc, p) => acc + p.montant, 0);
      if (v.montant_total > paye) {
        totalImpayes += v.montant_total - paye;
        nbImpayes++;
      }
    });
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Bannière de Bienvenue */}
      <div className="bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl p-6 sm:p-7 relative overflow-hidden shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#2B2119]">
              Bonjour, {session.nom}
            </h1>
            <p className="text-sm text-[#6D5D52] mt-1.5 max-w-xl">
              Bienvenue sur ton tableau de bord <strong>djoonoo</strong>. Retrouve en un coup d&apos;œil l&apos;activité de tes boutiques, ton stock et tes créances.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/caisse"
              className="px-4 py-2.5 rounded-xl bg-[#C1652D] text-[#FAF6F1] font-bold text-sm hover:bg-[#a95524] transition-colors flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Nouvelle vente</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Cartes KPIs Chiffres en FCFA */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {/* Ventes du jour */}
        <Link
          href="/dashboard/ventes"
          className="bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl p-5 shadow-sm hover:border-[#C1652D]/40 transition-all block group"
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#6D5D52] mb-3">
            <span>Ventes du jour</span>
            <div className="w-8 h-8 rounded-xl bg-[#C1652D]/10 text-[#C1652D] flex items-center justify-center group-hover:scale-105 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#2B2119] font-mono">
            {ventesAujourdhuiTotal.toLocaleString("fr-FR")}{" "}
            <span className="text-base font-sans text-[#6D5D52] font-semibold">FCFA</span>
          </div>
          <div className="text-xs text-[#8C7A6B] mt-2">
            {nbVentesAujourdhui} transaction{nbVentesAujourdhui > 1 ? "s" : ""} enregistrée{nbVentesAujourdhui > 1 ? "s" : ""} aujourd&apos;hui
          </div>
        </Link>

        {/* Alertes de stock */}
        <Link
          href="/dashboard/produits"
          className="bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl p-5 shadow-sm hover:border-orange-300 transition-all block group"
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#6D5D52] mb-3">
            <span>Alertes Stock</span>
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#2B2119] font-mono">
            {alertesStockCount}{" "}
            <span className="text-base font-sans text-[#6D5D52] font-semibold">
              article{alertesStockCount > 1 ? "s" : ""}
            </span>
          </div>
          <div className="text-xs text-[#8C7A6B] mt-2">
            {alertesStockCount === 0
              ? "Tous les stocks sont à un niveau optimal"
              : `${alertesStockCount} article(s) à surveiller ou réapprovisionner`}
          </div>
        </Link>

        {/* Impayés & Créances */}
        <Link
          href="/dashboard/ventes"
          className="bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl p-5 shadow-sm hover:border-red-300 transition-all block group"
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#6D5D52] mb-3">
            <span>Impayés à recouvrer</span>
            <div className="w-8 h-8 rounded-xl bg-red-100 text-red-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-red-700 font-mono">
            {totalImpayes.toLocaleString("fr-FR")}{" "}
            <span className="text-base font-sans text-red-600 font-semibold">FCFA</span>
          </div>
          <div className="text-xs text-[#8C7A6B] mt-2">
            {nbImpayes === 0
              ? "Aucun crédit client en attente"
              : `${nbImpayes} créance(s) client en cours`}
          </div>
        </Link>
      </div>

      {/* Raccourcis Métier Asymétriques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Gestion des Boutiques */}
        <Link
          href="/dashboard/boutiques"
          className="bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl p-6 shadow-sm hover:border-[#C1652D]/40 transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#C1652D]/10 text-[#C1652D] flex items-center justify-center">
              <Store className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-[#8C7A6B] group-hover:text-[#C1652D] transition-colors" />
          </div>
          <h3 className="font-extrabold text-base text-[#2B2119] mb-1">
            Mes Boutiques
          </h3>
          <p className="text-xs text-[#6D5D52] leading-relaxed">
            Consulte tes points de vente, crée de nouvelles boutiques et gère leur statut actif/inactif.
          </p>
        </Link>

        {/* Gestion de l'Équipe */}
        <Link
          href="/dashboard/equipe"
          className="bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl p-6 shadow-sm hover:border-[#C1652D]/40 transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#C1652D]/10 text-[#C1652D] flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-[#8C7A6B] group-hover:text-[#C1652D] transition-colors" />
          </div>
          <h3 className="font-extrabold text-base text-[#2B2119] mb-1">
            Équipe & Collaborateurs
          </h3>
          <p className="text-xs text-[#6D5D52] leading-relaxed">
            Invite tes gérants et vendeurs, affecte-les à une boutique et sécurise leurs accès par 2FA.
          </p>
        </Link>

        {/* Caisse POS */}
        <Link
          href="/dashboard/caisse"
          className="bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl p-6 shadow-sm hover:border-[#C1652D]/40 transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#C1652D]/10 text-[#C1652D] flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-[#8C7A6B] group-hover:text-[#C1652D] transition-colors" />
          </div>
          <h3 className="font-extrabold text-base text-[#2B2119] mb-1">
            Caisse Enregistreuse
          </h3>
          <p className="text-xs text-[#6D5D52] leading-relaxed">
            Terminal de vente rapide, calcul automatique des remises et impression de factures conformes.
          </p>
        </Link>
      </div>
    </div>
  );
}
