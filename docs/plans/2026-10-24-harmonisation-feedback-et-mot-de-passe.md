# Plan d'Implémentation : Harmonisation des Couleurs d'Accent Délavées (Feedback & Mot de Passe)

> **Pour l'agent d'exécution :** Chaque tâche est jalonnée de cases à cocher (`- [ ]`). Validez chaque micro-étape séquentiellement selon le protocole TDD strict (Test en échec -> Implémentation minimale -> Test passant -> Validation).

**Objectif :** Rétablir et harmoniser les couleurs d'accents fonctionnelles pour :
1. **La barre de niveau de sécurité du mot de passe** (*Password Strength*).
2. **Les bannières et messages de succès, d'erreur et d'avertissement** (Feedback Utilisateur).
En utilisant exclusivement des versions **délavées (pastel / douces / désaturées, pas vives)**, strictement identiques sur l'ensemble de l'application, tout en **préservant intacts** les statuts d'éléments existants et l'interface de Caisse POS / Reçus de vente.

**Architecture :** Next.js 16 (App Router), Tailwind CSS v4, composants React 19, tokens CSS centralisés dans `globals.css`.  
**Spécification source :** Directives utilisateur du 24 octobre 2026 — Harmonisation sémantique délavée.

---

## 1. Charte des Couleurs d'Accent Délavées (Tokens Unifiés)

Pour respecter la charte de fond crème (`#FAF6F1`) et de texte café torréfié (`#2B2119`) sans aucune criardise, les 3 accents sémantiques adoptent des teintes douces, feutrées et élégantes :

### A. Vert de Succès (Sauge / Muted Emerald)
*Utilisé pour : messages de validation réussie, étape mot de passe robuste, confirmations de copie.*
- **Fond de bannière** : `#EAF3EC` (vert sauge pastel très doux)
- **Bordure** : `#BBDBC0` (bordure fine délavée)
- **Texte** : `#2D5A36` (vert végétal boisé, lisible et doux)
- **Icône** : `#3B7A48` (icône assortie)
- **Barre mot de passe (Niveau 3 - Robuste)** : `#5CA86D`

### B. Rouge d'Erreur (Rose Poudré / Muted Brick)
*Utilisé pour : messages d'erreur de formulaire, alertes d'échec, étape mot de passe faible.*
- **Fond de bannière** : `#FDF1F1` (rose poudré très pâle)
- **Bordure** : `#F3C7C7` (bordure pastel atténuée)
- **Texte** : `#7C2D2D` (rouge brique profond adouci)
- **Icône** : `#A34141` (icône assortie)
- **Barre mot de passe (Niveau 1 - Faible)** : `#D96B6B`

### C. Ambre d'Avertissement (Sable Doré / Muted Amber)
*Utilisé pour : messages d'attention, alertes intermédiaires, étape mot de passe moyen.*
- **Fond de bannière** : `#FEF8EC` (ivoire vanillé très doux)
- **Bordure** : `#F6E2B8` (bordure sable pastel)
- **Texte** : `#7B541C` (ambre boisé doux)
- **Icône** : `#A06F28` (icône assortie)
- **Barre mot de passe (Niveau 2 - Moyen)** : `#DE9F43`

---

## 2. Périmètre d'Intervention Strict

| Éléments Inclus | Éléments Strictement Exclus (Inchangés) |
|---|---|
| ✅ **Barre de force du mot de passe** (Invitation & Inscription) | ⛔ **Statuts d'éléments du Dashboard** (badges `Actif`, `Inactif`, `En attente`, etc.) restent inchangés |
| ✅ **Bannières & Toasts de Succès** (Paramètres, Équipe, Super-Admin) | ⛔ **Caisse POS** (sélecteurs MoMo, monnaie à rendre, boutons caisse) restent inchangés |
| ✅ **Bannières & Toasts d'Erreur** (Harmonisation sur le rouge délavé) | ⛔ **Reçus de vente & Tickets** restent inchangés |
| ✅ **Tokens utilitaires dans `globals.css`** pour garantie d'uniformité | ⛔ **Badges du Journal d'Audit** restent inchangés |

---

## 3. Vue d'Ensemble des Phases

| Phase | Domaine | Objectif |
|---|---|---|
| **Phase 1** | Tokens & Classes Centralisées | Définir les variables et classes délavées harmonisées dans `globals.css`. |
| **Phase 2** | Barre de Sécurité du Mot de Passe | Rétablir la progression délavée (Rouge poudré -> Ambre doux -> Vert sauge) dans `invitation/[token]/page.tsx`. |
| **Phase 3** | Bannières de Succès & Feedback | Remplacer le terracotta par le vert sauge délavé dans tous les formulaires (Paramètres, Équipe, Super-Admin, etc.). |
| **Phase 4** | Harmonisation des Bannières d'Erreur & Attention | Harmoniser toutes les alertes d'erreur et d'avertissement sur la même palette délavée unifiée. |
| **Phase 5** | Validation & Non-Régression | Vérifier les tests Vitest (188 tests) et le build de production. |

---

## TÂCHES DÉTAILLÉES D'EXÉCUTION

---

### Phase 1 : Tokens & Classes Centralisées (`globals.css`)

