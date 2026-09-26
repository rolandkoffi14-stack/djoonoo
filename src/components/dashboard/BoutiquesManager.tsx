"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Store,
  Plus,
  MapPin,
  Phone,
  Tag,
  Users,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Loader2,
  X,
  AlertCircle,
  ArrowRight,
  Power,
} from "lucide-react";
import { creerBoutiqueAction, changerStatutBoutiqueAction } from "@/app/actions/boutiques";

export interface BoutiqueItem {
  id: string;
  code: string;
  nom: string;
  secteur_activite: string;
  adresse: string;
  ville: string;
  telephone: string | null;
  statut: "actif" | "inactif";
  nbEmployes: number;
  date_creation: string;
}

interface BoutiquesManagerProps {
  boutiques: BoutiqueItem[];
  forfait: {
    nom: string;
    max_boutiques: number | null;
  };
  prochainCode: string;
}

export default function BoutiquesManager({
  boutiques,
  forfait,
  prochainCode,
}: BoutiquesManagerProps) {
  const router = useRouter();
  const [modalOuverte, setModalOuverte] = useState(false);
  const [upgradeModalOuverte, setUpgradeModalOuverte] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const [actionBoutiqueId, setActionBoutiqueId] = useState<string | null>(null);

  const totalBoutiques = boutiques.length;
  const maxAtteint =
    forfait.max_boutiques !== null && totalBoutiques >= forfait.max_boutiques;

  function handleOuvrirModal() {
    if (maxAtteint) {
      setUpgradeModalOuverte(true);
    } else {
      setErreur(null);
      setModalOuverte(true);
    }
  }

  async function handleCreerBoutique(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await creerBoutiqueAction(null, formData);
      if (!res.success) {
        setErreur(res.error || "Une erreur est survenue lors de la création.");
      } else {
        setModalOuverte(false);
        router.refresh();
      }
    });
  }

  async function handleToggleStatut(boutiqueId: string, statutActuel: "actif" | "inactif") {
    const nouveauStatut = statutActuel === "actif" ? "inactif" : "actif";
    setActionBoutiqueId(boutiqueId);

    startTransition(async () => {
      const res = await changerStatutBoutiqueAction(boutiqueId, nouveauStatut);
      if (!res.success) {
        alert(res.error || "Impossible de modifier le statut de la boutique.");
      } else {
        router.refresh();
      }
      setActionBoutiqueId(null);
    });
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec statistiques et CTA */}
      <div className="bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-1.5 rounded-lg bg-[#C1652D]/10 text-[#C1652D]">
                <Store className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-extrabold text-[#2B2119]">
                Mes Boutiques & Points de vente
              </h1>
            </div>
            <p className="text-xs text-[#6D5D52] max-w-xl">
              Gère tes différents points de vente, ouvre de nouveaux établissements et contrôle leur statut d&apos;activité selon ton forfait.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Badge Consommation Forfait */}
            <div className="px-3.5 py-2 rounded-xl bg-[#E5DACF]/40 border border-[#E5DACF] text-xs font-semibold text-[#2B2119] flex items-center gap-2">
              <span className="text-[#6D5D52]">Forfait {forfait.nom} :</span>
              <span className="font-bold text-[#C1652D]">
                {forfait.max_boutiques === null
                  ? `${totalBoutiques} boutique(s) (Illimité)`
                  : `${totalBoutiques} / ${forfait.max_boutiques} boutique(s)`}
              </span>
            </div>

            <button
              onClick={handleOuvrirModal}
              className="px-4 py-2.5 rounded-xl bg-[#C1652D] text-[#FAF6F1] font-bold text-xs hover:bg-[#a95524] transition-colors flex items-center gap-2 shadow-sm focus:outline-none cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nouvelle boutique</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grille des boutiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {boutiques.map((b) => {
          const estActif = b.statut === "actif";
          const enCoursDeModification = actionBoutiqueId === b.id && isPending;

          return (
            <div
              key={b.id}
              className={`rounded-2xl border transition-all duration-200 bg-[#FAF6F1] flex flex-col justify-between p-5 ${
                estActif
                  ? "border-[#E5DACF] hover:border-[#C1652D]/40 shadow-sm"
                  : "border-[#E5DACF]/60 opacity-80 bg-[#FAF6F1]/60"
              }`}
            >
              {/* En-tête de carte */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-[#C1652D]/10 text-[#C1652D] font-mono font-extrabold text-xs">
                      {b.code}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        estActif
                          ? "bg-green-100 text-green-800"
                          : "bg-stone-200 text-stone-700"
                      }`}
                    >
                      {estActif ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-green-600" />
                          <span>Actif</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 text-stone-500" />
                          <span>Inactif</span>
                        </>
                      )}
                    </span>
                  </div>

                  <span className="text-[11px] text-[#8C7A6B]">
                    {b.nbEmployes} collaborateur{b.nbEmployes > 1 ? "s" : ""}
                  </span>
                </div>

                <h3 className="font-extrabold text-base text-[#2B2119] mb-1">
                  {b.nom}
                </h3>

                <div className="space-y-1.5 text-xs text-[#6D5D52] mt-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[#8C7A6B] shrink-0" />
                    <span className="truncate">
                      {b.ville} • {b.adresse}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-[#8C7A6B] shrink-0" />
                    <span className="truncate">{b.secteur_activite}</span>
                  </div>

                  {b.telephone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-[#8C7A6B] shrink-0" />
                      <span className="truncate">{b.telephone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Pied de carte avec statut et action */}
              <div className="mt-5 pt-3.5 border-t border-[#E5DACF] flex items-center justify-between text-xs">
                <span className="text-[#8C7A6B] text-[11px]">
                  Créée le {new Date(b.date_creation).toLocaleDateString("fr-FR")}
                </span>

                <button
                  onClick={() => handleToggleStatut(b.id, b.statut)}
                  disabled={enCoursDeModification}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-colors focus:outline-none cursor-pointer ${
                    estActif
                      ? "text-stone-600 hover:text-stone-900 hover:bg-stone-200/50"
                      : "text-[#C1652D] hover:bg-[#C1652D]/10"
                  }`}
                  title={
                    estActif
                      ? "Désactiver temporairement cette boutique"
                      : "Réactiver cette boutique"
                  }
                >
                  {enCoursDeModification ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Power className="w-3.5 h-3.5" />
                  )}
                  <span>{estActif ? "Désactiver" : "Réactiver"}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modale de Création de Boutique */}
      {modalOuverte && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl max-w-lg w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
            {/* Header Modale */}
            <div className="flex items-center justify-between pb-4 border-b border-[#E5DACF]">
              <div>
                <h2 className="text-lg font-extrabold text-[#2B2119]">
                  Ouvrir une nouvelle boutique
                </h2>
                <p className="text-xs text-[#6D5D52] mt-0.5">
                  Prochain code séquentiel attribué :{" "}
                  <strong className="font-mono text-[#C1652D]">{prochainCode}</strong>
                </p>
              </div>
              <button
                onClick={() => setModalOuverte(false)}
                className="p-1 rounded-lg text-[#8C7A6B] hover:text-[#2B2119] hover:bg-[#E5DACF]/50 focus:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Message d'erreur */}
            {erreur && (
              <div className="my-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{erreur}</span>
              </div>
            )}

            {/* Formulaire */}
            <form onSubmit={handleCreerBoutique} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-[#2B2119] mb-1">
                  Nom de la boutique *
                </label>
                <input
                  type="text"
                  name="nom"
                  required
                  placeholder="Ex : Boutique Cadjèhoun, Annexe Akpakpa"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-xs font-medium text-[#2B2119] placeholder:text-[#8C7A6B] focus:outline-none focus:ring-2 focus:ring-[#C1652D]/30 focus:border-[#C1652D]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#2B2119] mb-1">
                    Ville *
                  </label>
                  <input
                    type="text"
                    name="ville"
                    required
                    placeholder="Ex : Cotonou, Parakou"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-xs font-medium text-[#2B2119] placeholder:text-[#8C7A6B] focus:outline-none focus:ring-2 focus:ring-[#C1652D]/30 focus:border-[#C1652D]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2B2119] mb-1">
                    Téléphone boutique
                  </label>
                  <input
                    type="tel"
                    name="telephone"
                    placeholder="Ex : +229 97 00 00 00"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-xs font-medium text-[#2B2119] placeholder:text-[#8C7A6B] focus:outline-none focus:ring-2 focus:ring-[#C1652D]/30 focus:border-[#C1652D]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2B2119] mb-1">
                  Adresse complète / Emplacement *
                </label>
                <input
                  type="text"
                  name="adresse"
                  required
                  placeholder="Ex : Rue 108, face Pharmacie des Étoiles"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-xs font-medium text-[#2B2119] placeholder:text-[#8C7A6B] focus:outline-none focus:ring-2 focus:ring-[#C1652D]/30 focus:border-[#C1652D]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2B2119] mb-1">
                  Secteur d&apos;activité
                </label>
                <input
                  type="text"
                  name="secteur_activite"
                  defaultValue="Commerce général"
                  placeholder="Ex : Mode, Quincaillerie, Cosmétique"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5DACF] bg-[#FAF6F1] text-xs font-medium text-[#2B2119] placeholder:text-[#8C7A6B] focus:outline-none focus:ring-2 focus:ring-[#C1652D]/30 focus:border-[#C1652D]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5DACF]">
                <button
                  type="button"
                  onClick={() => setModalOuverte(false)}
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#6D5D52] hover:bg-[#E5DACF]/50 transition-colors focus:outline-none"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2.5 rounded-xl bg-[#C1652D] text-[#FAF6F1] text-xs font-bold hover:bg-[#a95524] transition-colors flex items-center gap-2 shadow-sm focus:outline-none disabled:opacity-50"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Créer la boutique</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale d'Upgrade si limite de forfait atteinte */}
      {upgradeModalOuverte && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl max-w-md w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5DACF]">
              <div className="flex items-center gap-2 text-[#C1652D]">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="font-extrabold text-base text-[#2B2119]">
                  Limite de boutique atteinte
                </h3>
              </div>
              <button
                onClick={() => setUpgradeModalOuverte(false)}
                className="p-1 rounded-lg text-[#8C7A6B] hover:text-[#2B2119] hover:bg-[#E5DACF]/50 focus:outline-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs text-[#6D5D52] leading-relaxed">
              <p>
                Ton abonnement actuel <strong>Forfait {forfait.nom}</strong> autorise un maximum de{" "}
                <strong>{forfait.max_boutiques} boutique(s)</strong>.
              </p>
              <p>
                Pour gérer plusieurs magasins simultanément et attribuer des gérants dédiés, passe au{" "}
                <strong>Forfait Réseau</strong> (jusqu&apos;à 3 boutiques) ou <strong>Forfait Empire</strong> (boutiques illimitées).
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5DACF]">
              <button
                onClick={() => setUpgradeModalOuverte(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-[#6D5D52] hover:bg-[#E5DACF]/50 transition-colors"
              >
                Plus tard
              </button>
              <Link
                href="/dashboard/abonnement"
                className="px-4 py-2 rounded-xl bg-[#C1652D] text-[#FAF6F1] text-xs font-bold hover:bg-[#a95524] transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <span>Découvrir les forfaits</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
