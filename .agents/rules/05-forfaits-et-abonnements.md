## 5. Système de forfaits & abonnement — refonte complète (décision A2)

### 5.1 Principe
Abonnement **automatique** avec période d'essai, architecture prête pour une passerelle de paiement (Fedapay ou Kkiapay) **sans intégration réelle à cette itération** — seul le mode `manuel` (confirmation Super-Admin) est implémenté au premier prompt.

### 5.2 Machine à états de `comptes.statut_abonnement`
```
essai → actif → impaye → suspendu → resilie
  ↓                ↑
  └────────────────┘ (paiement reçu après échéance, avant suspension définitive)
```
- `essai` : période d'essai en cours, `date_fin_essai` renseignée à la création du compte
- `actif` : abonnement à jour
- `impaye` : `date_fin_periode_courante` dépassée sans confirmation de paiement — **état intermédiaire avec grâce**, le compte reste utilisable
- `suspendu` : au-delà d'un délai de grâce après `impaye`, accès bloqué (voir section 8 bis pour le comportement exact)
- `resilie` : résiliation définitive, décision Patron ou Super-Admin

**Durée de la période d'essai : 14 jours** (résolution section 16, point 6) — standard SaaS, assez long pour qu'un commerçant traverse au moins une semaine de ventes réelles avant de décider, assez court pour créer une urgence de conversion. Valeur de départ dans `parametres_plateforme.duree_essai_jours` (section 3), modifiable par le Super-Admin sans redéploiement.

**Délai de grâce entre `impaye` et `suspendu` : 7 jours** (résolution section 16, point 6) — la confirmation de paiement étant **manuelle**, ce délai doit absorber deux latences distinctes : le temps que le patron paie réellement en Mobile Money après notification, **et** le temps que le Super-Admin se connecte et confirme ce paiement. Une valeur plus courte (ex. 5 jours) risquerait de suspendre un compte dont le paiement est arrivé mais pas encore pointé côté admin. Valeur de départ dans `parametres_plateforme.delai_grace_jours`, modifiable par le Super-Admin.

### 5.3 Architecture technique — adaptateur de paiement
```typescript
interface FournisseurPaiementAbonnement {
  initierPaiement(facture: FactureAbonnement): Promise<{ referenceExterne?: string }>;
  verifierWebhookSignature(rawBody: string, signatureHeader: string): boolean;
  traiterWebhook(payload: unknown): Promise<{ factureId: string; statut: 'payee' | 'echouee' }>;
}
```
- **Implémentation MVP unique** : `ManuelProvider` — ne fait rien automatiquement ; le Super-Admin confirme manuellement depuis son dashboard, ce qui met à jour `factures_abonnement.statut` et, en cascade, `comptes.statut_abonnement`.
- `factures_abonnement.fournisseur_paiement` est un `String` (pas un enum Prisma) précisément pour qu'ajouter `"fedapay"`/`"kkiapay"` plus tard ne nécessite aucune migration de type — seulement une nouvelle classe implémentant l'interface ci-dessus.

### 5.4 Génération des cycles de facturation
Un job planifié (cron, déclenché depuis une route protégée appelée par crontab sur le VPS — pas de nouvelle dépendance d'infrastructure) doit, quotidiennement :
1. Identifier les comptes dont `date_fin_periode_courante` est dépassée
2. Créer une entrée `factures_abonnement` (`statut = en_attente`) si aucune n'existe déjà pour le cycle courant
3. Faire progresser `statut_abonnement` selon la machine à états (section 5.2) si le délai de grâce est dépassé sans confirmation

### 5.5 Limites de forfait
Inchangé par rapport à la v1 : vérification serveur systématique à la création de boutique/employé, `NULL` = illimité (décision B7, section 3).
