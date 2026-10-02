"use client";

import React, { useState } from "react";
import { Store, Phone, MapPin, Tag, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { modifierParametresBoutiqueAction } from "@/app/actions/parametres";

export interface BoutiqueItem {
  id: string;
  code: string;
  nom: string;
  ville: string;
  adresse: string;
  telephone: string | null;
  secteur_activite: string;
  statut: string;
}

interface TabBoutiqueProps {
  boutiques: BoutiqueItem[];
  role: string;
  boutiqueAssigneeId?: string | null;
}

export default function TabBoutique({ boutiques, role, boutiqueAssigneeId }: TabBoutiqueProps) {
  // Sélection initiale de boutique
  const boutiqueInitiale =
    (boutiqueAssigneeId && boutiques.find((b) => b.id === boutiqueAssigneeId)) ||
    boutiques[0] ||
    null;

  const [selectedBoutiqueId, setSelectedBoutiqueId] = useState<string>(boutiqueInitiale?.id || "");
  const boutiqueActuelle = boutiques.find((b) => b.id === selectedBoutiqueId) || boutiqueInitiale;

  const [nom, setNom] = useState(boutiqueActuelle?.nom || "");
  const [ville, setVille] = useState(boutiqueActuelle?.ville || "");
  const [adresse, setAdresse] = useState(boutiqueActuelle?.adresse || "");
  const [telephone, setTelephone] = useState(boutiqueActuelle?.telephone || "");
  const [secteurActivite, setSecteurActivite] = useState(boutiqueActuelle?.secteur_activite || "");

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const handleChangerBoutique = (nouvelleId: string) => {
    setSelectedBoutiqueId(nouvelleId);
    const b = boutiques.find((item) => item.id === nouvelleId);
    if (b) {
      setNom(b.nom);
      setVille(b.ville);
      setAdresse(b.adresse);
      setTelephone(b.telephone || "");
      setSecteurActivite(b.secteur_activite);
      setMessage(null);
      setErreur(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boutiqueActuelle) return;

    setIsLoading(true);
    setMessage(null);
    setErreur(null);

    const formData = new FormData();
    formData.append("boutiqueId", boutiqueActuelle.id);
    formData.append("nom", nom);
    formData.append("ville", ville);
    formData.append("adresse", adresse);
    formData.append("telephone", telephone);
    formData.append("secteurActivite", secteurActivite);

    try {
      const res = await modifierParametresBoutiqueAction(formData);
      if (res.success) {
        setMessage(res.message || "Boutique mise à jour avec succès.");
      } else {
        setErreur(res.error || "Impossible de modifier la boutique.");
      }
    } catch {
      setErreur("Erreur réseau.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!boutiqueActuelle) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-neutral-200 text-center">
        <Store className="w-8 h-8 mx-auto text-neutral-400 mb-2" />
        <h4 className="font-bold text-[#2B2119]">Aucune boutique rattachée</h4>
        <p className="text-xs text-neutral-500 mt-1">
          Aucune boutique active n'a été trouvée pour ce compte.
        </p>
      </div>
    );
  }

  const isLectureSeule = role !== "patron";

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-neutral-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-neutral-100 gap-4">
          <div>
            <h3 className="font-bold text-[#2B2119] text-lg">
              {role === "patron" ? "Coordonnées de la Boutique" : "Ma Boutique Assignée"}
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Ces coordonnées apparaissent sur les reçus émis par ce point de vente.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400 font-medium">Code boutique :</span>
            <span className="font-mono text-xs font-bold px-2.5 py-1 bg-[#FAF6F1] text-[#C1652D] rounded-lg border border-[#C1652D]/20">
              {boutiqueActuelle.code}
            </span>
          </div>
        </div>

        {/* Sélecteur de boutique si rôle Patron avec plusieurs boutiques */}
        {role === "patron" && boutiques.length > 1 && (
          <div className="mb-6 p-4 bg-[#FAF6F1] rounded-xl border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <label className="text-xs font-bold text-[#2B2119] uppercase tracking-wider">
              Sélectionner la boutique à modifier :
            </label>
            <select
              value={selectedBoutiqueId}
              onChange={(e) => handleChangerBoutique(e.target.value)}
              className="px-3.5 py-2 rounded-xl border border-neutral-200 bg-white text-xs font-semibold text-[#2B2119] focus:outline-none focus:ring-2 focus:ring-[#C1652D] cursor-pointer"
            >
              {boutiques.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nom} ({b.code}) — {b.ville}
                </option>
              ))}
            </select>
          </div>
        )}

        {message && (
          <div className="mb-6 p-4 bg-[#FAF6F1] border border-[#C1652D]/30 rounded-xl flex items-center gap-3 text-xs text-[#2B2119] animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-[#C1652D] shrink-0" />
            <span className="font-medium">{message}</span>
          </div>
        )}

        {erreur && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-xs text-rose-800 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{erreur}</span>
          </div>
        )}

        {isLectureSeule ? (
          /* Vue lecture seule pour Gérant et Vendeur */
          <div className="space-y-4 max-w-xl text-xs text-neutral-700">
            <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2.5">
              <div className="flex justify-between">
                <span className="text-neutral-500">Nom de la boutique</span>
                <span className="font-bold text-[#2B2119]">{boutiqueActuelle.nom}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Secteur d'activité</span>
                <span className="font-bold text-[#2B2119]">{boutiqueActuelle.secteur_activite || "Commerce général"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Ville</span>
                <span className="font-bold text-[#2B2119]">{boutiqueActuelle.ville}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Adresse</span>
                <span className="font-bold text-[#2B2119]">{boutiqueActuelle.adresse}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Téléphone caisse</span>
                <span className="font-bold text-[#2B2119]">
                  {boutiqueActuelle.telephone || "Non défini"}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-neutral-400 italic">
              La modification des coordonnées de la boutique est réservée au Patron.
            </p>
          </div>
        ) : (
          /* Formulaire de modification réservé au Patron */
          <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#2B2119] mb-1.5 uppercase tracking-wider">
                  Nom de la boutique *
                </label>
                <div className="relative">
                  <Store className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    required
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#C1652D]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2B2119] mb-1.5 uppercase tracking-wider">
                  Secteur d'activité
                </label>
                <div className="relative">
                  <Tag className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    value={secteurActivite}
                    onChange={(e) => setSecteurActivite(e.target.value)}
                    placeholder="Secteur d'activité"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#C1652D]"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#2B2119] mb-1.5 uppercase tracking-wider">
                  Ville d'implantation *
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    required
                    value={ville}
                    onChange={(e) => setVille(e.target.value)}
                    placeholder="Ville d'implantation"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#C1652D]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2B2119] mb-1.5 uppercase tracking-wider">
                  Ligne téléphonique dédiée
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="tel"
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                    placeholder="Numéro de téléphone de la boutique"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#C1652D]"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2B2119] mb-1.5 uppercase tracking-wider">
                Adresse physique & repères géographiques *
              </label>
              <input
                type="text"
                required
                value={adresse}
                onChange={(e) => setAdresse(e.target.value)}
                placeholder="Adresse physique ou repères"
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#C1652D]"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2.5 bg-[#C1652D] hover:bg-[#A05324] text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer inline-flex items-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Enregistrement...</span>
                  </>
                ) : (
                  <span>Enregistrer les coordonnées de la boutique</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
