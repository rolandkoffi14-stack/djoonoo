import { Metadata } from "next";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: `${siteConfig.app.nom} — Inscription & Création d'entreprise`,
  description: `Crée ton compte entreprise ${siteConfig.app.nom} et démarre tes ${siteConfig.saas.dureeEssaiJoursDefaut} jours d'essai gratuit.`,
};

export default function InscriptionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
