# Plan d'Implémentation : Invitation Collaborateurs, Email Resend & Onboarding 2FA Gérant

> **Pour l'agent d'exécution :** Chaque tâche est jalonnée de cases à cocher (`- [ ]`). Validez chaque micro-étape séquentiellement selon le protocole TDD strict.

**Objectif :** Remplacer la saisie manuelle du mot de passe initial par un flux d'invitation par email sécurisé (Resend) sous 48h, avec configuration autonome du mot de passe par le collaborateur et configuration obligatoire du 2FA par le Gérant.  
**Architecture :** Stockage sécurisé de tokens hachés SHA-256 dans `tokens_invitation`, statut `en_attente` sur `utilisateurs`, service d'envoi d'email Resend avec template djoonoo, page publique `/invitation/[token]` avec onboarding en 2 étapes pour Gérant (mdp + TOTP), et gestion du renvoi d'invitation dans `EquipeManager.tsx`.  
**Pile technique :** Next.js 15 (App Router), Prisma, Resend / Fetch REST, bcryptjs, otplib, qrcode, Tailwind CSS v4, Vitest.  
**Spécification source :** `docs/specs/2026-09-29-invitation-collaborateur-resend-2fa.md`  

## Contraintes Globales
- **Isolation multi-tenant** : `compte_id` strictement vérifié à chaque étape d'invitation.
- **Sécurité des jetons** : Le jeton brut (32 octets hexadécimaux) ne réside que dans l'URL envoyée par email ; la base de données stocke uniquement son empreinte SHA-256.
- **Validité temporelle stricte** : Expiration à 48 heures (`Date.now() + 48 * 3600 * 1000`).
- **2FA non négociable pour le Gérant** : L'activation d'un compte Gérant exige la vérification d'un code TOTP valide à 6 chiffres avant le passage au statut `actif`.
- **Mode Développeur résilient** : Si `RESEND_API_KEY` est absente en local, le lien d'invitation est affiché dans les logs serveur sans lever d'exception bloquante.

## Focus de Revue Critique (Top 5 des angles morts potentiels)
1. **Tentative de connexion avant activation** : Si un collaborateur en statut `en_attente` tente de se connecter sur `/connexion`, le système doit bloquer la connexion avec un message amical guidant vers son email.
2. **Token expiré ou déjà utilisé** : La page `/invitation/[token]` doit afficher un écran d'erreur clair avec conseil de contacter le responsable, et le token doit être supprimé après activation.
3. **Double clic ou rejeu sur le formulaire d'activation** : La finalisation doit être idempotente ou atomique pour éviter deux activations simultanées.
4. **Gérant avec code 2FA incorrect lors de l'onboarding** : Le mot de passe ne doit pas être enregistré tant que le code TOTP n'a pas été validé avec succès.
5. **Remplacement d'invitation existante (Renvoi)** : Lorsqu'un responsable renvoie une invitation, l'ancien token doit être révoqué/écrasé par le nouveau.

---

## Tâches d'Implémentation

### Tâche 1 : Schéma Prisma & Migration (`tokens_invitation` & `StatutUtilisateur`)
- **Consomme :** `prisma/schema.prisma`
- **Produit :** `enum StatutUtilisateur { actif, inactif, en_attente }`, `utilisateurs.mot_de_passe_hash` nullable, nouveau modèle `tokens_invitation`
- [ ] 1. Modifier `prisma/schema.prisma` :
  - Ajouter `en_attente` à `enum StatutUtilisateur`.
  - Rendre `mot_de_passe_hash String?` optionnel sur `utilisateurs`.
  - Ajouter le modèle `tokens_invitation` avec clé étrangère `utilisateur_id` unique et suppression en cascade.
