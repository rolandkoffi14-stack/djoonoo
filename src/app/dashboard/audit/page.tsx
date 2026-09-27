import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { recupererJournalAuditAction } from "@/app/actions/audit";
import AuditManager from "@/components/dashboard/AuditManager";
import { parsePaginationParams } from "@/lib/pagination";

export const metadata = {
  title: "Journal d'Audit & Sécurité — djoonoo",
  description: "Historique inaltérable de traçabilité des opérations de l'entreprise",
};

interface AuditPageProps {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    categorie?: string;
    utilisateurId?: string;
    q?: string;
  }>;
}

export default async function AuditPage(props: AuditPageProps) {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/connexion");
  }

  // L'audit complet est réservé au rôle Patron (Section 2 & 7)
  if (session.role !== "patron") {
    redirect("/dashboard");
  }

  const searchParams = props.searchParams ? await props.searchParams : {};
  const { page, limit } = parsePaginationParams(searchParams, 25);
  const categorie = searchParams.categorie || "toutes";
  const utilisateurId = searchParams.utilisateurId || "tous";
  const recherche = searchParams.q || "";

  const res = await recupererJournalAuditAction({
    page,
    limite: limit,
    categorie,
    utilisateurId,
    recherche,
  });

  const logs = res.success && res.data ? res.data.logs : [];
  const stats = res.success && res.data ? res.data.stats : {
    totalGlobal: 0,
    totalAujourdhui: 0,
    totalSensibles: 0
  };
  const utilisateurs = res.success && res.data ? res.data.utilisateurs : [];
  const totalLogs = res.success && res.data ? res.data.pagination.total : 0;
  const totalPages = res.success && res.data ? res.data.pagination.totalPages : 1;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <AuditManager
        initialLogs={logs}
        initialStats={stats}
        utilisateurs={utilisateurs}
        page={page}
        limit={limit}
        totalPages={totalPages}
        totalElements={totalLogs}
      />
    </div>
  );
}
