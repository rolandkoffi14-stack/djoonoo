import { describe, it, expect } from "vitest";
import { formatSafeError } from "../src/lib/safe-action";

describe("Assainissement des Erreurs & Masquage SQL (Phase 6 - Items 1.4 & 4.5)", () => {
  it("doit masquer les erreurs techniques Prisma et requêtes SQL", () => {
    const prismaError = new Error(
      "Invalid `prisma.utilisateurs.create()` invocation: Unique constraint failed on the fields: (`email`) SELECT * FROM users WHERE host='127.0.0.1'"
    );

    const safeMessage = formatSafeError(prismaError, "Erreur lors de la création de l'utilisateur.");
    expect(safeMessage).not.toMatch(/SELECT/i);
    expect(safeMessage).not.toMatch(/prisma/i);
    expect(safeMessage).not.toMatch(/127\.0\.0\.1/);
    expect(safeMessage).toBe("Cet enregistrement existe déjà dans la base de données.");
  });

  it("doit masquer les erreurs de connexion à la base de données", () => {
    const dbConnError = new Error("Can't reach database server at `aws-0-eu-central-1.pooler.supabase.com:6543`");
    const safeMessage = formatSafeError(dbConnError, "Erreur système.");

    expect(safeMessage).not.toMatch(/supabase/i);
    expect(safeMessage).not.toMatch(/pooler/i);
    expect(safeMessage).toBe("Service temporairement indisponible. Veuillez réessayer plus tard.");
  });

  it("doit conserver les messages d'erreurs fonctionnels explicites sans faille", () => {
    const customError = new Error("Code à 6 chiffres incorrect ou expiré.");
    const safeMessage = formatSafeError(customError);

    expect(safeMessage).toBe("Code à 6 chiffres incorrect ou expiré.");
  });
});