- [ ] 2. Synchroniser la base de données : `npx prisma db push` et générer le client `npx prisma generate`.
- [ ] 3. Créer le test unitaire `tests/schema-invitation.test.ts` vérifiant l'insertion d'un token d'invitation avec date d'expiration.
- [ ] 4. Exécuter le test et vérifier le succès : `npx vitest run tests/schema-invitation.test.ts`.

---

### Tâche 2 : Service d'Emailing Resend & Template d'Invitation (`src/lib/email.ts`)
- **Consomme :** Variable d'environnement `RESEND_API_KEY`, données de l'invitation (nom, role, nomEntreprise, boutiqueNom, lienInvitation)
- **Produit :** Fonction `envoyerEmailInvitation()` exportée depuis `src/lib/email.ts`
- [ ] 1. Créer le module `src/lib/email.ts` :
  - Configuration de l'appel API Resend (`POST https://api.resend.com/emails` ou SDK `resend`).
  - Génération du template HTML responsive aux couleurs de djoonoo (`#C1652D`, `#2B2119`, `#FAF6F1`).
  - Gestion du fallback : si `RESEND_API_KEY` est absente ou invalide en environnement non-production, loguer l'URL d'activation dans `console.info` et renvoyer `{ success: true, mode: "log" }`.
- [ ] 2. Créer le test unitaire `tests/email-service.test.ts` vérifiant la génération du template HTML et le comportement de fallback sans clé API.
- [ ] 3. Exécuter le test et vérifier le succès : `npx vitest run tests/email-service.test.ts`.

---

### Tâche 3 : Actions Serveur de Création et Renvoi d'Invitation (`src/app/actions/employes.ts`)
- **Consomme :** `src/app/actions/employes.ts`, `src/lib/email.ts`, `prisma.tokens_invitation`
- **Produit :** `creerEmployeAction` mise à jour (sans mot de passe initial), `renvoyerInvitationAction` ajoutée
- [ ] 1. Modifier `creerEmployeAction` dans `src/app/actions/employes.ts` :
  - Retirer le champ obligatoire `mot_de_passe` du payload/formData.
  - Créer l'utilisateur avec `statut: "en_attente"` et `mot_de_passe_hash: null`.
  - Générer un token cryptographique sécurisé (32 octets aléatoires `crypto.randomBytes(32).toString("hex")`).
  - Stocker le hash SHA-256 dans `tokens_invitation` avec date d'expiration à `now + 48h`.
  - Appeler `envoyerEmailInvitation` avec le lien complet `${origin}/invitation/${rawToken}`.
- [ ] 2. Implémenter l'action `renvoyerInvitationAction(utilisateurId: string)` :
  - Vérifier les permissions du demandeur (Patron ou Gérant de la boutique).
  - Vérifier que l'utilisateur est bien en statut `en_attente`.
  - Générer un nouveau token, mettre à jour l'entrée `tokens_invitation` (+48h) et réexpédier l'email.
- [ ] 3. Écrire le test unitaire `tests/employes-invitation-action.test.ts`.
- [ ] 4. Exécuter le test et vérifier le passage au vert : `npx vitest run tests/employes-invitation-action.test.ts`.

---

### Tâche 4 : Actions Serveur d'Activation & Validation 2FA (`src/app/actions/invitation.ts`)
- **Consomme :** Token brut de l'URL, `otplib`, `qrcode`, `bcryptjs`
- **Produit :** `verifierTokenInvitationAction(token)`, `finaliserActivationCompteAction(payload)`
- [ ] 1. Créer le fichier `src/app/actions/invitation.ts` :
  - `verifierTokenInvitationAction(token: string)` : Hache le token en SHA-256, cherche dans `tokens_invitation`. Si expiré ou introuvable, renvoie une erreur. Si valide, si le rôle est Gérant, génère le secret TOTP et le QR code dataURL.
  - `finaliserActivationCompteAction(payload: { token: string, motDePasse: string, codeTotp?: string })` :
    - Valide la complexité du mot de passe (min 8 caractères).
    - Si Gérant : vérifie le code TOTP avec `authenticator.verify({ token: codeTotp, secret })`. Si code invalide, rejette avec erreur.
    - Hache le mot de passe avec bcrypt.
    - Met à jour l'utilisateur : `mot_de_passe_hash`, `statut: "actif"`, `deux_fa_active: role === "gerant"`, `deux_fa_secret`.
    - Supprime le token d'invitation.
    - Enregistre l'audit `"activation_compte_collaborateur"`.
