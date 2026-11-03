import { redirect } from "next/navigation";
import { estEntrepriseInitialisee } from "@/lib/plateforme-config";

export const dynamic = "force-dynamic";

export default async function InscriptionPage() {
  const initialisee = await estEntrepriseInitialisee();
  if (initialisee) {
    redirect("/connexion");
  }
  redirect("/initialisation");
}
