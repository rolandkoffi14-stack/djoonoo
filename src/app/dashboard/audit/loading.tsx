import React from "react";
import { TableSkeleton } from "@/components/ui/Skeleton";

export default function AuditLoading() {
  return (
    <div className="space-y-6">
      <TableSkeleton colonnes={5} lignes={10} />
    </div>
  );
}
