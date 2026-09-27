import React from "react";
import { Skeleton, CardsKpiSkeleton } from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Bannière de Bienvenue */}
      <div className="bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl p-6 sm:p-7 space-y-3">
        <Skeleton className="w-48 h-8" />
        <Skeleton className="w-96 max-w-full h-4" />
      </div>

      {/* KPIs */}
      <CardsKpiSkeleton count={4} />

      {/* Grille inférieure */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl p-6 space-y-4">
          <Skeleton className="w-40 h-6" />
          <Skeleton className="w-full h-48 rounded-xl" />
        </div>
        <div className="bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl p-6 space-y-4">
          <Skeleton className="w-40 h-6" />
          <Skeleton className="w-full h-48 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
