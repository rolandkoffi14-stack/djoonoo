import { getCurrentSession } from "@/lib/auth";
import { realtimeHub, RealtimeEvent } from "@/lib/realtime-hub";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getCurrentSession();

  if (!session) {
    return new Response("Non autorisé", { status: 401 });
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeatInterval: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // 1. Message de bienvenue initial
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ status: "ok", compteId: session.compteId })}\n\n`)
      );

      // 2. Abonnement au Hub pour ce compte_id
      unsubscribe = realtimeHub.subscribe(session.compteId, (event: RealtimeEvent) => {
        try {
          controller.enqueue(
            encoder.encode(`event: update\ndata: ${JSON.stringify(event)}\n\n`)
          );
        } catch (err) {
          console.error("[SSE] Erreur d'envoi client:", err);
        }
      });

      // 3. Heartbeat toutes les 25 secondes pour maintenir la connexion active
      heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          if (heartbeatInterval) clearInterval(heartbeatInterval);
        }
      }, 25000);
    },
    cancel() {
      if (unsubscribe) unsubscribe();
      if (heartbeatInterval) clearInterval(heartbeatInterval);
    },
  });

  // Gestion de la coupure par le client
  request.signal.addEventListener("abort", () => {
    if (unsubscribe) unsubscribe();
    if (heartbeatInterval) clearInterval(heartbeatInterval);
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform, no-store",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
