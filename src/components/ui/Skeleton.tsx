import React from "react";

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-[#E5DACF]/50 rounded-xl ${className}`}
    />
  );
}

export function CardsKpiSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${count} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl p-5 space-y-3"
        >
          <div className="flex justify-between items-center">
            <Skeleton className="w-24 h-4" />
            <Skeleton className="w-8 h-8 rounded-lg" />
          </div>
          <Skeleton className="w-36 h-7" />
          <Skeleton className="w-20 h-3" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({
  colonnes = 5,
  lignes = 8,
}: {
  colonnes?: number;
  lignes?: number;
}) {
  return (
    <div className="bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl overflow-hidden shadow-sm space-y-4 p-5">
      {/* Barre de recherche et filtres factices */}
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <Skeleton className="w-full sm:w-72 h-10 rounded-xl" />
        <div className="flex gap-2">
          <Skeleton className="w-20 h-10 rounded-xl" />
          <Skeleton className="w-20 h-10 rounded-xl" />
        </div>
      </div>

      {/* Lignes du tableau */}
      <div className="space-y-3 pt-2">
        <Skeleton className="w-full h-8 rounded-lg bg-[#E5DACF]/70" />
        {Array.from({ length: lignes }).map((_, i) => (
          <div key={i} className="flex gap-3 items-center py-2 border-b border-[#E5DACF]/30">
            {Array.from({ length: colonnes }).map((_, j) => (
              <Skeleton
                key={j}
                className={`h-5 ${j === 0 ? "w-24" : j === 1 ? "flex-1" : "w-20"}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
