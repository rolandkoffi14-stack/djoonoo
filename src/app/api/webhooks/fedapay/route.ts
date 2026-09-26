import { NextRequest, NextResponse } from "next/server";
import { verifierSignatureFedaPay, traiterWebhookFedaPay } from "@/lib/fedapay";

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("x-fedapay-signature") || "";
    if (!signature) {
      return NextResponse.json(
        { error: "Signature de webhook FedaPay manquante." },
        { status: 400 }
      );
    }

    const rawBody = await req.text();

    // Vérification cryptographique HMAC SHA-256 + anti-rejeu
    const estValide = verifierSignatureFedaPay(rawBody, signature);
    if (!estValide) {
      console.warn("⚠️ [FedaPay Webhook] Tentative de webhook avec signature invalide !");
      return NextResponse.json(
        { error: "Signature de webhook FedaPay invalide." },
        { status: 400 }
      );
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
    }

    // Traitement atomique idempotent
    const resultat = await traiterWebhookFedaPay(payload);

    return NextResponse.json({ received: true, detail: resultat.message }, { status: 200 });
  } catch (err: any) {
    console.error("❌ [FedaPay Webhook] Erreur interne :", err);
    return NextResponse.json(
      { error: "Erreur interne de traitement du webhook." },
      { status: 500 }
    );
  }
}
