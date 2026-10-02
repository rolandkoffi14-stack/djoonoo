"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  Printer,
  X,
  CheckCircle2,
  FileText,
  Receipt,
  Building2,
  Store,
  Clock,
  Phone,
  User,
} from "lucide-react";
import { RecuVenteData } from "@/app/actions/ventes";

export interface RecuVenteModalProps {
  recu: RecuVenteData;
  onClose: () => void;
  titreSucces?: string;
}

export default function RecuVenteModal({
  recu,
  onClose,
  titreSucces = "Vente enregistrée avec succès !",
}: RecuVenteModalProps) {
  // Format d'impression actif : "ticket_80mm" par défaut, ou "facture_a4"
  const [formatActif, setFormatActif] = useState<"ticket_80mm" | "facture_a4">("ticket_80mm");
  const [customMsgTicket, setCustomMsgTicket] = useState<string>("Merci de votre visite et à très bientôt !");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const prefFormat = localStorage.getItem("djoonoo_pref_format_impression");
    if (prefFormat === "ticket_80mm" || prefFormat === "facture_a4") {
      setFormatActif(prefFormat);
    }
    const prefMsg = localStorage.getItem("djoonoo_pref_msg_ticket");
    if (prefMsg) {
      setCustomMsgTicket(prefMsg);
    }
  }, []);

  const dateFormatee = new Date(recu.date_vente).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const modePaiementLibelle = recu.mode_paiement
    ? recu.mode_paiement === "especes"
      ? "Espèces"
      : recu.mode_paiement === "mtn_momo"
      ? "MTN Mobile Money"
      : "Moov Money"
    : "Non payé (Vente à crédit)";

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        declencherImpression();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [formatActif]);

  useEffect(() => {
    return () => {
      const iframe = document.getElementById("iframe-impression-recu");
      if (iframe) iframe.remove();
    };
  }, []);

  function declencherImpression() {
    try {
      const element = document.getElementById("document-imprimable");
      if (!element) {
        window.print();
        return;
      }

      // Supprimer un ancien iframe s'il existe
      const ancienIframe = document.getElementById("iframe-impression-recu");
      if (ancienIframe) {
        ancienIframe.remove();
      }

      const iframe = document.createElement("iframe");
      iframe.id = "iframe-impression-recu";
      // Positionnement hors-champ réel (sans opacity:0 ni visibility:hidden pour éviter que Chromium ne bloque le rendu de print)
      iframe.style.position = "fixed";
      iframe.style.top = "-9999px";
      iframe.style.left = "-9999px";
      iframe.style.width = "800px";
      iframe.style.height = "1000px";
      iframe.style.border = "none";
      iframe.style.pointerEvents = "none";
      document.body.appendChild(iframe);

      const pri = iframe.contentWindow;
      if (!pri) {
        window.print();
        return;
      }

      // Cloner toutes les feuilles de styles (Tailwind, polices Google Fonts, variables CSS)
      const styles = Array.from(
        document.querySelectorAll("link[rel='stylesheet'], style")
      )
        .map((s) => s.outerHTML)
        .join("\n");

      const pageCss =
        formatActif === "ticket_80mm"
          ? `@page { 
               size: 80mm auto; 
               margin: 0; 
             }
             *, *::before, *::after { 
               box-sizing: border-box; 
               -webkit-print-color-adjust: exact !important;
               print-color-adjust: exact !important;
             }
             html, body { 
               margin: 0 !important; 
               padding: 0 !important; 
               background: #ffffff !important; 
               color: #2B2119 !important; 
               font-family: monospace, "Courier New", Courier, monospace !important;
               width: 80mm !important;
               visibility: visible !important;
               opacity: 1 !important;
             }
             .conteneur-print {
               width: 78mm !important;
               max-width: 78mm !important;
               margin: 0 auto !important;
               padding: 3mm 2mm !important;
               background: #ffffff !important;
               visibility: visible !important;
               opacity: 1 !important;
             }
             .conteneur-print * {
               visibility: visible !important;
               opacity: 1 !important;
             }
             .conteneur-print > div {
               box-shadow: none !important;
               border: none !important;
               border-radius: 0 !important;
               margin: 0 !important;
               padding: 0 !important;
               width: 100% !important;
               max-width: 100% !important;
             }`
          : `@page { 
               size: A4 portrait; 
               margin: 8mm; 
             }
             *, *::before, *::after { 
               box-sizing: border-box; 
               -webkit-print-color-adjust: exact !important;
               print-color-adjust: exact !important;
             }
             html, body { 
               margin: 0 !important; 
               padding: 0 !important; 
               background: #ffffff !important; 
               color: #2B2119 !important; 
               font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
               width: 100% !important;
               visibility: visible !important;
               opacity: 1 !important;
             }
             .conteneur-print {
               width: 100% !important;
               max-width: 100% !important;
               margin: 0 !important;
               padding: 0 !important;
               background: #ffffff !important;
               visibility: visible !important;
               opacity: 1 !important;
             }
             .conteneur-print * {
               visibility: visible !important;
               opacity: 1 !important;
             }
             .conteneur-print > div {
               box-shadow: none !important;
               border: none !important;
               border-radius: 0 !important;
               margin: 0 !important;
               width: 100% !important;
               max-width: 100% !important;
             }`;

      pri.document.open();
      pri.document.write(
        "<!DOCTYPE html>" +
        "<html lang=\"fr\">" +
        "<head>" +
        "<meta charset=\"utf-8\" />" +
        "<title>Facture " + recu.numero_facture + "</title>" +
        styles +
        "<style>" + pageCss + "</style>" +
        "</head>" +
        "<body>" +
        "<div class=\"conteneur-print\">" +
        element.innerHTML +
        "</div>" +
        "</body>" +
        "</html>"
      );
      pri.document.close();

      let printed = false;
      const lancerImpression = () => {
        if (printed) return;
        printed = true;
        try {
          pri.focus();
          pri.print();
        } catch (err) {
          console.error("Erreur pri.print, repli sur window.print", err);
          window.print();
        }
      };

      const nettoyerIframe = () => {
        try {
          if (iframe.parentNode) {
            iframe.remove();
          }
        } catch {}
      };

      // Nettoyer uniquement quand la boîte de dialogue d'impression est fermée
      pri.onafterprint = nettoyerIframe;

      // Attendre que les styles et le DOM soient calculés
      if (pri.document.readyState === "complete") {
        setTimeout(lancerImpression, 150);
      } else {
        pri.onload = () => {
          setTimeout(lancerImpression, 150);
        };
        setTimeout(lancerImpression, 400);
      }

      // Nettoyage de sécurité après 2 minutes
      setTimeout(nettoyerIframe, 120000);
    } catch (e) {
      console.error("Erreur impression iframe, fallback window.print", e);
      window.print();
    }
  }

  if (!mounted) return null;

  return createPortal(
    <div
      id="portal-recu-racine"
      className="fixed inset-0 z-50 bg-[#2B2119]/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
    >

      <div
        className="bg-[#FAF6F1] border border-[#E5DACF] rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-auto"
      >
        {/* ======================================================== */}
        {/* BARRE D'ACTIONS SUPÉRIEURE (print:hidden)                 */}
        {/* ======================================================== */}
        <div className="zone-print-ignore p-3.5 sm:p-4 bg-[#FAF6F1] border-b border-[#E5DACF] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-[#C1652D]/10 text-[#C1652D] shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </span>
            <span className="font-extrabold text-sm text-[#2B2119] truncate">
              {titreSucces}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Commutateur de formats : 80 mm vs A4 */}
            <div className="flex items-center bg-[#E5DACF]/50 p-0.5 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setFormatActif("ticket_80mm")}
                className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  formatActif === "ticket_80mm"
                    ? "bg-white text-[#2B2119] shadow-xs"
                    : "text-[#6D5D52] hover:text-[#2B2119]"
                }`}
              >
                <Receipt className="w-3.5 h-3.5 text-[#C1652D]" />
                <span>Ticket (80 mm)</span>
              </button>
              <button
                type="button"
                onClick={() => setFormatActif("facture_a4")}
                className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  formatActif === "facture_a4"
                    ? "bg-white text-[#2B2119] shadow-xs"
                    : "text-[#6D5D52] hover:text-[#2B2119]"
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-[#C1652D]" />
                <span>Facture (A4)</span>
              </button>
            </div>

            {/* Bouton d'impression */}
            <button
              type="button"
              onClick={declencherImpression}
              className="px-3.5 py-1.5 rounded-xl bg-[#2B2119] text-[#FAF6F1] text-xs font-bold hover:bg-black transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimer</span>
            </button>

            {/* Bouton Fermer */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-[#E5DACF] text-[#6D5D52] hover:text-[#2B2119] cursor-pointer transition-colors"
              title="Fermer la fenêtre"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* CORPS VISIBLE & IMPRIMABLE DU REÇU / FACTURE             */}
        {/* ======================================================== */}
        <div className="p-4 sm:p-6 max-h-[75vh] overflow-y-auto bg-stone-100/60 flex justify-center">
          <div id="document-imprimable">
            {formatActif === "ticket_80mm" ? (
              /* ======================================================== */
              /* FORMAT 1 : TICKET DE CAISSE THERMIQUE 80 MM              */
              /* ======================================================== */
              <div className="w-[78mm] max-w-[78mm] p-4 sm:p-5 bg-white text-[#2B2119] font-mono text-[11px] space-y-3.5 shadow-md rounded-xl border border-stone-200 my-1">
                {/* En-tête ticket : Nom entreprise en tout premier */}
                <div className="text-center space-y-1 border-b border-dashed border-stone-300 pb-3">
                  {/* 1. NOM DE L'ENTREPRISE TOUT EN HAUT */}
                  <div className="text-sm font-black tracking-tight text-[#2B2119] uppercase leading-tight">
                    {recu.entreprise?.nom || recu.boutique.nom}
                  </div>

                  {/* 2. NOM DE LA BOUTIQUE */}
                  <div className="text-xs font-bold text-[#6D5D52]">
                    {recu.boutique.nom}
                  </div>

                  {/* 3. COORDONNÉES */}
                  <div className="text-[10px] text-stone-600">
                    {recu.boutique.adresse}, {recu.boutique.ville}
                  </div>
                  {(recu.boutique.telephone || recu.entreprise?.telephone_principal) && (
                    <div className="text-[10px] text-stone-600">
                      Tél : {recu.boutique.telephone || recu.entreprise?.telephone_principal}
                    </div>
                  )}

                  {/* Mentions fiscales si disponibles */}
                  {(recu.entreprise?.ifu || recu.entreprise?.rccm) && (
                    <div className="text-[9px] text-stone-500 font-sans">
                      {recu.entreprise?.ifu && <span>IFU: {recu.entreprise.ifu} </span>}
                      {recu.entreprise?.rccm && <span>• RCCM: {recu.entreprise.rccm}</span>}
                    </div>
                  )}

                  {/* Numéro facture & date */}
                  <div className="pt-2 text-[11px] font-extrabold text-[#C1652D]">
                    FACTURE N° {recu.numero_facture}
                  </div>
                  <div className="text-[10px] text-stone-500">{dateFormatee}</div>
                  <div className="text-[10px] text-stone-600">Vendeur : {recu.vendeur.nom}</div>
                  {recu.client ? (
                    <div className="text-[10px] font-bold text-stone-800 pt-0.5">
                      Client : {recu.client.nom} ({recu.client.telephone})
                    </div>
                  ) : (
                    <div className="text-[10px] text-stone-500 italic pt-0.5">
                      Client : Au comptoir (Anonyme)
                    </div>
                  )}
                </div>

                {/* Articles */}
                <div className="space-y-1.5 border-b border-dashed border-stone-300 pb-3">
                  <div className="flex justify-between font-bold text-stone-500 text-[10px] uppercase">
                    <span>Désignation</span>
                    <span>Total</span>
                  </div>

                  {recu.lignes.map((l, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <div className="flex justify-between font-semibold">
                        <span className="truncate pr-1">{l.produit_nom}</span>
                        <span className="shrink-0">{l.total_ligne.toLocaleString("fr-FR")} F</span>
                      </div>
                      <div className="text-[10px] text-stone-500">
                        {l.quantite} x {l.prix_unitaire.toLocaleString("fr-FR")} F
                      </div>
                      {(l.imei1 || l.imei2) && (
                        <div className="text-[9px] text-[#C1652D] font-mono">
                          {l.imei1 && <div>IMEI 1 : {l.imei1}</div>}
                          {l.imei2 && <div>IMEI 2 : {l.imei2}</div>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Récapitulatif financier */}
                <div className="space-y-1.5 border-b border-dashed border-stone-300 pb-3">
                  <div className="flex justify-between text-stone-600">
                    <span>Total brut :</span>
                    <span>{recu.montant_brut.toLocaleString("fr-FR")} FCFA</span>
                  </div>

                  {recu.montant_remise > 0 && (
                    <div className="flex justify-between text-[#C1652D] font-semibold">
                      <span>Remise accordée :</span>
                      <span>-{recu.montant_remise.toLocaleString("fr-FR")} FCFA</span>
                    </div>
                  )}

                  <div className="flex justify-between text-xs font-black text-stone-900 pt-1 border-t border-stone-200">
                    <span>NET À PAYER :</span>
                    <span>{recu.montant_total.toLocaleString("fr-FR")} FCFA</span>
                  </div>

                  <div className="flex justify-between text-stone-700 pt-0.5">
                    <span>Montant réglé :</span>
                    <span className="font-bold">{recu.montant_paye.toLocaleString("fr-FR")} FCFA</span>
                  </div>

                  {recu.monnaie_rendue > 0 && (
                    <div className="flex justify-between text-[#C1652D] font-bold">
                      <span>Monnaie rendue :</span>
                      <span>{recu.monnaie_rendue.toLocaleString("fr-FR")} FCFA</span>
                    </div>
                  )}

                  {recu.montant_total > recu.montant_paye && (
                    <div className="flex justify-between text-red-700 font-bold">
                      <span>Reste dû :</span>
                      <span>
                        {(recu.montant_total - recu.montant_paye).toLocaleString("fr-FR")} FCFA
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-[10px] text-stone-600 pt-1">
                    <span>Règlement :</span>
                    <span className="font-semibold">{modePaiementLibelle}</span>
                  </div>
                </div>

                {/* Pied de ticket */}
                <div className="text-center text-[10px] text-stone-500 pt-2 space-y-1.5 border-t border-dashed border-stone-200">
                  <div>{customMsgTicket || "Merci de votre visite et à très bientôt !"}</div>
                  <div className="flex items-center justify-center gap-1.5 text-[9px] font-sans font-bold text-stone-400">
                    <span>Propulsé par</span>
                    <div className="relative h-3 w-12 inline-block">
                      <Image
                        src="/brand/01_horizontal_logos/djoonoo_logo_clair_transparent.svg"
                        alt="djoonoo"
                        fill
                        className="object-contain"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* ======================================================== */
              /* FORMAT 2 : FACTURE OFFICIELLE AU FORMAT A4               */
              /* ======================================================== */
              <div className="w-full max-w-[210mm] p-6 sm:p-10 bg-white text-[#2B2119] font-sans text-xs space-y-6 shadow-md border border-stone-200 rounded-xl my-1">
                {/* En-tête A4 : 2 colonnes */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-[#E5DACF] pb-6">
                  {/* Colonne Gauche : Émetteur (Entreprise d'abord, puis Boutique) */}
                  <div className="space-y-1.5 flex-1">
                    {/* 1. NOM DE L'ENTREPRISE EN GRAND */}
                    <h2 className="text-xl sm:text-2xl font-black text-[#2B2119] tracking-tight uppercase">
                      {recu.entreprise?.nom || recu.boutique.nom}
                    </h2>

                    {/* 2. BOUTIQUE ET COORDONNÉES */}
                    <div className="text-sm font-bold text-[#C1652D] flex items-center gap-1.5">
                      <Store className="w-4 h-4" />
                      <span>{recu.boutique.nom}</span>
                    </div>

                    <p className="text-xs text-[#6D5D52] leading-relaxed">
                      {recu.boutique.adresse}, {recu.boutique.ville}
                    </p>

                    <div className="text-xs text-[#6D5D52] flex flex-wrap gap-x-4 gap-y-1 pt-0.5">
                      {(recu.boutique.telephone || recu.entreprise?.telephone_principal) && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-[#C1652D]" />
                          <span>Tél : {recu.boutique.telephone || recu.entreprise?.telephone_principal}</span>
                        </span>
                      )}
                    </div>

                    {/* Mentions légales de l'entreprise */}
                    {(recu.entreprise?.ifu || recu.entreprise?.rccm) && (
                      <div className="text-[11px] text-[#8C7A6B] font-mono pt-1 space-x-3">
                        {recu.entreprise?.ifu && <span>IFU : {recu.entreprise.ifu}</span>}
                        {recu.entreprise?.rccm && <span>RCCM : {recu.entreprise.rccm}</span>}
                      </div>
                    )}
                  </div>

                  {/* Colonne Droite : Cartouche Facture */}
                  <div className="bg-[#FAF6F1] border border-[#E5DACF] p-4 rounded-xl min-w-[220px] text-right space-y-2">
                    <div className="text-lg font-black tracking-wider text-[#2B2119]">
                      FACTURE
                    </div>
                    <div className="font-mono text-xs font-bold text-[#C1652D]">
                      {recu.numero_facture}
                    </div>
                    <div className="text-[11px] text-[#6D5D52] flex items-center justify-end gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{dateFormatee}</span>
                    </div>
                    <div className="pt-1">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          recu.statut_paiement === "paye"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : recu.statut_paiement === "partiel"
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : "bg-red-100 text-red-800 border border-red-200"
                        }`}
                      >
                        {recu.statut_paiement === "paye"
                          ? "Payé"
                          : recu.statut_paiement === "partiel"
                          ? "Acompte partiel"
                          : "Impayé (Crédit)"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bloc Destinataire & Vendeur : 2 colonnes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#FAF6F1]/60 p-4 rounded-xl border border-[#E5DACF]/60">
                  <div>
                    <span className="text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider block mb-1">
                      Facturé à :
                    </span>
                    {recu.client ? (
                      <div>
                        <div className="font-bold text-sm text-[#2B2119]">{recu.client.nom}</div>
                        <div className="text-xs text-[#6D5D52] font-mono mt-0.5">
                          Tél : {recu.client.telephone}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-[#6D5D52] italic">
                        Client comptoir (Vente anonyme)
                      </div>
                    )}
                  </div>

                  <div className="sm:text-right">
                    <span className="text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider block mb-1">
                      Détails de la vente :
                    </span>
                    <div className="text-xs text-[#2B2119]">
                      Servi par : <span className="font-bold">{recu.vendeur.nom}</span>
                    </div>
                    <div className="text-xs text-[#6D5D52] mt-0.5">
                      Règlement : <span className="font-semibold">{modePaiementLibelle}</span>
                    </div>
                  </div>
                </div>

                {/* Tableau A4 des Produits */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#E5DACF] bg-[#FAF6F1] text-[11px] font-extrabold text-[#2B2119]">
                        <th className="py-2.5 px-3 w-10 text-center">#</th>
                        <th className="py-2.5 px-3">Désignation de l&apos;article</th>
                        <th className="py-2.5 px-3 text-center w-20">Qté</th>
                        <th className="py-2.5 px-3 text-right w-32">Prix unitaire</th>
                        <th className="py-2.5 px-3 text-right w-36">Total (FCFA)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5DACF]/60 text-xs">
                      {recu.lignes.map((ligne, idx) => (
                        <tr key={idx} className="hover:bg-stone-50/50">
                          <td className="py-2.5 px-3 text-center text-[#8C7A6B] font-mono text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-[#2B2119]">{ligne.produit_nom}</div>
                            {(ligne.imei1 || ligne.imei2) && (
                              <div className="text-[10px] text-[#C1652D] font-mono mt-0.5 space-x-2">
                                {ligne.imei1 && <span>IMEI 1 : {ligne.imei1}</span>}
                                {ligne.imei2 && <span>• IMEI 2 : {ligne.imei2}</span>}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold">
                            {ligne.quantite}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-[#6D5D52]">
                            {ligne.prix_unitaire.toLocaleString("fr-FR")}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-[#2B2119]">
                            {ligne.total_ligne.toLocaleString("fr-FR")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Synthèse financière et conditions */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-4 border-t border-[#E5DACF]">
                  {/* Conditions & Mentions à gauche */}
                  <div className="space-y-2 flex-1 text-[11px] text-[#8C7A6B] leading-relaxed max-w-sm">
                    <p className="font-bold text-[#6D5D52]">Conditions de vente :</p>
                    <p>
                      Les marchandises vendues ne sont ni reprises ni échangées après validation,
                      sauf vice de conformité signalé sous 24h.
                    </p>
                    <p className="font-semibold text-[#2B2119]">
                      Merci pour votre fidélité et votre confiance !
                    </p>
                  </div>

                  {/* Totaux à droite */}
                  <div className="w-full sm:w-72 space-y-2 bg-[#FAF6F1] p-4 rounded-xl border border-[#E5DACF]">
                    <div className="flex justify-between text-xs text-[#6D5D52]">
                      <span>Total brut :</span>
                      <span className="font-mono">{recu.montant_brut.toLocaleString("fr-FR")} FCFA</span>
                    </div>

                    {recu.montant_remise > 0 && (
                      <div className="flex justify-between text-xs text-[#C1652D] font-semibold">
                        <span>Remise accordée :</span>
                        <span className="font-mono">-{recu.montant_remise.toLocaleString("fr-FR")} FCFA</span>
                      </div>
                    )}

                    <div className="flex justify-between text-sm font-black text-[#2B2119] pt-2 border-t border-[#E5DACF]">
                      <span>NET À PAYER :</span>
                      <span className="font-mono text-[#C1652D]">
                        {recu.montant_total.toLocaleString("fr-FR")} FCFA
                      </span>
                    </div>

                    <div className="flex justify-between text-xs text-[#6D5D52] pt-1">
                      <span>Montant versé :</span>
                      <span className="font-mono font-bold text-[#2B2119]">
                        {recu.montant_paye.toLocaleString("fr-FR")} FCFA
                      </span>
                    </div>

                    {recu.monnaie_rendue > 0 && (
                      <div className="flex justify-between text-xs text-[#C1652D] font-bold">
                        <span>Monnaie rendue :</span>
                        <span className="font-mono">
                          {recu.monnaie_rendue.toLocaleString("fr-FR")} FCFA
                        </span>
                      </div>
                    )}

                    {recu.montant_total > recu.montant_paye && (
                      <div className="flex justify-between text-xs text-red-700 font-extrabold pt-1 border-t border-red-200">
                        <span>Reste à payer :</span>
                        <span className="font-mono">
                          {(recu.montant_total - recu.montant_paye).toLocaleString("fr-FR")} FCFA
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bas de page officiel A4 */}
                <div className="pt-6 border-t border-stone-200 text-center text-[10px] text-stone-400 flex flex-col items-center justify-center gap-1.5">
                  <div className="flex items-center justify-center gap-1.5 font-bold text-stone-400">
                    <span>Document de vente généré via</span>
                    <div className="relative h-3.5 w-14 inline-block">
                      <Image
                        src="/brand/01_horizontal_logos/djoonoo_logo_clair_transparent.svg"
                        alt="djoonoo"
                        fill
                        className="object-contain"
                      />
                    </div>
                  </div>
                  <div className="text-[9px] text-stone-400">Plateforme de gestion commerciale & de caisse</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* PIED DE MODALE : ACTION SUIVANTE (print:hidden)          */}
        {/* ======================================================== */}
        <div className="zone-print-ignore p-3.5 sm:p-4 bg-[#FAF6F1] border-t border-[#E5DACF] flex items-center justify-between gap-3">
          <div className="text-xs text-[#6D5D52] hidden sm:block">
            {formatActif === "ticket_80mm"
              ? "Format standard adapté aux imprimantes thermiques de caisse (80 mm)."
              : "Format entreprise pleine page A4 prêt pour archivage ou impression bureau."}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#C1652D] text-[#FAF6F1] text-xs font-bold hover:bg-[#a95524] transition-colors cursor-pointer text-center shadow-xs"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
