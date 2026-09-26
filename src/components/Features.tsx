import { Layers, Users, TrendingUp, Store } from "lucide-react";

export default function Features() {
  return (
    <section id="fonctionnalites" className="py-20 sm:py-28 bg-[#FAF6F1]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(193,101,45,0.2)] bg-[#F5EDE3] px-3.5 py-1 text-xs font-semibold text-[#C1652D] mb-3">
            <span>Pensé pour ton quotidien</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#2B2119]">
            Tout pour gérer ton commerce simplement, sans te perdre dans les calculs
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#6B5C52]">
            Fini les oublis sur le cahier et les doutes en fin de journée. djoonoo te donne
            la visibilité exacte sur ton argent et tes marchandises.
          </p>
        </div>

        {/* Grille asymétrique (4 cartes de tailles différenciées) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Carte 1 : Stock & alertes (7 colonnes) */}
          <div className="md:col-span-7 rounded-2xl border border-[rgba(43,33,25,0.12)] bg-[#F5EDE3]/50 p-7 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FAF6F1] border border-[rgba(43,33,25,0.1)] text-[#C1652D] mb-5">
                <Layers className="h-6 w-6" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-[#2B2119] mb-3">
                Ne sois plus jamais pris au dépourvu
              </h3>
              <p className="text-sm sm:text-base text-[#6B5C52] leading-relaxed mb-6">
                Chaque vente déduit immédiatement les articles de ton stock. Définis un seuil
                d'alerte pour chaque produit et sois prévenu avant qu'un rayon ne soit vide,
                pour recommander à temps auprès de tes fournisseurs.
              </p>
            </div>

            {/* Illustration concrète */}
            <div className="rounded-xl border border-[rgba(43,33,25,0.08)] bg-[#FAF6F1] p-4 text-xs space-y-2">
              <div className="flex items-center justify-between font-semibold text-[#2B2119]">
                <span>Bidon d'Huile raffinée 5L</span>
                <span className="text-[#C53030] font-bold">4 restants (Alerte à 6)</span>
              </div>
              <div className="w-full bg-[rgba(43,33,25,0.08)] h-2 rounded-full overflow-hidden">
                <div className="bg-[#C53030] h-full w-[35%]" />
              </div>
              <p className="text-[11px] text-[#6B5C52]">
                Alerte stock bas déclenchée automatiquement
              </p>
            </div>
          </div>

          {/* Carte 2 : Client reconnu partout (5 colonnes) */}
          <div className="md:col-span-5 rounded-2xl border border-[rgba(43,33,25,0.12)] bg-[#F5EDE3]/50 p-7 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FAF6F1] border border-[rgba(43,33,25,0.1)] text-[#C1652D] mb-5">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-[#2B2119] mb-3">
                Un client, une seule fiche, dans toutes tes boutiques
              </h3>
              <p className="text-sm sm:text-base text-[#6B5C52] leading-relaxed mb-6">
                Retrouve n'importe quel client en quelques secondes grâce à son numéro de téléphone.
                Son historique d'achats est unifié : s'il achète dans un autre de tes points de vente,
                tu sais déjà ce qu'il a l'habitude de prendre.
              </p>
            </div>

            <div className="rounded-xl border border-[rgba(43,33,25,0.08)] bg-[#FAF6F1] p-4 text-xs">
              <p className="font-semibold text-[#2B2119]">Recherche instantanée par numéro</p>
              <p className="text-[#6B5C52] mt-1 text-[11px]">
                Évite les doublons et fidélise ta clientèle avec un accueil personnalisé.
              </p>
            </div>
          </div>

          {/* Carte 3 : Impayés suivis sans effort (5 colonnes) */}
          <div className="md:col-span-5 rounded-2xl border border-[rgba(43,33,25,0.12)] bg-[#F5EDE3]/50 p-7 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FAF6F1] border border-[rgba(43,33,25,0.1)] text-[#C1652D] mb-5">
                <TrendingUp className="h-6 w-6" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-[#2B2119] mb-3">
                Sais toujours qui te doit quoi
              </h3>
              <p className="text-sm sm:text-base text-[#6B5C52] leading-relaxed mb-6">
                Finis les calculs manuels à la calculatrice. djoonoo calcule le statut de chaque
                facture en temps réel. Enregistre des acomptes au fur et à mesure et consulte
                la liste de tes créances en un coup d'œil.
              </p>
            </div>

            <div className="rounded-xl border border-[rgba(43,33,25,0.08)] bg-[#FAF6F1] p-4 text-xs space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[#6B5C52]">Facture n° 0038</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#FEF3EB] text-[#C1652D] border border-[#C1652D]/25">
                  Partiel
                </span>
              </div>
              <p className="text-[11px] text-[#6B5C52]">
                10 000 FCFA versés sur 25 000 FCFA • Reste : 15 000 FCFA
              </p>
            </div>
          </div>

          {/* Carte 4 : Plusieurs boutiques, une vue unique (7 colonnes) */}
          <div className="md:col-span-7 rounded-2xl border border-[rgba(43,33,25,0.12)] bg-[#F5EDE3]/50 p-7 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FAF6F1] border border-[rgba(43,33,25,0.1)] text-[#C1652D] mb-5">
                <Store className="h-6 w-6" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-[#2B2119] mb-3">
                Pilote tout ton réseau depuis un seul endroit
              </h3>
              <p className="text-sm sm:text-base text-[#6B5C52] leading-relaxed mb-6">
                Que tu aies une seule boutique ou plusieurs magasins à Cotonou et Porto-Novo,
                tu gardes le contrôle absolu. Transfère un employé d'une boutique à l'autre sans
                jamais fausser l'historique de tes ventes passées.
              </p>
            </div>

            <div className="rounded-xl border border-[rgba(43,33,25,0.08)] bg-[#FAF6F1] p-4 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-[#2B2119]">Historique préservé des ventes</span>
                <span className="text-[11px] text-[#6B5C52]">Rapports consolidés par boutique</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
