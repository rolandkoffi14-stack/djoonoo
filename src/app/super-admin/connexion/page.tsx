import { redirect } from "next/navigation";
import { estPlateformeInitialisee } from "@/lib/plateforme-config";
import ConnexionSuperAdminClient from "@/components/super-admin/ConnexionSuperAdminClient";

export const metadata = {
  title: "Connexion Console — Super-Admin djoonoo",
  description: "Accès sécurisé à la console Super-Admin",
};

export const dynamic = "force-dynamic";

export default async function SuperAdminConnexionPage() {
  const estInitialisee = await estPlateformeInitialisee();

  // Si aucun Super-Admin n'a encore été créé, rediriger vers l'étape de premier setup
  if (!estInitialisee) {
    redirect("/super-admin/initialisation");
  }

  return <ConnexionSuperAdminClient />;
}
