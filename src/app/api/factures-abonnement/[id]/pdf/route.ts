import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { genererHtmlFactureAbonnement } from "@/lib/invoice-generator";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (!session) {
    return new NextResponse("Non autorisé", { status: 401 });
  }

  const { id } = await params;

  const facture = await prisma.factures_abonnement.findUnique({
    where: { id },
    include: {
      compte: {
        include: { forfait: true },
      },
    },
  });

  if (!facture) {
    return new NextResponse("Facture introuvable", { status: 404 });
  }

  // Contrôle strict de l'isolation multi-tenant
  if (facture.compte_id !== session.compteId) {
    return new NextResponse("Accès refusé", { status: 403 });
  }

  const annee = new Date(facture.date_echeance).getFullYear();
  const numFacture = `FAC-DJOONOO-${annee}-${facture.id.slice(0, 8).toUpperCase()}`;

  const html = genererHtmlFactureAbonnement({
    numeroFacture: numFacture,
    dateEmission: new Date(facture.date_echeance).toLocaleDateString("fr-FR"),
    datePaiement: facture.date_confirmation
      ? new Date(facture.date_confirmation).toLocaleDateString("fr-FR")
      : null,
    statut: facture.statut,
    montant: facture.montant,
    forfaitNom: facture.compte.forfait?.nom || "Standard",
    dureeJours: facture.compte.forfait?.duree_jours || 30,
    fournisseurPaiement: facture.fournisseur_paiement,
    referenceFedaPay: facture.reference_externe,
    client: {
      nomEntreprise: facture.compte.nom_entreprise,
      email: facture.compte.email_principal,
      telephone: facture.compte.telephone_principal,
      ifu: facture.compte.ifu,
      rccm: facture.compte.rccm,
      adresse: facture.compte.adresse_siege,
      ville: facture.compte.ville,
    },
  });

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-cache",
    },
  });
}
