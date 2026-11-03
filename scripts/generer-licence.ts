/**
 * Utilitaire Éditeur — Générateur de Clé de Licence djoonoo (Version Hors-SaaS)
 * 
 * Usage :
 *   npx tsx scripts/generer-licence.ts "NOM DE L'ENTREPRISE" [quota_boutiques]
 * 
 * Exemples :
 *   npx tsx scripts/generer-licence.ts "BOUTIQUE DU PROGRÈS" 1
 *   npx tsx scripts/generer-licence.ts "ETS ALAFIA & FILS" illimite
 */

import { genererCleLicence, LicensePayload } from "../src/lib/license";

const nomEntreprise = process.argv[2];
const quotaArg = process.argv[3] || "1";

if (!nomEntreprise) {
  console.error("❌ Erreur : vous devez fournir le nom officiel de l'entreprise.");
  console.log('Usage: npx tsx scripts/generer-licence.ts "NOM DE L\'ENTREPRISE" [quota_boutiques]');
  process.exit(1);
}

const maxBoutiques =
  quotaArg.toLowerCase() === "illimite" || quotaArg.toLowerCase() === "unlimited" || quotaArg === "0"
    ? null
    : parseInt(quotaArg, 10) || 1;

const payload: LicensePayload = {
  nomEntreprise: nomEntreprise.trim(),
  type: "lifetime",
  maxBoutiques,
  dateAchat: new Date().toISOString().split("T")[0],
};

const cle = genererCleLicence(payload);

console.log("\n========================================================");
console.log("       DJOONOO — CLÉ DE LICENCE PERMANENTE ÉMISE");
console.log("========================================================");
console.log(`Entreprise Titulaire : ${payload.nomEntreprise}`);
console.log(`Type de Licence      : Licence à Vie (Comptant)`);
console.log(`Quota de Boutiques   : ${maxBoutiques === null ? "Illimité" : `${maxBoutiques} boutique(s)`}`);
console.log(`Date d'émission      : ${payload.dateAchat}`);
console.log("--------------------------------------------------------");
console.log("CLÉ DE LICENCE OFFICIELLE :");
console.log(`\n${cle}\n`);
console.log("========================================================\n");

