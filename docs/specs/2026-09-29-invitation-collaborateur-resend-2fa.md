# Spécification Technique & Fonctionnelle — Processus d'Invitation Collaborateurs & Onboarding 2FA

**Date :** 29 septembre 2026  
**Statut :** Validé en brainstorming  
**Périmètre :** Gestion de l'équipe (`/dashboard/equipe`), Authentification (`/invitation/[token]`), Emailing (Resend), Schéma Prisma (`tokens_invitation`, `StatutUtilisateur`).

---

## 1. Contexte & Objectifs

Actuellement, l'ajout d'un collaborateur (Gérant ou Vendeur) par le Patron impose à ce dernier de définir manuellement un mot de passe initial et, dans le cas d'un Gérant, de lui faire scanner son propre écran pour le code QR TOTP 2FA.

### Objectifs de la refonte
1. **Zéro mot de passe initial** : Le Patron ou le Gérant qui invite ne saisit plus aucun mot de passe.
2. **Invitation par email sécurisée (Resend)** : Envoi automatique d'un email d'invitation contenant un lien unique cryptographiquement sécurisé, valable **48 heures**.
3. **Statut d'attente visible** : L'employé apparaît dans la liste de l'équipe avec le badge **« En attente d'activation »**, avec possibilité de renvoyer l'invitation en 1 clic.
4. **Parcours d'activation autonome (`/invitation/[token]`)** :
   - Le collaborateur définit et confirme lui-même son mot de passe secret.
   - **Si Gérant** : Configuration obligatoire et autonome de son application 2FA (Google Authenticator / Authy) avec vérification d'un premier code TOTP avant activation.
5. **Activation du compte** : Dès validation, le compte passe en statut `actif` et permet la connexion immédiate.

---

## 2. Architecture des Données (Prisma)

### 2.1 Évolution de l'enum `StatutUtilisateur`
Ajout de la valeur `en_attente` :
```prisma
enum StatutUtilisateur {
  actif
  inactif
  en_attente
}
```

### 2.2 Évolution du modèle `utilisateurs`
Le champ `mot_de_passe_hash` devient nullable afin d'accueillir un utilisateur invité qui n'a pas encore défini son mot de passe :
```prisma
model utilisateurs {
  id                String            @id @default(uuid())
  compte_id         String
  boutique_id       String?
  role              RoleUtilisateur
  nom               String
  telephone         String
  email             String            @unique
  mot_de_passe_hash String?           // Nullable tant que l'invitation n'a pas été activée
  deux_fa_active    Boolean           @default(false)
  deux_fa_secret    String?
  statut            StatutUtilisateur @default(en_attente)
  date_creation     DateTime          @default(now())

  // Relations existantes...
  token_invitation  tokens_invitation?
}
```

### 2.3 Nouveau modèle `tokens_invitation`
Stockage sécurisé des jetons d'activation avec hachage SHA-256 (conformité OWASP : le token brut ne réside jamais en base de données) :
```prisma
model tokens_invitation {
  id              String       @id @default(uuid())
  utilisateur_id  String       @unique
  token_hash      String       @unique // SHA-256 du token généré (32 octets aléatoires)
  date_expiration DateTime     // Date de création + 48 heures
  date_creation   DateTime     @default(now())

  utilisateur     utilisateurs @relation(fields: [utilisateur_id], references: [id], onDelete: Cascade)
}
```

---

## 3. Service d'Emailing (Resend) & Gabarit d'Invitation

### 3.1 Module `src/lib/email.ts`
- Utilisation du SDK officiel `resend` ou de l'API REST Resend (`https://api.resend.com/emails`).
- Variable d'environnement requise : `RESEND_API_KEY`.
- Adresse d'expédition : `djoonoo <bienvenue@djoonoo.com>` (ou `onboarding@resend.dev` en environnement de test/sandbox).
- **Mode Dev / Fallback** : Si `RESEND_API_KEY` n'est pas encore configurée ou en environnement local, le lien d'invitation est systématiquement journalisé dans la console du serveur (`console.log`) afin de ne jamais bloquer le développement et les tests.

### 3.2 Contenu de l'email
- Charte visuelle djoonoo : Couleurs `#C1652D` (cuivre), `#2B2119` (ébène doux), `#FAF6F1` (fond ivoire).
- Informations claires :
  - Nom de l'entreprise invitante (`nom_entreprise`).
  - Boutique d'affectation (`boutique.nom`).
  - Rôle attribué (*Gérant de boutique* avec mention du 2FA ou *Vendeur*).
  - Bouton d'action principal : **« Activer mon compte collaborateur »**.
  - Avertissement : Ce lien expire dans 48 heures.

---

## 4. Flux Métier Détaillé

