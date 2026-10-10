import { describe, it, expect } from "vitest";
import { genererHtmlFactureAbonnement } from "../src/lib/invoice-generator";

describe("Sentinelle Sécurité — Prévention XSS Stocké Facture Abonnement", () => {
  it("doit neutraliser et échapper tout code HTML ou script injecté dans les métadonnées client", () => {
    const payloadMalveillant = {
      numeroFacture: "FAC-TEST-001<script>alert('xss-num')</script>",
      dateEmission: "10/10/2026",
      datePaiement: null,
      statut: "en_attente",
      montant: 5000,
      forfaitNom: "Solo <script>alert('forfait')</script>",
      dureeJours: 30,
      fournisseurPaiement: "fedapay",
      referenceFedaPay: "TX-123\"><script>alert('ref')</script>",
      client: {
        nomEntreprise: "Boutique Dangereuse <script>alert('xss-nom')</script>",
        email: "hacker@test.com",
        telephone: "+22990000000",
        ifu: "1234567890<img src=x onerror=alert('xss-ifu')>",
        rccm: "RB/COT/26-A-0000",
        adresse: "Rue 10 \" onmouseover=\"alert('xss-addr')",
        ville: "Cotonou <iframe src=javascript:alert('xss-ville')></iframe>",
      },
    };

    const html = genererHtmlFactureAbonnement(payloadMalveillant);

    // Aucune balise script ou gestionnaire d'événement inline non échappé ne doit être présent
    expect(html).not.toContain("<script>alert('xss-nom')</script>");
    expect(html).not.toContain("<img src=x onerror=alert('xss-ifu')>");
    expect(html).not.toContain("<iframe src=javascript:alert('xss-ville')></iframe>");
    expect(html).not.toContain("\" onmouseover=\"alert('xss-addr')");
    expect(html).not.toContain("<script>alert('forfait')</script>");
    expect(html).not.toContain("\"><script>alert('ref')</script>");

    // Doit contenir les versions correctement échappées
    expect(html).toContain("&lt;script&gt;alert(&#39;xss-nom&#39;)&lt;/script&gt;");
    expect(html).toContain("&lt;img src=x onerror=alert(&#39;xss-ifu&#39;)&gt;");
  });
});
