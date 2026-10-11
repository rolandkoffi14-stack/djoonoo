# Plan d'Implémentation : Refonte Design Dashboard Super-Admin (Sidebar Latérale)

> **Pour l'agent d'exécution :** Chaque tâche est jalonnée de cases à cocher (`- [ ]`). Validez chaque micro-étape séquentiellement.

**Objectif :** Remplacer la barre de navigation supérieure actuelle de la console Super-Admin par un menu latéral à gauche rétractable et responsive (identique à l'expérience du dashboard marchand), tout en conservant fidèlement la palette de couleurs actuelle (Slate sombre `bg-slate-950` / `bg-slate-900`, bordures `border-slate-800`, accent terracotta `#C1652D` et logo clair transparent).  
**Architecture :** Découpage modulaire avec deux nouveaux composants dédiés (`SuperAdminSidebar` et `SuperAdminHeader`) dans `src/components/super-admin/`, intégrés au sein de `src/app/super-admin/layout.tsx` avec conteneur `flex` desktop et tiroir mobile animé.  
**Pile technique :** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Lucide React, actions serveur Next.js.  
**Spécification source :** Cahier des charges djoonoo — Section 6 (Dashboard Super-Admin) & `.agents/rules/06-dashboard-super-admin.md`.

---

## Contraintes Globales
- **Palette chromatique stricte :** Conserver les teintes d'origine du Super-Admin : fond de barre sombre `bg-slate-950` / `bg-slate-900`, séparateurs `border-slate-800`, textes `text-slate-200` / `text-slate-400`, accent `#C1652D`, logo clair `/brand/01_horizontal_logos/djoonoo_logo_sombre_transparent.svg`.
- **Zéro régression fonctionnelle :** Préserver scrupuleusement les 4 routes actuelles (`/super-admin`, `/super-admin/abonnements`, `/super-admin/forfaits`, `/super-admin/parametres`), l'action de déconnexion `deconnexionSuperAdminAction`, et l'isolation des pages publiques (`/super-admin/connexion` et `/super-admin/initialisation`) qui doivent rester sans menu latéral.
- **Accessibilité & Mobile :** Tiroir mobile (`drawer`) accessible via déclencheur hamburger, fermeture au clic extérieur (overlay sombre avec `backdrop-blur-xs`) et au clic sur un lien de navigation.

---

## Focus de Revue Critique (Top 5 des angles morts potentiels)
1. **Conflit de session non authentifiée :** `/super-admin/connexion` et `/super-admin/initialisation` partagent le layout racine `src/app/super-admin/layout.tsx`. Si `session` est `null`, ni la sidebar ni le header ne doivent être rendus.
2. **Superposition sur mobile :** Le bouton hamburger ne doit pas masquer les actions du header ni chevaucher les titres des pages.
3. **Détection de la route active :** `/super-admin` est la racine des sous-pages ; la détection active de `/super-admin` doit être exacte (`pathname === "/super-admin"`) pour ne pas surbriller en même temps que `/super-admin/abonnements`.
4. **Déconnexion sécurisée :** La modale de confirmation doit appeler directement l'action serveur Next.js `deconnexionSuperAdminAction` sans rupture de CSRF.
5. **Défilement & Hauteur :** La sidebar desktop doit être verrouillée (`sticky top-0 h-screen`) tandis que la zone de contenu principale défile indépendamment (`overflow-y-auto`).

---

## Découpage des Tâches d'Implémentation

### Tâche 1 : Création du Composant `SuperAdminSidebar`
**Fichier à créer :** `src/components/super-admin/SuperAdminSidebar.tsx`  
**Consomme :** `deconnexionSuperAdminAction` de `@/app/actions/super-admin`, `usePathname` de `next/navigation`, icônes de `lucide-react`.  
**Produit :** Composant client `<SuperAdminSidebar adminEmail={string} />`.

- [x] **1. Écrire le composant `SuperAdminSidebar.tsx`** :
  - Structure calquée sur `src/components/dashboard/Sidebar.tsx` mais avec le design sombre Slate :
    - En-tête : logo `djoonoo_logo_sombre_transparent.svg` + badge terracotta `SUPER-ADMIN`.
    - Carte statut plateforme : badge "Console Plateforme" avec puce verte "Active".
    - Liste des liens de navigation avec icônes Lucide :
      - `Comptes Marchands` (`Building2`, `/super-admin`)
      - `Paiements d'Abonnement` (`CreditCard`, `/super-admin/abonnements`)
      - `Forfaits & Limites` (`Layers`, `/super-admin/forfaits`)
      - `Paramètres Plateforme` (`Settings`, `/super-admin/parametres`)
    - Styles d'état :
      - Lien actif : fond `#C1652D`, texte blanc, chevron indicateur à droite.
      - Lien inactif : `text-slate-400 hover:text-white hover:bg-slate-800/60`.
    - Pied de page : affichage de l'email admin, badge `2FA TOTP Validée` (`ShieldCheck text-[#C1652D]`), et bouton déclenchant la modale de déconnexion.
    - Modale de confirmation de déconnexion avec formulaire vers `deconnexionSuperAdminAction`.
    - Bouton hamburger flottant pour mobile (`md:hidden`) et tiroir coulissant avec backdrop noir transparent.
- [x] **2. Vérification statique TypeScript** :
  - Commande : `npx tsc --noEmit`
  - Résultat attendu : 0 erreur.

---

### Tâche 2 : Création du Composant `SuperAdminHeader`
**Fichier à créer :** `src/components/super-admin/SuperAdminHeader.tsx`  
**Consomme :** `usePathname` de `next/navigation`, icônes Lucide (`ShieldCheck`, `Activity`).  
**Produit :** Composant client `<SuperAdminHeader />`.

- [x] **1. Écrire le composant `SuperAdminHeader.tsx`** :
  - Hauteur `h-16`, fond `bg-slate-900/95 backdrop-blur-md`, bordure basse `border-slate-800`, texte blanc.
  - Position `sticky top-0 z-10`.
  - Padding gauche `pl-16 md:pl-6` pour s'aligner avec le bouton hamburger sur mobile.
  - Affichage dynamique du titre de la section courante basé sur le pathname :
    - `/super-admin` → "Comptes Marchands"
    - `/super-admin/abonnements` → "Paiements d'Abonnement"
    - `/super-admin/forfaits` → "Forfaits & Limites"
    - `/super-admin/parametres` → "Paramètres Plateforme"
  - Indicateur à droite : badge d'intégrité système ("Système Sécurisé", icône `ShieldCheck` terracotta, puce statut "En ligne").
- [x] **2. Vérification statique TypeScript** :
  - Commande : `npx tsc --noEmit`
  - Résultat attendu : 0 erreur.

---

### Tâche 3 : Refonte du Layout Racine `SuperAdminLayout`
**Fichier à modifier :** `src/app/super-admin/layout.tsx`  
**Consomme :** `getSuperAdminSession` de `@/lib/super-admin-auth`, `SuperAdminSidebar`, `SuperAdminHeader`.  
**Produit :** Layout unifié avec navigation latérale pour les sessions authentifiées et rendu fluide pour les pages de connexion.

- [x] **1. Mettre à jour `src/app/super-admin/layout.tsx`** :
  - Si `!session` : retourner simplement `<main className="min-h-screen bg-[#F8FAFC]">{children}</main>` (pour les pages publiques `/super-admin/connexion` et `/super-admin/initialisation`).
  - Si `session` :
    ```tsx
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans">
      <SuperAdminSidebar adminEmail={session.email} />
      <div className="flex-1 flex flex-col min-w-0">
        <SuperAdminHeader />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
    ```
- [x] **2. Vérification de la compatibilité des pages enfants** :
  - S'assurer que les conteneurs existants (`<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">`) dans :
    - `src/app/super-admin/page.tsx`
    - `src/app/super-admin/abonnements/page.tsx`
    - `src/app/super-admin/forfaits/page.tsx`
    - `src/app/super-admin/parametres/page.tsx`
    s'affichent sans aucun décalage ni double scrollbar.
- [x] **3. Vérification statique TypeScript** :
  - Commande : `npx tsc --noEmit`
  - Résultat attendu : 0 erreur.

---

### Tâche 4 : Tests de Non-Régression & Validation Complète
**Fichiers vérifiés :** Tous les fichiers de la suite de tests (`tests/*`).

- [x] **1. Exécuter l'ensemble des tests automatisés** :
  - Commande : `npx vitest run`
  - Critère de validation : 100% des tests réussis (161/161 tests au vert), notamment les tests de sécurité, de cookies super-admin et de pagination.
- [x] **2. Vérification de la compilation Next.js** :
  - Commande : `npx tsc --noEmit` (Code 0)
- [x] **3. Revue visuelle des interactions responsive** :
  - Desktop (> 768px) : sidebar gauche fixe visible, header sticky en haut, contenu principal à droite.
  - Mobile (< 768px) : sidebar masquée, hamburger fonctionnel ouvrant le tiroir, fermeture fluide au clic sur l'arrière-plan ou sur un lien.
