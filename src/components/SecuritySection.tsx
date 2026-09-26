import { Shield, Lock, Clock } from "lucide-react";

export default function SecuritySection() {
  return (
    <section className="py-16 sm:py-24 bg-[#FAF6F1] border-t border-[rgba(43,33,25,0.08)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(193,101,45,0.2)] bg-[#F5EDE3] px-3.5 py-1 text-xs font-semibold text-[#C1652D] mb-3">
            <span>Sérénité & protection</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#2B2119]">
            Tes chiffres de vente et ton argent restent strictement confidentiels
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#6B5C52]">
            Nous savons combien la discrétion et la confiance sont essentielles dans le commerce.
            Voici comment tes données sont protégées chaque jour.
          </p>
        </div>

        <div className="mx-auto max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pilier 1 : Double vérification 2FA */}
          <div className="rounded-2xl border border-[rgba(43,33,25,0.12)] bg-[#F5EDE3]/50 p-6 sm:p-7 flex flex-col justify-between">
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FAF6F1] border border-[rgba(43,33,25,0.1)] text-[#C1652D] mb-4">
                <Shield className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-[#2B2119] mb-2">
                Double vérification (2FA)
              </h3>
              <p className="text-xs sm:text-sm text-[#6B5C52] leading-relaxed">
                Le sigle 2FA désigne une double vérification : en plus de ton mot de passe, un code
                temporaire généré sur ton téléphone est demandé pour confirmer que c'est bien toi,
                bloquant tout accès non autorisé même si quelqu'un devine ton mot de passe.
              </p>
            </div>
          </div>

          {/* Pilier 2 : Données privées et isolées */}
          <div className="rounded-2xl border border-[rgba(43,33,25,0.12)] bg-[#F5EDE3]/50 p-6 sm:p-7 flex flex-col justify-between">
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FAF6F1] border border-[rgba(43,33,25,0.1)] text-[#C1652D] mb-4">
                <Lock className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-[#2B2119] mb-2">
                Espace entièrement privé
              </h3>
              <p className="text-xs sm:text-sm text-[#6B5C52] leading-relaxed">
                Chaque compte commerçant est hermétiquement séparé des autres. Aucun autre
                boutiquier ni aucun concurrent ne peut apercevoir tes ventes, ton inventaire
                ou le nom de tes clients.
              </p>
            </div>
          </div>

          {/* Pilier 3 : Traçabilité complète */}
          <div className="rounded-2xl border border-[rgba(43,33,25,0.12)] bg-[#F5EDE3]/50 p-6 sm:p-7 flex flex-col justify-between">
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FAF6F1] border border-[rgba(43,33,25,0.1)] text-[#C1652D] mb-4">
                <Clock className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-[#2B2119] mb-2">
                Rien ne s'efface en cachette
              </h3>
              <p className="text-xs sm:text-sm text-[#6B5C52] leading-relaxed">
                Chaque annulation de facture, chaque mouvement de stock ou modification importante
                est enregistrée avec le nom de la personne et l'heure précise. Tu gardes un contrôle
                complet sur ce qui se passe dans tes boutiques.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
