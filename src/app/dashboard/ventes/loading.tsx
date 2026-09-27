import React from "react";
import { TableSkeleton } from "@/components/ui/Skeleton";

export default function VentesLoading() {
  return (
    <div className="space-y-6">
      <TableSkeleton colonnes={7} lignes={8} />
    </div>
  );
}
