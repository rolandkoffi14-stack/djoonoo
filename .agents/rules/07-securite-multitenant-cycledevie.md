## 7. Sécurité — règles non négociables

- Aucun secret en dur, `.env*` non commité, aucune clé serveur en `NEXT_PUBLIC_`, échec au démarrage si variable manquante
- Accès Prisma exclusivement côté serveur, filtrage `compte_id` systématique (règle 5)
- Mots de passe bcrypt/argon2, sessions `HttpOnly`, vérification des droits côté serveur systématique
- **2FA obligatoire pour Patron, Gérant et Super-Admin** (extension décidée en section 2) — **mécanisme tranché : TOTP** (application d'authentification, ex. Google Authenticator/Authy), pas de SMS (résolution section 16, point 3). Le SMS exigerait une passerelle externe (coût, fiabilité de livraison variable, nouvelle dépendance d'infra) alors que le TOTP fonctionne hors ligne, gratuitement, et résiste au SIM-swap — un vecteur de fraude particulièrement pertinent sur un marché où le Mobile Money est central. Librairie : `otplib`, avec génération de QR code à l'activation. Compromis assumé : un peu de friction à l'onboarding pour un utilisateur peu à l'aise avec ce type d'app, à compenser par un guide illustré dans le hand-off, pas par un choix technique différent.
- Limitation des tentatives de connexion
- Validation serveur systématique, Prisma paramétré (`$queryRaw` en tagged template uniquement, jamais `$queryRawUnsafe`), contenu échappé à l'affichage
- Rate limiting sur connexion/inscription/réinitialisation — **infrastructure tranchée : deux couches, aucun nouveau service externe payant** (résolution section 16, point 4) : (1) rate limiting au niveau Caddy (module `caddy-ratelimit`), par IP, première ligne de défense sans dépendance nouvelle puisque Caddy est déjà le proxy retenu (section 10) ; (2) compteur de tentatives en base Postgres, par compte/email ciblé, plus précis qu'un filtre IP seul contre un brute-force distribué visant un seul compte. Choix délibéré de ne pas ajouter Upstash/Redis (contrairement à TechPhone229, pertinent là-bas pour une infra serverless) : djoonoo tourne sur un VPS unique, et ajouter un service externe payant irait à l'encontre de la logique de consolidation des coûts déjà actée pour ce type de projet.
- CORS restreint, jamais `*` sur route sensible
- Modifications d'état uniquement via POST/PUT/PATCH/DELETE
- Aucune trace d'erreur complète renvoyée au client en production, aucun `console.log` sensible
- Lockfile commité, `npm audit` avant mise en production, vigilance sur les noms de packages hallucinés

**Journal d'audit — liste non exhaustive des actions à tracer** (résolution partielle du point D15 de l'audit, à compléter en cours de développement plutôt que figée ici) : création/suppression de boutique, invitation/révocation d'employé, transfert d'employé, modification de prix produit, annulation de vente (règle 10), changement de forfait d'un compte, changement de statut d'une boutique, changement de mot de passe.

---

## 8. Architecture multi-tenant & isolation des données

Inchangée par rapport à la v1 : filtrage `compte_id` centralisé (règle 5) comme mécanisme principal, Row-Level Security PostgreSQL natif en renforcement recommandé non bloquant, Super-Admin jamais dans ce système.

## 8 bis. États de cycle de vie — comportements précisés (résolution des points G18/G19 de l'audit)

- **Boutique désactivée** (`statut = inactif`) : plus aucune nouvelle vente ni nouveau produit ne peut y être enregistré (vérification serveur). Données historiques restent consultables en lecture seule. Les utilisateurs qui y sont rattachés ne peuvent plus se connecter pour y agir tant qu'elle n'est pas réactivée ou qu'ils ne sont pas transférés ailleurs par le Patron.
- **Compte suspendu** (`statut_abonnement = suspendu`) : **blocage complet à la connexion** pour tous les utilisateurs du compte, Patron inclus, avec message clair invitant à régulariser l'abonnement. Pas de mode dégradé en lecture seule au MVP — choisi pour rester simple plutôt que de porter une complexité d'accès partiel non demandée.
