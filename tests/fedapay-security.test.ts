import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { verifierSignatureFedaPay } from "../src/lib/fedapay";

describe("Sécurité Cryptographique FedaPay", () => {
  const secretTest = "wh_test_secret_key_123456";
  const bodyTest = JSON.stringify({
    name: "transaction.approved",
    entity: { id: 9999, status: "approved", amount: 15000 },
  });

  it("doit valider une signature HMAC SHA-256 valide avec horodatage récent", () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const toSign = `${timestamp}.${bodyTest}`;
    const hash = crypto.createHmac("sha256", secretTest).update(toSign).digest("hex");
    const signatureHeader = `t=${timestamp},s=${hash}`;

    const valide = verifierSignatureFedaPay(bodyTest, signatureHeader, secretTest);
    expect(valide).toBe(true);
  });

  it("doit rejeter un webhook dont l'horodatage est antérieur à 5 minutes (protection anti-rejeu)", () => {
    const vieuxTimestamp = Math.floor(Date.now() / 1000) - 400; // 400s en arrière (>300s)
    const toSign = `${vieuxTimestamp}.${bodyTest}`;
    const hash = crypto.createHmac("sha256", secretTest).update(toSign).digest("hex");
    const signatureHeader = `t=${vieuxTimestamp},s=${hash}`;

    const valide = verifierSignatureFedaPay(bodyTest, signatureHeader, secretTest);
    expect(valide).toBe(false);
  });

  it("doit rejeter une signature altérée ou falsifiée", () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const signatureHeader = `t=${timestamp},s=mauvaisesignaturefalsifiee12345`;

    const valide = verifierSignatureFedaPay(bodyTest, signatureHeader, secretTest);
    expect(valide).toBe(false);
  });
});
