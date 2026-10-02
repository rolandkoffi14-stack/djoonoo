"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle,
  ShieldCheck,
  Lock,
  Smartphone,
  CreditCard,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { initierPaiementAbonnementAction } from "@/app/actions/subscription";

interface ForfaitProps {
  id: string;
  nom: string;
  prix_mensuel: number;
  duree_jours: number;
  max_boutiques: number | null;
  max_employes_par_boutique: number | null;
}

interface CompteProps {
  id: string;
  nomEntreprise: string;
  email: string;
  telephone: string;
}

interface MethodeProps {
  id: string;
  type: string;
  numero_telephone: string;
  nom_titulaire?: string | null;
  derniers_chiffres: string;
  par_defaut: boolean;
}

interface CheckoutClientProps {
  forfait: ForfaitProps;
  compte: CompteProps;
  methodesPaiement: MethodeProps[];
}

export default function CheckoutClient({
  forfait,
  compte,
  methodesPaiement,
}: CheckoutClientProps) {
  // Méthode par défaut présélectionnée si disponible
  const methodeParDefaut = methodesPaiement.find((m) => m.par_defaut) || methodesPaiement[0];

  const [selectedMethodeId, setSelectedMethodeId] = useState<string>(
    methodeParDefaut ? methodeParDefaut.id : "nouveau"
  );
  const [nouveauType, setNouveauType] = useState<string>("mtn_momo");
  const [nouveauTelephone, setNouveauTelephone] = useState<string>(compte.telephone || "");
  const [saveAsDefault, setSaveAsDefault] = useState<boolean>(methodesPaiement.length === 0);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const handlePayer = async () => {
    setIsLoading(true);
    setErreur(null);

    try {
      let telephonePaiement: string | undefined = undefined;
      let methodeType: string | undefined = undefined;

      if (selectedMethodeId === "nouveau") {
        if (!nouveauTelephone || nouveauTelephone.trim().length < 8) {
          setErreur("Veuillez saisir un numéro de téléphone valide.");
          setIsLoading(false);
          return;
        }
        telephonePaiement = nouveauTelephone.trim();
        methodeType = nouveauType;
      } else {
        const methodeChoisie = methodesPaiement.find((m) => m.id === selectedMethodeId);
        if (methodeChoisie) {
          telephonePaiement = methodeChoisie.numero_telephone;
          methodeType = methodeChoisie.type;
        }
      }

      const res = await initierPaiementAbonnementAction({
        forfaitId: forfait.id,
        telephonePaiement,
        enregistrerParDefaut: selectedMethodeId === "nouveau" ? saveAsDefault : false,
        methodeType,
      });

      if (res.success && res.urlPaiement) {
        window.location.href = res.urlPaiement;
      } else {
        setErreur(res.error || "Impossible d'initialiser le paiement.");
        setIsLoading(false);
      }
    } catch (err: any) {
      setErreur(err.message || "Erreur de connexion.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF6F1] flex flex-col lg:flex-row">
      {/* ======================================================== */}
      {/* VOLET GAUCHE (SOMBRE #2B2119 - Récapitulatif commande)   */}
      {/* ======================================================== */}
      <div className="w-full lg:w-1/2 bg-[#2B2119] text-white p-8 sm:p-12 lg:p-16 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-neutral-800">
        <div>
          {/* Retour */}
          <Link
            href="/dashboard/abonnement"
            className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-400 hover:text-white transition mb-10"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour à mon abonnement</span>
          </Link>

          {/* Logo djoonoo */}
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-xl bg-[#C1652D] flex items-center justify-center font-black text-white text-lg">
              dj
            </div>
            <span className="text-xl font-bold tracking-tight">djoonoo</span>
          </div>

          <p className="text-xs uppercase tracking-widest text-neutral-400 font-semibold mb-2">
            Abonnement SaaS
          </p>
          <h1 className="text-3xl sm:text-4xl font-black text-white">
            Forfait {forfait.nom}
          </h1>

          <div className="mt-6 flex items-baseline gap-2">
            <span className="text-4xl sm:text-5xl font-black text-white">
              {forfait.prix_mensuel.toLocaleString()}
            </span>
            <span className="text-lg font-bold text-[#C1652D]">FCFA</span>
            <span className="text-xs text-neutral-400">/{forfait.duree_jours} jours</span>
          </div>

          {/* Fonctionnalités incluses */}
          <div className="mt-10 pt-8 border-t border-neutral-800/80 space-y-3.5 text-sm text-neutral-300">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-4 h-4 text-[#C1652D] shrink-0" />
              <span>
                {forfait.max_boutiques === null
                  ? "Boutiques illimitées"
                  : `${forfait.max_boutiques} boutique${forfait.max_boutiques > 1 ? "s" : ""}`}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <CheckCircle className="w-4 h-4 text-[#C1652D] shrink-0" />
              <span>
                {forfait.max_employes_par_boutique === null
                  ? "Employés illimités"
                  : `Jusqu'à ${forfait.max_employes_par_boutique} employé${
                      forfait.max_employes_par_boutique > 1 ? "s" : ""
                    } par boutique`}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <CheckCircle className="w-4 h-4 text-[#C1652D] shrink-0" />
              <span>Caisse POS & reçus instantanés</span>
            </div>

            <div className="flex items-center gap-3">
              <CheckCircle className="w-4 h-4 text-[#C1652D] shrink-0" />
              <span>Gestion des stocks et alertes de seuil</span>
            </div>

            <div className="flex items-center gap-3">
              <CheckCircle className="w-4 h-4 text-[#C1652D] shrink-0" />
              <span>Facturation et rapports financiers exportables</span>
            </div>
          </div>
        </div>

        {/* Total et récapitulatif comptable */}
        <div className="mt-12 pt-8 border-t border-neutral-800 space-y-3 text-xs">
          <div className="flex justify-between text-neutral-400">
            <span>Sous-total</span>
            <span className="font-semibold text-white">{forfait.prix_mensuel.toLocaleString()} FCFA</span>
          </div>

          <div className="flex justify-between text-neutral-400">
            <span>TVA (Régime standard)</span>
            <span className="font-semibold text-white">0 FCFA</span>
          </div>

          <div className="flex justify-between text-sm font-bold text-white pt-3 border-t border-neutral-800">
            <span>Total dû aujourd'hui</span>
            <span className="text-base text-[#C1652D] font-extrabold">
              {forfait.prix_mensuel.toLocaleString()} FCFA
            </span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* VOLET DROIT (CLAIR #FAF6F1 - Choix moyen & finalisation) */}
      {/* ======================================================== */}
      <div className="w-full lg:w-1/2 p-8 sm:p-12 lg:p-16 flex flex-col justify-between">
        <div className="max-w-md mx-auto w-full space-y-8">
          {erreur && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold">Erreur de paiement</p>
                <p className="mt-0.5">{erreur}</p>
              </div>
            </div>
          )}

          {/* Coordonnées */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Coordonnées de l'entreprise
            </h2>
            <div className="p-4 bg-white rounded-2xl border border-neutral-200/80 shadow-xs space-y-1">
              <p className="text-xs text-neutral-500">Compte commerçant</p>
              <p className="text-sm font-bold text-[#2B2119]">{compte.nomEntreprise}</p>
              <p className="text-xs text-neutral-600">{compte.email}</p>
            </div>
          </div>

          {/* Moyen de paiement */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Moyen de paiement Mobile Money & Cartes
            </h2>

            {/* Liste des méthodes enregistrées avec sélection par défaut */}
            {methodesPaiement.length > 0 && (
              <div className="space-y-2">
                {methodesPaiement.map((m) => (
                  <label
                    key={m.id}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border-2 cursor-pointer transition ${
                      selectedMethodeId === m.id
                        ? "bg-white border-[#C1652D] ring-2 ring-[#C1652D]/10"
                        : "bg-white border-neutral-200 hover:border-neutral-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="methode_paiement"
                        value={m.id}
                        checked={selectedMethodeId === m.id}
                        onChange={() => setSelectedMethodeId(m.id)}
                        className="w-4 h-4 text-[#C1652D] focus:ring-[#C1652D]"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#2B2119] capitalize">
                            {m.type === "mtn_momo"
                              ? "MTN Mobile Money"
                              : m.type === "moov_money"
                              ? "Moov Money"
                              : "Carte Bancaire"}
                          </span>
                          {m.par_defaut && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#C1652D]/10 text-[#C1652D] border border-[#C1652D]/20">
                              Par défaut
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-mono text-neutral-600 mt-0.5">
                          •••• •••• •• {m.derniers_chiffres}
                        </p>
                      </div>
                    </div>

                    <Smartphone className="w-4 h-4 text-neutral-400" />
                  </label>
                ))}
              </div>
            )}

            {/* Option pour saisir un nouveau numéro */}
            <div className="space-y-3">
              <label
                className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition ${
                  selectedMethodeId === "nouveau"
                    ? "bg-white border-[#C1652D] ring-2 ring-[#C1652D]/10"
                    : "bg-white border-neutral-200 hover:border-neutral-300"
                }`}
              >
                <input
                  type="radio"
                  name="methode_paiement"
                  value="nouveau"
                  checked={selectedMethodeId === "nouveau"}
                  onChange={() => setSelectedMethodeId("nouveau")}
                  className="w-4 h-4 text-[#C1652D] focus:ring-[#C1652D]"
                />
                <span className="text-xs font-bold text-[#2B2119]">
                  {methodesPaiement.length > 0 ? "Utiliser un autre moyen ou numéro" : "Saisir mon numéro Mobile Money"}
                </span>
              </label>

              {selectedMethodeId === "nouveau" && (
                <div className="p-4 bg-white rounded-2xl border border-neutral-200 space-y-3 animate-in fade-in duration-150">
                  {/* Choix opérateur */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setNouveauType("mtn_momo")}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                        nouveauType === "mtn_momo"
                          ? "bg-[#C1652D]/10 border-[#C1652D] text-[#C1652D]"
                          : "border-neutral-200 hover:bg-neutral-50 text-neutral-700"
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5 text-[#C1652D]" />
                      <span>MTN MoMo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNouveauType("moov_money")}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                        nouveauType === "moov_money"
                          ? "bg-[#C1652D]/10 border-[#C1652D] text-[#C1652D]"
                          : "border-neutral-200 hover:bg-neutral-50 text-neutral-700"
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5 text-[#C1652D]" />
                      <span>Moov Money</span>
                    </button>
                  </div>

                  {/* Saisie numéro */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Numéro de téléphone
                    </label>
                    <input
                      type="tel"
                      value={nouveauTelephone}
                      onChange={(e) => setNouveauTelephone(e.target.value)}
                      placeholder="+229 97 12 34 56"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#C1652D]"
                    />
                  </div>

                  {/* Mémoriser comme par défaut */}
                  <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={saveAsDefault}
                      onChange={(e) => setSaveAsDefault(e.target.checked)}
                      className="w-4 h-4 rounded text-[#C1652D] focus:ring-[#C1652D] border-neutral-300"
                    />
                    <span className="text-xs font-medium text-neutral-700">
                      Enregistrer comme moyen de paiement par défaut
                    </span>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Bouton de confirmation & paiement */}
          <div className="space-y-4 pt-2">
            <button
              onClick={handlePayer}
              disabled={isLoading}
              className="w-full py-4 px-6 rounded-2xl font-bold text-sm text-white bg-[#C1652D] hover:bg-[#A05324] transition shadow-md flex items-center justify-center gap-2.5 disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Redirection vers FedaPay...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  <span>Confirmer et payer {forfait.prix_mensuel.toLocaleString()} FCFA</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-2 text-xs text-neutral-500 text-center">
              <Lock className="w-3.5 h-3.5 text-[#C1652D] shrink-0" />
              <span>Passerelle certifiée FedaPay • Chiffrement sécurisé 256-bit</span>
            </div>
          </div>
        </div>

        {/* Mentions de pied */}
        <div className="max-w-md mx-auto w-full pt-8 text-[11px] text-neutral-400 text-center space-y-1">
          <p>En confirmant, vous autorisez djoonoo à initier la transaction FedaPay.</p>
          <p>Activation instantanée à réception du paiement.</p>
        </div>
      </div>
    </div>
  );
}
