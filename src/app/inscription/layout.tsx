import { Metadata } from "next";

export const metadata: Metadata = {
  title: "djoonoo — Inscription & Création d'entreprise",
  description: "Crée ton compte entreprise djoonoo et démarre tes 14 jours d'essai gratuit.",
};

export default function InscriptionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
