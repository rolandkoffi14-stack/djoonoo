# djoonoo — GEMINI.md (v3 — zones d'ombre résolues)
## SaaS de facturation & gestion de vente pour petits et moyens commerçants (Bénin)

## Rôle

Tu es l'agent d'exécution chargé d'écrire l'intégralité du code de **djoonoo** à partir de ce seul document. Ce fichier est ta source unique de vérité. Chaque section est une instruction à exécuter à la lettre, pas un résumé à interpréter librement.

**Cette version corrige le cahier des charges d'origine** après un audit complet, puis résout les 7 dernières zones d'ombre par des recommandations d'architecture explicites (section 16). Il ne reste plus aucun point ouvert non tranché dans ce document.

---

## 0. Identité de marque — non négociable

- **Nom du produit** : `djoonoo` — toujours en minuscules, sans exception, y compris en début de phrase, dans le `<title>` HTML, dans les emails.
- **Slogan** : "Ta boutique, à portée de main - où que tu sois."
- **Proposition de valeur** : "djoonoo voit ta boutique pour toi. Ventes, stock, impayés — en un coup d'œil, où que tu sois."
- **Ton de voix** : tutoiement systématique dans toute l'interface — jamais de vouvoiement, jamais de ton corporate.

### Couleurs (valeurs exactes)
```css
--djoonoo-accent: #C1652D;   /* terracotta chaud — SEULE couleur d'emphase autorisée */
--djoonoo-bg: #FAF6F1;       /* blanc cassé chaud — jamais #ffffff */
--djoonoo-text: #2B2119;     /* brun très foncé — jamais #000000 */
```
`#C1652D` est la seule couleur d'emphase (bouton, lien mis en avant, badge). Vert et rouge sont réservés **exclusivement** aux statuts d'entités métier (`statut_paiement`, `statut_vente`, alerte de stock bas) — jamais décoratifs. Aucune autre teinte nulle part dans l'interface.

### Typographie
Montserrat, plusieurs graisses, via `next/font/google`. Aucune autre police.

### Logo
Fourni séparément par le porteur du projet — ne pas en générer.

### Noms des forfaits
**Solo**, **Réseau**, **Empire** — ce sont les valeurs de **données de démarrage (seed)**, pas des constantes codées en dur. Le Super-Admin peut créer, renommer, modifier ou désactiver n'importe quel forfait depuis son dashboard (section 6) ; ces trois noms ne sont qu'un point de départ initial en base, jamais une liste fermée dans le code.

### Mentions légales
- Raison sociale : **ETS. 2KR DIGITAL**
- Adresse : Ilôt 251, parcelle C', Cocotomey, Abomey-Calavi, République du Bénin
- Téléphone : +229 01 62 16 91 01
- Email de contact/support : rolandkoffi14@gmail.com

### Portée
- Zone de lancement : **Bénin uniquement**. Langue : **français uniquement**.
- Moyens de paiement **de l'abonnement SaaS** : voir section 5 — intégration automatisée de la passerelle FedaPay (MTN Mobile Money, Moov Money, Cartes bancaires) avec activation instantanée sans validation manuelle obligatoire du Super-Admin (décision H21).
