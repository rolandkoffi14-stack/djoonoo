import {
  Store,
  Layers,
  Users,
  TrendingUp,
  AlertTriangle,
  Receipt,
  Search,
  ArrowRightLeft,
  DollarSign,
  ShieldCheck,
} from "lucide-react";

export default function Features() {
  return (
    <section id="fonctionnalites" className="py-20 sm:py-28 bg-[#FAF6F1]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-16">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#C1652D] mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-[#C1652D]" />
            Fonctionnalités clés MVP
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#2B2119]">
            Tout ce dont tu as besoin pour piloter ton commerce, sans superflu
          </h2>
          <p className="mt-4 text-lg text-[#6B5C52]">
            Conçu sur mesure pour la réalité quotidienne des commerçants au Bénin : transactions
            sécurisées, gestion des créances et inventaire en temps réel.
          </p>
        </div>

        {/* Grille asymétrique (taille différenciée - anti-pattern IA résolu) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Carte 1 : Stock & alertes (8 colonnes) */}
          <div className="md:col-span-8 rounded-2xl border border-[rgba(43,33,25,0.1)] bg-[#FFFFFF] p-8 flex flex-col justify-between hover:border-[rgba(43,33,25,0.2)] transition-all">
            <div>
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F5EAE3] text-[#C1652D]">
                  <Layers className="h-6 w-6" />
                </div>
                <span className="rounded-full bg-[#EDF7EE] px-3 py-1 text-xs font-bold text-[#1E7E34]">
                  Décrémentation atomique
                </span>
              </div>
              <h3 className="text-xl font-bold text-[#2B2119] mb-2">
                Suivi du stock en temps réel & Alerte de rupture
              </h3>
              <p className="text-sm text-[#6B5C52] leading-relaxed mb-6">
                Chaque vente décrémente instantanément le stock disponible sans risque de survente
                simultanée. Définis un seuil d'alerte pour chaque article et sois prévenu avant la
                rupture de stock.
              </p>
            </div>

            {/* Aperçu visuel concret */}
            <div className="rounded-xl border border-[rgba(43,33,25,0.08)] bg-[#FAF6F1] p-4 text-xs space-y-2.5">
              <div className="flex items-center justify-between font-semibold text-[#2B2119]">
                <span>Article : Huile Dinor 5L</span>
                <span className="text-[#C53030] font-bold">4 restants (Seuil : 6)</span>
              </div>
              <div className="w-full bg-[rgba(43,33,25,0.08)] h-2 rounded-full overflow-hidden">
                <div className="bg-[#C53030] h-full w-[25%]" />
              </div>
              <p className="text-[11px] text-[#6B5C52]">
                Alerte déclenchée automatiquement • Réapprovisionnement suggéré
              </p>
            </div>
          </div>

          {/* Carte 2 : Rapprochement Client (4 colonnes) */}
          <div className="md:col-span-4 rounded-2xl border border-[rgba(43,33,25,0.1)] bg-[#FFFFFF] p-8 flex flex-col justify-between hover:border-[rgba(43,33,25,0.2)] transition-all">
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F5EAE3] text-[#C1652D] mb-4">
                <Search className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-[#2B2119] mb-2">
                Recherche client par téléphone
              </h3>
              <p className="text-sm text-[#6B5C52] leading-relaxed mb-6">
                Dès la saisie d'un nouveau numéro, djoonoo propose un rapprochement avec les clients
                existants de ton compte pour éliminer les doublons entre boutiques.
              </p>
            </div>
            <div className="rounded-xl border border-[rgba(43,33,25,0.08)] bg-[#FAF6F1] p-3 text-xs text-[#2B2119]">
              <p className="font-semibold text-[#C1652D]">Historique unifié</p>
              <p className="text-[11px] text-[#6B5C52] mt-1">
                Le client garde son historique d'achats même s'il visite une autre de tes boutiques.
              </p>
            </div>
          </div>

          {/* Carte 3 : Gestion des créances et impayés (4 colonnes) */}
          <div className="md:col-span-4 rounded-2xl border border-[rgba(43,33,25,0.1)] bg-[#FFFFFF] p-8 flex flex-col justify-between hover:border-[rgba(43,33,25,0.2)] transition-all">
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F5EAE3] text-[#C1652D] mb-4">
                <DollarSign className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-[#2B2119] mb-2">
                Suivi précis des impayés
              </h3>
              <p className="text-sm text-[#6B5C52] leading-relaxed mb-4">
                Statuts calculés automatiquement (impayé, partiel, payé). Les vendeurs et gérants
                peuvent enregistrer des versements de suivi dès que le client revient régler son solde.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-[#FDE8E8] px-2 py-0.5 text-[11px] font-bold text-[#C53030]">
                Impayé
              </span>
              <span className="text-xs text-[#6B5C52]">→</span>
              <span className="rounded-md bg-[#FEF3EB] px-2 py-0.5 text-[11px] font-bold text-[#DD6B20]">
                Partiel
              </span>
              <span className="text-xs text-[#6B5C52]">→</span>
              <span className="rounded-md bg-[#EDF7EE] px-2 py-0.5 text-[11px] font-bold text-[#1E7E34]">
                Payé
              </span>
            </div>
          </div>

          {/* Carte 4 : Multi-boutiques & transferts (8 colonnes) */}
          <div className="md:col-span-8 rounded-2xl border border-[rgba(43,33,25,0.1)] bg-[#FFFFFF] p-8 flex flex-col justify-between hover:border-[rgba(43,33,25,0.2)] transition-all">
            <div>
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F5EAE3] text-[#C1652D]">
                  <ArrowRightLeft className="h-6 w-6" />
                </div>
                <span className="rounded-full bg-[#F5EAE3] px-3 py-1 text-xs font-bold text-[#C1652D]">
                  Règle 2 : Intégrité des ventes
                </span>
              </div>
              <h3 className="text-xl font-bold text-[#2B2119] mb-2">
                Multi-boutiques & Transfert d'employés sans perte d'historique
              </h3>
              <p className="text-sm text-[#6B5C52] leading-relaxed mb-6">
                Le Patron gère plusieurs boutiques depuis le même compte. Tu peux transférer un gérant
                ou un vendeur d'un point de vente à un autre : l'historique des ventes passées reste
                strictement figé et rattaché à sa boutique d'origine.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-[rgba(43,33,25,0.08)] bg-[#FAF6F1]">
                <p className="font-bold text-[#2B2119]">Boutique B01 (Cocotomey)</p>
                <p className="text-[#6B5C52] mt-0.5">CA Jour : 142 500 FCFA • 12 ventes</p>
              </div>
              <div className="p-3 rounded-lg border border-[rgba(43,33,25,0.08)] bg-[#FAF6F1]">
                <p className="font-bold text-[#2B2119]">Boutique B02 (Akpakpa)</p>
                <p className="text-[#6B5C52] mt-0.5">CA Jour : 98 000 FCFA • 8 ventes</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
