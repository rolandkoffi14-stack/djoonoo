import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { estEntrepriseInitialisee } from "@/lib/plateforme-config";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getCurrentSession();
  if (session) {
    redirect("/dashboard");
  }

  const initialisee = await estEntrepriseInitialisee();
  if (!initialisee) {
    redirect("/initialisation");
  }

  redirect("/connexion");
}
