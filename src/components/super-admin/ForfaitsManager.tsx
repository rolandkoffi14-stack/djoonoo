"use client";

import React, { useState, useTransition } from "react";
import {
  Layers,
  Plus,
  Edit2,
  Check,
  X,
  Building2,
  Users,
  CreditCard,
  Infinity as InfinityIcon,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { enregistrerForfaitAction } from "@/app/actions/super-admin";

export interface ForfaitItem {
  id: string;
  nom: string;
  max_boutiques: number | null;
  max_employes_par_boutique: number | null;
  prix_mensuel: number;
  duree_jours: number;
  actif: boolean;
  _count?: {
    comptes: number;
  };
}

interface ForfaitsManagerProps {
  initialForfaits: ForfaitItem[];
}

export default function ForfaitsManager({
  initialForfaits,
}: ForfaitsManagerProps) {
  const [forfaits, setForfaits] = useState<ForfaitItem[]>(initialForfaits);
  const [modalOpen, setModalOpen] = useState(false);
  const [editionForfait, setEditionForfait] = useState<ForfaitItem | null>(null);

  // États du formulaire
  const [nom, setNom] = useState("");
  const [prixMensuel, setPrixMensuel] = useState("10000");
  const [dureeJours, setDureeJours] = useState("30");
  const [illimiteBoutiques, setIllimiteBoutiques] = useState(false);
  const [maxBoutiques, setMaxBoutiques] = useState("1");
  const [illimiteEmployes, setIllimiteEmployes] = useState(false);
  const [maxEmployes, setMaxEmployes] = useState("2");
  const [actif, setActif] = useState(true);

  const [isPending, startTransition] = useTransition();

  const handleOuvrirCreation = () => {
    setEditionForfait(null);
    setNom("");
    setPrixMensuel("15000");
    setDureeJours("30");
    setIllimiteBoutiques(false);
    setMaxBoutiques("1");
    setIllimiteEmployes(false);
    setMaxEmployes("2");
    setActif(true);
    setModalOpen(true);
  };

  const handleOuvrirEdition = (f: ForfaitItem) => {
    setEditionForfait(f);
    setNom(f.nom);
    setPrixMensuel(f.prix_mensuel.toString());
    setDureeJours((f.duree_jours || 30).toString());
    setIllimiteBoutiques(f.max_boutiques === null);
    setMaxBoutiques(f.max_boutiques ? f.max_boutiques.toString() : "1");
    setIllimiteEmployes(f.max_employes_par_boutique === null);
    setMaxEmployes(
      f.max_employes_par_boutique ? f.max_employes_par_boutique.toString() : "2"
    );
    setActif(f.actif);
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData();
    if (editionForfait) {
      formData.set("id", editionForfait.id);
    }
    formData.set("nom", nom);
    formData.set("prix_mensuel", prixMensuel);
    formData.set("duree_jours", dureeJours);
    if (illimiteBoutiques) {
      formData.set("illimite_boutiques", "on");
    } else {
      formData.set("max_boutiques", maxBoutiques);
    }

    if (illimiteEmployes) {
      formData.set("illimite_employes", "on");
    } else {
      formData.set("max_employes", maxEmployes);
    }

    if (actif) {
      formData.set("actif", "on");
    }

    startTransition(async () => {
      const res = await enregistrerForfaitAction(null, formData);
      if (res.success && res.forfait) {
        const saved = res.forfait;
        setForfaits((prev) => {
          const index = prev.findIndex((p) => p.id === saved.id);
          if (index >= 0) {
            const next = [...prev];
            next[index] = { ...next[index], ...saved };
            return next;
          }
          return [...prev, saved];
        });
        setModalOpen(false);
      } else {
        alert(res.error || "Une erreur est survenue.");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-[#C1652D]" />
            <span>Gestion des Forfaits &amp; Quotas (Décision B7)</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configuration des offres commerciales et règles d&apos;illimité (NULL strict en base)
          </p>
        </div>

        <button
          onClick={handleOuvrirCreation}
          className="px-4 py-2.5 bg-[#C1652D] hover:bg-[#A85324] text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2 self-start cursor-pointer shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Créer un forfait</span>
        </button>
      </div>

      {/* Cartes des forfaits */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {forfaits.map((f) => {
          return (
            <div
              key={f.id}
              className={`p-6 rounded-3xl border bg-white shadow-xs flex flex-col justify-between transition-all ${
                f.actif
                  ? "border-slate-200"
                  : "border-slate-200/60 opacity-60 bg-slate-50"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-black text-slate-900">{f.nom}</span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                      f.actif
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {f.actif ? "Actif" : "Désactivé"}
                  </span>
                </div>

                <div className="mb-6">
                  <div className="text-3xl font-black text-[#C1652D] font-mono">
                    {f.prix_mensuel.toLocaleString("fr-FR")}
                    <span className="text-xs font-sans text-slate-500 font-bold ml-1">
                      FCFA / mois
                    </span>
                  </div>
                  {f._count && (
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>{f._count.comptes} entreprise(s) abonnée(s)</span>
                    </div>
                  )}
                </div>

                {/* Quotas & Limites */}
                <div className="space-y-3 pt-4 border-t border-slate-100 text-xs">
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      <span>Nombre max de boutiques</span>
                    </span>
                    <span className="font-bold font-mono text-slate-900">
                      {f.max_boutiques === null ? (
                        <span className="inline-flex items-center gap-1 text-[#C1652D]">
                          <InfinityIcon className="w-3.5 h-3.5" />
                          <span>Illimité (NULL)</span>
                        </span>
                      ) : (
                        `${f.max_boutiques} boutique(s)`
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-700">
                    <span className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span>Employés par boutique</span>
                    </span>
                    <span className="font-bold font-mono text-slate-900">
                      {f.max_employes_par_boutique === null ? (
                        <span className="inline-flex items-center gap-1 text-[#C1652D]">
                          <InfinityIcon className="w-3.5 h-3.5" />
                          <span>Illimité (NULL)</span>
                        </span>
                      ) : (
                        `${f.max_employes_par_boutique} employé(s)`
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-700">
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span>Durée de validité</span>
                    </span>
                    <span className="font-bold font-mono text-[#C1652D]">
                      {f.duree_jours || 30} jours
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-end">
                <button
                  onClick={() => handleOuvrirEdition(f)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors inline-flex items-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Modifier</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modale d'Édition / Création de Forfait */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900">
                {editionForfait ? `Modifier le forfait ${editionForfait.nom}` : "Créer un nouveau forfait"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nom */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nom commercial du forfait
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Solo, Réseau, Empire..."
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#C1652D]"
                />
              </div>

              {/* Prix mensuel */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Prix mensuel (FCFA)
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  step={500}
                  value={prixMensuel}
                  onChange={(e) => setPrixMensuel(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-[#C1652D]"
                />
              </div>

              {/* Durée de validité (Décision H24) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Durée de validité (en jours)
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={dureeJours}
                  onChange={(e) => setDureeJours(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-[#C1652D]"
                  placeholder="30"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Ex: 30 pour 1 mois, 90 pour 1 trimestre, 365 pour 1 an.
                </p>
              </div>

              {/* Quota Boutiques (Décision B7) */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    Boutiques autorisées
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={illimiteBoutiques}
                      onChange={(e) => setIllimiteBoutiques(e.target.checked)}
                      className="rounded text-[#C1652D] focus:ring-[#C1652D]"
                    />
                    <span className="text-xs font-bold text-[#C1652D]">Illimité (NULL)</span>
                  </label>
                </div>

                {!illimiteBoutiques && (
                  <input
                    type="number"
                    min={1}
                    value={maxBoutiques}
                    onChange={(e) => setMaxBoutiques(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-sm font-mono"
                  />
                )}
              </div>

              {/* Quota Employés (Décision B7) */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    Employés max par boutique
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={illimiteEmployes}
                      onChange={(e) => setIllimiteEmployes(e.target.checked)}
                      className="rounded text-[#C1652D] focus:ring-[#C1652D]"
                    />
                    <span className="text-xs font-bold text-[#C1652D]">Illimité (NULL)</span>
                  </label>
                </div>

                {!illimiteEmployes && (
                  <input
                    type="number"
                    min={1}
                    value={maxEmployes}
                    onChange={(e) => setMaxEmployes(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-sm font-mono"
                  />
                )}
              </div>

              {/* Actif toggle */}
              <div className="flex items-center justify-between pt-2">
                <label className="text-xs font-bold text-slate-700">
                  Forfait actif pour les nouvelles souscriptions
                </label>
                <input
                  type="checkbox"
                  checked={actif}
                  onChange={(e) => setActif(e.target.checked)}
                  className="rounded text-[#C1652D] focus:ring-[#C1652D]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl bg-[#C1652D] hover:bg-[#A85324] text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  {isPending ? "Enregistrement..." : "Enregistrer le forfait"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
