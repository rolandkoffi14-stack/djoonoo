import React from "react";
import { CardsKpiSkeleton } from "@/components/ui/Skeleton";

export default function RapportsLoading() {
  return (
    <div className="space-y-6">
      <CardsKpiSkeleton count={4} />
    </div>
  );
}