### Flux 1 : Création de l'invitation dans le Dashboard
1. Le Patron (ou le Gérant pour un vendeur) ouvre la modale d'invitation dans `/dashboard/equipe`.
2. Il renseigne : Rôle, Boutique, Nom, Email, Téléphone. Le champ de mot de passe est **supprimé**.
3. Soumission de l'action `creerEmployeAction` :
   - Vérifications des permissions et des quotas de forfait existantes.
   - Génération d'un token aléatoire de 32 octets : `token = crypto.randomBytes(32).toString("hex")`.
   - Calcul de son hachage : `tokenHash = crypto.createHash("sha256").update(token).digest("hex")`.
   - Création de l'utilisateur avec `statut: "en_attente"` et `mot_de_passe_hash: null`.
   - Création de l'entrée `tokens_invitation` avec expiration à `now + 48h`.
   - Envoi de l'email avec l'URL : `${BASE_URL}/invitation/${token}`.
   - Journalisation dans `journal_audit` avec l'action `"invitation_employe"`.
4. La modale se ferme et l'employé apparaît dans le tableau avec le statut **« En attente d'activation »**.

### Flux 2 : Renvoyer une invitation
- Action `renvoyerInvitationAction(utilisateurId: string)` :
- Si un collaborateur n'a pas reçu son email ou si son lien de 48h a expiré :
  - Le Patron/Gérant clique sur le bouton **« Renvoyer l'invitation »**.
  - Régénération d'un nouveau token et d'une nouvelle expiration de 48h.
  - Nouvel envoi de l'email via Resend.

### Flux 3 : Activation par le Collaborateur (`/invitation/[token]`)
1. **Accès au lien** :
   - Calcul du SHA-256 du token reçu dans l'URL.
   - Recherche dans `tokens_invitation`.
   - **Cas d'erreur** :
     - Token introuvable ou expiré -> Page d'erreur explicite : *"Ce lien d'invitation est invalide ou a expiré (durée de validité : 48h). Veuillez contacter votre responsable pour recevoir une nouvelle invitation."*
     - Compte déjà activé -> *"Ce compte est déjà activé. Vous pouvez vous connecter directement."* avec bouton vers `/connexion`.
2. **Étape 1 — Définition du mot de passe (Tous les rôles)** :
   - Formulaire sécurisé avec saisie du mot de passe (minimum 8 caractères), confirmation et jauge de force visuelle.
3. **Étape 2 — Configuration 2FA (Uniquement pour le Gérant)** :
   - Si `role === "gerant"` :
     - Affichage du QR code Google Authenticator / Authy généré côté serveur.
     - Affichage de la clé textuelle de secours.
     - Champ de vérification TOTP à 6 chiffres.
     - Le gérant doit obligatoirement saisir un code valide issu de son application pour prouver la bonne configuration du 2FA.
4. **Validation finale de l'activation** :
   - Hachage bcrypt du mot de passe.
   - Mise à jour de l'utilisateur :
     - `mot_de_passe_hash: nouveauHash`
     - `statut: "actif"`
     - Si Gérant : `deux_fa_active: true`, `deux_fa_secret: secretValide`
   - Suppression du token dans `tokens_invitation`.
   - Enregistrement dans `journal_audit` : action `"activation_compte_collaborateur"`.
   - Redirection vers `/connexion?invite=succes` avec notification de confirmation.

---

## 5. Matrice des Fichiers Impactés

| Fichier | Modification |
|---|---|
| `prisma/schema.prisma` | Ajout de `en_attente` dans `StatutUtilisateur`, `mot_de_passe_hash String?`, et modèle `tokens_invitation`. |
| `src/lib/email.ts` | **Nouveau** module de configuration Resend et template d'email HTML djoonoo. |
| `src/app/actions/employes.ts` | Mise à jour de `creerEmployeAction` (retrait mdp, génération token, Resend) et ajout de `renvoyerInvitationAction`. |
| `src/app/actions/invitation.ts` | **Nouveau** Server Actions pour valider le token, générer le QR code gérant, et finaliser l'activation. |
| `src/app/invitation/[token]/page.tsx` | **Nouvelle** page publique d'activation d'invitation (design soigné, étape mot de passe + étape 2FA Gérant). |
| `src/components/dashboard/EquipeManager.tsx` | Retrait du champ mot de passe de la modale, affichage du badge « En attente d'activation » et bouton « Renvoyer ». |
| `src/lib/auth.ts` | Blocage de connexion si `statut === "en_attente"` (message clair invitant à utiliser le lien email). |
| `tests/invitation-collaborateur.test.ts` | **Nouveau** test complet TDD vérifiant le cycle de vie de l'invitation, l'expiration 48h, et l'activation avec 2FA. |

---

## 6. Auto-revue de la Spécification

- [x] **Zéro placeholder** : Tous les champs, durées (48h) et flux sont explicitement définis sans aucun TODO.
- [x] **Cohérence interne** : Respecte l'isolation multi-tenant `compte_id`, la règle métier d'affectation d'employé (Règle 2) et l'obligation stricte du 2FA pour les gérants (Règle D14).
- [x] **Sécurité** : Les tokens sont hachés en SHA-256 dans la base de données ; les mots de passe sont hachés avec bcrypt ; le QR code 2FA n'est affiché qu'au destinataire sur son propre écran.
- [x] **Expérience utilisateur** : Les gérants bénéficient d'une interface pas-à-pas pour configurer leur 2FA sans friction.
