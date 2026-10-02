"use client";

import React, { useState } from "react";
import { Building2, FileText, Phone, MapPin, Hash, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { modifierEntrepriseAction } from "@/app/actions/parametres";

interface TabEntrepriseProps {
  entreprise: {
    nom_entreprise: string;
    forme_juridique: string | null;
    ifu: string | null;
    rccm: string | null;
    telephone_principal: string;
    telephone_secondaire: string | null;
    ville: string;
    adresse_siege: string | null;
    code: string;
  };
}

export default function TabEntreprise({ entreprise }: TabEntrepriseProps) {
  const [nomEntreprise, setNomEntreprise] = useState(entreprise.nom_entreprise);
  const [formeJuridique, setFormeJuridique] = useState(entreprise.forme_juridique || "");
  const [ifu, setIfu] = useState(entreprise.ifu || "");
  const [rccm, setRccm] = useState(entreprise.rccm || "");
  const [telephonePrincipal, setTelephonePrincipal] = useState(entreprise.telephone_principal);
  const [telephoneSecondaire, setTelephoneSecondaire] = useState(entreprise.telephone_secondaire || "");
  const [ville, setVille] = useState(entreprise.ville);
  const [adresseSiege, setAdresseSiege] = useState(entreprise.adresse_siege || "");

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);
    setErreur(null);

    const formData = new FormData();
    formData.append("nom_entreprise", nomEntreprise);
    formData.append("forme_juridique", formeJuridique);
    formData.append("ifu", ifu);
    formData.append("rccm", rccm);
    formData.append("telephone_principal", telephonePrincipal);
    formData.append("telephone_secondaire", telephoneSecondaire);
    formData.append("ville", ville);
    formData.append("adresse_siege", adresseSiege);

    try {
      const res = await modifierEntrepriseAction(formData);
      if (res.success) {
        setMessage(res.message || "Informations enregistrées avec succès.");
      } else {
        setErreur(res.error || "Impossible d'enregistrer.");
      }
    } catch {
      setErreur("Erreur réseau.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-neutral-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-neutral-100 gap-4">
          <div>
            <h3 className="font-bold text-[#2B2119] text-lg">Identité légale & Siège social</h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Ces informations figurent sur tes reçus et documents officiels djoonoo.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400 font-medium">Code compte :</span>
            <span className="font-mono text-xs font-bold px-2.5 py-1 bg-neutral-100 text-[#2B2119] rounded-lg border border-neutral-200">
              {entreprise.code}
            </span>
          </div>
        </div>

        {message && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-xs text-emerald-800 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{message}</span>
          </div>
        )}

        {erreur && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-xs text-rose-800 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{erreur}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
          {/* Ligne 1 : Nom Entreprise & Forme Juridique */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#2B2119] mb-1.5 uppercase tracking-wider">
                Raison sociale / Nom commercial *
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  required
                  value={nomEntreprise}
                  onChange={(e) => setNomEntreprise(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#C1652D]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2B2119] mb-1.5 uppercase tracking-wider">
                Forme Juridique
              </label>
              <input
                type="text"
                value={formeJuridique}
                onChange={(e) => setFormeJuridique(e.target.value)}
                placeholder="Ex: SARL, Entreprise Individuelle, ETS"
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#C1652D]"
              />
            </div>
          </div>

          {/* Ligne 2 : Identifiants Légaux (IFU & RCCM) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#2B2119] mb-1.5 uppercase tracking-wider">
                Numéro IFU (Fiscal)
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={ifu}
                  onChange={(e) => setIfu(e.target.value)}
                  placeholder="Ex: 0202012345678"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#C1652D]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2B2119] mb-1.5 uppercase tracking-wider">
                Numéro RCCM (Commerce)
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={rccm}
                  onChange={(e) => setRccm(e.target.value)}
                  placeholder="Ex: RB/COT/21 B 12345"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#C1652D]"
                />
              </div>
            </div>
          </div>

          {/* Ligne 3 : Téléphones */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#2B2119] mb-1.5 uppercase tracking-wider">
                Téléphone principal *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="tel"
                  required
                  value={telephonePrincipal}
                  onChange={(e) => setTelephonePrincipal(e.target.value)}
                  placeholder="+229 97 00 00 00"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#C1652D]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2B2119] mb-1.5 uppercase tracking-wider">
                Téléphone secondaire
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="tel"
                  value={telephoneSecondaire}
                  onChange={(e) => setTelephoneSecondaire(e.target.value)}
                  placeholder="Optionnel"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#C1652D]"
                />
              </div>
            </div>
          </div>

          {/* Ligne 4 : Ville & Adresse Siège */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#2B2119] mb-1.5 uppercase tracking-wider">
                Ville du siège *
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  required
                  value={ville}
                  onChange={(e) => setVille(e.target.value)}
                  placeholder="Ex: Cotonou"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#C1652D]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2B2119] mb-1.5 uppercase tracking-wider">
                Adresse physique du siège
              </label>
              <input
                type="text"
                value={adresseSiege}
                onChange={(e) => setAdresseSiege(e.target.value)}
                placeholder="Ex: Haie Vive, Carré 120"
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#C1652D]"
              />
            </div>
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
                <span>Sauvegarder les informations légales</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
