"use client";

import React, { useState } from "react";
import { User, ShieldCheck, Building2, Store, Printer } from "lucide-react";
import TabProfil from "./TabProfil";
import TabSecurite from "./TabSecurite";
import TabEntreprise from "./TabEntreprise";
import TabBoutique, { BoutiqueItem } from "./TabBoutique";
import TabCaisse from "./TabCaisse";

export interface ParametresUserProps {
  id: string;
  nom: string;
  email: string;
  telephone: string;
  role: string;
  deux_fa_active: boolean;
  boutique_id?: string | null;
}

export interface ParametresEntrepriseProps {
  nom_entreprise: string;
  forme_juridique: string | null;
  ifu: string | null;
  rccm: string | null;
  telephone_principal: string;
  telephone_secondaire: string | null;
  ville: string;
  adresse_siege: string | null;
  code: string;
}

interface ParametresClientProps {
  user: ParametresUserProps;
  entreprise: ParametresEntrepriseProps;
  boutiques: BoutiqueItem[];
}

export default function ParametresClient({ user, entreprise, boutiques }: ParametresClientProps) {
  const [activeTab, setActiveTab] = useState<string>("profil");

  // Liste des onglets disponibles selon le rôle
  const getTabs = () => {
    const tabs = [
      { id: "profil", label: "Mon Profil", icon: User },
      { id: "securite", label: "Sécurité & 2FA", icon: ShieldCheck },
    ];

    if (user.role === "patron") {
      tabs.push({ id: "entreprise", label: "Mon Entreprise", icon: Building2 });
      tabs.push({ id: "boutique", label: "Boutiques", icon: Store });
    } else {
      // Gérant ou Vendeur
      tabs.push({ id: "boutique", label: "Ma Boutique", icon: Store });
    }

    tabs.push({ id: "caisse", label: "Caisse & Reçus", icon: Printer });

    return tabs;
  };

  const tabs = getTabs();

  return (
    <div className="space-y-6">
      {/* Barre de navigation par onglets */}
      <div className="border-b border-neutral-200">
        <nav className="flex gap-4 sm:gap-8 -mb-px overflow-x-auto pb-px">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-4 px-1 text-sm font-semibold transition border-b-2 flex items-center gap-2 shrink-0 cursor-pointer ${
                  isActive
                    ? "border-[#C1652D] text-[#C1652D]"
                    : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-[#C1652D]" : "text-neutral-400"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Contenu de l'onglet actif */}
      <div>
        {activeTab === "profil" && (
          <TabProfil
            initialNom={user.nom}
            initialTelephone={user.telephone}
            initialEmail={user.email}
            role={user.role}
          />
        )}

        {activeTab === "securite" && (
          <TabSecurite
            role={user.role}
            deuxFaActive={user.deux_fa_active}
          />
        )}

        {activeTab === "entreprise" && user.role === "patron" && (
          <TabEntreprise entreprise={entreprise} />
        )}

        {activeTab === "boutique" && (
          <TabBoutique
            boutiques={boutiques}
            role={user.role}
            boutiqueAssigneeId={user.boutique_id}
          />
        )}

        {activeTab === "caisse" && <TabCaisse />}
      </div>
    </div>
  );
}
