# Plan d'Implémentation : Menu Paramètres Multi-Rôles (/dashboard/parametres)

> **Pour l'agent d'exécution :** Chaque tâche est jalonnée de cases à cocher (`- [ ]`). Validez chaque micro-étape séquentiellement.

**Objectif :** Créer la page complète et modulaire des Paramètres (`/dashboard/parametres`) adaptée dynamiquement aux rôles **Patron**, **Gérant** et **Vendeur**, permettant la gestion du profil, de la sécurité/mot de passe, de l'identité de l'entreprise (Patron), de la boutique (Gérant/Patron) et des préférences de caisse.  
**Architecture :** Page serveur Next.js 15 (`src/app/dashboard/parametres/page.tsx`) extrayant la session et les données du tenant/utilisateur, couplée à un composant client modulaire par onglets (`ParametresClient.tsx`), soutenu par des Server Actions atomiques sécurisées (`src/app/actions/parametres.ts`).  
**Pile technique :** Next.js 15 App Router, React 19, TypeScript, Prisma ORM, bcryptjs, otplib (TOTP 2FA), Lucide Icons, Tailwind CSS v4.  
**Spécification source :** Cahier des charges djoonoo (`.agents/rules/01-perimetre-mvp.md`, `02-roles-et-permissions.md`, `03-modele-donnees-prisma.md`).

---

## Contraintes Globales & Sécurité
- **Isolation Multi-Tenant stricte** : Tout update en base doit obligatoirement filtrer par `session.compteId` et vérifier le rôle.
- **Sécurité Mot de Passe** : Le mot de passe actuel doit être vérifié avec `bcrypt.compare` avant tout changement. Longueur minimale de 8 caractères.
- **Permissions Rôles** :
  - L'onglet **Entreprise** est accessible STRICTEMENT au rôle `patron`.
  - L'onglet **Ma Boutique** est accessible au rôle `patron` (sélection de la boutique) et au rôle `gerant` (sa boutique assignée uniquement). Le vendeur ne peut pas modifier la boutique.
  - Le menu **Paramètres** doit être ajouté dans la Sidebar pour les rôles `gerant` et `vendeur` en plus de `patron`.
- **Charte graphique djoonoo** : Couleur d'accent `#C1652D`, fond `#FAF6F1`, texte `#2B2119`, curseurs `cursor-pointer` sur tous les boutons interactifs.

---

## Focus de Revue Critique (Top 5 des angles morts potentiels)
1. **Unicité de l'email** : Si le patron met à jour son email, vérifier qu'aucun autre utilisateur n'utilise déjà cet email et synchroniser `comptes.email_principal` et `utilisateurs.email`.
2. **Droits Gérant sur sa boutique** : Vérifier que le gérant ne peut modifier que sa propre `boutique_id` et jamais celle d'un autre point de vente.
3. **Mots de passe hachés** : Ne jamais renvoyer ni afficher `mot_de_passe_hash` côté client.
4. **2FA Obligatoire Patron & Gérant** : Ne pas permettre au Patron ni au Gérant de désactiver leur 2FA (obligatoire selon règle section 2), uniquement permettre la réinitialisation avec validation du code TOTP. Le Vendeur, quant à lui, peut activer/désactiver librement son 2FA.
5. **Préférences Caisse sans rupture** : Assurer une synchronisation transparente avec `localStorage` (`djoonoo_pref_format_impression`, `djoonoo_pref_msg_ticket`) pour que `RecuVenteModal` prenne immédiatement en compte le format configuré (80mm vs A4).

---

## Découpage des Micro-Tâches

### Tâche 1 : Ajout du lien Paramètres dans la Sidebar pour Gérant et Vendeur
- **Objectif** : Rendre le menu `/dashboard/parametres` accessible à tous les rôles dans la navigation latérale.
- **Fichier** : `src/components/dashboard/Sidebar.tsx`
- **Actions** :
  - Ajouter `{ label: "Paramètres", href: "/dashboard/parametres", icon: Settings }` dans le tableau retourné pour `case "gerant"` et `case "vendeur"`.
- [ ] Mettre à jour `Sidebar.tsx`.

---

