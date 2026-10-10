import { redirect } from "next/navigation";
import { estPlateformeInitialisee } from "@/lib/plateforme-config";
import SetupSuperAdminClient from "@/components/super-admin/SetupSuperAdminClient";

export const metadata = {
  title: "Initialisation Plateforme — Super-Admin djoonoo",
  description: "Configuration initiale du premier compte Super-Admin",
};

export const dynamic = "force-dynamic";

export default async function SuperAdminInitialisationPage() {
  const estInitialisee = await estPlateformeInitialisee();

  // Si la plateforme a déjà son Super-Admin, cette page est scellée à tout jamais
  if (estInitialisee) {
    redirect("/super-admin/connexion");
  }

  return <SetupSuperAdminClient />;
}
