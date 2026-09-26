## 9. Précautions de montée en charge

Inchangé : connection pooling Supabase obligatoire dès le lancement, serveurs stateless, index systématique sur `compte_id`/`boutique_id` — désormais présents directement sur `ventes` et `produits` (résolution section 16, point 2 ; voir schéma section 3), plus besoin de jointure pour ces deux tables.

---

## 10. Stack technique

| Composant | Choix |
|---|---|
| Framework | Next.js 15 (App Router) |
| Langage | TypeScript |
| ORM | Prisma ORM |
| Base de données | PostgreSQL managé Supabase, accès exclusivement Prisma côté serveur |
| Authentification | Auth.js (NextAuth v5), sessions JWT, cookies `HttpOnly` |
| 2FA | `otplib` (TOTP) — résolution section 16, point 3 |
| Email transactionnel | Resend — résolution section 16, point 5, par cohérence avec le playbook RyHaD Tic-Medic déjà réutilisé pour cette stack (section 10 du cahier des charges d'origine) |
| Rate limiting | Module `caddy-ratelimit` (proxy) + compteur de tentatives en base Postgres — résolution section 16, point 4, aucun service externe supplémentaire |
| Styling | Tailwind CSS, police Montserrat |
| Tâche planifiée | Cron déclenché par crontab sur le VPS, appelant une route protégée — pour la génération des cycles de facturation (section 5.4), pas de nouveau service d'infrastructure |
| Déploiement | VPS (Contabo Cloud VPS) via Coolify, proxy Caddy |
| Stockage de fichiers | Non géré en v1 |

---

## 12. Déploiement & Infrastructure

Inchangé : VPS Contabo, playbook RyHaD Tic-Medic (utilisateur non-root, clé SSH uniquement, firewall UFW, fail2ban, mises à jour automatiques — ces mesures sont déjà explicites ici, la référence à RyHaD est une note de provenance, pas une dépendance à un document externe manquant), Coolify + Caddy, instance unique au lancement, Supabase pour la base.
