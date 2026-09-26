import { NextRequest, NextResponse } from "next/server";
import { executerCycleAbonnements } from "@/lib/subscriptions-cron";

const CRON_SECRET =
  process.env.CRON_SECRET || "djoonoo-cron-secret-production-token-2026";

export const dynamic = "force-dynamic";

/**
 * Route API Cron pour le déclenchement planifié du cycle d'abonnement (Section 5.4)
 * Déclenchée quotidiennement par crontab ou service externe via token d'authentification.
 */
export async function GET(req: NextRequest) {
  return handleCronExecution(req);
}

export async function POST(req: NextRequest) {
  return handleCronExecution(req);
}

async function handleCronExecution(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const urlKey = req.nextUrl.searchParams.get("key");

    let bearerToken = "";
    if (authHeader && authHeader.startsWith("Bearer ")) {
      bearerToken = authHeader.substring(7).trim();
    }

    const tokenFourni = bearerToken || urlKey;

    if (!tokenFourni || tokenFourni !== CRON_SECRET) {
      return NextResponse.json(
        { success: false, error: "Accès non autorisé au job planifié" },
        { status: 401 }
      );
    }

    const rapport = await executerCycleAbonnements();

    return NextResponse.json(rapport, { status: 200 });
  } catch (error) {
    console.error("Erreur lors de l'exécution du cron abonnements:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur serveur lors de l'exécution du job d'abonnement",
      },
      { status: 500 }
    );
  }
}
