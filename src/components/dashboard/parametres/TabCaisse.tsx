"use client";

import React, { useState, useEffect } from "react";
import { Printer, Receipt, FileText, CheckCircle2, Sparkles, MessageSquare } from "lucide-react";

export default function TabCaisse() {
  const [formatImpression, setFormatImpression] = useState<"ticket_80mm" | "facture_a4">("ticket_80mm");
  const [messagePied, setMessagePied] = useState<string>("Merci de votre visite ! À très bientôt.");
  const [sauvegarde, setSauvegarde] = useState(false);

  useEffect(() => {
    // Charger depuis le localStorage au montage
    const savedFormat = localStorage.getItem("djoonoo_pref_format_impression");
    if (savedFormat === "ticket_80mm" || savedFormat === "facture_a4") {
      setFormatImpression(savedFormat);
    }

    const savedMsg = localStorage.getItem("djoonoo_pref_msg_ticket");
    if (savedMsg) {
      setMessagePied(savedMsg);
    }
  }, []);

  const handleEnregistrer = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("djoonoo_pref_format_impression", formatImpression);
    localStorage.setItem("djoonoo_pref_msg_ticket", messagePied);

    setSauvegarde(true);
    setTimeout(() => setSauvegarde(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-neutral-200/80 shadow-xs">
        <div className="flex items-center gap-3 pb-6 mb-6 border-b border-neutral-100">
          <div className="p-2.5 bg-[#FAF6F1] text-[#C1652D] rounded-xl">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-[#2B2119] text-lg">Caisse POS & Reçus de Vente</h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Personnalise ton imprimante de caisse et les mentions imprimées remises aux clients.
            </p>
          </div>
        </div>

        {sauvegarde && (
          <div className="mb-6 p-4 bg-[#FAF6F1] border border-[#C1652D]/30 rounded-xl flex items-center gap-3 text-xs text-[#2B2119] animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-[#C1652D] shrink-0" />
            <span className="font-medium">Préférences de caisse enregistrées avec succès sur ce poste.</span>
          </div>
        )}

        <form onSubmit={handleEnregistrer} className="space-y-6">
          {/* Choix du format d'impression */}
          <div>
            <label className="block text-xs font-bold text-[#2B2119] mb-3 uppercase tracking-wider">
              Format d'impression par défaut
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
              {/* Option 1 : Ticket thermique 80mm */}
              <div
                onClick={() => setFormatImpression("ticket_80mm")}
                className={`p-4 rounded-2xl border-2 transition cursor-pointer flex items-start gap-3.5 ${
                  formatImpression === "ticket_80mm"
                    ? "border-[#C1652D] bg-[#FAF6F1]/50 ring-2 ring-[#C1652D]/10"
                    : "border-neutral-200 hover:border-neutral-300 bg-white"
                }`}
              >
                <div className={`p-2.5 rounded-xl ${formatImpression === "ticket_80mm" ? "bg-[#C1652D] text-white" : "bg-neutral-100 text-neutral-500"}`}>
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-[#2B2119]">Ticket Thermique (80 mm)</h4>
                    <span className="text-[10px] bg-[#C1652D]/10 text-[#C1652D] border border-[#C1652D]/20 font-bold px-2 py-0.5 rounded-full">
                      Recommandé
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                    Idéal pour les imprimantes de caisse POS / tickets de caisse compacts à sortie rapide.
                  </p>
                </div>
              </div>

              {/* Option 2 : Facture A4 */}
              <div
                onClick={() => setFormatImpression("facture_a4")}
                className={`p-4 rounded-2xl border-2 transition cursor-pointer flex items-start gap-3.5 ${
                  formatImpression === "facture_a4"
                    ? "border-[#C1652D] bg-[#FAF6F1]/50 ring-2 ring-[#C1652D]/10"
                    : "border-neutral-200 hover:border-neutral-300 bg-white"
                }`}
              >
                <div className={`p-2.5 rounded-xl ${formatImpression === "facture_a4" ? "bg-[#C1652D] text-white" : "bg-neutral-100 text-neutral-500"}`}>
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#2B2119]">Facture A4 Standard</h4>
                  <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                    Format pleine page adapté aux imprimantes bureautiques traditionnelles et archivage.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Message de pied de ticket */}
          <div className="max-w-xl">
            <label className="block text-xs font-bold text-[#2B2119] mb-1.5 uppercase tracking-wider">
              Message personnalisé en bas de ticket
            </label>
            <div className="relative">
              <MessageSquare className="w-4 h-4 absolute left-3.5 top-3 text-neutral-400" />
              <textarea
                rows={2}
                value={messagePied}
                onChange={(e) => setMessagePied(e.target.value)}
                placeholder="Message personnalisé en pied de ticket..."
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#C1652D]"
              />
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">
              Ce texte sera imprimé au bas de chaque reçu délivré au client en caisse.
            </p>
          </div>

          {/* Aperçu direct du ticket */}
          <div className="max-w-sm p-4 bg-[#FAF6F1] rounded-2xl border border-neutral-200/80 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#2B2119]">
              <Sparkles className="w-3.5 h-3.5 text-[#C1652D]" />
              <span>Aperçu du pied de reçu</span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-dashed border-neutral-300 text-center font-mono text-xs text-neutral-600">
              <p className="text-[11px] text-neutral-400">--- FIN DE TICKET ---</p>
              <p className="font-semibold text-[#2B2119] mt-1.5 italic text-xs">
                « {messagePied || "Merci pour votre achat !"} »
              </p>
              <p className="text-[10px] text-neutral-400 mt-2 font-sans">
                Logiciel de caisse propulsé par djoonoo
              </p>
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="px-6 py-2.5 bg-[#C1652D] hover:bg-[#A05324] text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer inline-flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Enregistrer mes préférences de caisse</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
