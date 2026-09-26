# djoonoo — Spécifications & Règles du Projet (Index Modulaire)

Ce projet est régi par l'ensemble des règles modulaires situées dans le dossier [`.agents/rules/`](file:///c:/Users/Cédric/Downloads/Africavibecoding/facturepro/djoonoo/.agents/rules).

Chaque fichier de règle contient l'intégralité du cahier des charges et des instructions d'exécution réparties par domaine de responsabilité :

| Fichier | Section(s) couverte(s) | Description |
|---|---|---|
| [00-identite-et-role.md](file:///c:/Users/Cédric/Downloads/Africavibecoding/facturepro/djoonoo/.agents/rules/00-identite-et-role.md) | En-tête, Rôle & Section 0 | Identité de marque, charte graphique (`#C1652D`), typographie, mentions légales et portée. |
| [01-perimetre-mvp.md](file:///c:/Users/Cédric/Downloads/Africavibecoding/facturepro/djoonoo/.agents/rules/01-perimetre-mvp.md) | Section 1 & Section 1 bis | Périmètre fonctionnel MVP (comptes, produits, ventes, impayés, clients, rapports) et liste stricte hors périmètre. |
| [02-roles-et-permissions.md](file:///c:/Users/Cédric/Downloads/Africavibecoding/facturepro/djoonoo/.agents/rules/02-roles-et-permissions.md) | Section 2 | Matrice des rôles & permissions (Super-Admin, Patron, Gérant, Vendeur) et politique 2FA. |
| [03-modele-donnees-prisma.md](file:///c:/Users/Cédric/Downloads/Africavibecoding/facturepro/djoonoo/.agents/rules/03-modele-donnees-prisma.md) | Section 3 | Schéma Prisma de référence complet (enums, modèles, relations, index). |
| [04-regles-metier-critiques.md](file:///c:/Users/Cédric/Downloads/Africavibecoding/facturepro/djoonoo/.agents/rules/04-regles-metier-critiques.md) | Section 4 | 10 règles métier critiques avec implémentations de code exactes (transactions atomiques, stock, factures, codes). |
| [05-forfaits-et-abonnements.md](file:///c:/Users/Cédric/Downloads/Africavibecoding/facturepro/djoonoo/.agents/rules/05-forfaits-et-abonnements.md) | Section 5 | Système de forfaits, machine à états des abonnements, interface adaptateur de paiement et cron. |
| [06-dashboard-super-admin.md](file:///c:/Users/Cédric/Downloads/Africavibecoding/facturepro/djoonoo/.agents/rules/06-dashboard-super-admin.md) | Section 6 | Dashboard Super-Admin isolé, gestion des forfaits et confirmation manuelle des paiements. |
| [07-securite-multitenant-cycledevie.md](file:///c:/Users/Cédric/Downloads/Africavibecoding/facturepro/djoonoo/.agents/rules/07-securite-multitenant-cycledevie.md) | Sections 7, 8 & 8 bis | Sécurité non négociable (2FA TOTP, rate limiting double couche), isolation multi-tenant `compte_id` et cycle de vie. |
| [08-stack-technique-et-infra.md](file:///c:/Users/Cédric/Downloads/Africavibecoding/facturepro/djoonoo/.agents/rules/08-stack-technique-et-infra.md) | Sections 9, 10 & 12 | Stack technique (Next.js 15, Prisma, Supabase, Auth.js v5), montée en charge et déploiement VPS/Coolify. |
| [09-design-et-conventions.md](file:///c:/Users/Cédric/Downloads/Africavibecoding/facturepro/djoonoo/.agents/rules/09-design-et-conventions.md) | Sections 11 & 13 | Directives de design (anti-patterns IA) et conventions de nommage (français snake_case pour le métier). |
| [10-decisions-audit-et-zones-resolues.md](file:///c:/Users/Cédric/Downloads/Africavibecoding/facturepro/djoonoo/.agents/rules/10-decisions-audit-et-zones-resolues.md) | Sections 14 & 16 | Traçabilité des décisions A1 à H20 et résolution des 7 zones d'ombre. |
| [11-ordre-de-construction-et-directives.md](file:///c:/Users/Cédric/Downloads/Africavibecoding/facturepro/djoonoo/.agents/rules/11-ordre-de-construction-et-directives.md) | Section 15 & Directive d'exécution | Les 14 étapes ordonnées de construction et directive d'exécution finale. |