### Tâche 2 : Server Actions pour les Paramètres (`src/app/actions/parametres.ts`)
- **Objectif** : Implémenter et tester les actions serveur de mise à jour du profil, mot de passe, entreprise et 2FA.
- **Fichiers** :
  - `src/app/actions/parametres.ts`
  - `tests/parametres-actions.test.ts`
- **Contrat d'interface** :
  - `modifierProfilAction(formData: FormData): Promise<{ success: boolean; error?: string }>`
  - `modifierMotDePasseAction(formData: FormData): Promise<{ success: boolean; error?: string }>`
  - `modifierEntrepriseAction(formData: FormData): Promise<{ success: boolean; error?: string }>`
  - `basculer2FAVendeurAction(active: boolean, totpCode?: string): Promise<{ success: boolean; error?: string; qrCodeUrl?: string; secret?: string }>`
- [ ] Écrire le test unitaire `tests/parametres-actions.test.ts`.
- [ ] Implémenter `src/app/actions/parametres.ts`.
- [ ] Exécuter `vitest run tests/parametres-actions.test.ts` et vérifier le succès.

---

### Tâche 3 : Composants d'Onglets Spécifiques
- **Objectif** : Développer les sous-composants modulaires d'onglets pour une maintenance claire :
  1. `TabProfil.tsx` : Nom, téléphone, email (Patron modifiable / employé informatif).
  2. `TabSecurite.tsx` : Changement mot de passe + 2FA TOTP (statut obligatoire Patron/Gérant ou bascule Vendeur).
  3. `TabEntreprise.tsx` : Raison sociale, IFU, RCCM, forme juridique, ville, adresses, téléphones.
  4. `TabBoutique.tsx` : Coordonnées de la boutique (Gérant / Patron).
  5. `TabCaisse.tsx` : Choix du format d'impression (80mm vs A4) et message personnalisé de pied de ticket.
- **Fichiers** :
  - `src/components/dashboard/parametres/TabProfil.tsx`
  - `src/components/dashboard/parametres/TabSecurite.tsx`
  - `src/components/dashboard/parametres/TabEntreprise.tsx`
  - `src/components/dashboard/parametres/TabBoutique.tsx`
  - `src/components/dashboard/parametres/TabCaisse.tsx`
- [ ] Créer les 5 composants d'onglets avec gestion des états, validation et retours visuels (toast / messages de confirmation verts).

---

### Tâche 4 : Composant Client Principal (`ParametresClient.tsx`)
- **Objectif** : Orchestrer la navigation par onglets dynamiques selon le rôle de l'utilisateur avec design soigné et responsive.
- **Fichier** : `src/components/dashboard/parametres/ParametresClient.tsx`
- [ ] Implémenter la barre d'onglets réactive avec badges et icônes.
- [ ] Connecter chaque onglet aux données passées en props.

---

### Tâche 5 : Route Serveur (`src/app/dashboard/parametres/page.tsx`)
- **Objectif** : Récupérer les données nécessaires depuis la base Prisma en respectant l'isolation tenant et alimenter `ParametresClient`.
- **Fichier** : `src/app/dashboard/parametres/page.tsx`
- **Données injectées** :
  - Utilisateur connecté (`id`, `nom`, `email`, `telephone`, `role`, `deux_fa_active`, `boutique_id`)
  - Compte entreprise (`nom_entreprise`, `ifu`, `rccm`, `forme_juridique`, `telephone_principal`, `telephone_secondaire`, `ville`, `adresse_siege`, `code`)
  - Boutique(s) rattachée(s) : boutique assignée si Gérant/Vendeur, ou liste des boutiques si Patron.
- [ ] Implémenter la page serveur dynamique.

---

### Tâche 6 : Synchronisation dans `RecuVenteModal.tsx`
- **Objectif** : Faire en sorte que `RecuVenteModal` lise le format d'impression par défaut (`ticket_80mm` ou `facture_a4`) et le message personnalisé stockés dans les préférences.
- **Fichier** : `src/components/dashboard/RecuVenteModal.tsx`
- [ ] Charger les préférences au montage dans `RecuVenteModal.tsx`.

---

### Tâche 7 : Validation, Tests Vitest, Build & Push
- [ ] Exécuter la suite complète de tests `vitest run`.
- [ ] Valider la compilation TypeScript `npx tsc --noEmit`.
- [ ] Exécuter `npm run build`.
- [ ] Commiter et pousser sur `origin main`.
