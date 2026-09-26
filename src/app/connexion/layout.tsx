import { Metadata } from "next";

export const metadata: Metadata = {
  title: "djoonoo — Connexion à ton espace",
  description: "Connecte-toi à ton espace pour gérer ta boutique, tes ventes et tes stocks.",
};

export default function ConnexionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
