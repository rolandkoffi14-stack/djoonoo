import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { estEntrepriseInitialisee } from "@/lib/plateforme-config";
import ConnexionClient from "@/components/auth/ConnexionClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Connexion — djoonoo",
  description: "Accédez à votre espace de gestion djoonoo",
};

export default async function ConnexionPage() {
  const session = await getCurrentSession();
  if (session) {
    redirect("/dashboard");
  }

  // Sécurité non négociable : Si l'instance n'est pas encore initialisée,
  // l'accès à la page de connexion est strictement bloqué et redirige vers /initialisation
  const initialisee = await estEntrepriseInitialisee();
  if (!initialisee) {
    redirect("/initialisation");
  }

  return <ConnexionClient />;
}
