import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { recupererJournalAuditAction } from "@/app/actions/audit";
import AuditManager from "@/components/dashboard/AuditManager";

export const metadata = {
  title: "Journal d'Audit & Sécurité — djoonoo",
  description: "Historique inaltérable de traçabilité des opérations de l'entreprise",
};

export default async function AuditPage() {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/connexion");
  }

  // L'audit complet est réservé au rôle Patron (Section 2 & 7)
  if (session.role !== "patron") {
    redirect("/dashboard");
  }

  const res = await recupererJournalAuditAction();

  const logs = res.success && res.data ? res.data.logs : [];
  const stats = res.success && res.data ? res.data.stats : {
    totalGlobal: 0,
    totalAujourdhui: 0,
    totalSensibles: 0
  };
  const utilisateurs = res.success && res.data ? res.data.utilisateurs : [];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <AuditManager
        initialLogs={logs}
        initialStats={stats}
        utilisateurs={utilisateurs}
      />
    </div>
  );
}
