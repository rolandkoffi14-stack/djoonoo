import React from "react";
import { CardsKpiSkeleton } from "@/components/ui/Skeleton";

export default function EquipeLoading() {
  return (
    <div className="space-y-6">
      <CardsKpiSkeleton count={3} />
    </div>
  );
}
