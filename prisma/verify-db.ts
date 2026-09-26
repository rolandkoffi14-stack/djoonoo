import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const comptes = await prisma.comptes.findMany({
    include: {
      boutiques: true,
      utilisateurs: {
        select: {
          id: true,
          email: true,
          nom: true,
          role: true,
          deux_fa_active: true,
          deux_fa_secret: true,
        },
      },
      forfait: true,
      journal_audit: true,
    },
  });

  console.log(`\n=== 📊 ÉTAT DE LA BASE SUPABASE (${comptes.length} compte(s) créé(s)) ===`);
  for (const c of comptes) {
    console.log(`\n🏢 COMPTE : [${c.code}] ${c.nom_entreprise} (${c.ville})`);
    console.log(`   - Forfait : ${c.forfait.nom} (${c.forfait.prix_mensuel} FCFA/mois)`);
    console.log(`   - Statut abonnement : ${c.statut_abonnement}`);
    console.log(`   - Fin d'essai : ${c.date_fin_essai?.toISOString()}`);
    console.log(`   - Boutiques (${c.boutiques.length}) :`, c.boutiques.map((b) => `${b.code}: ${b.nom} (${b.statut})`));
    console.log(`   - Utilisateurs (${c.utilisateurs.length}) :`, c.utilisateurs.map((u) => `${u.role}: ${u.nom} <${u.email}> (2FA secret généré: ${!!u.deux_fa_secret})`));
    console.log(`   - Journal d'audit (${c.journal_audit.length} événement(s)) :`, c.journal_audit.map((a) => `${a.action} sur ${a.entite_concernee}`));
  }

  const forfaits = await prisma.forfaits.findMany();
  console.log(`\n📦 FORFAITS EN BASE (${forfaits.length}) :`, forfaits.map((f) => `${f.nom}: ${f.prix_mensuel} FCFA (boutiques: ${f.max_boutiques ?? "illimité"}, employés: ${f.max_employes_par_boutique ?? "illimité"})`));

  const params = await prisma.parametres_plateforme.findMany();
  console.log(`⚙️  PARAMÈTRES PLATEFORME (${params.length}) :`, params.map((p) => `${p.cle} = ${p.valeur}`));
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
