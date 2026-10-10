import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { connexionAction, inscrirePatronAction } from "../src/app/actions/auth";

describe("Sentinelle Sécurité — Zéro Fuite de Code 2FA dans les Logs", () => {
  let consoleLogSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it("ne doit JAMAIS afficher de code TOTP à 6 chiffres dans console.log lors d'une connexion", async () => {
    const formData = new FormData();
    formData.append("email", "test-patron@example.com");
    formData.append("mot_de_passe", "mauvais-mot-de-passe");

    await connexionAction({}, formData);

    const calls = consoleLogSpy.mock.calls.map((args: any[]) => args.join(" "));
    const regexCodeTotp = /CODE 2FA TOTP.*:\s*\d{6}/i;

    for (const logLine of calls) {
      expect(logLine).not.toMatch(regexCodeTotp);
    }
  });

  it("ne doit JAMAIS afficher de code TOTP lors d'une tentative d'inscription", async () => {
    const formData = new FormData();
    formData.append("nom_entreprise", "Entreprise Test");
    formData.append("nom_patron", "Patron Test");
    formData.append("telephone_patron", "+22901000000");
    formData.append("email", "patron-test@example.com");
    formData.append("mot_de_passe", "MotDePasse123!");
    formData.append("confirmation_mot_de_passe", "MotDePasse123!");
    formData.append("nom_boutique", "Boutique Principale");
    formData.append("ville_boutique", "Cotonou");
    formData.append("adresse_boutique", "Haie Vive");

    await inscrirePatronAction({}, formData);

    const calls = consoleLogSpy.mock.calls.map((args: any[]) => args.join(" "));
    const regexCodeTotp = /CODE 2FA TOTP.*:\s*\d{6}/i;

    for (const logLine of calls) {
      expect(logLine).not.toMatch(regexCodeTotp);
    }
  });
});
