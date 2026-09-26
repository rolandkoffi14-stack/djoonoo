import { describe, it, expect } from "vitest";
import { POST } from "../src/app/api/webhooks/fedapay/route";

describe("Point de terminaison Webhook FedaPay", () => {
  it("doit renvoyer un statut 400 si l'en-tête de signature est manquant", async () => {
    const req = new Request("http://localhost:3000/api/webhooks/fedapay", {
      method: "POST",
      body: JSON.stringify({ name: "transaction.approved" }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Signature");
  });
});
