## 5. Système de forfaits & abonnement — parcours SaaS moderne & FedaPay (décision H21 à H24)

### 5.1 Principe général
Parcours SaaS moderne 100% automatisé avec intégration directe de la passerelle de paiement **FedaPay** (Mobile Money MTN MoMo, Moov Money, Cartes bancaires Visa/Mastercard).

- **Activation instantanée** : Dès que le client effectue son règlement sur le guichet FedaPay, un webhook sécurisé valide la facture et active/renouvelle son compte immédiatement, **sans aucune validation manuelle requise du Super-Admin**.
- **Supervision Super-Admin** : Le Super-Admin n'est plus un goulot d'étranglement, mais conserve la traçabilité complète de toutes les transactions et peut procéder à une régularisation manuelle exceptionnelle en cas de besoin.
- **Choix du forfait** : Le Patron peut choisir et modifier son forfait à tout moment (Solo, Réseau, Empire). La durée de validité du forfait est configurable en base (`forfaits.duree_jours`, 30 jours par défaut au lieu d'une valeur codée en dur — décision H24).

---

### 5.2 Machine à états de `comptes.statut_abonnement`

```
  ┌────────────────────────────────────────────────────────┐
  │                                                        │
  ▼                                                        │
essai ──(14 jours expirés sans paiement)───────────────┐   │
  │                                                    │   │
  │ (Paiement FedaPay)                                 ▼   │
actif ──(Échéance atteinte)──► impaye (grâce 7j) ──► expire (read-only)
  ▲                                │
  └───────(Paiement FedaPay)───────┘

suspendu : mesure administrative Super-Admin / fraude (connexion refusée)
resilie  : clôture définitive du compte
```

#### Définition des états :
1. **`essai`** : Période d'essai gratuite de **14 jours stricts** (`parametres_plateforme.duree_essai_jours`).
   - L'utilisateur a accès aux fonctionnalités de vente et de gestion selon les limites du forfait sélectionné.
   - **Règle stricte (décision H22)** : **Le délai de grâce ne s'applique JAMAIS à la fin d'une période d'essai gratuite**. Un utilisateur qui n'a jamais payé ne bénéficie pas de 7 jours supplémentaires gratuits (fin de l'effet 21 jours gratuits). À l'issue des 14 jours, le compte passe directement en **`expire`**.
2. **`actif`** : Abonnement en cours de validité (paiement validé par FedaPay ou régularisé). `date_fin_periode_courante` est fixée à `date_actuelle + forfait.duree_jours`.
3. **`impaye`** : État intermédiaire réservé **exclusivement aux comptes ayant déjà payé un abonnement** arrivé à échéance sans renouvellement.
   - Un **délai de grâce de 7 jours** (`parametres_plateforme.delai_grace_jours`) s'applique.
   - Le compte reste pleinement fonctionnel durant ces 7 jours pour absorber les délais de rechargement Mobile Money, avec une bannière d'avertissement incitant au renouvellement.
4. **`expire`** : Appliqué dès la fin des 14 jours d'essai pour un prospect sans paiement, ou dès la fin du délai de grâce de 7 jours pour un abonné non renouvelé (décision H23).
   - **Comportement SaaS standard — Mode Lecture Seule** :
     - **Connexion AUTORISÉE** : Tous les utilisateurs du compte (Patron, Gérant, Vendeur) peuvent se connecter. Le compte n'est pas banni du système.
     - **Consultation intégrale** : Les commerçants conservent un accès complet en lecture à leurs données historiques (rapports financiers passés, ventes, factures émises, catalogue de produits, liste des clients).
     - **Blocage strict des écritures** : Aucune nouvelle vente ne peut être enregistrée, aucun stock décrémenté, aucun nouveau produit/boutique/employé créé.
     - **Bannière et guichet de réactivation** : Une bannière persistante et une page dédiée affichent un bouton de réactivation immédiate redirigeant vers FedaPay pour régler le forfait et réactiver le compte à la seconde (passage immédiat à `actif`).
5. **`suspendu`** : Mesure administrative ou disciplinaire (fraude, litige grave, décision manuelle du Super-Admin).
   - **Connexion TOTALEMENT INTERDITE** pour tous les utilisateurs du compte, Patron inclus.
   - Message à la connexion invitant à contacter le support djoonoo.
6. **`resilie`** : Clôture définitive du compte demandée par le commerçant ou actée par la direction.

---

### 5.3 Architecture technique — Adaptateur & Intégration FedaPay

#### 5.3.1 Interface du fournisseur
```typescript
export interface FournisseurPaiementAbonnement {
  initierPaiement(params: {
    compteId: string;
    factureId: string;
    forfaitId: string;
    montant: number;
    email: string;
    nom: string;
    telephone: string;
    callbackUrl: string;
  }): Promise<{ urlPaiement: string; referenceExterne: string }>;

  verifierWebhookSignature(rawBody: string, signatureHeader: string): boolean;

  traiterWebhook(payload: any): Promise<{
    factureId: string;
    compteId: string;
    statut: 'payee' | 'echouee';
    referenceExterne: string;
  }>;
}
```

#### 5.3.2 Flux nominal d'encaissement FedaPay
1. **Initiation** :
   - Le Patron clique sur "Choisir ce forfait" ou "Renouveler".
   - Le serveur crée une `factures_abonnement` avec `statut = en_attente` et `fournisseur_paiement = "fedapay"`.
   - L'adaptateur FedaPay appelle l'API FedaPay (`POST /v1/transactions`) avec :
     - `amount` : prix en FCFA (entier).
     - `currency` : `{ iso: "XOF" }`.
     - `description` : `Abonnement djoonoo - Forfait ${forfait.nom}`.
     - `customer` : nom, email, téléphone du Patron.
     - `custom_metadata` : `{ compte_id, facture_id, forfait_id }`.
     - `callback_url` : URL de retour client vers `/dashboard/abonnement?status=verif`.
   - L'adaptateur génère le token de paiement (`POST /v1/transactions/{id}/token`) et récupère l'URL de paiement hébergée par FedaPay.
   - Le commerçant est redirigé vers FedaPay et choisit son mode : MTN Mobile Money Bénin, Moov Money Bénin, ou Carte bancaire.

2. **Traitement du Webhook sécurisé** (`POST /api/webhooks/fedapay`) :
   - FedaPay notifie le serveur djoonoo à chaque changement d'état.
   - **Vérification cryptographique obligatoire** : signature HMAC SHA-256 via l'en-tête `X-FEDAPAY-SIGNATURE` et le secret d'endpoint (`FEDAPAY_WEBHOOK_SECRET`).
   - **Protection anti-rejeu** : vérification de l'horodatage inclus dans l'en-tête avec tolérance maximale de 300 secondes.
   - **Idempotence** : vérification que la transaction `id` n'a pas déjà été marquée payée en base.
   - Sur événement `transaction.approved` :
     - Transaction atomique PostgreSQL Prisma :
       - `factures_abonnement.statut = payee`
       - `factures_abonnement.date_confirmation = now()`
       - `factures_abonnement.reference_externe = event.entity.id`
       - `comptes.statut_abonnement = actif`
       - `comptes.forfait_id = forfait.id`
       - `comptes.date_debut_periode_courante = now()`
       - `comptes.date_fin_periode_courante = now() + forfait.duree_jours`
       - Écriture d'un événement dans `journal_audit`.
   - Réponse HTTP 200 immédiate `{"received": true}`.

---

### 5.4 Job planifié de cycle de vie (Cron quotidien)
Exécuté chaque nuit via `/api/cron/cycle-abonnements` (sécurisé par `CRON_SECRET`) :
1. **Essais expirés** : Tous les comptes avec `statut_abonnement = essai` et `date_fin_essai < now()` passent immédiatement à `statut_abonnement = expire` (mode lecture seule, connexion autorisée). Aucune période de grâce n'est accordée.
2. **Périodes payées échues** : Tous les comptes avec `statut_abonnement = actif` et `date_fin_periode_courante < now()` passent à `statut_abonnement = impaye`. Une facture de renouvellement `factures_abonnement` est émise avec une date d'échéance à `maintenant + delai_grace_jours` (7 jours).
3. **Grâces expirées** : Tous les comptes avec `statut_abonnement = impaye` dont la date d'échéance de la facture de renouvellement est antérieure à `now()` passent à `statut_abonnement = expire` (mode lecture seule, consultation préservée).
4. **Idempotence & Audit** : Chaque transition est journalisée dans `journal_audit_plateforme`.
