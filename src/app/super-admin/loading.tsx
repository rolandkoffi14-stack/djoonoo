import React from "react";
import { CardsKpiSkeleton, TableSkeleton } from "@/components/ui/Skeleton";

export default function SuperAdminLoading() {
  return (
    <div className="space-y-6">
      <CardsKpiSkeleton count={4} />
      <TableSkeleton colonnes={6} lignes={8} />
    </div>
  );
}
