"use client";

import React, { useState, useTransition } from "react";
import { Settings, Save, CheckCircle2, AlertCircle } from "lucide-react";
import { modifierParametrePlateformeAction } from "@/app/actions/super-admin";

export interface ParametreItem {
  cle: string;
  valeur: string;
  description: string | null;
}

interface ParametresManagerProps {
  initialParametres: ParametreItem[];
}

export default function ParametresManager({
  initialParametres,
}: ParametresManagerProps) {
  const [parametres, setParametres] = useState<ParametreItem[]>(initialParametres);
  const [valeurs, setValeurs] = useState<Record<string, string>>(
    initialParametres.reduce((acc, p) => ({ ...acc, [p.cle]: p.valeur }), {})
  );
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleEnregistrer = (cle: string, description?: string | null) => {
    setMessage(null);
    const nouvelleValeur = valeurs[cle];

    startTransition(async () => {
      const res = await modifierParametrePlateformeAction(
        cle,
        nouvelleValeur,
        description || undefined
      );

      if (res.success) {
        setMessage({
          type: "success",
          text: `Paramètre « ${cle} » mis à jour avec succès.`,
        });
        setParametres((prev) =>
          prev.map((p) => (p.cle === cle ? { ...p, valeur: nouvelleValeur } : p))
        );
      } else {
        setMessage({
          type: "error",
          text: res.error || "Erreur de mise à jour.",
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-amber-500" />
          <span>Paramètres Plateforme (Clé-Valeur)</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Configuration centrale des règles de cycle de vie et d&apos;abonnement
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-2xl border text-sm flex items-center gap-2.5 ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Liste des paramètres */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
        {parametres.map((p) => (
          <div key={p.cle} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="font-mono font-bold text-sm text-slate-900">{p.cle}</div>
              <div className="text-xs text-slate-500 mt-0.5">
                {p.description || "Aucune description fournie."}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="text"
                value={valeurs[p.cle] ?? ""}
                onChange={(e) =>
                  setValeurs((prev) => ({ ...prev, [p.cle]: e.target.value }))
                }
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 w-32 text-center focus:outline-none focus:border-[#C1652D]"
              />
              <button
                onClick={() => handleEnregistrer(p.cle, p.description)}
                disabled={isPending}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-[#C1652D] text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Sauvegarder</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
