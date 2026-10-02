/**
 * Générateur de facture officielle d'abonnement djoonoo
 * Produit un document HTML print-ready format A4 avec mentions légales complètes.
 */

export interface FactureAbonnementData {
  numeroFacture: string;
  dateEmission: string;
  datePaiement: string | null;
  statut: string;
  montant: number;
  forfaitNom: string;
  dureeJours: number;
  fournisseurPaiement: string;
  referenceFedaPay: string | null;
  client: {
    nomEntreprise: string;
    email: string;
    telephone: string;
    ifu?: string | null;
    rccm?: string | null;
    adresse?: string | null;
    ville: string;
  };
}

export function genererHtmlFactureAbonnement(data: FactureAbonnementData): string {
  const estPayee = data.statut === "payee";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Facture djoonoo - ${data.numeroFacture}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { background-color: #f7f7f7; color: #2B2119; padding: 20px; font-size: 13px; line-height: 1.5; }
    .invoice-box { max-width: 800px; margin: 0 auto; background: #fff; padding: 35px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 25px; border-bottom: 2px solid #FAF6F1; }
    .logo-container { display: flex; align-items: center; gap: 10px; }
    .logo-badge { width: 38px; height: 38px; background: #C1652D; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 900; font-size: 20px; }
    .brand-name { font-size: 24px; font-weight: 900; color: #2B2119; letter-spacing: -0.5px; }
    .issuer-info { margin-top: 10px; font-size: 11px; color: #666; line-height: 1.4; }
    .invoice-details { text-align: right; }
    .invoice-title { font-size: 22px; font-weight: 800; color: #2B2119; }
    .invoice-number { font-family: monospace; font-size: 13px; font-weight: 700; color: #C1652D; margin-top: 4px; }
    .meta-line { font-size: 11px; color: #777; margin-top: 3px; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; margin-top: 8px; }
    .status-paid { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
    .status-pending { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
    
    .addresses { display: flex; justify-content: space-between; margin-top: 30px; gap: 20px; }
    .addr-card { flex: 1; background: #FAF6F1; padding: 18px; border-radius: 8px; }
    .addr-title { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: #8c7667; margin-bottom: 6px; }
    .addr-name { font-size: 14px; font-weight: 700; color: #2B2119; }
    .addr-details { font-size: 11px; color: #555; margin-top: 4px; line-height: 1.4; }

    table { width: 100%; border-collapse: collapse; margin-top: 30px; }
    th { background: #2B2119; color: #fff; text-align: left; padding: 10px 14px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    th:last-child { text-align: right; }
    td { padding: 14px; border-bottom: 1px solid #eee; font-size: 12px; }
    td:last-child { text-align: right; font-weight: 700; }
    .item-desc { font-weight: 700; color: #2B2119; }
    .item-sub { font-size: 11px; color: #777; margin-top: 2px; }

    .totals { margin-top: 25px; display: flex; justify-content: flex-end; }
    .totals-table { width: 280px; }
    .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 12px; color: #666; }
    .totals-row.grand-total { border-top: 2px solid #2B2119; padding-top: 10px; margin-top: 6px; font-size: 15px; font-weight: 900; color: #2B2119; }
    .totals-row.grand-total span:last-child { color: #C1652D; font-size: 17px; }

    .payment-stamp { margin-top: 25px; padding: 14px 18px; border-radius: 8px; background: #FAF6F1; border-left: 4px solid #C1652D; display: flex; justify-content: space-between; align-items: center; }
    .stamp-title { font-size: 11px; font-weight: 700; color: #2B2119; }
    .stamp-desc { font-size: 11px; color: #666; }

    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 10px; color: #999; line-height: 1.5; }
    
    .print-bar { text-align: center; margin-bottom: 20px; }
    .btn-print { background: #C1652D; color: #fff; border: none; padding: 10px 24px; font-size: 13px; font-weight: 700; border-radius: 8px; cursor: pointer; }
    .btn-print:hover { background: #A05324; }

    @media print {
      body { background: #fff; padding: 0; }
      .invoice-box { box-shadow: none; padding: 0; border-radius: 0; }
      .print-bar { display: none; }
    }
  </style>
</head>
<body>
  <div class="print-bar">
    <button class="btn-print" onclick="window.print()">Imprimer / Télécharger en PDF</button>
  </div>

  <div class="invoice-box">
    <div class="header">
      <div>
        <div class="logo-container">
          <div class="logo-badge">dj</div>
          <span class="brand-name">djoonoo</span>
        </div>
        <div class="issuer-info">
          <strong>djoonoo Technologies</strong><br>
          Cotonou, République du Bénin<br>
          RCCM : RB/COT/24 B 12345 • IFU : 0202412345678<br>
          Contact : support@djoonoo.com • +229 01 00 00 00
        </div>
      </div>

      <div class="invoice-details">
        <div class="invoice-title">FACTURE</div>
        <div class="invoice-number">${data.numeroFacture}</div>
        <div class="meta-line">Date d'émission : ${data.dateEmission}</div>
        ${data.datePaiement ? `<div class="meta-line">Date de paiement : ${data.datePaiement}</div>` : ""}
        <div>
          <span class="status-badge ${estPayee ? "status-paid" : "status-pending"}">
            ${estPayee ? "ACQUITTÉE" : "EN ATTENTE"}
          </span>
        </div>
      </div>
    </div>

    <div class="addresses">
      <div class="addr-card">
        <div class="addr-title">Facturé à l'entreprise</div>
        <div class="addr-name">${data.client.nomEntreprise}</div>
        <div class="addr-details">
          ${data.client.ville}, République du Bénin<br>
          ${data.client.adresse ? `${data.client.adresse}<br>` : ""}
          Téléphone : ${data.client.telephone}<br>
          E-mail : ${data.client.email}
          ${data.client.ifu ? `<br>IFU : ${data.client.ifu}` : ""}
        </div>
      </div>

      <div class="addr-card">
        <div class="addr-title">Détails de l'abonnement</div>
        <div class="addr-name">Formule ${data.forfaitNom}</div>
        <div class="addr-details">
          Période de validité : ${data.dureeJours} jours<br>
          Passerelle : FedaPay (Bénin)<br>
          ${data.referenceFedaPay ? `Réf. Transaction : ${data.referenceFedaPay}` : ""}
        </div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description du service</th>
          <th>Périodicité</th>
          <th>Montant (FCFA)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <div class="item-desc">Abonnement djoonoo — Forfait ${data.forfaitNom}</div>
            <div class="item-sub">Accès complet à la plateforme SaaS djoonoo (Caisse POS, Ventes, Stocks, Multi-boutiques)</div>
          </td>
          <td>${data.dureeJours} jours</td>
          <td>${data.montant.toLocaleString()} FCFA</td>
        </tr>
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-table">
        <div class="totals-row">
          <span>Sous-total HT</span>
          <span>${data.montant.toLocaleString()} FCFA</span>
        </div>
        <div class="totals-row">
          <span>TVA (0% - Non applicable)</span>
          <span>0 FCFA</span>
        </div>
        <div class="totals-row grand-total">
          <span>Total payé</span>
          <span>${data.montant.toLocaleString()} FCFA</span>
        </div>
      </div>
    </div>

    ${
      estPayee
        ? `<div class="payment-stamp">
        <div>
          <div class="stamp-title">Règlement validé avec succès</div>
          <div class="stamp-desc">Paiement enregistré via FedaPay (MTN MoMo / Moov Money / Carte).</div>
        </div>
        <div style="font-weight:900; color:#065f46; font-size:14px;">ACQUITTÉE</div>
      </div>`
        : ""
    }

    <div class="footer">
      Facture générée automatiquement par la plateforme djoonoo.<br>
      Pour toute question comptable ou fiscale, contactez notre support à support@djoonoo.com.
    </div>
  </div>
</body>
</html>`;
}