- [x] **Tâche 1.1 : Définir les classes de feedback délavées dans `src/app/globals.css`**
  - **Consomme :** `src/app/globals.css`.
  - **Produit :** Modification de [src/app/globals.css](file:///c:/Users/C%C3%A9dric/Downloads/Africavibecoding/facturepro/djoonoo/src/app/globals.css).
  - **Classes utilitaires à introduire :**
    ```css
    /* Feedback Sémantique Harmonisé & Délavé */
    .banner-feedback-success {
      background-color: #EAF3EC;
      border: 1px solid #BBDBC0;
      color: #2D5A36;
    }
    .banner-feedback-error {
      background-color: #FDF1F1;
      border: 1px solid #F3C7C7;
      color: #7C2D2D;
    }
    .banner-feedback-warning {
      background-color: #FEF8EC;
      border: 1px solid #F6E2B8;
      color: #7B541C;
    }
    ```

---

### Phase 2 : Barre de Sécurité du Mot de Passe (*Password Strength*)

- [x] **Tâche 2.1 : Rétablir la progression délavée dans `src/app/invitation/[token]/page.tsx`**
  - **Consomme :** `src/app/invitation/[token]/page.tsx`.
  - **Produit :** Modification de [src/app/invitation/[token]/page.tsx:287-315](file:///c:/Users/C%C3%A9dric/Downloads/Africavibecoding/facturepro/djoonoo/src/app/invitation/%5Btoken%5D/page.tsx#L287-L315).
  - **Implémentation :**
    - Niveau 1 : `scoreForce >= 1 ? "bg-[#D96B6B]" : "bg-stone-200"` (Rouge délavé)
    - Niveau 2 : `scoreForce >= 2 ? "bg-[#DE9F43]" : "bg-stone-200"` (Ambre délavé)
    - Niveau 3 : `scoreForce >= 3 ? "bg-[#5CA86D]" : "bg-stone-200"` (Vert sauge délavé)
    - Texte *"Mot de passe robuste"* : `text-[#2D5A36]` avec icône `text-[#3B7A48]`
  - **Écran de félicitations final (activation réussie) :**
    - Pastille `CheckCircle2` (ligne 192) : `bg-[#EAF3EC] text-[#3B7A48] border border-[#BBDBC0]`.
    - Bouton copier clé TOTP (ligne 370) : `text-[#3B7A48]`.

---

### Phase 3 : Bannières et Messages de Succès (Feedback Utilisateur)

- [x] **Tâche 3.1 : Harmoniser les messages de succès dans les 5 onglets de Paramètres**
  - **Consomme :**
    - `src/components/dashboard/parametres/TabSecurite.tsx`
    - `src/components/dashboard/parametres/TabProfil.tsx`
    - `src/components/dashboard/parametres/TabEntreprise.tsx`
    - `src/components/dashboard/parametres/TabBoutique.tsx`
    - `src/components/dashboard/parametres/TabCaisse.tsx`
  - **Implémentation :**
    Remplacer `bg-[#E5DACF]/30 border-[#C1652D]/30 text-[#2B2119]` et l'icône `text-[#C1652D]` par :
    - Conteneur : `bg-[#EAF3EC] border border-[#BBDBC0] text-[#2D5A36]` (ou classe `.banner-feedback-success`)
    - Icône `CheckCircle2` : `text-[#3B7A48]`

- [x] **Tâche 3.2 : Harmoniser le message de succès dans `EquipeManager.tsx`**
  - **Consomme :** `src/components/dashboard/EquipeManager.tsx`.
  - **Produit :** Modification de [src/components/dashboard/EquipeManager.tsx:227-245](file:///c:/Users/C%C3%A9dric/Downloads/Africavibecoding/facturepro/djoonoo/src/components/dashboard/EquipeManager.tsx#L227-L245).
  - **Implémentation :**
    - Bannière `messageSucces` : `bg-[#EAF3EC] border border-[#BBDBC0] text-[#2D5A36]`
    - Icône `CheckCircle2` : `text-[#3B7A48]`
    - Bouton fermer : `text-[#2D5A36]/70 hover:text-[#2D5A36]`

- [x] **Tâche 3.3 : Harmoniser le message de succès dans `ParametresManager.tsx` (Super-Admin)**
  - **Consomme :** `src/components/super-admin/ParametresManager.tsx`.
  - **Produit :** Modification de [src/components/super-admin/ParametresManager.tsx:70-82](file:///c:/Users/C%C3%A9dric/Downloads/Africavibecoding/facturepro/djoonoo/src/components/super-admin/ParametresManager.tsx#L70-L82).
  - **Implémentation :**
    - `message.type === "success"` : `bg-[#EAF3EC] border border-[#BBDBC0] text-[#2D5A36]` avec icône `text-[#3B7A48]`.

---

### Phase 4 : Harmonisation des Bannières d'Erreur & d'Avertissement

- [x] **Tâche 4.1 : Uniformiser les bannières d'erreur sur le Rouge Délavé**
  - **Consomme :**
    - `TabSecurite.tsx`, `TabProfil.tsx`, `TabEntreprise.tsx`, `TabBoutique.tsx`
    - `EquipeManager.tsx`, `ProduitsManager.tsx`, `BoutiquesManager.tsx`
    - `InscriptionClient.tsx`, `connexion/page.tsx`
  - **Implémentation :**
    Remplacer les variations disparates (`bg-rose-50`, `bg-red-50`, `border-rose-200`) par la formule délavée harmonisée :
    - Conteneur : `bg-[#FDF1F1] border border-[#F3C7C7] text-[#7C2D2D]`
    - Icône `AlertCircle` : `text-[#A34141]`

---

### Phase 5 : Validation Globale & Non-Régression

- [x] **Tâche 5.1 : Exécution complète de la suite de tests Vitest**
  - **Commande :**
    ```bash
    npx vitest run
    ```
  - **Critère de succès :** 100 % des tests (188 tests) au vert.

- [x] **Tâche 5.2 : Validation du Build de production Next.js**
  - **Commande :**
    ```bash
    npm run build
    ```
  - **Critère de succès :** Build complet avec 0 erreur TypeScript / CSS.
