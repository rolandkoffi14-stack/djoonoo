import { ShieldCheck, Lock, Smartphone, FileText, CheckCircle2 } from "lucide-react";

export default function SecuritySection() {
  return (
    <section id="securite" className="py-20 sm:py-28 bg-[#F3ECE2]/60 border-t border-[rgba(43,33,25,0.08)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Texte explicatif */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#C1652D]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#C1652D]" />
              Sécurité non négociable
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#2B2119]">
              Tes données de vente et de stock protégées à chaque instant
            </h2>
            <p className="text-base text-[#6B5C52] leading-relaxed">
              Dans un environnement commercial où le Mobile Money est central, la sécurité ne doit
              laisser aucune place au hasard. djoonoo intègre une protection robuste et éprouvée.
            </p>

            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FAF6F1] border border-[rgba(43,33,25,0.1)] text-[#C1652D]">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#2B2119]">
                    Authentification 2FA par TOTP obligatoire
                  </h4>
                  <p className="text-xs text-[#6B5C52] mt-0.5 leading-relaxed">
                    Connexion sécurisée par Google Authenticator ou Authy pour le Patron et le Gérant.
                    Protège efficacement contre les attaques par échange de carte SIM (SIM-swap).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FAF6F1] border border-[rgba(43,33,25,0.1)] text-[#C1652D]">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#2B2119]">
                    Isolation étanche par compte (Multi-tenant)
                  </h4>
                  <p className="text-xs text-[#6B5C52] mt-0.5 leading-relaxed">
                    Chaque compte Patron possède son cloisonnement strict via <code className="bg-[#FAF6F1] px-1 py-0.5 rounded text-[#2B2119]">compte_id</code>. Aucun autre commerçant ne peut accéder à tes chiffres.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FAF6F1] border border-[rgba(43,33,25,0.1)] text-[#C1652D]">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#2B2119]">
                    Journal d'audit inaltérable
                  </h4>
                  <p className="text-xs text-[#6B5C52] mt-0.5 leading-relaxed">
                    Chaque annulation de vente, changement de prix ou transfert de personnel est tracé
                    avec horodatage pour une transparence totale.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Carte visuelle de sécurité */}
          <div className="lg:col-span-6">
            <div className="rounded-2xl border border-[rgba(43,33,25,0.12)] bg-[#FFFFFF] p-8 shadow-[0_4px_16px_rgba(43,33,25,0.06)] space-y-6">
              <div className="flex items-center justify-between pb-6 border-b border-[rgba(43,33,25,0.08)]">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EDF7EE] text-[#1E7E34]">
                    <ShieldCheck className="h-7 w-7" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-[#2B2119]">Protection active</h4>
                    <p className="text-xs text-[#6B5C52]">Normes de sécurité bancaire & RGPD / APDP</p>
                  </div>
                </div>
                <span className="rounded-full bg-[#EDF7EE] px-3 py-1 text-xs font-bold text-[#1E7E34]">
                  100% Vérifié
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-lg bg-[#FAF6F1] border border-[rgba(43,33,25,0.06)]">
                  <span className="text-[#6B5C52]">Sessions sécurisées :</span>
                  <span className="font-bold text-[#2B2119]">Cookies HttpOnly & JWT signés</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-[#FAF6F1] border border-[rgba(43,33,25,0.06)]">
                  <span className="text-[#6B5C52]">Mots de passe :</span>
                  <span className="font-bold text-[#2B2119]">Hachage fort bcrypt/argon2</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-[#FAF6F1] border border-[rgba(43,33,25,0.06)]">
                  <span className="text-[#6B5C52]">Rate limiting anti-brute-force :</span>
                  <span className="font-bold text-[#2B2119]">Double couche (Caddy + Postgres)</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-[#FAF6F1] border border-[rgba(43,33,25,0.06)]">
                  <span className="text-[#6B5C52]">Sauvegardes quotidiennes :</span>
                  <span className="font-bold text-[#2B2119]">Automatisées Supabase</span>
                </div>
              </div>

              <p className="text-[11px] text-[#6B5C52] text-center pt-2">
                Édité et maintenu par <strong>ETS. 2KR DIGITAL</strong> • Cocotomey, République du Bénin
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
