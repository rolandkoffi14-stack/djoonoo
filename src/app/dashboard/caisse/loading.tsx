import React from "react";
import { Skeleton } from "@/components/ui/Skeleton";

export default function CaisseLoading() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Grille des produits à gauche */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex gap-3">
          <Skeleton className="flex-1 h-12 rounded-xl" />
          <Skeleton className="w-32 h-12 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl p-4 space-y-2"
            >
              <Skeleton className="w-16 h-4" />
              <Skeleton className="w-full h-5" />
              <Skeleton className="w-20 h-6" />
            </div>
          ))}
        </div>
      </div>

      {/* Panneau de caisse / panier à droite */}
      <div className="bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl p-6 space-y-6">
        <Skeleton className="w-32 h-6" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex justify-between items-center py-2 border-b border-[#E5DACF]/40">
              <Skeleton className="w-32 h-4" />
              <Skeleton className="w-16 h-4" />
            </div>
          ))}
        </div>
        <div className="pt-6 border-t border-[#E5DACF] space-y-3">
          <div className="flex justify-between">
            <Skeleton className="w-20 h-5" />
            <Skeleton className="w-28 h-6" />
          </div>
          <Skeleton className="w-full h-12 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
