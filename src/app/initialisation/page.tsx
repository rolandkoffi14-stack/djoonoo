import { redirect } from "next/navigation";
import { estEntrepriseInitialisee } from "@/lib/plateforme-config";
import InitialisationClient from "@/components/auth/InitialisationClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Activation & Initialisation — djoonoo",
  description: "Configuration initiale de votre logiciel de gestion avec licence à vie",
};

export default async function InitialisationPage() {
  const initialisee = await estEntrepriseInitialisee();
  if (initialisee) {
    redirect("/connexion");
  }

  return <InitialisationClient />;
}

