import React from "react";
import { TableSkeleton } from "@/components/ui/Skeleton";

export default function ClientsLoading() {
  return (
    <div className="space-y-6">
      <TableSkeleton colonnes={6} lignes={8} />
    </div>
  );
}
