import { redirect } from "next/navigation";
import { getSuperAdminSession } from "@/lib/super-admin-auth";
import { prisma } from "@/lib/prisma";
import ParametresManager, { ParametreItem } from "@/components/super-admin/ParametresManager";

export const metadata = {
  title: "Paramètres Plateforme — Super-Admin djoonoo",
  description: "Configuration globale de la plateforme djoonoo",
};

export default async function SuperAdminParametresPage() {
  const session = await getSuperAdminSession();
  if (!session) {
    redirect("/super-admin/connexion");
  }

  const parametres = await prisma.parametres_plateforme.findMany({
    orderBy: { cle: "asc" },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ParametresManager initialParametres={parametres} />
    </div>
  );
}
