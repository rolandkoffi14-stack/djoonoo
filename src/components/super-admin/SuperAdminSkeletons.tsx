import React from "react";

/**
 * Skeleton haute-fidélité pour la page Comptes Marchands (/super-admin)
 */
export function SuperAdminComptesSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-pulse">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-64 bg-slate-200 rounded-xl" />
          <div className="h-4 w-96 max-w-full bg-slate-200/70 rounded-lg" />
        </div>
        <div className="h-10 w-48 bg-slate-200 rounded-xl" />
      </div>

      {/* Cartes KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3">
            <div className="h-3 w-24 bg-slate-200 rounded uppercase" />
            <div className="h-8 w-16 bg-slate-300 rounded-lg" />
            <div className="h-3 w-32 bg-slate-200/70 rounded" />
          </div>
        ))}
      </div>

      {/* Filtres & Recherche */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row gap-3 justify-between">
        <div className="h-10 w-full sm:w-80 bg-slate-100 rounded-xl" />
        <div className="h-10 w-36 bg-slate-100 rounded-xl" />
      </div>

      {/* Tableau des Comptes */}
      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between gap-4">
          <div className="h-4 w-16 bg-slate-200 rounded" />
          <div className="h-4 w-32 bg-slate-200 rounded" />
          <div className="h-4 w-28 bg-slate-200 rounded" />
          <div className="h-4 w-20 bg-slate-200 rounded" />
          <div className="h-4 w-24 bg-slate-200 rounded" />
          <div className="h-4 w-20 bg-slate-200 rounded" />
        </div>
        <div className="divide-y divide-slate-100">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4">
              <div className="h-4 w-16 bg-slate-200/80 rounded" />
              <div className="space-y-1.5 flex-1 max-w-xs">
                <div className="h-4 w-36 bg-slate-200 rounded" />
                <div className="h-3 w-48 bg-slate-200/60 rounded" />
              </div>
              <div className="h-4 w-28 bg-slate-200/70 rounded hidden md:block" />
              <div className="h-6 w-20 bg-slate-200 rounded-full" />
              <div className="h-4 w-20 bg-slate-200/60 rounded hidden lg:block" />
              <div className="h-8 w-8 bg-slate-200 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton haute-fidélité pour la page Paiements d'Abonnement (/super-admin/abonnements)
 */
export function SuperAdminAbonnementsSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-pulse">
      {/* En-tête */}
      <div className="space-y-2">
        <div className="h-7 w-72 bg-slate-200 rounded-xl" />
        <div className="h-4 w-96 max-w-full bg-slate-200/70 rounded-lg" />
      </div>

      {/* Cartes KPI (3 cartes comme en production) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-6 rounded-2xl bg-white border border-slate-200 space-y-3">
            <div className="h-3 w-32 bg-slate-200 rounded uppercase" />
            <div className="h-8 w-28 bg-slate-300 rounded-lg" />
            <div className="h-3 w-40 bg-slate-200/70 rounded" />
          </div>
        ))}
      </div>

      {/* Barre de Recherche et Filtres */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="h-11 w-full sm:w-96 bg-white border border-slate-200 rounded-xl" />
        <div className="h-11 w-40 bg-white border border-slate-200 rounded-xl" />
      </div>

      {/* Tableau des Règlements */}
      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between gap-4">
          <div className="h-4 w-20 bg-slate-200 rounded" />
          <div className="h-4 w-36 bg-slate-200 rounded" />
          <div className="h-4 w-20 bg-slate-200 rounded" />
          <div className="h-4 w-24 bg-slate-200 rounded" />
          <div className="h-4 w-28 bg-slate-200 rounded" />
          <div className="h-4 w-20 bg-slate-200 rounded" />
          <div className="h-4 w-16 bg-slate-200 rounded" />
        </div>
        <div className="divide-y divide-slate-100">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-5 flex items-center justify-between gap-4">
              <div className="h-6 w-20 bg-slate-200 rounded-md" />
              <div className="space-y-1.5 flex-1 max-w-xs">
                <div className="h-4 w-36 bg-slate-200 rounded" />
                <div className="h-3 w-44 bg-slate-200/60 rounded" />
              </div>
              <div className="h-4 w-20 bg-slate-200/70 rounded" />
              <div className="h-5 w-24 bg-slate-200 rounded" />
              <div className="h-7 w-28 bg-slate-100 rounded-xl" />
              <div className="h-6 w-24 bg-slate-200 rounded-full" />
              <div className="h-7 w-20 bg-slate-200 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton haute-fidélité pour la page Forfaits & Limites (/super-admin/forfaits)
 */
export function SuperAdminForfaitsSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-pulse">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-64 bg-slate-200 rounded-xl" />
          <div className="h-4 w-96 max-w-full bg-slate-200/70 rounded-lg" />
        </div>
        <div className="h-10 w-36 bg-slate-200 rounded-xl" />
      </div>

      {/* Cartes des forfaits */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-6 rounded-3xl bg-white border border-slate-200 space-y-6 shadow-xs">
            <div className="flex justify-between items-center">
              <div className="h-6 w-28 bg-slate-300 rounded-lg" />
              <div className="h-5 w-16 bg-slate-200 rounded-md" />
            </div>
            <div className="space-y-2">
              <div className="h-9 w-36 bg-slate-300 rounded-lg" />
              <div className="h-3 w-20 bg-slate-200 rounded" />
            </div>
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="h-4 w-48 bg-slate-200/80 rounded" />
              <div className="h-4 w-40 bg-slate-200/80 rounded" />
            </div>
            <div className="pt-4 flex gap-2">
              <div className="h-9 flex-1 bg-slate-100 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton haute-fidélité pour la page Paramètres Plateforme (/super-admin/parametres)
 */
export function SuperAdminParametresSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-pulse">
      {/* En-tête */}
      <div className="space-y-2">
        <div className="h-7 w-72 bg-slate-200 rounded-xl" />
        <div className="h-4 w-96 max-w-full bg-slate-200/70 rounded-lg" />
      </div>

      {/* Liste des paramètres */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden divide-y divide-slate-100 shadow-xs">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="h-4 w-44 bg-slate-300 rounded" />
              <div className="h-3 w-80 max-w-full bg-slate-200/70 rounded" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-32 bg-slate-100 rounded-xl" />
              <div className="h-10 w-28 bg-slate-200 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
