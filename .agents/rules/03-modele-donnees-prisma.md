---
trigger: always_on
---

## 3. Modèle de données — schéma Prisma de référence

Convention de nommage : modèles et champs métier en français `snake_case`, fidèles au cahier des charges (section 13/16 d'origine).

**Changement global par rapport à la v1 de ce document** : tous les montants monétaires passent de `Decimal` à `Int` (résolution du point F17 de l'audit — le Franc CFA n'a pas de sous-unité utilisée en pratique ; un entier élimine tout risque d'arrondi et toute ambiguïté d'échelle décimale).

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ---------- ENUMS ----------

enum StatutAbonnement {
  essai
  actif
  impaye     // échéance dépassée, en attente de régularisation avant suspension — voir section 5
  suspendu
  resilie
}

enum RoleUtilisateur {
  patron
  gerant
  vendeur
}

enum StatutUtilisateur {
  actif
  inactif
}

enum StatutBoutique {
  actif
  inactif
  // Harmonisé en français — résolution du point B6 de l'audit (le cahier
  // d'origine donnait "active/inactive", incohérent avec le reste du schéma
  // et avec sa propre convention de nommage, section 13/16)
}

enum StatutPaiementVente {
  impaye
  partiel
  paye
}

enum StatutVente {
  validee
  annulee
  // Nouveau — résolution du point A1 de l'audit, voir règle 10 section 4
}

enum ModePaiement {
  especes
  mtn_momo
  moov_money
}

enum StatutFactureAbonnement {
  en_attente
  payee
  echouee
  annulee
}

// ---------- TENANT & ABONNEMENT ----------

model comptes {
  id                String            @id @default(uuid())
  code              String            @unique // 3 lettres extraites de nom_entreprise + suffixe si collision — règle 8, section 4

  nom_entreprise    String
  email_principal   String            @unique // = identifiant de connexion du Patron, voir décision C10 et note sous ce modèle
  forfait_id        String
  statut_abonnement StatutAbonnement

  // --- Champs entreprise, ajoutés suite à la décision C9 de l'audit ---
  // Volontairement TOUS nullable sauf telephone_principal : le public cible
  // (section 1) inclut des commerçants non formellement enregistrés — rendre
  // IFU/RCCM obligatoires exclurait une partie du public visé par le produit.
  ifu               String?           // Identifiant Fiscal Unique, si disponible
  rccm              String?           // Registre du Commerce et du Crédit Mobilier, si disponible
  forme_juridique   String?           // ex: Entreprise individuelle, SARL, SA
  telephone_principal String
  telephone_secondaire String?
  ville             String
  adresse_siege     String?

  // --- Cycle d'abonnement, ajoutés suite à la décision A2 ---
  date_fin_essai              DateTime?
  date_debut_periode_courante DateTime?
  date_fin_periode_courante   DateTime?

  date_creation     DateTime          @default(now())

  forfait                forfaits                 @relation(fields: [forfait_id], references: [id])
  utilisateurs            utilisateurs[]
  boutiques                boutiques[]
  clients                  clients[]
  journal_audit            journal_audit[]
  factures_abonnement      factures_abonnement[]
  compteur_boutique        compteur_boutique?

  @@index([forfait_id])
}

// Note d'implémentation (décision C10) : au flux d'inscription, une seule
// valeur d'email est saisie et modifiable jusqu'à validation finale ; elle
// devient à la fois comptes.email_principal ET utilisateurs.email du Patron
// créé dans la même transaction. Les deux colonnes existent séparément (et
// non une seule référence croisée) pour permettre une divergence future
// contrôlée — ex. transfert de propriété du compte à une autre personne —
// sans changer la structure ; au MVP, elles sont toujours égales à la création.

model forfaits {
  id                         String   @id @default(uuid())
  nom                        String   // "Solo" / "Réseau" / "Empire" en donnée de seed, jamais en dur dans le code — voir section 0
  max_boutiques              Int?     // NULL = illimité — décision B7, jamais -1 (voir note ci-dessous)
  max_employes_par_boutique  Int?     // NULL = illimité — idem
  prix_mensuel               Int      // FCFA, entier
  actif                      Boolean  @default(true)

  comptes                    comptes[]
}
// Note d'implémentation (décision B7) : NULL plutôt qu'une valeur sentinelle
// numérique (-1) pour "illimité" — une comparaison numérique mal écrite sur
// une sentinelle peut silencieusement laisser passer une limite censée
// s'appliquer. NULL oblige un traitement explicite :
// if (forfait.max_boutiques !== null && compteActuel >= forfait.max_boutiques) { refuser }

// Suivi de chaque cycle de facturation d'abonnement — distinct des factures
// de vente (ventes.numero_facture). Nouveau modèle, résolution du point A2.
model factures_abonnement {
  id                    String                   @id @default(uuid())
  compte_id             String
  montant               Int                      // FCFA
  statut                StatutFactureAbonnement  @default(en_attente)
  // String plutôt qu'enum Prisma : ajouter un fournisseur (fedapay, kkiapay)
  // ne doit pas nécessiter de migration de type enum PostgreSQL.
  fournisseur_paiement  String                   @default("manuel") // "manuel" au MVP ; "fedapay"/"kkiapay" une fois intégrés
  reference_externe     String?                  // id de transaction chez le fournisseur, une fois une passerelle branchée
  confirme_par_super_admin_id String?             // renseigné uniquement si fournisseur_paiement = "manuel"
  date_echeance         DateTime
  date_confirmation     DateTime?

  compte comptes @relation(fields: [compte_id], references: [id])

  @@index([compte_id])
}

// Compteur atomique de numérotation séquentielle des boutiques par compte
// (B01, B02, ...) — décision A4. Même famille de solution que
// compteurs_facture (règle 7/8, section 4), pour éviter le bug de
// concurrence d'un simple COUNT()+1.
model compteur_boutique {
  compte_id      String @id
  dernier_numero Int    @default(0)

  compte comptes @relation(fields: [compte_id], references: [id])
}

// Paramètres plateforme configurables par le Super-Admin, clé-valeur pour
// permettre l'ajout d'un futur paramètre sans migration de schéma — même
// philosophie que forfaits (rien en dur). Résolution section 16 (ex-point 7).
model parametres_plateforme {
  cle         String  @id // ex: "duree_essai_jours", "delai_grace_jours"
  valeur      String  // stocké en texte, parsé selon le type attendu par le paramètre
  description String?
}
// Seed initial obligatoire (résolution section 16, ex-point 6) :
//   { cle: "duree_essai_jours", valeur: "14" }
//   { cle: "delai_grace_jours", valeur: "7" }

// ---------- UTILISATEURS ----------

model utilisateurs {
  id                String            @id @default(uuid())
  compte_id         String
  boutique_id       String?           // NULL uniquement pour role = patron
  role              RoleUtilisateur
  nom               String
  telephone         String
  email             String            @unique // = identifiant de connexion, voir note sous "comptes" pour le Patron
  mot_de_passe_hash String
  deux_fa_active    Boolean           @default(false) // obligatoire = true pour role = patron OU gerant, imposé en logique applicative — décision D14
  statut            StatutUtilisateur
  date_creation     DateTime          @default(now())

  compte                   comptes                    @relation(fields: [compte_id], references: [id])
  boutique                 boutiques?                 @relation(fields: [boutique_id], references: [id])
  ventes_enregistrees      ventes[]                   @relation("VendeurDeLaVente")
  ventes_annulees          ventes[]                   @relation("AnnulePar")
  paiements_enregistres    paiements[]                @relation("EnregistrePar")
  historique_affectations  historique_affectations[]
  journal_audit            journal_audit[]

  @@index([compte_id])
  @@index([boutique_id])
}

model historique_affectations {
  id             String    @id @default(uuid())
  utilisateur_id String
  boutique_id    String
  date_debut     DateTime
  date_fin       DateTime? // NULL = affectation en cours

  utilisateur    utilisateurs @relation(fields: [utilisateur_id], references: [id])
  boutique       boutiques    @relation(fields: [boutique_id], references: [id])

  @@index([utilisateur_id])
  @@index([boutique_id])
}

// ---------- BOUTIQUES & PRODUITS ----------

model boutiques {
  id               String   @id @default(uuid())
  compte_id        String
  code             String   // "B01", "B02"... séquentiel par compte — voir compteur_boutique, décision A4
  nom              String
  secteur_activite String   // tranché en String (ambiguïté "enum/string" du cahier d'origine)
  adresse          String   // adresse complète / rue
  ville            String   // séparé de l'adresse — décision C9
  telephone        String?  // ligne dédiée à la boutique, optionnelle — décision C9
  statut           StatutBoutique
  date_creation    DateTime @default(now())

  compte                   comptes                    @relation(fields: [compte_id], references: [id])
  utilisateurs              utilisateurs[]
  produits                  produits[]
  ventes                    ventes[]
  historique_affectations   historique_affectations[]
  compteurs_facture         compteurs_facture[]

  @@unique([compte_id, code])
  @@index([compte_id])
}

model produits {
  id             String   @id @default(uuid())
  boutique_id    String
  compte_id      String   // dénormalisé depuis boutique.compte_id à la création, figé — résolution section 16, point 2
  nom            String
  prix_unitaire  Int      // FCFA
  quantite_stock Int
  seuil_alerte   Int
  date_creation  DateTime @default(now())
  // photo_url   String?  <- à ajouter uniquement si le stockage de fichiers (hors MVP) est activé

  boutique       boutiques      @relation(fields: [boutique_id], references: [id])
  lignes_vente   lignes_vente[]

  @@index([boutique_id])
  @@index([compte_id])
}

// ---------- CLIENTS ----------

model clients {
  id            String   @id @default(uuid())
  compte_id     String
  nom           String
  telephone     String
  date_creation DateTime @default(now())

  compte comptes  @relation(fields: [compte_id], references: [id])
  ventes ventes[]

  @@index([compte_id, telephone]) // recherche de rapprochement avant création — décision C11, pas d'unicité stricte
}

// ---------- VENTES ----------

model ventes {
  id                String              @id @default(uuid())
  numero_facture    String              @unique // format exact en règle 7, section 4
  boutique_id       String              // FIGÉ à la création, règle 2
  compte_id         String              // dénormalisé depuis boutique.compte_id à la création, figé — résolution section 16, point 2
  utilisateur_id    String              // le vendeur ayant enregistré la vente
  client_id         String?             // vente anonyme possible
  montant_remise    Int                 @default(0) // décision C12
  montant_total     Int                 // dérivé automatiquement, jamais saisi — règle 9, section 4
  statut_paiement   StatutPaiementVente // dérivé automatiquement — règle 4
  statut_vente      StatutVente         @default(validee) // règle 10 — annulation
  cle_idempotence   String?             @unique // règle 6 — résout le manque signalé dans l'audit précédent
  date_vente        DateTime            @default(now())
  annulee_par       String?
  date_annulation   DateTime?

  boutique     boutiques      @relation(fields: [boutique_id], references: [id])
  utilisateur  utilisateurs   @relation("VendeurDeLaVente", fields: [utilisateur_id], references: [id])
  annulateur   utilisateurs?  @relation("AnnulePar", fields: [annulee_par], references: [id])
  client       clients?       @relation(fields: [client_id], references: [id])
  lignes_vente lignes_vente[]
  paiements    paiements[]

  @@index([boutique_id])
  @@index([compte_id])
}

model lignes_vente {
  id                       String  @id @default(uuid())
  vente_id                 String
  produit_id               String
  compte_id                String  // dénormalisé, figé — résolution section 16 (ex-point 2)
  quantite                 Int
  prix_unitaire_a_la_vente Int     // FIGÉ, règle 3

  vente   ventes   @relation(fields: [vente_id], references: [id])
  produit produits @relation(fields: [produit_id], references: [id])

  @@index([vente_id])
  @@index([compte_id])
}

model paiements {
  id             String       @id @default(uuid())
  vente_id       String
  compte_id      String       // dénormalisé, figé — résolution section 16 (ex-point 2)
  montant        Int          // FCFA
  mode_paiement  ModePaiement
  date_paiement  DateTime     @default(now())
  enregistre_par String

  vente       ventes       @relation(fields: [vente_id], references: [id])
  utilisateur utilisateurs @relation("EnregistrePar", fields: [enregistre_par], references: [id])

  @@index([vente_id])
  @@index([compte_id])
}

model compteurs_facture {
  id             String @id @default(uuid())
  boutique_id    String
  annee          Int
  dernier_numero Int

  boutique boutiques @relation(fields: [boutique_id], references: [id])

  @@unique([boutique_id, annee])
}

// ---------- AUDIT (côté client) ----------

model journal_audit {
  id               String   @id @default(uuid())
  compte_id        String
  utilisateur_id   String
  action           String   // voir liste non exhaustive en section 7
  entite_concernee String
  entite_id        String
  date             DateTime @default(now())
  details           Json?

  compte      comptes      @relation(fields: [compte_id], references: [id])
  utilisateur utilisateurs @relation(fields: [utilisateur_id], references: [id])

  @@index([compte_id])
}

// ---------- SUPER-ADMIN (isolé) ----------

model super_admins {
  id                String   @id @default(uuid())
  email             String   @unique
  mot_de_passe_hash String
  deux_fa_active    Boolean  @default(true)
  date_creation     DateTime @default(now())

  journal_audit_plateforme journal_audit_plateforme[]
}

model journal_audit_plateforme {
  id              String   @id @default(uuid())
  super_admin_id  String
  action          String   // ex: "suspension_compte", "confirmation_paiement", "creation_forfait", "modification_forfait"
  compte_cible_id String?
  date            DateTime @default(now())
  details         Json?

  super_admin super_admins @relation(fields: [super_admin_id], references: [id])

  @@index([super_admin_id])
}
```
