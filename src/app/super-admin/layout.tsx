import React from "react";
import { getSuperAdminSession } from "@/lib/super-admin-auth";
import SuperAdminSidebar from "@/components/super-admin/SuperAdminSidebar";
import SuperAdminHeader from "@/components/super-admin/SuperAdminHeader";

export const metadata = {
  title: "Super-Admin Console — djoonoo",
  description: "Console centrale d'administration de la plateforme djoonoo",
};

export const dynamic = "force-dynamic";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSuperAdminSession();

  // Pour les pages non authentifiées (ex: /super-admin/connexion, /super-admin/initialisation),
  // afficher le contenu directement sans barre latérale ni header.
  if (!session) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans">
        <main className="flex-1">{children}</main>
      </div>
    );
  }

  // Pour les sessions Super-Admin authentifiées, afficher le layout complet avec sidebar à gauche
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex font-sans">
      {/* Menu latéral gauche Super-Admin (fixe desktop + drawer mobile) */}
      <SuperAdminSidebar adminEmail={session.email} />

      {/* Zone de contenu principale */}
      <div className="flex-1 flex flex-col min-w-0">
        <SuperAdminHeader />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
