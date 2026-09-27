import React from "react";
import { Skeleton, TableSkeleton } from "@/components/ui/Skeleton";

export default function AbonnementLoading() {
  return (
    <div className="space-y-8">
      {/* En-tête / Forfait actif */}
      <div className="bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl p-6 space-y-4">
        <Skeleton className="w-48 h-7" />
        <Skeleton className="w-96 max-w-full h-4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      </div>

      {/* Cartes des forfaits disponibles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>

      {/* Historique factures */}
      <TableSkeleton colonnes={5} lignes={5} />
    </div>
  );
}
