import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { executerCycleAbonnements } from "@/lib/subscriptions-cron";
import { getCronSecret } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Rejette formellement les requêtes GET (CWE-352 / Item 4.4 de l'audit)
 * Une requête GET ne doit jamais muter l'état de la plateforme.
 */
export async function GET(_req?: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: "Méthode non autorisée. Les mutations d'abonnement requièrent POST.",
    },
    { status: 405, headers: { Allow: "POST" } }
  );
}

/**
 * Route API Cron sécurisée pour le cycle d'abonnement (Section 5.4 / Item 4.4 & 1.1)
 * Déclenchée via HTTP POST avec en-tête `Authorization: Bearer <CRON_SECRET>`.
 * Le passage de token dans l'URL est formellement interdit pour prévenir les fuites de logs.
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "En-tête Authorization Bearer obligatoire manquant" },
        { status: 401 }
      );
    }

    const bearerToken = authHeader.substring(7).trim();
    const cronSecret = getCronSecret();

    // Comparaison en temps constant (anti-timing attacks)
    const tokenBuffer = Buffer.from(bearerToken);
    const secretBuffer = Buffer.from(cronSecret);

    if (
      tokenBuffer.length !== secretBuffer.length ||
      !crypto.timingSafeEqual(tokenBuffer, secretBuffer)
    ) {
      return NextResponse.json(
        { success: false, error: "Token d'autorisation invalide" },
        { status: 401 }
      );
    }

    const rapport = await executerCycleAbonnements();
    return NextResponse.json(rapport, { status: 200 });
  } catch (error) {
    console.error("[CRON SÉCURISÉ] Erreur lors de l'exécution du cycle d'abonnement:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur serveur interne lors du traitement du cycle d'abonnement",
      },
      { status: 500 }
    );
  }
}