- [ ] 2. Écrire le test unitaire `tests/invitation-activation.test.ts`.
- [ ] 3. Exécuter le test et vérifier le succès : `npx vitest run tests/invitation-activation.test.ts`.

---

### Tâche 5 : Page Publique d'Activation Collaborateur (`src/app/invitation/[token]/page.tsx`)
- **Consomme :** `src/app/actions/invitation.ts`
- **Produit :** Route publique Next.js `/invitation/[token]` avec design premium djoonoo
- [ ] 1. Créer la page d'activation `src/app/invitation/[token]/page.tsx` :
  - En-tête avec logo djoonoo et récapitulatif chaleureux : *"Bienvenue dans l'équipe de [Nom Entreprise]"*, rôle attribué et boutique.
  - Écran d'erreur élégant si token expiré ou inexistant avec rappel de la durée de 48h.
  - Formulaire de mot de passe personnel avec affichage/masquage du mot de passe et indicateur de force.
  - Étape conditionnelle 2FA pour le Gérant : instructions claires Google Authenticator, QR code épuré avec fond blanc et bordure cuivre, champ de code à 6 chiffres auto-séparé.
  - Bouton d'activation avec loader et redirection vers `/connexion?invite=succes`.

---

### Tâche 6 : Refonte de la Gestion de l'Équipe (`EquipeManager.tsx`)
- **Consomme :** `src/app/actions/employes.ts` (`creerEmployeAction`, `renvoyerInvitationAction`)
- **Produit :** Formulaire allégé dans la modale et affichage du statut « En attente d'activation »
- [ ] 1. Mettre à jour `src/components/dashboard/EquipeManager.tsx` :
  - Retirer le champ mot de passe de la modale d'invitation.
  - Retirer la sous-modale d'affichage du QR code côté Patron (désormais pris en charge par le Gérant lui-même sur son écran).
  - Ajouter un encadré explicatif : *"Un email d'invitation sécurisé sera envoyé au collaborateur avec un lien valable 48h."*
  - Dans le tableau des collaborateurs :
    - Si `statut === "en_attente"` : Afficher le badge ambre **« En attente d'activation »** avec icône `Clock`.
    - Ajouter le bouton **« Renvoyer l'invitation »** avec état de chargement et toast/message de confirmation.

---

### Tâche 7 : Sécurisation de la Connexion (`src/lib/auth.ts`)
- **Consomme :** `src/lib/auth.ts`
- **Produit :** Blocage explicite des comptes en attente d'activation
- [ ] 1. Modifier la fonction de vérification des identifiants dans `src/lib/auth.ts` :
  - Si l'utilisateur est trouvé mais que son `statut === "en_attente"`, refuser la connexion avec le message :
    *"Votre compte n'est pas encore activé. Veuillez cliquer sur le lien d'activation reçu par email pour définir votre mot de passe."*
  - Si `mot_de_passe_hash` est null, refuser immédiatement la connexion.
- [ ] 2. Tester le blocage dans `tests/auth-guard-invitation.test.ts`.

---

### Tâche 8 : Validation Complète de Non-Régression & Build
- **Consomme :** Tous les tests existants et nouveaux
- **Produit :** 100% de réussite sur l'ensemble de la suite de tests
- [ ] 1. Exécuter l'intégralité des tests : `npx vitest run`.
- [ ] 2. Vérifier les types TypeScript : `npx tsc --noEmit`.
- [ ] 3. Vérifier le formatage et le statut git.
