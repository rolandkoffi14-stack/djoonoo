"use client";

import React, { useState } from "react";
import { User, Mail, Phone, Shield, Loader2, CheckCircle2, AlertCircle, Lock } from "lucide-react";
import { modifierProfilAction } from "@/app/actions/parametres";

interface TabProfilProps {
  initialNom: string;
  initialTelephone: string;
  initialEmail: string;
  role: string;
}

export default function TabProfil({
  initialNom,
  initialTelephone,
  initialEmail,
  role,
}: TabProfilProps) {
  const [nom, setNom] = useState(initialNom);
  const [telephone, setTelephone] = useState(initialTelephone);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);
    setErreur(null);

    const formData = new FormData();
    formData.append("nom", nom);
    formData.append("telephone", telephone);

    try {
      const res = await modifierProfilAction(formData);
      if (res.success) {
        setMessage(res.message || "Profil mis à jour avec succès.");
      } else {
        setErreur(res.error || "Impossible de mettre à jour le profil.");
      }
    } catch {
      setErreur("Erreur réseau lors de la mise à jour.");
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleLabel = () => {
    switch (role) {
      case "patron":
        return { label: "Patron / Propriétaire", bg: "bg-[#C1652D]/10 text-[#C1652D] border border-[#C1652D]/30" };
      case "gerant":
        return { label: "Gérant de boutique", bg: "bg-[#FAF6F1] text-[#2B2119] border border-[#E5DACF]" };
      case "vendeur":
      default:
        return { label: "Vendeur / Caisse", bg: "bg-[#FAF6F1] text-[#6D5D52] border border-[#E5DACF]" };
    }
  };

  const roleInfo = getRoleLabel();

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-neutral-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-neutral-100 gap-4">
          <div>
            <h3 className="font-bold text-[#2B2119] text-lg">Informations personnelles</h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Tes coordonnées de contact et ton identifiant de connexion.
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 self-start sm:self-auto ${roleInfo.bg}`}>
            <Shield className="w-3.5 h-3.5" />
            <span>{roleInfo.label}</span>
          </span>
        </div>

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

        <form onSubmit={handleSubmit} className="space-y-5 max-w-xl">
          <div>
            <label className="block text-xs font-bold text-[#2B2119] mb-1.5 uppercase tracking-wider">
              Nom complet
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                required
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Nom et prénoms"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm text-[#2B2119] focus:outline-none focus:ring-2 focus:ring-[#C1652D]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#2B2119] mb-1.5 uppercase tracking-wider">
              Numéro de téléphone
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="tel"
                required
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                placeholder="Numéro de téléphone"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm text-[#2B2119] focus:outline-none focus:ring-2 focus:ring-[#C1652D]"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-[#2B2119] uppercase tracking-wider">
                Adresse email (Identifiant de connexion)
              </label>
              <span className="text-[11px] font-semibold text-[#8C7A6B] inline-flex items-center gap-1">
                <Lock className="w-3 h-3 text-[#8C7A6B]" />
                Non modifiable
              </span>
            </div>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C7A6B]" />
              <input
                type="email"
                readOnly
                disabled
                value={initialEmail}
                placeholder="Adresse email"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E5DACF] bg-[#FAF6F1]/70 text-[#6D5D52] text-sm cursor-not-allowed select-none"
              />
            </div>
            <p className="text-[11px] text-[#8C7A6B] mt-1.5">
              L&apos;adresse email constitue ton identifiant unique et inaltérable de connexion au SaaS djoonoo.
            </p>
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
                <span>Enregistrer les modifications</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
