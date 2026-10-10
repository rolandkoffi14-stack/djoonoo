import InscriptionClient from "@/components/auth/InscriptionClient";
import { getForfaitsCatalogue, getPlateformeParametres } from "@/lib/plateforme-config";

export const dynamic = "force-dynamic";

export default async function InscriptionPage() {
  const [forfaits, { dureeEssaiJours }] = await Promise.all([
    getForfaitsCatalogue(),
    getPlateformeParametres(),
  ]);

  return (
    <InscriptionClient
      forfaits={forfaits}
      dureeEssaiJours={dureeEssaiJours}
    />
  );
}
