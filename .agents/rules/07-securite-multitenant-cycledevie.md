## 7. Sécurité — règles non négociables & Paiements en ligne

### 7.1 Sécurité applicative & infrastructure
- Aucun secret en dur, `.env*` non commité, aucune clé serveur en `NEXT_PUBLIC_`, échec au démarrage si variable manquante.
- Accès Prisma exclusivement côté serveur, filtrage `compte_id` systématique (règle 5).
- Mots de passe bcrypt/argon2, sessions `HttpOnly`, vérification des droits côté serveur systématique.
- **2FA obligatoire pour Patron, Gérant et Super-Admin** — mécanisme TOTP (`otplib`), QR code à l'onboarding.
- Validation serveur systématique avec Zod, requêtes typées et sécurisées contre les injections SQL.
- Rate limiting double couche : (1) proxy Caddy par IP ; (2) compteurs en base Postgres par email pour parer aux attaques distribuées.
- En-têtes de sécurité HTTP stricts (HSTS, X-Content-Type-Options, Frame-Options, CSP restreint).
- Modifications d'état exclusivement par POST/PUT/PATCH/DELETE authentifiés.
- Journal d'audit : traçabilité de toutes les actions sensibles (ventes annulées, modifications de prix, affectations, paiements).

### 7.2 Sécurité des paiements en ligne (FedaPay — décision H21)
La manipulation de flux financiers en ligne exige une tolérance zéro sur la sécurité :
1. **Authentification & Clés d'API** :
   - Clé secrète `FEDAPAY_SECRET_KEY` stockée strictement côté serveur dans les variables d'environnement.
   - Clé publique `FEDAPAY_PUBLIC_KEY` pour les initialisations côté client si nécessaire.
   - Isolation stricte des environnements (`FEDAPAY_ENVIRONMENT = "sandbox"` en développement / test, `"live"` en production).
2. **Signature cryptographique des Webhooks (Obligatoire)** :
   - Tout webhook reçu sur `/api/webhooks/fedapay` doit obligatoirement comporter l'en-tête `X-FEDAPAY-SIGNATURE`.
   - La signature doit être vérifiée cryptographiquement à l'aide du secret dédié `FEDAPAY_WEBHOOK_SECRET` (HMAC SHA-256).
   - Tout événement avec signature invalide ou absente doit être rejeté avec un code HTTP 400 ou 401, sans aucun traitement métier.
3. **Protection anti-rejeu (Replay Attack)** :
   - FedaPay transmet un horodatage dans la signature.
   - La différence entre l'heure de réception et l'horodatage signé ne doit pas excéder **300 secondes (5 minutes)**. Tout message plus ancien est rejeté.
4. **Garantie d'idempotence** :
   - FedaPay pouvant réémettre un webhook jusqu'à 9 fois en cas de latence réseau, chaque événement traité est indexé par son ID unique ou référence externe (`factures_abonnement.cle_idempotence` / `reference_externe`).
   - Si une transaction a déjà le statut `payee`, le webhook répond immédiatement HTTP 200 sans ré-incrémenter la durée d'abonnement.
5. **Défense en profondeur du point de terminaison** :
   - Le webhook répond HTTP 200 rapidement après traitement pour éviter les timeouts côté passerelle.
   - Les erreurs de traitement internes sont loguées avec un identifiant de corrélation sans divulguer de données sensibles.

---

## 8. Architecture multi-tenant & isolation des données
Filtrage `compte_id` centralisé (règle 5) comme mécanisme principal, Row-Level Security PostgreSQL natif en renforcement. Le Super-Admin est isolé de ce système.

---

## 8 bis. États de cycle de vie — comportements précisés (décisions G18, H22, H23)

### 8 bis.1 Boutique désactivée (`statut = inactif`)
- Plus aucune nouvelle vente ni nouveau produit ne peut y être enregistré (vérification serveur).
- Données historiques restent consultables en lecture seule.
- Les utilisateurs rattachés ne peuvent plus y agir tant qu'elle n'est pas réactivée ou qu'ils ne sont pas transférés.

### 8 bis.2 Compte expiré (`statut_abonnement = expire`) — Mode Lecture Seule (décision H23)
Appliqué automatiquement à l'échéance des 14 jours d'essai sans paiement ou à la fin des 7 jours de grâce d'un compte impayé :
- **Connexion AUTORISÉE** : Le Patron et tous les utilisateurs peuvent se connecter normalement à leur compte.
- **Consultation intégrale (Read-Only)** : Accès sans restriction en lecture seule aux rapports passés, au journal des ventes, à la liste des clients, aux factures et à l'état des stocks.
- **Blocage strict des écritures** :
  - Interdiction d'enregistrer de nouvelles ventes ou de nouveaux paiements.
  - Interdiction de créer ou modifier des produits, boutiques ou utilisateurs.
  - Tout appel de mutation serveur retourne une erreur explicite avec le code `COMPTE_EXPIRE`.
- **Bannière et parcours de réactivation** :
  - Une bannière d'information visible sur toutes les pages signale que l'abonnement a pris fin.
  - Un bouton d'action directe redirige le Patron vers la sélection de forfait et le règlement FedaPay pour réactiver instantanément le compte.

### 8 bis.3 Compte suspendu (`statut_abonnement = suspendu`) — Blocage administratif Super-Admin
Mesure disciplinaire ou conservatoire décidée manuellement par le Super-Admin (fraude avérée, litige juridique, non-respect des conditions d'utilisation) :
- **Connexion TOTALEMENT INTERDITE** pour tous les utilisateurs du compte, Patron inclus.
- L'écran de connexion rejette la tentative avec un message invitant à contacter le support djoonoo.
- Aucune interface n'est accessible tant que le Super-Admin n'a pas réactivé manuellement le compte.
