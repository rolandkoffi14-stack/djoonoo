## 11. Directives de design — anti-patterns IA (non négociable)

L'interface ne doit pas ressembler à un template générique produit par IA. Règles à respecter :

- Une seule teinte d'accent (dégradé subtil ou aplat), jamais de dégradé violet-rose-orange
- Un set d'icônes cohérent avec la marque, jamais les icônes par défaut d'une librairie utilisées sans réflexion
- Blanc cassé (chaud ou froid) plutôt que blanc pur #ffffff
- Palette : un accent + des neutres, jamais une palette arc-en-ciel — le vert et le rouge sont l'unique exception, réservés aux statuts d'entités (paiement, stock), jamais à la décoration ou à l'emphase générale (règle complète en section 0)
- Ombres portées réservées aux éléments flottants (modales, menus), jamais sur tout
- Casser la symétrie parfaite des cartes de fonctionnalités — tailles différenciées
- SVG pour les icônes, jamais d'emojis en guise d'icônes
- Verre dépoli (backdrop-blur) réservé à la lisibilité d'un overlay, jamais décoratif
- Tirets simples plutôt que tirets cadratins
- Une police avec du caractère, lisible — pas systématiquement Inter/Geist/Space Grotesk par défaut
- Hiérarchie typographique plutôt que liseré coloré vertical décoratif
- Aucun faux témoignage — du réel ou rien
- Grille bento uniquement si chaque case porte une vraie information
- Pas de fenêtre de terminal décorative avec du faux code — montrer le vrai produit
- Bénéfices concrets et chiffrés dans les textes, éviter les formulations "ce n'est pas X, c'est Y"
- Varier les puces, garder la coche verte pour les vraies validations
- L'offre tarifaire réelle décide de la présentation, pas l'inverse (pas de moule "3 formules, celle du milieu mise en avant" par défaut)
- Démo réelle du produit (capture, enregistrement) — jamais une interface vide sans contenu
- Petits rayons d'arrondi par défaut, grand rayon réservé aux éléments qui le méritent
- États de chargement avec squelette de contenu ou libellé explicite, jamais un simple spinner muet
- Pas d'orbes lumineux flous ni de trame de points décorative en arrière-plan
- Le mot exact de la fonctionnalité plutôt qu'une icône étincelle générique pour dire "IA"
- Pas de flèche animée vers le CTA — un bon CTA se suffit à lui-même
- CGU et politique de confidentialité obligatoires dès qu'un formulaire collecte un email — squelette généré, relu par un humain avant mise en ligne
- Réactions au survol réservées aux éléments cliquables
- Contraste texte-fond d'au moins 4,5:1, mesuré

---

## 13. Conventions de nommage

- **Entités et enums métier** : en français `snake_case` (ex. `statut_paiement`, `lignes_vente`, `mode_paiement`, `historique_affectations`).
- **Code technique et variables d'infrastructure** : en anglais (ex. `tx`, `handler`, `token`, `request`, `payload`, `provider`).
- **Nommage des tables en base de données** : `snake_case` pluriel en règle générale (`comptes`, `forfaits`, `factures_abonnement`, `utilisateurs`, `boutiques`, `produits`, `clients`, `ventes`, `lignes_vente`, `paiements`, `compteurs_facture`, `super_admins`, `parametres_plateforme`).
  - **Exceptions sémantiques acceptées** : `compteur_boutique`, `journal_audit` et `journal_audit_plateforme` restent au singulier par cohérence sémantique (représentant un compteur unique dédié par compte ou un registre d'audit continu).
