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
    .logo-container { display: flex; align-items: center; }
    .logo-container svg { height: 40px; width: auto; }
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
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 192" height="42" role="img" aria-label="djoonoo logo">
            <g>
              <g transform="translate(-8,-4) scale(0.390625)">
                <path d="M 321.000 106.000 L 246.000 154.000 L 243.000 331.000 C 240.000 349.000 231.000 358.000 219.000 361.000 C 204.000 367.000 186.000 364.000 174.000 355.000 C 162.000 346.000 156.000 334.000 157.500 319.000 C 159.000 304.000 166.500 292.000 178.500 284.500 C 190.500 277.000 207.000 274.000 222.000 277.000 L 222.000 199.000 L 189.000 199.000 C 135.000 199.000 99.000 238.000 96.000 292.000 C 91.500 337.000 108.000 376.000 138.000 404.500 C 162.000 424.000 189.000 430.000 216.000 430.000 C 258.000 428.500 294.000 406.000 312.000 370.000 C 321.000 352.000 324.000 334.000 324.000 316.000 L 324.000 151.000 L 321.000 106.000 Z" fill="#C1652D"/>
                <rect x="372.000" y="82.000" width="48.000" height="48.000" fill="#C1652D"/>
                <rect x="339.000" y="124.000" width="27.000" height="27.000" fill="#C1652D"/>
                <rect x="363.000" y="160.000" width="24.000" height="24.000" fill="#C1652D"/>
              </g>
              <path d="M213.552 63.544H224.16V114.0H214.02800000000002V109.784Q210.084 114.544 202.604 114.544Q197.436 114.544 193.25400000000002 112.232Q189.072 109.92 186.692 105.636Q184.312 101.352 184.312 95.708Q184.312 90.064 186.692 85.78Q189.072 81.496 193.25400000000002 79.184Q197.436 76.872 202.604 76.872Q209.608 76.872 213.552 81.292ZM213.756 95.708Q213.756 91.084 211.10399999999998 88.33Q208.452 85.576 204.44 85.576Q200.36 85.576 197.70800000000003 88.33Q195.056 91.084 195.056 95.708Q195.056 100.332 197.70800000000003 103.086Q200.36 105.84 204.44 105.84Q208.452 105.84 211.10399999999998 103.086Q213.756 100.332 213.756 95.708Z M222.732 125.696 225.58800000000002 118.012Q227.424 119.304 230.07600000000002 119.304Q232.116 119.304 233.27200000000002 117.97800000000001Q234.42800000000003 116.652 234.42800000000003 114.0V77.416H245.036V113.932Q245.036 120.324 241.39800000000002 124.03Q237.76000000000002 127.736 231.232 127.736Q225.656 127.736 222.732 125.696ZM233.136 66.4Q233.136 63.88399999999999 234.97199999999998 62.184Q236.808 60.483999999999995 239.732 60.483999999999995Q242.656 60.483999999999995 244.49200000000002 62.116Q246.328 63.748 246.328 66.196Q246.328 68.848 244.49200000000002 70.582Q242.656 72.316 239.732 72.316Q236.808 72.316 234.97199999999998 70.616Q233.136 68.916 233.136 66.4Z M252.108 95.708Q252.108 90.268 254.692 85.984Q257.276 81.69999999999999 261.866 79.286Q266.456 76.872 272.236 76.872Q278.016 76.872 282.572 79.286Q287.12800000000004 81.69999999999999 289.71200000000005 85.984Q292.29600000000005 90.268 292.29600000000005 95.708Q292.29600000000005 101.148 289.71200000000005 105.43199999999999Q287.12800000000004 109.716 282.572 112.13Q278.016 114.544 272.236 114.544Q266.456 114.544 261.866 112.13Q257.276 109.716 254.692 105.43199999999999Q252.108 101.148 252.108 95.708ZM281.552 95.708Q281.552 91.084 278.934 88.33Q276.31600000000003 85.576 272.236 85.576Q268.156 85.576 265.504 88.33Q262.85200000000003 91.084 262.85200000000003 95.708Q262.85200000000003 100.332 265.504 103.086Q268.156 105.84 272.236 105.84Q276.31600000000003 105.84 278.934 103.086Q281.552 100.332 281.552 95.708Z M296.648 95.708Q296.648 90.268 299.232 85.984Q301.81600000000003 81.69999999999999 306.40600000000006 79.286Q310.99600000000004 76.872 316.77600000000007 76.872Q322.55600000000004 76.872 327.1120000000001 79.286Q331.66800000000006 81.69999999999999 334.25200000000007 85.984Q336.836 90.268 336.836 95.708Q336.836 101.148 334.25200000000007 105.43199999999999Q331.66800000000006 109.716 327.1120000000001 112.13Q322.55600000000004 114.544 316.77600000000007 114.544Q310.99600000000004 114.544 306.40600000000006 112.13Q301.81600000000003 109.716 299.232 105.43199999999999Q296.648 101.148 296.648 95.708ZM326.09200000000004 95.708Q326.09200000000004 91.084 323.47400000000005 88.33Q320.85600000000005 85.576 316.77600000000007 85.576Q312.696 85.576 310.04400000000004 88.33Q307.39200000000005 91.084 307.39200000000005 95.708Q307.39200000000005 100.332 310.04400000000004 103.086Q312.696 105.84 316.77600000000007 105.84Q320.85600000000005 105.84 323.47400000000005 103.086Q326.09200000000004 100.332 326.09200000000004 95.708Z M381.30800000000005 93.056V114.0H370.70000000000005V94.688Q370.70000000000005 90.336 368.79600000000005 88.19399999999999Q366.89200000000005 86.05199999999999 363.28800000000007 86.05199999999999Q359.27600000000007 86.05199999999999 356.8960000000001 88.53399999999999Q354.5160000000001 91.01599999999999 354.5160000000001 95.912V114.0H343.9080000000001V77.416H354.0400000000001V81.69999999999999Q356.1480000000001 79.388 359.27600000000007 78.13Q362.40400000000005 76.872 366.14400000000006 76.872Q372.9440000000001 76.872 377.1260000000001 80.952Q381.30800000000005 85.032 381.30800000000005 93.056Z M388.17600000000004 95.708Q388.17600000000004 90.268 390.76000000000005 85.984Q393.34400000000005 81.69999999999999 397.9340000000001 79.286Q402.52400000000006 76.872 408.3040000000001 76.872Q414.08400000000006 76.872 418.6400000000001 79.286Q423.1960000000001 81.69999999999999 425.7800000000001 85.984Q428.36400000000003 90.268 428.36400000000003 95.708Q428.36400000000003 101.148 425.7800000000001 105.43199999999999Q423.1960000000001 109.716 418.6400000000001 112.13Q414.08400000000006 114.544 408.3040000000001 114.544Q402.52400000000006 114.544 397.9340000000001 112.13Q393.34400000000005 109.716 390.76000000000005 105.43199999999999Q388.17600000000004 101.148 388.17600000000004 95.708ZM417.62000000000006 95.708Q417.62000000000006 91.084 415.00200000000007 88.33Q412.38400000000007 85.576 408.3040000000001 85.576Q404.22400000000005 85.576 401.57200000000006 88.33Q398.9200000000001 91.084 398.9200000000001 95.708Q398.9200000000001 100.332 401.57200000000006 103.086Q404.22400000000005 105.84 408.3040000000001 105.84Q412.38400000000007 105.84 415.00200000000007 103.086Q417.62000000000006 100.332 417.62000000000006 95.708Z M432.71600000000007 95.708Q432.71600000000007 90.268 435.30000000000007 85.984Q437.88400000000007 81.69999999999999 442.47400000000005 79.286Q447.0640000000001 76.872 452.84400000000005 76.872Q458.6240000000001 76.872 463.18000000000006 79.286Q467.7360000000001 81.69999999999999 470.3200000000001 85.984Q472.9040000000001 90.268 472.9040000000001 95.708Q472.9040000000001 101.148 470.3200000000001 105.43199999999999Q467.7360000000001 109.716 463.18000000000006 112.13Q458.6240000000001 114.544 452.84400000000005 114.544Q447.0640000000001 114.544 442.47400000000005 112.13Q437.88400000000007 109.716 435.30000000000007 105.43199999999999Q432.71600000000007 101.148 432.71600000000007 95.708ZM462.1600000000001 95.708Q462.1600000000001 91.084 459.5420000000001 88.33Q456.9240000000001 85.576 452.84400000000005 85.576Q448.76400000000007 85.576 446.1120000000001 88.33Q443.4600000000001 91.084 443.4600000000001 95.708Q443.4600000000001 100.332 446.1120000000001 103.086Q448.76400000000007 105.84 452.84400000000005 105.84Q456.9240000000001 105.84 459.5420000000001 103.086Q462.1600000000001 100.332 462.1600000000001 95.708Z" fill="#2B2119"/>
            </g>
          </svg>
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
