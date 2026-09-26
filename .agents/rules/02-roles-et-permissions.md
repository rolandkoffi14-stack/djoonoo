## 2. Rôles & permissions

| Rôle | Portée | Peut voir | Peut faire |
|---|---|---|---|
| **Super-Admin** | Toute la plateforme | Tous les comptes, statistiques globales | Créer/modifier les forfaits, suspendre/réactiver un compte, confirmer un paiement d'abonnement manuel |
| **Patron** | Tout son compte | Toutes ses boutiques, rapports consolidés, historique de transferts | Créer/supprimer des boutiques, inviter/transférer/révoquer des employés, voir tous les rapports financiers |
| **Gérant de boutique** | Une seule boutique | Sa boutique en détail (stock, ventes, rapports de sa boutique) | Gérer le stock, enregistrer des ventes, **enregistrer un paiement de suivi**, gérer les vendeurs de sa boutique |
| **Vendeur** | Une seule boutique, accès restreint | Sa boutique (stock disponible, ses ventes) | Enregistrer des ventes, **enregistrer un paiement de suivi**, consulter le stock — aucun accès aux rapports financiers globaux |

**2FA obligatoire pour Patron, Gérant et Super-Admin** — extension par rapport au cahier d'origine (résolution du point D14 de l'audit : un Gérant a des permissions trop étendues — gestion du stock, des vendeurs — pour rester hors du périmètre 2FA). Optionnelle mais encouragée pour Vendeur.

**Instruction technique inchangée** : le Super-Admin vit dans une table et un système d'authentification entièrement séparés (`super_admins`, cookie de session distinct, route de connexion dédiée, `role` de `utilisateurs` jamais étendu avec une valeur `super_admin`).
