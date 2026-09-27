import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Index de Performance Prisma (Section 9)", () => {
  it("doit comporter les index composés pour la pagination et les tris fréquents", () => {
    const schemaPath = path.resolve(process.cwd(), "prisma/schema.prisma");
    const schemaContent = fs.readFileSync(schemaPath, "utf-8");

    // Index pour les ventes : [boutique_id, date_vente] et [compte_id, date_vente]
    expect(schemaContent).toContain("@@index([boutique_id, date_vente])");
    expect(schemaContent).toContain("@@index([compte_id, date_vente])");

    // Index pour les clients : recherche par nom au sein du compte
    expect(schemaContent).toContain("@@index([compte_id, nom])");

    // Index pour les produits : tri par nom au sein de la boutique
    expect(schemaContent).toContain("@@index([boutique_id, nom])");
  });
});
