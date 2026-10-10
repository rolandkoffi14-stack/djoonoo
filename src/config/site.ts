/**
 * djoonoo — Configuration Centrale de la Plateforme (Fichier Unique)
 * 
 * Ce fichier est la source de vérité pour toutes les informations statiques,
 * légales, de marque et de repli de l'application djoonoo.
 * 
 * Lors d'un déploiement en production (Coolify / Docker / VPS), les valeurs
 * peuvent être surchargées via les variables d'environnement correspondantes
 * sans avoir à modifier le code source.
 */

export const siteConfig = {
  // ---------------------------------------------------------------------------
  // 1. ENTREPRISE EXPLOITANTE (Éditeur juridique & Mentions Légales)
  // ---------------------------------------------------------------------------
  entreprise: {
    /** Nom officiel de la société ou de l'établissement exploitant djoonoo */
    nom: process.env.COMPANY_NAME || "ETS. 2KR DIGITAL",
    /** Forme juridique de l'entreprise éditrice */
    formeJuridique: process.env.COMPANY_LEGAL_FORM || "Établissement",
    /** Adresse physique complète du siège social */
    adresseSiege:
      process.env.COMPANY_ADDRESS ||
      "Ilôt 251, parcelle C', Cocotomey, Abomey-Calavi, Bénin",
    /** Ville du siège social */
    ville: process.env.COMPANY_CITY || "Abomey-Calavi",
    /** Pays d'immatriculation */
    pays: process.env.COMPANY_COUNTRY || "République du Bénin",
    /** Numéro de téléphone officiel du service client et support */
    telephone: process.env.COMPANY_PHONE || "+229 01 62 16 91 01",
    /** Lien href normalisé pour les appels téléphoniques */
    telephoneHref:
      process.env.COMPANY_PHONE_HREF || "tel:+2290162169101",
    /** Adresse email de contact général / juridique */
    emailContact:
      process.env.COMPANY_CONTACT_EMAIL || "contact@2krdigital.online",
    /** Adresse email du support technique et de facturation */
    emailSupport:
      process.env.COMPANY_SUPPORT_EMAIL || "support@djoonoo.com",
    /** Identifiant Fiscal Unique (IFU) officiel de l'éditeur */
    ifu: process.env.COMPANY_IFU || null,
    /** Registre du Commerce et du Crédit Mobilier (RCCM) */
    rccm: process.env.COMPANY_RCCM || null,
    /** Date de la dernière mise à jour des CGU et mentions légales */
    dateDerniereMajMentions: "26 septembre 2026",
  },

  // ---------------------------------------------------------------------------
  // 2. MARQUE & PRODUIT DJOONOO
  // ---------------------------------------------------------------------------
  app: {
    nom: "djoonoo",
    slogan: "Ta boutique, à portée de main, où que tu sois.",
    description:
      "djoonoo voit ta boutique pour toi. Ventes, stock, impayés — en un coup d'œil, où que tu sois.",
    descriptionCourte:
      "Solution de gestion des ventes, du stock et des impayés conçue pour les commerçants.",
    sousSloganFacture: "Plateforme de gestion commerciale & de caisse",
    url:
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXTAUTH_URL ||
      "https://app.djoonoo.com",
    logos: {
      transparentClair:
        "/brand/01_horizontal_logos/djoonoo_logo_clair_transparent.svg",
      transparentClairPng:
        "/brand/01_horizontal_logos/djoonoo_logo_clair_transparent@2x.png",
      favicon: "/brand/03_web_pwa/favicon.ico",
      appleTouchIcon: "/brand/03_web_pwa/apple-touch-icon.png",
    },
    emailExpediteurDefaut:
      process.env.EMAIL_FROM ||
      "djoonoo <notifications@djoonoo.2krdigital.online>",
  },

  // ---------------------------------------------------------------------------
  // 3. PARAMÈTRES RÉGIONAUX & MONÉTAIRES PAR DÉFAUT
  // ---------------------------------------------------------------------------
  regional: {
    devise: "FCFA",
    deviseIso: "XOF",
    paysCode: "BJ",
    indicatifTelDefaut: "+229",
    formatTelAide: "Format béninois (+229) ou numéro local sans indicatif.",
  },

  // ---------------------------------------------------------------------------
  // 4. PARAMÈTRES SAAS PAR DÉFAUT (Utilisés si non configurés en BDD)
  // ---------------------------------------------------------------------------
  saas: {
    dureeEssaiJoursDefaut: 14,
    delaiGraceJoursDefaut: 7,
    dureeExpirationInvitationHeures: 48,
    fenetreRenouvellementAnticipeJours: 7,
    dureeSessionJours: 7,
  },

  // ---------------------------------------------------------------------------
  // 5. CATALOGUE INITIAL DES FORFAITS (Pour seed & initialisation propre)
  // ---------------------------------------------------------------------------
  forfaitsInitiaux: [
    {
      nom: "Solo",
      prix_mensuel: 5000,
      duree_jours: 30,
      max_boutiques: 1,
      max_employes_par_boutique: 1,
      badge: undefined,
      description: "Idéal pour le commerçant indépendant gérant une boutique unique.",
      boutiquesLabel: "1 boutique",
      employesLabel: "1 employé inclus",
      avantages: [
        "1 boutique unique",
        "1 compte employé (gérant ou vendeur)",
        "Gestion complète du stock et alertes",
        "Émission de factures numérotées",
        "Suivi des impayés et créances clients",
        "Rapports de ventes quotidiens",
      ],
      actif: true,
    },
    {
      nom: "Réseau",
      prix_mensuel: 15000,
      duree_jours: 30,
      max_boutiques: 3,
      max_employes_par_boutique: 5,
      badge: "Recommandé",
      description: "Pour les commerces en développement avec plusieurs points de vente.",
      boutiquesLabel: "Jusqu'à 3 boutiques",
      employesLabel: "Jusqu'à 5 employés par boutique",
      avantages: [
        "Jusqu'à 3 boutiques distinctes",
        "Jusqu'à 5 employés par boutique",
        "Base de clients unifiée entre boutiques",
        "Transferts d'employés avec historique intact",
        "Rapports consolidés ou boutique par boutique",
        "Sécurité à double vérification incluse",
      ],
      actif: true,
    },
    {
      nom: "Empire",
      prix_mensuel: 35000,
      duree_jours: 30,
      max_boutiques: null, // illimité
      max_employes_par_boutique: null, // illimité
      badge: undefined,
      description: "Pour les grossistes, demi-grossistes et grands réseaux commerciaux.",
      boutiquesLabel: "Boutiques illimitées",
      employesLabel: "Employés illimités",
      avantages: [
        "Nombre de boutiques illimité",
        "Nombre d'employés illimité",
        "Volume de ventes et produits sans restriction",
        "Historique et traçabilité de toutes les actions",
        "Rapprochement immédiat des clients par téléphone",
        "Assistance prioritaire directe",
      ],
      actif: true,
    },
  ],
} as const;
